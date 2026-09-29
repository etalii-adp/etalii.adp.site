import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogueSourceRecord, type SourceLock } from '../../../src/lib/catalogue/sources.ts';

// etalii.adp spec 002 renames a host's docs/diagrams.md to docs/tools.md; the catalogue's source record follows either.
function lock(path: string, sourcePath: string): SourceLock {
	return {
		procedure: 'refresh-catalogue',
		refreshedAt: '2026-09-29T00:00:00.000Z',
		sourceHeads: {},
		files: [{ path, repository: 'etalii-adp/etalii.adp.ide.standalone', sourcePath, commit: 'a'.repeat(40), gitBlob: 'b'.repeat(40), sha256: 'c'.repeat(64), licence: 'Apache-2.0' }],
		withdrawn: [],
		file: 'sources/catalogue/source.lock.json',
	};
}

test('the catalogue source record is docs/tools.md when the host has it', () => {
	assert.equal(catalogueSourceRecord(lock('standalone/tools.md', 'docs/tools.md'), 'standalone').path, 'docs/tools.md');
});

test('the catalogue source record is docs/diagrams.md while the host has no docs/tools.md', () => {
	const record = catalogueSourceRecord(lock('standalone/diagrams.md', 'docs/diagrams.md'), 'standalone');
	assert.deepEqual(record, { kind: 'git', repository: 'etalii-adp/etalii.adp.ide.standalone', path: 'docs/diagrams.md', revision: 'a'.repeat(40), retrievedAt: '2026-09-29T00:00:00.000Z', licence: 'Apache-2.0' });
});

test('a lock without the host catalogue fails, naming it', () => {
	assert.throws(() => catalogueSourceRecord(lock('intellij/tools.md', 'docs/tools.md'), 'standalone'), /has no entry for standalone\/diagrams\.md/);
});
