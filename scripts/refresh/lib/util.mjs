// Small helpers shared by the refresh scripts: running processes, JSON files, globs and paths.
import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Runs a program and resolves with its stdout (a string, or a Buffer with `{ encoding: 'buffer' }`). */
export function run(file, args, { cwd, encoding = 'utf8', env, input } = {}) {
	return new Promise((resolve, reject) => {
		const child = execFile(file, args, { cwd, encoding, env, maxBuffer: 256 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
			if (error) {
				error.stdout = stdout;
				error.stderr = String(stderr ?? '');
				reject(error);
			} else {
				resolve(stdout);
			}
		});
		child.stdin?.end(input);
	});
}

/** Runs git in `cwd` and resolves with its trimmed output. */
export async function git(cwd, args, options = {}) {
	const out = await run('git', args, { cwd, ...options });
	return typeof out === 'string' ? out.trim() : out;
}

/** Runs a command through the shell and captures stdout and stderr together, never rejecting. */
export function runCaptured(command, { cwd, env } = {}) {
	return new Promise((resolve) => {
		execFile(command, { cwd, env, shell: true, maxBuffer: 256 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) => {
			resolve({ ok: !error, code: error ? (error.code ?? 1) : 0, output: `${stdout ?? ''}${stderr ?? ''}` });
		});
	});
}

export function readJson(file) {
	return JSON.parse(readFileSync(file, 'utf8'));
}

/** Writes JSON the way every file under sources/ and procedures/config/ is written: two spaces, final newline. */
export function writeJson(file, value) {
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

/** A path with `/` separators, whatever the platform. */
export function posix(path) {
	return path.replaceAll('\\', '/');
}

/** Whether `path` matches `glob`, where `*` matches any run of characters other than `/`. */
export function matchGlob(glob, path) {
	const pattern = glob
		.split('*')
		.map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
		.join('[^/]*');
	return new RegExp(`^${pattern}$`).test(path);
}

/** The folder part of a glob that has no wildcard in it, for example `docs/screenshots` for `docs/screenshots/*.png`. */
export function globDirectory(glob) {
	const parts = glob.split('/');
	const fixed = [];
	for (const part of parts.slice(0, -1)) {
		if (part.includes('*')) break;
		fixed.push(part);
	}
	return fixed.join('/');
}

export function short(sha) {
	return sha ? sha.slice(0, 7) : 'none';
}

/** Compares two semantic versions (with an optional `v` prefix and pre-release part). */
export function compareSemver(a, b) {
	const parse = (v) => {
		const [core, pre] = v.replace(/^v/, '').split('-', 2);
		return { nums: core.split('.').map((n) => Number.parseInt(n, 10) || 0), pre };
	};
	const x = parse(a);
	const y = parse(b);
	for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
		const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
		if (d) return d;
	}
	if (x.pre === y.pre) return 0;
	if (x.pre === undefined) return 1;
	if (y.pre === undefined) return -1;
	return x.pre < y.pre ? -1 : 1;
}
