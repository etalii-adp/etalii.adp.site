// refresh-disl: the DISL and DID specifications, schemas and examples from etalii-adp/etalii.adp into
// sources/disl/<version>/, a frozen folder per version (research R12). Named refresh-dedl until etalii.adp spec 002
// renamed DEDL; `dedl` is still accepted as its name (lib/names.mjs).
//
// etalii.adp spec 002 splits DEDL into DISL (specifications/disl/) and DID (specifications/did/). Until its Part 7
// this procedure reads either layout: DISL and DID once specifications/disl/ exists, DEDL while it is absent. Both
// are stored in the same version folder (their file names differ); the site publishes their pages at /adp/disl/ and /adp/did/.
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { compareSemver } from '../lib/util.mjs';

/** The two layouts, each a list of languages with their folder, specification and schema (etalii.adp spec 002). */
export const LAYOUTS = {
	dedl: [{ short: 'DEDL', folder: 'specifications/dedl/', spec: 'DEDL-specification.md', schema: 'dedl.schema.json' }],
	disl: [
		{ short: 'DISL', folder: 'specifications/disl/', spec: 'DISL-specification.md', schema: 'disl.schema.json' },
		{ short: 'DID', folder: 'specifications/did/', spec: 'DID-specification.md', schema: 'did.schema.json' },
	],
};

/** The layout of the watched files: `disl` when any is under specifications/disl/, else `dedl`. */
export function layoutOf(files) {
	return files.some((f) => f.sourcePath.startsWith(LAYOUTS.disl[0].folder)) ? 'disl' : 'dedl';
}

const SPEC = LAYOUTS.dedl[0].spec;

/** The version in the specification's header (the text before its first `##` heading). */
export function headerVersion(markdown) {
	const header = markdown.split(/^## /m)[0];
	return header.match(/\bversion\b[\s|:*]*v?(\d+(?:\.\d+)+)/i)?.[1] ?? null;
}

/** The version segment of the schema's `$id`: `…/<name>/schema/<version>/<name>.schema.json`, `name` `dedl` by default. */
export function schemaVersion(json, name = 'dedl') {
	const id = JSON.parse(json).$id ?? '';
	const address = new RegExp(String.raw`/${name}/schema/([^/]+)/${name}\.schema\.json$`);
	return id.match(address)?.[1] ?? null;
}

/** Splits a specification on its `##` headings: `[{ heading, lines }]`, with the text before the first as "(header)". */
export function splitSections(markdown) {
	const sections = [];
	let current = { heading: '(header)', lines: [] };
	for (const line of markdown.replaceAll('\r\n', '\n').split('\n')) {
		if (line.startsWith('## ')) {
			sections.push(current);
			current = { heading: line.slice(3).trim(), lines: [] };
		} else {
			current.lines.push(line);
		}
	}
	sections.push(current);
	return sections;
}

/** Lines removed plus lines added between two texts, counted as multisets (a line moved within a section is free). */
function changedLines(before, after) {
	const counts = new Map();
	for (const line of before) counts.set(line, (counts.get(line) ?? 0) + 1);
	let added = 0;
	for (const line of after) {
		const n = counts.get(line) ?? 0;
		if (n) counts.set(line, n - 1);
		else added++;
	}
	const removed = [...counts.values()].reduce((a, b) => a + b, 0);
	return added + removed;
}

/** Compares two specifications section by section: `[{ heading, change, lines }]` for every section that differs. */
export function compareSections(before, after) {
	const was = new Map(splitSections(before ?? '').map((s) => [s.heading, s.lines]));
	const now = splitSections(after);
	const result = [];
	for (const section of now) {
		if (!was.has(section.heading)) result.push({ heading: section.heading, change: 'added', lines: section.lines.length });
		else {
			const lines = changedLines(was.get(section.heading), section.lines);
			if (lines) result.push({ heading: section.heading, change: 'changed', lines });
			was.delete(section.heading);
		}
	}
	if (before !== null) for (const [heading, lines] of was) result.push({ heading, change: 'removed', lines: lines.length });
	return result;
}

function versionsIn(lock) {
	return [...new Set((lock?.files ?? []).map((f) => f.path.split('/')[0]))].sort(compareSemver);
}

export default {
	id: 'refresh-disl',
	short: 'disl',
	what: 'DISL and DID reference',
	sources: [{ repository: 'etalii-adp/etalii.adp', ref: 'develop', paths: ['specifications/dedl/*', 'specifications/disl/*', 'specifications/did/*'], host: null }],
	usesReleases: false,

	/** Only the newest version's files are compared with the source; older versions are frozen. */
	lockEntries(lock) {
		const latest = versionsIn(lock).at(-1);
		return lock.files.filter((f) => f.path.startsWith(`${latest}/`));
	},

	async apply(ctx) {
		const [source] = ctx.sources;
		const layout = layoutOf(source.files);
		const languages = LAYOUTS[layout];
		// Only the files of the layout in use: while etalii.adp moves, a stale specifications/dedl/ beside the new
		// folders is not published a second time.
		const used = source.files.filter((f) => languages.some((l) => f.sourcePath.startsWith(l.folder)));
		const byName = new Map(used.map((f) => [basename(f.sourcePath), f]));
		const found = languages.map((language) => {
			const spec = byName.get(language.spec);
			const schema = byName.get(language.schema);
			if (!spec) throw new Error(`${source.repository}: ${language.folder}* has no ${language.spec} at ${source.head.slice(0, 7)}`);
			if (!schema) throw new Error(`${source.repository}: ${language.folder}* has no ${language.schema} at ${source.head.slice(0, 7)}`);
			const specText = readFileSync(spec.file, 'utf8');
			const fromHeader = headerVersion(specText);
			const fromSchema = schemaVersion(readFileSync(schema.file, 'utf8'), language.short.toLowerCase());
			if (!fromHeader || !fromSchema || fromHeader !== fromSchema) {
				throw new Error(`${source.repository}: the ${language.short} version disagrees: the specification header says ${fromHeader ?? '(none)'}, the schema $id says ${fromSchema ?? '(none)'}`);
			}
			return { language, specText, version: fromHeader };
		});
		if (new Set(found.map((f) => f.version)).size > 1) {
			throw new Error(`${source.repository}: ${found.map((f) => `${f.language.short} is version ${f.version}`).join(' and ')}; they are published together, so they must share a version`);
		}
		const version = found[0].version;
		const specText = found[0].specText;
		const specName = found[0].language.spec;
		const versions = versionsIn(ctx.previous);
		const latest = versions.at(-1) ?? null;
		if (latest && compareSemver(version, latest) < 0) {
			throw new Error(`${source.repository}: the source's ${languages.map((l) => l.short).join(' and ')} version ${version} is older than the published ${latest}; an older version's folder is never rewritten`);
		}
		const newVersion = latest !== null && version !== latest;

		const files = used.map((from) => ({ path: `${version}/${basename(from.sourcePath)}`, from }));
		const keep = (ctx.previous?.files ?? []).map((f) => f.path).filter((path) => !path.startsWith(`${version}/`));

		// The sections are compared with the previous specification of the same name, or DISL's with DEDL's the first
		// time the new layout is read.
		const oldSpecName = latest && existsSync(join(ctx.target, latest, specName)) ? specName : SPEC;
		const oldSpec = latest && existsSync(join(ctx.target, latest, oldSpecName)) ? readFileSync(join(ctx.target, latest, oldSpecName), 'utf8') : null;
		const previousEntries = new Map((ctx.previous?.files ?? []).filter((f) => f.path.startsWith(`${latest}/`)).map((f) => [basename(f.path), f]));
		const others = used
			.filter((f) => basename(f.sourcePath) !== specName)
			.map((f) => {
				const was = previousEntries.get(basename(f.sourcePath));
				return { file: basename(f.sourcePath), change: !was ? 'added' : was.gitBlob === f.gitBlob ? 'unchanged' : 'changed' };
			});
		for (const name of previousEntries.keys()) {
			if (name !== specName && name !== oldSpecName && !byName.has(name)) others.push({ file: name, change: 'removed' });
		}

		return {
			files,
			keep,
			details: {
				layout,
				spec: specName,
				version,
				previousVersion: latest,
				newVersion,
				sections: compareSections(oldSpec === null ? null : oldSpec, specText),
				files: others.sort((a, b) => a.file.localeCompare(b.file)),
			},
		};
	},

	title(summary) {
		const d = summary.details;
		return d?.newVersion ? `Refresh DISL and DID reference: publish ${d.version} beside ${d.previousVersion}` : undefined;
	},

	renderDetails(d) {
		if (!d?.version) return '';
		const lines = [];
		if (d.newVersion) lines.push(`New version ${d.version} published beside ${d.previousVersion}; \`sources/disl/${d.previousVersion}/\` is unchanged.`, '');
		else if (!d.previousVersion) lines.push(`Version ${d.version} imported for the first time.`, '');
		if (d.layout === 'disl') lines.push('Read from `specifications/disl/` and `specifications/did/` (DISL and DID, etalii.adp spec 002); the DISL specification is compared below.', '');
		lines.push(`**Specification** (\`${d.version}/${d.spec ?? SPEC}\`):`, '');
		if (!d.sections.length) lines.push('No section changed.');
		else {
			lines.push('| Section | Change | Lines changed |', '|---|---|---|');
			for (const s of d.sections) lines.push(`| ${s.heading.replaceAll('|', '\\|')} | ${s.change} | ${s.lines} |`);
		}
		lines.push('', '**Schema and examples**:', '', '| File | Change |', '|---|---|');
		for (const f of d.files) lines.push(`| \`${f.file}\` | ${f.change} |`);
		return lines.join('\n');
	},
};
