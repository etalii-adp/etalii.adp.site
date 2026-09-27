// Reads, writes and compares sources/<short>/source.lock.json (contracts/source-lock.schema.json).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeJson } from './util.mjs';

export const LOCK_FILE = 'source.lock.json';

const PROCEDURE = /^refresh-[a-z][a-z0-9-]*$/;
const SHA = /^[0-9a-f]{40}$/;
const SHA256 = /^[0-9a-f]{64}$/;
const REPOSITORY = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;
const DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/** The SHA-256 of a Buffer or string, as 64 hex characters. */
export function hashBytes(bytes) {
	return createHash('sha256').update(bytes).digest('hex');
}

/** The SHA-256 of a file's bytes, as 64 hex characters. */
export function sha256(file) {
	return hashBytes(readFileSync(file));
}

/** The SHA-256 of a text file with its line endings made LF, so a checkout's CRLF does not count as a change. */
export function textHash(file) {
	return hashBytes(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'));
}

function checkKeys(object, allowed, where, problems) {
	for (const key of Object.keys(object)) if (!allowed.includes(key)) problems.push(`${where}: unexpected property "${key}"`);
}

function checkRequired(object, required, where, problems) {
	for (const key of required) if (!(key in object)) problems.push(`${where}: missing "${key}"`);
}

/**
 * Checks a lock against the shape of contracts/source-lock.schema.json, by hand, and returns one line per problem.
 * `"local": true` is a problem unless `allowLocal` is set, for runs that are themselves local.
 */
export function validateLock(lock, { allowLocal = false } = {}) {
	const problems = [];
	if (lock === null || typeof lock !== 'object' || Array.isArray(lock)) return ['the lock is not a JSON object'];
	checkKeys(lock, ['procedure', 'refreshedAt', 'local', 'sourceHeads', 'releases', 'config', 'files', 'inputs', 'derived', 'withdrawn'], 'lock', problems);
	checkRequired(lock, ['procedure', 'refreshedAt', 'sourceHeads', 'files', 'withdrawn'], 'lock', problems);
	if ('procedure' in lock && !PROCEDURE.test(lock.procedure)) problems.push(`lock: unknown procedure "${lock.procedure}"`);
	if ('refreshedAt' in lock && !DATE_TIME.test(lock.refreshedAt)) problems.push(`lock: refreshedAt "${lock.refreshedAt}" is not an ISO 8601 date-time`);
	if ('local' in lock) {
		if (lock.local !== true) problems.push('lock: "local" may only be true');
		else if (!allowLocal) problems.push('lock: "local": true (a run against a local --source checkout must never be committed)');
	}
	for (const [repository, head] of Object.entries(lock.sourceHeads ?? {})) {
		if (!REPOSITORY.test(repository)) problems.push(`sourceHeads: "${repository}" is not owner/name`);
		if (!SHA.test(head)) problems.push(`sourceHeads.${repository}: "${head}" is not a 40-hex commit`);
	}
	for (const [repository, release] of Object.entries(lock.releases ?? {})) {
		if (!REPOSITORY.test(repository)) problems.push(`releases: "${repository}" is not owner/name`);
		if (release === null) continue;
		checkKeys(release, ['tag', 'commit'], `releases.${repository}`, problems);
		if (typeof release.tag !== 'string') problems.push(`releases.${repository}: missing tag`);
		if (!SHA.test(release.commit ?? '')) problems.push(`releases.${repository}: commit "${release.commit}" is not a 40-hex commit`);
	}
	for (const [path, hash] of Object.entries(lock.config ?? {})) {
		if (!SHA256.test(hash)) problems.push(`config.${path}: "${hash}" is not a SHA-256`);
	}
	(lock.files ?? []).forEach((file, i) => {
		const where = `files[${i}] ${file.path ?? ''}`.trim();
		checkKeys(file, ['path', 'repository', 'sourcePath', 'commit', 'gitBlob', 'sha256', 'licence'], where, problems);
		checkRequired(file, ['path', 'repository', 'sourcePath', 'commit', 'gitBlob', 'sha256', 'licence'], where, problems);
		if ('repository' in file && !REPOSITORY.test(file.repository)) problems.push(`${where}: repository "${file.repository}" is not owner/name`);
		if ('commit' in file && !SHA.test(file.commit)) problems.push(`${where}: commit "${file.commit}" is not 40 hexadecimal characters`);
		if ('gitBlob' in file && !SHA.test(file.gitBlob)) problems.push(`${where}: gitBlob "${file.gitBlob}" is not 40 hexadecimal characters`);
		if ('sha256' in file && !SHA256.test(file.sha256)) problems.push(`${where}: sha256 "${file.sha256}" is not a SHA-256`);
	});
	(lock.inputs ?? []).forEach((input, i) => {
		const where = `inputs[${i}] ${input.sourcePath ?? ''}`.trim();
		checkKeys(input, ['repository', 'sourcePath', 'commit', 'gitBlob'], where, problems);
		checkRequired(input, ['repository', 'sourcePath', 'commit', 'gitBlob'], where, problems);
		if ('commit' in input && !SHA.test(input.commit)) problems.push(`${where}: commit "${input.commit}" is not 40 hexadecimal characters`);
	});
	(lock.derived ?? []).forEach((derived, i) => {
		const where = `derived[${i}] ${derived.path ?? ''}`.trim();
		checkKeys(derived, ['path', 'sha256'], where, problems);
		checkRequired(derived, ['path', 'sha256'], where, problems);
	});
	(lock.withdrawn ?? []).forEach((entry, i) => {
		const where = `withdrawn[${i}] ${entry.path ?? ''}`.trim();
		checkKeys(entry, ['path', 'sourcePath', 'withdrawnAt', 'lastCommit', 'replacedBy'], where, problems);
		checkRequired(entry, ['path', 'sourcePath', 'withdrawnAt', 'lastCommit'], where, problems);
		if ('lastCommit' in entry && !SHA.test(entry.lastCommit)) problems.push(`${where}: lastCommit "${entry.lastCommit}" is not a 40-hex commit`);
	});
	return problems;
}

/** Parses and validates lock text; throws with every problem named. */
export function parseLock(text, options) {
	const lock = JSON.parse(text);
	const problems = validateLock(lock, options);
	if (problems.length) throw new Error(`invalid ${LOCK_FILE}:\n  ${problems.join('\n  ')}`);
	return lock;
}

/** Reads `<dir>/source.lock.json`, or returns null when there is none. */
export function readLock(dir, options) {
	const file = join(dir, LOCK_FILE);
	if (!existsSync(file)) return null;
	return parseLock(readFileSync(file, 'utf8'), options);
}

const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);

/** Puts a lock's lists in their stable order and its keys in schema order. */
export function normaliseLock(lock) {
	const out = { procedure: lock.procedure, refreshedAt: lock.refreshedAt };
	if (lock.local) out.local = true;
	out.sourceHeads = Object.fromEntries(Object.entries(lock.sourceHeads ?? {}).sort());
	if (lock.releases) out.releases = Object.fromEntries(Object.entries(lock.releases).sort());
	if (lock.config && Object.keys(lock.config).length) out.config = Object.fromEntries(Object.entries(lock.config).sort());
	out.files = [...(lock.files ?? [])].sort(byPath);
	if (lock.inputs?.length) {
		out.inputs = [...lock.inputs].sort((a, b) => `${a.repository}:${a.sourcePath}`.localeCompare(`${b.repository}:${b.sourcePath}`));
	}
	if (lock.derived?.length) out.derived = [...lock.derived].sort(byPath);
	out.withdrawn = [...(lock.withdrawn ?? [])].sort(byPath);
	return out;
}

/** Writes `<dir>/source.lock.json` in its stable form, after checking its shape. */
export function writeLock(dir, lock) {
	const normal = normaliseLock(lock);
	const problems = validateLock(normal, { allowLocal: true });
	if (problems.length) throw new Error(`refusing to write an invalid ${LOCK_FILE}:\n  ${problems.join('\n  ')}`);
	writeJson(join(dir, LOCK_FILE), normal);
	return normal;
}

/** Whether two locks record the same thing, ignoring when they were written and the heads at that time. */
export function sameRecord(a, b) {
	if (!a || !b) return false;
	const strip = (lock) => JSON.stringify({ ...normaliseLock(lock), refreshedAt: null, sourceHeads: null });
	return strip(a) === strip(b);
}

const key = (entry) => `${entry.repository}:${entry.sourcePath}`;

/**
 * Compares the files a source has now (`resolved`: `[{ repository, sourcePath, gitBlob }]`) with what the lock
 * recorded, by git blob, and the latest releases with the lock's `releases` (when `releases` is given).
 * `entries` defaults to the lock's files and inputs; a procedure narrows it when a lock keeps frozen copies.
 * Returns `{ current, added, changed, removed }`; there is nothing current without a lock.
 */
export function compareResolved(lock, resolved, releases, entries = lock ? [...lock.files, ...(lock.inputs ?? [])] : []) {
	const recorded = new Map(entries.map((entry) => [key(entry), entry]));
	const seen = new Set();
	const added = [];
	const changed = [];
	for (const file of resolved) {
		const was = recorded.get(key(file));
		seen.add(key(file));
		if (!was) added.push(file);
		else if (was.gitBlob !== file.gitBlob) changed.push(file);
	}
	const removed = entries.filter((entry) => !seen.has(key(entry)));
	const releasesChanged = releases !== undefined && JSON.stringify(sortKeys(lock?.releases ?? {})) !== JSON.stringify(sortKeys(releases));
	return {
		current: lock !== null && !added.length && !changed.length && !removed.length && !releasesChanged,
		added,
		changed,
		removed,
		releasesChanged,
	};
}

function sortKeys(object) {
	return Object.fromEntries(Object.entries(object).sort());
}

/**
 * Records the lock entries of `removed` files in `lock.withdrawn`, with the time and their last commit. A
 * withdrawal points at `replacedBy` when a file in the lock has the same git blob under another path (a rename).
 * An earlier withdrawal of a path that is present again is dropped. Returns the new withdrawals.
 */
export function applyWithdrawals(lock, removed, now = new Date()) {
	const present = new Set(lock.files.map((file) => file.path));
	lock.withdrawn = (lock.withdrawn ?? []).filter((entry) => !present.has(entry.path));
	const added = [];
	for (const entry of removed) {
		const replacement = lock.files.find((file) => file.gitBlob === entry.gitBlob && file.path !== entry.path);
		const withdrawal = {
			path: entry.path,
			sourcePath: entry.sourcePath,
			withdrawnAt: now.toISOString(),
			lastCommit: entry.commit,
			replacedBy: replacement ? replacement.path : null,
		};
		lock.withdrawn = lock.withdrawn.filter((w) => w.path !== entry.path);
		lock.withdrawn.push(withdrawal);
		added.push(withdrawal);
	}
	return added;
}
