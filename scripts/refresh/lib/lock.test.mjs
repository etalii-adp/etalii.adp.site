import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';
import { applyWithdrawals, compareResolved, readLock, sha256, validateLock, writeLock } from './lock.mjs';

const dir = mkdtempSync(join(tmpdir(), 'refresh-lock-test-'));
after(() => rmSync(dir, { recursive: true, force: true }));

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const REPO = 'etalii-adp/etalii.adp';
const entry = (path, gitBlob, extra = {}) => ({ path, repository: REPO, sourcePath: `specifications/dedl/${path.split('/').pop()}`, commit: A, gitBlob, sha256: '0'.repeat(64), licence: 'unstated', ...extra });
const lock = (files, extra = {}) => ({ procedure: 'refresh-dedl', refreshedAt: '2026-09-26T10:00:00.000Z', sourceHeads: { [REPO]: A }, files, withdrawn: [], ...extra });

describe('sha256', () => {
	it('hashes a file’s bytes', () => {
		const file = join(dir, 'hello.txt');
		writeFileSync(file, 'hello\n');
		assert.equal(sha256(file), '5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03');
	});
});

describe('readLock and writeLock', () => {
	it('writes a lock that validates, sorted, two-space JSON with a final newline, and reads it back', () => {
		const target = join(dir, 'write');
		writeLock(target, lock([entry('0.1/z.json', B), entry('0.1/a.md', A)]));
		const text = readFileSync(join(target, 'source.lock.json'), 'utf8');
		assert.ok(text.endsWith('}\n'));
		assert.ok(text.includes('\n  "procedure": "refresh-dedl"'));
		const read = readLock(target);
		assert.deepEqual(read.files.map((f) => f.path), ['0.1/a.md', '0.1/z.json']);
		assert.deepEqual(validateLock(read), []);
	});

	it('accepts exactly the properties of contracts/source-lock.schema.json', () => {
		const schema = JSON.parse(readFileSync(new URL('../../../specs/004-content-refresh-procedures/contracts/source-lock.schema.json', import.meta.url), 'utf8'));
		const every = Object.fromEntries(Object.keys(schema.properties).map((key) => [key, undefined]));
		const problems = validateLock({ ...lock([]), ...every, ...lock([]) });
		assert.deepEqual(problems.filter((p) => p.includes('unexpected property')), []);
		for (const required of schema.required) {
			const partial = lock([]);
			delete partial[required];
			assert.ok(validateLock(partial).some((p) => p.includes(`missing "${required}"`)), required);
		}
	});

	it('returns null when there is no lock', () => {
		assert.equal(readLock(join(dir, 'nothing-here')), null);
	});

	it('names every problem of an invalid lock', () => {
		const problems = validateLock({ ...lock([entry('x', 'nope', { commit: 'short' })]), extra: 1 });
		assert.ok(problems.some((p) => p.includes('unexpected property "extra"')));
		assert.ok(problems.some((p) => p.includes('commit "short" is not 40 hexadecimal characters')));
		assert.ok(problems.some((p) => p.includes('gitBlob "nope"')));
	});

	it('rejects a lock with "local": true unless the run is itself local', () => {
		const local = lock([], { local: true });
		assert.ok(validateLock(local).some((p) => p.includes('"local": true')));
		assert.deepEqual(validateLock(local, { allowLocal: true }), []);
		const target = join(dir, 'local');
		writeLock(target, local);
		assert.throws(() => readLock(target), /"local": true/);
		assert.equal(readLock(target, { allowLocal: true }).local, true);
	});
});

describe('compareResolved', () => {
	const recorded = lock([entry('0.1/spec.md', A), entry('0.1/schema.json', B)]);
	const resolved = (spec = A, schema = B) => [
		{ repository: REPO, sourcePath: 'specifications/dedl/spec.md', gitBlob: spec },
		{ repository: REPO, sourcePath: 'specifications/dedl/schema.json', gitBlob: schema },
	];

	it('is current when every blob is equal', () => {
		assert.equal(compareResolved(recorded, resolved()).current, true);
	});

	it('reports a changed blob', () => {
		const result = compareResolved(recorded, resolved(C));
		assert.equal(result.current, false);
		assert.deepEqual(result.changed.map((f) => f.sourcePath), ['specifications/dedl/spec.md']);
	});

	it('reports an added and a removed file', () => {
		const result = compareResolved(recorded, [resolved()[0], { repository: REPO, sourcePath: 'specifications/dedl/new.dedl', gitBlob: C }]);
		assert.deepEqual(result.added.map((f) => f.sourcePath), ['specifications/dedl/new.dedl']);
		assert.deepEqual(result.removed.map((f) => f.path), ['0.1/schema.json']);
	});

	it('is never current without a lock', () => {
		assert.equal(compareResolved(null, []).current, false);
	});

	it('compares releases when they are given', () => {
		const withRelease = lock([entry('0.1/spec.md', A), entry('0.1/schema.json', B)], { releases: { [REPO]: { tag: 'v1.0.0', commit: A } } });
		assert.equal(compareResolved(withRelease, resolved(), { [REPO]: { tag: 'v1.0.0', commit: A } }).current, true);
		const moved = compareResolved(withRelease, resolved(), { [REPO]: { tag: 'v1.1.0', commit: B } });
		assert.equal(moved.current, false);
		assert.equal(moved.releasesChanged, true);
		assert.equal(compareResolved(withRelease, resolved(), { [REPO]: null }).current, false);
	});
});

describe('applyWithdrawals', () => {
	it('records a removed file with its source path, time and last commit', () => {
		const next = lock([entry('0.1/spec.md', A)]);
		const removed = entry('0.1/erd.dedl', B, { commit: C });
		const now = new Date('2026-09-27T12:00:00Z');
		const [withdrawal] = applyWithdrawals(next, [removed], now);
		assert.deepEqual(withdrawal, { path: '0.1/erd.dedl', sourcePath: 'specifications/dedl/erd.dedl', withdrawnAt: '2026-09-27T12:00:00.000Z', lastCommit: C, replacedBy: null });
		assert.deepEqual(next.withdrawn, [withdrawal]);
		assert.deepEqual(validateLock(next), []);
	});

	it('sets replacedBy when an added file has the same blob (a rename)', () => {
		const next = lock([entry('0.1/entities.dedl', B)]);
		const [withdrawal] = applyWithdrawals(next, [entry('0.1/erd.dedl', B)]);
		assert.equal(withdrawal.replacedBy, '0.1/entities.dedl');
	});

	it('drops an earlier withdrawal of a path that is present again', () => {
		const next = lock([entry('0.1/erd.dedl', B)], { withdrawn: [{ path: '0.1/erd.dedl', sourcePath: 'x', withdrawnAt: '2026-01-01T00:00:00.000Z', lastCommit: A }] });
		applyWithdrawals(next, []);
		assert.deepEqual(next.withdrawn, []);
	});
});
