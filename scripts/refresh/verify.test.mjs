import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { hashBytes } from './lib/lock.mjs';

const script = fileURLToPath(new URL('./verify.mjs', import.meta.url));
const roots = [];
after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

const SHA = 'a'.repeat(40);
const SPEC = '# DISL\n';

/** A site root with sources/disl/ holding one file and its lock, after `change` has had its way with both. */
function makeRoot(change = () => {}) {
	const root = mkdtempSync(join(tmpdir(), 'refresh-verify-'));
	roots.push(root);
	const files = { 'sources/.gitkeep': '', 'sources/disl/0.1/DISL-specification.md': SPEC };
	const lock = {
		procedure: 'refresh-disl',
		refreshedAt: '2026-09-27T00:00:00.000Z',
		sourceHeads: { 'etalii-adp/etalii.adp': SHA },
		files: [{ path: '0.1/DISL-specification.md', repository: 'etalii-adp/etalii.adp', sourcePath: 'specifications/disl/DISL-specification.md', commit: SHA, gitBlob: SHA, sha256: hashBytes(SPEC), licence: 'unstated' }],
		withdrawn: [],
	};
	change({ files, lock });
	files['sources/disl/source.lock.json'] = `${JSON.stringify(lock, null, 2)}\n`;
	for (const [path, content] of Object.entries(files)) {
		if (content === null) continue;
		mkdirSync(dirname(join(root, path)), { recursive: true });
		writeFileSync(join(root, path), content);
	}
	return root;
}

function verify(root) {
	const run = spawnSync(process.execPath, [script, '--root', root], { encoding: 'utf8', windowsHide: true });
	return { code: run.status, lines: run.stdout.trim().split('\n').filter((line) => !line.startsWith('refresh:verify:')) };
}

describe('refresh:verify', () => {
	it('passes on an empty sources/', () => {
		const root = mkdtempSync(join(tmpdir(), 'refresh-verify-'));
		roots.push(root);
		mkdirSync(join(root, 'sources'));
		writeFileSync(join(root, 'sources', '.gitkeep'), '');
		assert.equal(verify(root).code, 0);
	});

	it('passes when every file matches its lock', () => {
		const result = verify(makeRoot());
		assert.equal(result.code, 0, result.lines.join('\n'));
	});

	const cases = [
		['an unlisted file', ({ files }) => (files['sources/disl/0.1/extra.disl'] = '{}'), /0\.1\/extra\.disl: not listed in the lock/],
		['a missing file', ({ files }) => (files['sources/disl/0.1/DISL-specification.md'] = null), /DISL-specification\.md: listed in the lock but missing/],
		['a SHA-256 mismatch', ({ files }) => (files['sources/disl/0.1/DISL-specification.md'] = '# DISL, edited by hand\n'), /SHA-256 differs from the lock/],
		['"local": true', ({ lock }) => (lock.local = true), /"local": true/],
		['a commit that is not 40 hex characters', ({ lock }) => (lock.files[0].commit = 'abc1234'), /commit "abc1234" is not 40 hexadecimal characters/],
		['a repository that is not a declared source', ({ lock }) => (lock.files[0].repository = 'someone/else'), /repository someone\/else is not a declared source of refresh-disl/],
	];
	for (const [name, change, expected] of cases) {
		it(`fails on ${name}, with one line for it`, () => {
			const result = verify(makeRoot(change));
			assert.equal(result.code, 1);
			assert.equal(result.lines.length, 1, result.lines.join('\n'));
			assert.match(result.lines[0], expected);
		});
	}

	describe('with a build output folder', () => {
		const page = (metas) => `<!doctype html><html><head><title>t</title>${metas}</head><body></body></html>`;
		const built = (html) => ({ files }) => {
			files['package.json'] = JSON.stringify({ adp: { out: 'dist' } });
			files['dist/disl/index.html'] = html;
		};

		it('passes when every adp:source resolves to a lock entry', () => {
			const result = verify(makeRoot(built(page(`<meta name="adp:sourced" content="true"><meta name="adp:source" content="etalii-adp/etalii.adp@${SHA}:specifications/disl/DISL-specification.md">`))));
			assert.equal(result.code, 0, result.lines.join('\n'));
		});

		it('fails on an adp:source that points to no lock entry', () => {
			const stale = 'b'.repeat(40);
			const result = verify(makeRoot(built(page(`<meta name="adp:sourced" content="true"><meta name="adp:source" content="etalii-adp/etalii.adp@${stale}:specifications/disl/DISL-specification.md">`))));
			assert.equal(result.code, 1);
			assert.deepEqual(result.lines.length, 1);
			assert.match(result.lines[0], /dist\/disl\/index\.html: adp:source ".*" points to no lock entry/);
		});

		it('fails on an adp:sourced page with no adp:source', () => {
			const result = verify(makeRoot(built(page('<meta name="adp:sourced" content="true">'))));
			assert.equal(result.code, 1);
			assert.match(result.lines[0], /built from sources\/ but has no adp:source meta/);
		});
	});
});
