// `npm run refresh:verify`: the source-record check of contracts/site-integration.md. Every file under
// sources/<short>/ is recorded in that folder's lock with a matching SHA-256, and every built page made from
// sources/ names the revision it was built from. Prints one line per violation; exits 1 on any.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'parse5';
import { LOCK_FILE, sha256, validateLock } from './lib/lock.mjs';
import { matchGlob, posix } from './lib/util.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));

function walk(dir, base = dir, out = []) {
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, base, out);
		else out.push(posix(relative(base, path)));
	}
	return out;
}

/** The procedure module owning sources/<short>/; tests add their own through REFRESH_PROCEDURES_DIR. */
async function loadModule(short) {
	const extra = process.env.REFRESH_PROCEDURES_DIR;
	const file = extra && existsSync(join(extra, `${short}.mjs`)) ? resolve(extra, `${short}.mjs`) : join(here, 'procedures', `${short}.mjs`);
	if (!existsSync(file)) return null;
	return (await import(pathToFileURL(file).href)).default;
}

function metas(html) {
	const found = [];
	const visit = (node) => {
		if (node.nodeName === 'meta') {
			const attrs = Object.fromEntries(node.attrs.map((a) => [a.name, a.value]));
			if (attrs.name) found.push(attrs);
		}
		if (node.nodeName === 'body') return;
		for (const child of node.childNodes ?? []) visit(child);
	};
	visit(parse(html));
	return found;
}

/** Runs the check on the site at `root` and returns the violations, one string each. */
export async function verify({ root = process.cwd(), allowLocal = false } = {}) {
	const violations = [];
	const sourcesDir = join(root, 'sources');
	const records = [];

	const folders = existsSync(sourcesDir) ? readdirSync(sourcesDir).filter((name) => statSync(join(sourcesDir, name)).isDirectory()) : [];
	for (const short of folders.sort()) {
		const dir = join(sourcesDir, short);
		const at = `sources/${short}`;
		const present = walk(dir).filter((path) => path !== LOCK_FILE);
		if (!existsSync(join(dir, LOCK_FILE))) {
			violations.push(`${at}: no ${LOCK_FILE}, so none of its ${present.length} files has a source record`);
			continue;
		}
		let lock;
		try {
			lock = JSON.parse(readFileSync(join(dir, LOCK_FILE), 'utf8'));
		} catch (error) {
			violations.push(`${at}/${LOCK_FILE}: not valid JSON (${error.message})`);
			continue;
		}
		for (const problem of validateLock(lock, { allowLocal })) violations.push(`${at}/${LOCK_FILE}: ${problem}`);

		const module = await loadModule(short);
		if (!module) violations.push(`${at}: no procedure module scripts/refresh/procedures/${short}.mjs declares this folder`);
		else if (lock.procedure !== module.id) violations.push(`${at}/${LOCK_FILE}: procedure "${lock.procedure}" is not ${module.id}, which owns this folder`);
		const declared = new Set((module?.sources ?? []).map((s) => s.repository));
		const derivedGlobs = module?.derivedFiles ?? [];

		const listed = new Set();
		for (const file of lock.files ?? []) {
			listed.add(file.path);
			const path = join(dir, file.path);
			if (!existsSync(path)) violations.push(`${at}/${file.path}: listed in the lock but missing`);
			else if (sha256(path) !== file.sha256) violations.push(`${at}/${file.path}: SHA-256 differs from the lock (edited by hand?)`);
			if (module && !declared.has(file.repository)) violations.push(`${at}/${file.path}: repository ${file.repository} is not a declared source of ${module.id}`);
			records.push(`${file.repository}@${file.commit}:${file.sourcePath}`);
		}
		for (const derived of lock.derived ?? []) {
			listed.add(derived.path);
			const path = join(dir, derived.path);
			if (!existsSync(path)) violations.push(`${at}/${derived.path}: listed in the lock as derived but missing`);
			else if (sha256(path) !== derived.sha256) violations.push(`${at}/${derived.path}: SHA-256 differs from the lock (edited by hand?)`);
			if (module && !derivedGlobs.some((glob) => matchGlob(glob, derived.path))) violations.push(`${at}/${derived.path}: not a derived file ${module.id} declares`);
		}
		for (const input of lock.inputs ?? []) {
			if (module && !declared.has(input.repository)) violations.push(`${at}/${LOCK_FILE}: input repository ${input.repository} is not a declared source of ${module.id}`);
		}
		for (const path of present) if (!listed.has(path)) violations.push(`${at}/${path}: not listed in the lock`);
	}

	const pkgFile = join(root, 'package.json');
	const out = existsSync(pkgFile) ? JSON.parse(readFileSync(pkgFile, 'utf8')).adp?.out : undefined;
	if (out && existsSync(join(root, out))) {
		const known = new Set(records);
		for (const page of walk(join(root, out)).filter((path) => path.endsWith('.html'))) {
			const found = metas(readFileSync(join(root, out, page), 'utf8'));
			const sources = found.filter((m) => m.name === 'adp:source').map((m) => m.content);
			for (const source of sources) if (!known.has(source)) violations.push(`${out}/${page}: adp:source "${source}" points to no lock entry`);
			if (found.some((m) => m.name === 'adp:sourced' && m.content === 'true') && !sources.length) {
				violations.push(`${out}/${page}: built from sources/ but has no adp:source meta`);
			}
		}
	}
	return violations;
}

async function main() {
	const args = process.argv.slice(2);
	const rootAt = args.indexOf('--root');
	const root = rootAt >= 0 ? resolve(args[rootAt + 1]) : process.cwd();
	const violations = await verify({ root });
	for (const line of violations) console.log(line);
	if (violations.length) {
		console.log(`refresh:verify: ${violations.length} violation${violations.length === 1 ? '' : 's'}`);
		process.exit(1);
	}
	console.log('refresh:verify: every sourced file matches its source record');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
