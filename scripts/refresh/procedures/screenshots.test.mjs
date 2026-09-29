import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { makePng } from '../fixtures/png.mjs';
import { makeRepo, readFixture } from '../fixtures/repo.mjs';
import { makeSite } from '../fixtures/site.mjs';

const standalone = readFixture(fileURLToPath(new URL('../fixtures/standalone', import.meta.url)));
const README = 'docs/screenshots/readme.md';
const cleanups = [];
after(() => cleanups.forEach((fn) => fn()));

const valid = (seed) => makePng(1600, 900, { seed });
const MAPPING = {
	standalone: { 'mindmap.png': 'freeplane/mindmap', 'timeline.png': 'generic/timeline', 'wardley-map.png': 'wardley/map', 'workspace.png': 'c4/container', 'extra.png': 'uml/class' },
	intellij: {},
	vscode: {},
	eclipse: {},
};

/** The standalone fixture with four valid screenshots and a release, the other three hosts as empty repositories. */
function setup({ mapping = MAPPING } = {}) {
	const source = makeRepo(
		{
			...standalone,
			'docs/screenshots/mindmap.png': valid(1),
			'docs/screenshots/timeline.png': valid(2),
			'docs/screenshots/wardley-map.png': valid(3),
			'docs/screenshots/workspace.png': makePng(1600, 900, { seed: 4, bytes: 600 * 1024 }),
		},
		{ tags: ['v1.0.0'] },
	);
	const others = ['intellij', 'vscode', 'eclipse'].map((host) => [host, makeRepo({ 'README.md': `${host}\n` })]);
	const site = makeSite({ config: { 'screenshots.json': mapping } });
	cleanups.push(source.cleanup, site.cleanup, ...others.map(([, repo]) => repo.cleanup));
	const args = ['--source', `etalii-adp/etalii.adp.ide.standalone=${source.dir}`, ...others.flatMap(([host, repo]) => ['--source', `etalii-adp/etalii.adp.ide.${host}=${repo.dir}`])];
	return { source, site, run: (mode = '--dry-run') => site.refresh(['screenshots', mode, ...args]) };
}

describe('refresh-screenshots', () => {
	let source;
	let site;
	let run;
	before(() => {
		({ source, site, run } = setup());
		const first = run('--no-deliver');
		assert.equal(first.code, 0, first.output);
		site.accept('screenshots');
	});

	it('imports each valid image with its record in screenshots.json', () => {
		const records = site.json('sources/screenshots/standalone/screenshots.json');
		const mindmap = records.find((r) => r.file === 'mindmap.png');
		assert.equal(mindmap.origin, 'freeplane/mindmap');
		assert.equal(mindmap.status, 'accepted');
		assert.equal(mindmap.width, 1600);
		assert.equal(mindmap.height, 900);
		assert.equal(mindmap.budgetBytes, 300 * 1024);
		assert.match(mindmap.expectation, /^The mindmap laid out left-to-right/);
		assert.match(mindmap.document, /mindmap\.adp/);
		assert.equal(records.find((r) => r.file === 'workspace.png').budgetBytes, 1024 * 1024, 'the workspace overview has its own budget');
		assert.ok(site.bytes('sources/screenshots/standalone/mindmap.png').equals(valid(1)));
	});

	it('(h) neither copies nor runs capture.mjs, and copies no readme or catalogue', () => {
		const lock = site.json('sources/screenshots/source.lock.json');
		assert.ok(lock.files.every((f) => f.path.endsWith('.png')), JSON.stringify(lock.files.map((f) => f.path)));
		assert.ok(!site.exists('sources/screenshots/standalone/capture.mjs'));
		assert.deepEqual(lock.inputs.map((i) => i.sourcePath).sort(), ['docs/diagrams.md', README]);
	});

	it('(g) takes nothing from a host without docs/screenshots/, without failing', () => {
		assert.ok(!site.exists('sources/screenshots/vscode'));
		assert.deepEqual(site.json('sources/screenshots/source.lock.json').files.filter((f) => !f.path.startsWith('standalone/')), []);
	});

	it('reports current when nothing changed', () => {
		assert.match(run().stdout, /outcome: current/);
	});

	it('(a) brings in a changed valid image with its expectation, for review', () => {
		source.commit({ 'docs/screenshots/mindmap.png': valid(9) });
		const result = run('--dry-run');
		assert.equal(result.code, 0, result.output);
		const summary = site.json('.refresh/summary.json');
		assert.deepEqual(summary.details.images.map((i) => [i.file, i.change]), [['mindmap.png', 'changed']]);
		const body = site.read('.refresh/pr-body.md');
		assert.match(body, /\| standalone \| `mindmap\.png` \| changed \| \d+ KB \| The mindmap laid out left-to-right/);
		assert.match(body, /## Review notes\n\nCheck each image shows what its expectation says:\n\n- `standalone\/mindmap\.png`: The mindmap/);
	});

	it('(b) rejects a 400 KB image and keeps the previous copy and its lock entry', () => {
		source.commit({ 'docs/screenshots/timeline.png': makePng(1600, 900, { seed: 5, bytes: 400 * 1024 }) });
		const lockBefore = site.json('sources/screenshots/source.lock.json').files.find((f) => f.path === 'standalone/timeline.png');
		const result = run('--no-deliver');
		assert.equal(result.code, 0, result.output);
		const summary = site.json('.refresh/summary.json');
		const rejected = summary.details.rejected.find((r) => r.file === 'timeline.png');
		assert.match(rejected.reason, /^over 300 KB budget \(400 KB\)$/);
		assert.equal(rejected.previousKept, true);
		assert.ok(site.bytes('sources/screenshots/standalone/timeline.png').equals(valid(2)));
		assert.deepEqual(site.json('sources/screenshots/source.lock.json').files.find((f) => f.path === 'standalone/timeline.png'), lockBefore);
		assert.match(site.read('.refresh/pr-body.md'), /- standalone `timeline\.png`: over 300 KB budget \(400 KB\); previous copy kept/);
		const record = site.json('sources/screenshots/standalone/screenshots.json').find((r) => r.file === 'timeline.png');
		assert.equal(record.status, 'rejected');
		site.accept('screenshots');
	});

	it('(c) rejects a wrong size and an image missing from the expectations table, naming the check', () => {
		source.commit({ 'docs/screenshots/wardley-map.png': makePng(1280, 720), 'docs/screenshots/extra.png': valid(6) });
		run();
		const rejected = site.json('.refresh/summary.json').details.rejected;
		assert.equal(rejected.find((r) => r.file === 'wardley-map.png').reason, '1280×720, not the stated 1600×900 viewport');
		assert.equal(rejected.find((r) => r.file === 'extra.png').reason, 'not listed in the images table of docs/screenshots/readme.md');
		assert.equal(rejected.find((r) => r.file === 'extra.png').previousKept, false);
	});

	it('(d) lists a usable tool with no image as a gap, and creates no file for it', () => {
		const { gaps } = site.json('.refresh/summary.json').details;
		const gap = gaps.find((g) => g.origin === 'c4/context');
		assert.deepEqual(gap, { host: 'standalone', origin: 'c4/context', name: 'System Context', state: 'prototype' });
		assert.ok(!gaps.some((g) => g.origin === 'freeplane/mindmap'));
		assert.ok(!gaps.some((g) => g.origin === 'gartner/hypecycle-graph'), 'in progress is not usable');
		assert.match(site.read('.refresh/pr-body.md'), /- standalone: `c4\/context` \(System Context, prototype\)/);
	});

	it('(f) reports the readme’s "Known artefact" note as a source caveat, until the source removes it', () => {
		const body = site.read('.refresh/pr-body.md');
		assert.match(body, /## Source caveats\n\n\*\*Known artefact of that\*\* \(etalii-adp\/etalii\.adp\.ide\.standalone, \[`docs\/screenshots\/readme\.md` at `[0-9a-f]{7}`\]\(https:\/\/github\.com\/etalii-adp\/etalii\.adp\.ide\.standalone\/blob\/[0-9a-f]{40}\/docs\/screenshots\/readme\.md\)\):\n\n> a build that bypassed the sign-in/);
		const readme = standalone[README].toString('utf8').replace(/- \*\*Known artefact of that\*\*:[\s\S]*?let the script sign in\.\n/, '');
		source.commit({ [README]: readme });
		run();
		assert.doesNotMatch(site.read('.refresh/pr-body.md'), /Source caveats/);
	});
});

describe('refresh-screenshots decisions', () => {
	it('(e) asks which tool an unmapped image shows, offering the host’s origins', () => {
		const { site, run } = setup({ mapping: { standalone: { 'mindmap.png': 'freeplane/mindmap', 'timeline.png': 'generic/timeline', 'workspace.png': 'c4/container' }, intellij: {}, vscode: {}, eclipse: {} } });
		const result = run();
		assert.equal(result.code, 3, result.output);
		const decision = site.json('.refresh/decision.json');
		assert.equal(decision.question, 'Which tool does the screenshot wardley-map.png of standalone show?');
		assert.equal(decision.writeTo, 'procedures/config/screenshots.json');
		assert.deepEqual(decision.key, ['standalone', 'wardley-map.png']);
		assert.ok(decision.options.includes('wardley/map'));
		assert.ok(decision.options.includes('none'));
		const answer = site.decide('screenshots', 'wardley/map');
		assert.equal(answer.code, 0, answer.output);
		const again = run();
		assert.equal(again.code, 0, again.output);
		assert.ok(site.json('.refresh/summary.json').files.some((f) => f.path === 'procedures/config/screenshots.json'));
	});
});
