import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { makeRepo, readFixture } from '../fixtures/repo.mjs';
import { makeSite } from '../fixtures/site.mjs';
import { compareSections, headerVersion, schemaVersion } from './disl.mjs';

// The fixture holds etalii.adp's specifications/disl/ and specifications/did/.
const fixture = readFixture(fileURLToPath(new URL('../fixtures/etalii.adp', import.meta.url)));
const SPEC = 'specifications/disl/DISL-specification.md';
const SCHEMA = 'specifications/disl/disl.schema.json';
const DID_SPEC = 'specifications/did/DID-specification.md';
const DID_SCHEMA = 'specifications/did/did.schema.json';
const text = (path) => fixture[path].toString('utf8');
const FILES = ['0.1/DID-specification.md', '0.1/DISL-specification.md', '0.1/did.schema.json', '0.1/disl.schema.json', '0.1/erd.dis', '0.1/timeline.did'];
const cleanups = [];
after(() => cleanups.forEach((fn) => fn()));

function setup(files = fixture) {
	const source = makeRepo(files);
	const site = makeSite();
	cleanups.push(source.cleanup, site.cleanup);
	const arg = `etalii-adp/etalii.adp=${source.dir}`;
	return { source, site, arg, run: (mode = '--dry-run') => site.refresh(['disl', mode, '--source', arg]) };
}

describe('refresh-disl', () => {
	const { source, site, run } = setup();

	it('(a) imports the first time into sources/disl/0.1/, with a lock entry per file', () => {
		const result = run('--no-deliver');
		assert.equal(result.code, 0, result.output);
		const lock = site.json('sources/disl/source.lock.json');
		assert.deepEqual(lock.files.map((f) => f.path).sort(), FILES);
		for (const file of lock.files) {
			assert.equal(file.repository, 'etalii-adp/etalii.adp');
			assert.equal(file.commit, source.head);
			assert.ok(site.bytes(`sources/disl/${file.path}`).equals(fixture[file.sourcePath]), `${file.path} is verbatim`);
		}
		assert.match(site.read('.refresh/pr-body.md'), /Version 0\.1 imported for the first time/);
		assert.match(site.read('.refresh/pr-body.md'), /Read from `specifications\/disl\/` and `specifications\/did\/`/);
		assert.match(site.read('.refresh/pr-body.md'), /\*\*Specification\*\* \(`0\.1\/DISL-specification\.md`\)/);
		assert.equal(site.json('.refresh/summary.json').details.spec, 'DISL-specification.md');
		site.accept('disl');
	});

	it('(b) reports current when nothing changed', () => {
		const result = run();
		assert.equal(result.code, 0, result.output);
		assert.match(result.stdout, /outcome: current/);
	});

	it('(c) reports one changed file and one changed section, with its line count, for one changed sentence', () => {
		source.commit({ [SPEC]: text(SPEC).replace('Identifiers are simple names.', 'Identifiers are short names.') });
		const result = run();
		assert.equal(result.code, 0, result.output);
		const summary = site.json('.refresh/summary.json');
		assert.deepEqual(summary.files, [{ path: 'sources/disl/0.1/DISL-specification.md', change: 'changed' }]);
		assert.deepEqual(summary.details.sections, [{ heading: '2. Foundations', change: 'changed', lines: 2 }]);
		const patch = site.read('.refresh/diff.patch');
		assert.match(patch, /^-Identifiers are simple names\.$/m);
		assert.match(patch, /^\+Identifiers are short names\.$/m);
		assert.equal(patch.split('\n').filter((line) => /^[+-][^+-]/.test(line) && !line.includes('"')).length, 2, 'only that sentence changes outside the lock');
	});

	it('(g) reports the schema and each example as changed or unchanged', () => {
		const { details } = site.json('.refresh/summary.json');
		assert.deepEqual(details.files, [
			{ file: 'DID-specification.md', change: 'unchanged' },
			{ file: 'did.schema.json', change: 'unchanged' },
			{ file: 'disl.schema.json', change: 'unchanged' },
			{ file: 'erd.dis', change: 'unchanged' },
			{ file: 'timeline.did', change: 'unchanged' },
		]);
		source.commit({ 'specifications/disl/erd.dis': '{ "name": "erd", "elements": ["entity"] }\n' });
		run();
		const changed = site.json('.refresh/summary.json').details.files;
		assert.equal(changed.find((f) => f.file === 'erd.dis').change, 'changed');
		assert.equal(changed.find((f) => f.file === 'disl.schema.json').change, 'unchanged');
	});

	it('(f) lists a removed example under withdrawn and under "Withdrawn" in the body', () => {
		source.commit({ 'specifications/did/timeline.did': null });
		const result = run();
		assert.equal(result.code, 0, result.output);
		const summary = site.json('.refresh/summary.json');
		assert.deepEqual(summary.withdrawals.map((w) => w.path), ['0.1/timeline.did']);
		assert.equal(summary.withdrawals[0].sourcePath, 'specifications/did/timeline.did');
		assert.match(site.read('.refresh/pr-body.md'), /## Withdrawn\n\n- `0\.1\/timeline\.did` \(from `specifications\/did\/timeline\.did`/);
		assert.match(site.read('.refresh/diff.patch'), /b\/sources\/disl\/0\.1\/timeline\.did\ndeleted file mode/);
	});
});

describe('refresh-disl versions', () => {
	let env;
	before(() => {
		env = setup();
		assert.equal(env.run('--no-deliver').code, 0);
		env.site.accept('disl');
	});

	it('(e) fails, naming both values, when only one of the two says 0.2', () => {
		env.source.commit({ [SPEC]: text(SPEC).replace('version 0.1', 'version 0.2') });
		const result = env.run();
		assert.equal(result.code, 2, result.output);
		assert.match(result.stdout, /the specification header says 0\.2, the schema \$id says 0\.1/);
	});

	it('(d) publishes a new version beside the old one, leaving 0.1 byte for byte unchanged', () => {
		env.source.commit({
			[SCHEMA]: text(SCHEMA).replace('/schema/0.1/', '/schema/0.2/'),
			[DID_SPEC]: text(DID_SPEC).replace('version 0.1', 'version 0.2'),
			[DID_SCHEMA]: text(DID_SCHEMA).replace('/schema/0.1/', '/schema/0.2/'),
		});
		const before01 = env.site.read('sources/disl/0.1/DISL-specification.md');
		const result = env.run('--no-deliver');
		assert.equal(result.code, 0, result.output);
		const summary = env.site.json('.refresh/summary.json');
		assert.equal(summary.title, 'Refresh DISL and DID reference: publish 0.2 beside 0.1');
		assert.ok(summary.files.every((f) => f.path.startsWith('sources/disl/0.2/')), JSON.stringify(summary.files));
		assert.equal(env.site.read('sources/disl/0.1/DISL-specification.md'), before01);
		assert.ok(env.site.exists('sources/disl/0.2/disl.schema.json'));
		assert.ok(env.site.exists('sources/disl/0.2/did.schema.json'));
		assert.match(env.site.read('.refresh/pr-body.md'), /New version 0\.2 published beside 0\.1/);
		const lock = env.site.json('sources/disl/source.lock.json');
		assert.equal(lock.files.length, 12);
		assert.deepEqual(lock.withdrawn, []);
		env.site.accept('disl');
		const verify = env.site.verify();
		assert.match(verify.stdout, /"local": true/, 'a local run is never valid to commit');
	});

	it('compares the newest version only, so the next run is current', () => {
		assert.match(env.run().stdout, /outcome: current/);
	});
});

describe('refresh-disl when DISL and DID disagree', () => {
	it('(k) fails when DISL and DID name different versions', () => {
		const did = 'specifications/did/did.schema.json';
		const spec = 'specifications/did/DID-specification.md';
		const { run } = setup({ ...fixture, [did]: fixture[did].toString('utf8').replace('/schema/0.1/', '/schema/0.2/'), [spec]: fixture[spec].toString('utf8').replace('version 0.1', 'version 0.2') });
		const result = run();
		assert.equal(result.code, 2, result.output);
		assert.match(result.stdout, /DISL is version 0\.1 and DID is version 0\.2/);
	});

	it('(l) fails, naming the file, when specifications/did/ has no schema', () => {
		const files = { ...fixture };
		delete files['specifications/did/did.schema.json'];
		const result = setup(files).run();
		assert.equal(result.code, 2, result.output);
		assert.match(result.stdout, /specifications\/did\/\* has no did\.schema\.json/);
	});
});

describe('disl helpers', () => {
	it('reads the version from the DISL and DID schema $id', () => {
		assert.equal(schemaVersion(text(SCHEMA), 'disl'), '0.1');
		assert.equal(schemaVersion(text(DID_SCHEMA), 'did'), '0.1');
		assert.equal(schemaVersion(text(DID_SCHEMA), 'disl'), null, 'a DID schema is not a DISL schema');
	});

	it('reads the version from the header and from the schema $id', () => {
		assert.equal(headerVersion(text(SPEC)), '0.1');
		assert.equal(headerVersion('# DISL\n\n| Version | 1.2 |\n\n## 1. Intro\n\nversion 9.9'), '1.2');
	});

	it('compares sections: added, removed and changed', () => {
		const result = compareSections('# T\n\n## A\n\none\n\n## B\n\ntwo\n', '# T\n\n## A\n\none, changed\n\n## C\n\nthree\n');
		assert.deepEqual(result, [
			{ heading: 'A', change: 'changed', lines: 2 },
			{ heading: 'C', change: 'added', lines: 3 },
			{ heading: 'B', change: 'removed', lines: 3 },
		]);
	});
});
