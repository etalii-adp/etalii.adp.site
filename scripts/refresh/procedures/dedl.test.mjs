import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { makeRepo, readFixture } from '../fixtures/repo.mjs';
import { makeSite } from '../fixtures/site.mjs';
import { compareSections, headerVersion, schemaVersion } from './dedl.mjs';

const fixture = readFixture(fileURLToPath(new URL('../fixtures/etalii.adp', import.meta.url)));
const SPEC = 'specifications/dedl/DEDL-specification.md';
const SCHEMA = 'specifications/dedl/dedl.schema.json';
const text = (path) => fixture[path].toString('utf8');
const cleanups = [];
after(() => cleanups.forEach((fn) => fn()));

function setup() {
	const source = makeRepo(fixture);
	const site = makeSite();
	cleanups.push(source.cleanup, site.cleanup);
	const arg = `etalii-adp/etalii.adp=${source.dir}`;
	return { source, site, arg, run: (mode = '--dry-run') => site.refresh(['dedl', mode, '--source', arg]) };
}

describe('refresh-dedl', () => {
	const { source, site, run } = setup();

	it('(a) imports the first time into sources/dedl/0.1/, with a lock entry per file', () => {
		const result = run('--no-deliver');
		assert.equal(result.code, 0, result.output);
		const lock = site.json('sources/dedl/source.lock.json');
		assert.deepEqual(lock.files.map((f) => f.path), ['0.1/DEDL-specification.md', '0.1/dedl.schema.json', '0.1/erd.dedl', '0.1/timeline.document.json']);
		for (const file of lock.files) {
			assert.equal(file.repository, 'etalii-adp/etalii.adp');
			assert.equal(file.commit, source.head);
			assert.ok(site.bytes(`sources/dedl/${file.path}`).equals(fixture[file.sourcePath]), `${file.path} is verbatim`);
		}
		assert.match(site.read('.refresh/pr-body.md'), /Version 0\.1 imported for the first time/);
		site.accept('dedl');
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
		assert.deepEqual(summary.files, [{ path: 'sources/dedl/0.1/DEDL-specification.md', change: 'changed' }]);
		assert.deepEqual(summary.details.sections, [{ heading: '2. Foundations', change: 'changed', lines: 2 }]);
		const patch = site.read('.refresh/diff.patch');
		assert.match(patch, /^-Identifiers are simple names\.$/m);
		assert.match(patch, /^\+Identifiers are short names\.$/m);
		assert.equal(patch.split('\n').filter((line) => /^[+-][^+-]/.test(line) && !line.includes('"')).length, 2, 'only that sentence changes outside the lock');
	});

	it('(g) reports the schema and each example as changed or unchanged', () => {
		const { details } = site.json('.refresh/summary.json');
		assert.deepEqual(details.files, [
			{ file: 'dedl.schema.json', change: 'unchanged' },
			{ file: 'erd.dedl', change: 'unchanged' },
			{ file: 'timeline.document.json', change: 'unchanged' },
		]);
		source.commit({ 'specifications/dedl/erd.dedl': '{ "name": "erd", "elements": ["entity"] }\n' });
		run();
		const changed = site.json('.refresh/summary.json').details.files;
		assert.equal(changed.find((f) => f.file === 'erd.dedl').change, 'changed');
		assert.equal(changed.find((f) => f.file === 'dedl.schema.json').change, 'unchanged');
	});

	it('(f) lists a removed example under withdrawn and under "Withdrawn" in the body', () => {
		source.commit({ 'specifications/dedl/timeline.document.json': null });
		const result = run();
		assert.equal(result.code, 0, result.output);
		const summary = site.json('.refresh/summary.json');
		assert.deepEqual(summary.withdrawals.map((w) => w.path), ['0.1/timeline.document.json']);
		assert.equal(summary.withdrawals[0].sourcePath, 'specifications/dedl/timeline.document.json');
		assert.match(site.read('.refresh/pr-body.md'), /## Withdrawn\n\n- `0\.1\/timeline\.document\.json` \(from `specifications\/dedl\/timeline\.document\.json`/);
		assert.match(site.read('.refresh/diff.patch'), /b\/sources\/dedl\/0\.1\/timeline\.document\.json\ndeleted file mode/);
	});
});

describe('refresh-dedl versions', () => {
	let env;
	before(() => {
		env = setup();
		assert.equal(env.run('--no-deliver').code, 0);
		env.site.accept('dedl');
	});

	it('(e) fails, naming both values, when only one of the two says 0.2', () => {
		env.source.commit({ [SPEC]: text(SPEC).replace('version 0.1', 'version 0.2') });
		const result = env.run();
		assert.equal(result.code, 2, result.output);
		assert.match(result.stdout, /the specification header says 0\.2, the schema \$id says 0\.1/);
	});

	it('(d) publishes a new version beside the old one, leaving 0.1 byte for byte unchanged', () => {
		env.source.commit({ [SCHEMA]: text(SCHEMA).replace('/schema/0.1/', '/schema/0.2/') });
		const before01 = env.site.read('sources/dedl/0.1/DEDL-specification.md');
		const result = env.run('--no-deliver');
		assert.equal(result.code, 0, result.output);
		const summary = env.site.json('.refresh/summary.json');
		assert.equal(summary.title, 'Refresh DEDL reference: publish 0.2 beside 0.1');
		assert.ok(summary.files.every((f) => f.path.startsWith('sources/dedl/0.2/')), JSON.stringify(summary.files));
		assert.equal(env.site.read('sources/dedl/0.1/DEDL-specification.md'), before01);
		assert.ok(env.site.exists('sources/dedl/0.2/dedl.schema.json'));
		assert.match(env.site.read('.refresh/pr-body.md'), /New version 0\.2 published beside 0\.1/);
		const lock = env.site.json('sources/dedl/source.lock.json');
		assert.equal(lock.files.length, 8);
		assert.deepEqual(lock.withdrawn, []);
		env.site.accept('dedl');
		const verify = env.site.verify();
		assert.match(verify.stdout, /"local": true/, 'a local run is never valid to commit');
	});

	it('compares the newest version only, so the next run is current', () => {
		assert.match(env.run().stdout, /outcome: current/);
	});
});

describe('dedl helpers', () => {
	it('reads the version from the header and from the schema $id', () => {
		assert.equal(headerVersion(text(SPEC)), '0.1');
		assert.equal(headerVersion('# DEDL\n\n| Version | 1.2 |\n\n## 1. Intro\n\nversion 9.9'), '1.2');
		assert.equal(schemaVersion(text(SCHEMA)), '0.1');
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
