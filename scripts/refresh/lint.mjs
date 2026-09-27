// `npm run refresh:lint`: checks the procedures themselves (contracts/procedure-document.md § Rules). Every
// procedure has the template's sections in order, one index row, and the same sources as its script; every mapping
// value is valid. Prints one line per problem with its file; exits 1 on any.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
export const SECTIONS = ['Sources', 'Updates', 'Before you start', 'Steps', 'Decisions', 'Verification', 'Pull request', 'When the source moves'];
const ORIGIN = /^[a-z0-9-]+\/[a-z0-9.-]+$/;

/** The document's `#`/`##` headings and the lines of each `##` section, ignoring fenced code and HTML comments. */
function outline(markdown) {
	const text = markdown.replaceAll('\r\n', '\n').replace(/<!--[\s\S]*?-->/g, '');
	let title = null;
	const sections = [];
	let fenced = false;
	for (const line of text.split('\n')) {
		if (/^(```|~~~)/.test(line)) fenced = !fenced;
		if (!fenced && /^# /.test(line) && title === null) title = line.slice(2).trim();
		else if (!fenced && /^## /.test(line)) sections.push({ name: line.slice(3).trim(), lines: [] });
		else sections.at(-1)?.lines.push(line);
	}
	return { title, sections };
}

const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());

/** The rows of the first Markdown table in `lines`, without its header and separator. */
function tableRows(lines) {
	const start = lines.findIndex((l) => l.trim().startsWith('|'));
	if (start < 0) return [];
	const rows = [];
	for (let i = start + 2; i < lines.length && lines[i].trim().startsWith('|'); i++) rows.push(cells(lines[i]));
	return rows;
}

const unquote = (value) => value.replaceAll('`', '').trim();

async function loadModule(short) {
	const file = join(here, 'procedures', `${short}.mjs`);
	if (!existsSync(file)) return null;
	return (await import(pathToFileURL(file).href)).default;
}

/** Runs every check on the procedures folder `dir` and returns the problems, one string each. */
export async function lint({ dir = 'procedures', cwd = process.cwd() } = {}) {
	const problems = [];
	const at = (file) => relative(cwd, file).replaceAll('\\', '/');
	const readmeFile = join(dir, 'README.md');
	const readme = existsSync(readmeFile) ? readFileSync(readmeFile, 'utf8') : '';
	if (!readme) problems.push(`${at(readmeFile)}: the index of procedures is missing`);
	const indexRows = tableRows(readme.replaceAll('\r\n', '\n').split('\n')).map((row) => row[0].match(/refresh-[a-z0-9-]+/)?.[0] ?? row[0]);
	const docs = readdirSync(dir).filter((name) => /^refresh-[a-z0-9-]+\.md$/.test(name)).sort();

	for (const name of docs) {
		const id = name.replace(/\.md$/, '');
		const file = join(dir, name);
		const { title, sections } = outline(readFileSync(file, 'utf8'));
		if (!title) problems.push(`${at(file)}: no "# " title`);
		const names = sections.map((s) => s.name);
		for (const required of SECTIONS) if (!names.includes(required)) problems.push(`${at(file)}: missing section "## ${required}"`);
		const present = names.filter((n) => SECTIONS.includes(n));
		const expected = SECTIONS.filter((s) => names.includes(s));
		if (present.join('|') !== expected.join('|')) problems.push(`${at(file)}: sections out of order: ${present.join(', ')} (expected ${expected.join(', ')})`);
		for (const extra of names.filter((n) => !SECTIONS.includes(n))) problems.push(`${at(file)}: unexpected section "## ${extra}"`);

		const rows = indexRows.filter((row) => row === id).length;
		if (rows !== 1) problems.push(`${at(file)}: ${rows === 0 ? 'not listed' : `listed ${rows} times`} in the index ${at(readmeFile)}`);

		for (const section of sections) {
			const body = section.lines.join('\n');
			if (section.name !== 'Decisions' && /ask the owner/i.test(body)) problems.push(`${at(file)}: "ask the owner" in "## ${section.name}"; questions belong in Decisions only`);
			if (section.name === 'Steps') {
				for (const sentence of body.split(/(?<=[.;:])\s+/)) {
					if (/\b(edit|modify|change|fix|correct|rewrite)\b[^.]*\bsources\//i.test(sentence) && !/\b(never|not|no)\b/i.test(sentence)) {
						problems.push(`${at(file)}: a step tells the reader to edit a file under sources/: "${sentence.trim().slice(0, 100)}"`);
					}
				}
			}
		}

		if (id === 'refresh-all') continue;
		const short = id.replace(/^refresh-/, '');
		let module;
		try {
			module = await loadModule(short);
		} catch (error) {
			problems.push(`${at(file)}: scripts/refresh/procedures/${short}.mjs cannot be loaded: ${error.message}`);
			continue;
		}
		if (!module) {
			problems.push(`${at(file)}: no module scripts/refresh/procedures/${short}.mjs implements this procedure`);
			continue;
		}
		const sourcesSection = sections.find((s) => s.name === 'Sources');
		if (!sourcesSection) continue;
		const documented = new Map(tableRows(sourcesSection.lines).map((row) => [unquote(row[0]), new Set(row[2].split(',').map(unquote).filter(Boolean))]));
		const declared = new Map(module.sources.map((s) => [s.repository, new Set(s.paths)]));
		for (const [repository, paths] of declared) {
			if (!documented.has(repository)) problems.push(`${at(file)}: Sources lists no row for ${repository}, which the module reads`);
			else if ([...paths].sort().join(',') !== [...documented.get(repository)].sort().join(',')) {
				problems.push(`${at(file)}: Sources gives ${repository} the paths ${[...documented.get(repository)].join(', ')}, but the module reads ${[...paths].join(', ')}`);
			}
		}
		for (const repository of documented.keys()) if (!declared.has(repository)) problems.push(`${at(file)}: Sources lists ${repository}, which the module does not read`);
	}

	for (const id of indexRows) {
		if (/^refresh-/.test(id) && !docs.includes(`${id}.md`)) problems.push(`${at(readmeFile)}: the index lists ${id}, but ${id}.md does not exist`);
	}

	const statesFile = join(dir, 'config', 'states.json');
	if (existsSync(statesFile)) {
		const states = JSON.parse(readFileSync(statesFile, 'utf8'));
		for (const [host, mapping] of Object.entries(states.mappings ?? {})) {
			for (const [label, value] of Object.entries(mapping)) {
				if (!(states.siteStates ?? []).includes(value)) problems.push(`${at(statesFile)}: mappings.${host}["${label}"] is "${value}", which is not a site state`);
			}
		}
	}
	const screenshotsFile = join(dir, 'config', 'screenshots.json');
	if (existsSync(screenshotsFile)) {
		for (const [host, mapping] of Object.entries(JSON.parse(readFileSync(screenshotsFile, 'utf8')))) {
			for (const [image, origin] of Object.entries(mapping)) {
				if (origin !== 'none' && !ORIGIN.test(origin)) problems.push(`${at(screenshotsFile)}: ${host}["${image}"] is "${origin}", which is not a <vendor>/<type> origin or "none"`);
			}
		}
	}
	return problems;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const args = process.argv.slice(2);
	const dirAt = args.indexOf('--dir');
	const problems = await lint({ dir: dirAt >= 0 ? resolve(args[dirAt + 1]) : 'procedures' });
	for (const problem of problems) console.log(problem);
	if (problems.length) {
		console.log(`refresh:lint: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
		process.exit(1);
	}
	console.log('refresh:lint: every procedure follows the template and is indexed');
}
