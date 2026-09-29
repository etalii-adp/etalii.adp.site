import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { makeRepo } from './fixtures/repo.mjs';
import { makeSite } from './fixtures/site.mjs';

const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));
const env = { REFRESH_PROCEDURES_DIR: join(fixtures, 'procedures') };
const cleanups = [];
after(() => cleanups.forEach((fn) => fn()));

function setup() {
	const source = makeRepo({ 'data/a.txt': 'alpha\n', 'data/b.txt': 'beta\n', 'other/c.txt': 'not watched\n' });
	const site = makeSite();
	cleanups.push(source.cleanup, site.cleanup);
	return { source, site, arg: `example/stub-source=${source.dir}` };
}

describe('run.mjs', () => {
	let source;
	let site;
	let arg;
	before(() => {
		({ source, site, arg } = setup());
		const first = site.refresh(['stub', '--no-deliver', '--source', arg], env);
		assert.equal(first.code, 0, first.output);
		site.accept('stub');
	});

	it('reports current (exit 0) when the source has not changed', () => {
		const run = site.refresh(['stub', '--dry-run', '--source', arg], env);
		assert.equal(run.code, 0, run.output);
		assert.match(run.stdout, /outcome: current/);
		assert.equal(site.json('.refresh/summary.json').outcome, 'current');
	});

	it('ignores a commit outside the watched paths', () => {
		source.commit({ 'other/c.txt': 'still not watched\n' });
		const run = site.refresh(['stub', '--dry-run', '--source', arg], env);
		assert.match(run.stdout, /outcome: current/);
	});

	it('delivers a changed file, writing summary.json and pr-body.md, with one line per stage', () => {
		source.commit({ 'data/a.txt': 'alpha, changed\n' });
		const run = site.refresh(['stub', '--dry-run', '--source', arg], env);
		assert.equal(run.code, 0, run.output);
		for (const stage of ['resolve', 'fetch', 'apply', 'verify', 'deliver']) assert.match(run.stdout, new RegExp(`^${stage}: `, 'm'));
		assert.match(run.stdout, /^outcome: delivered$/m);
		const summary = site.json('.refresh/summary.json');
		assert.equal(summary.outcome, 'delivered');
		assert.deepEqual(summary.files, [{ path: 'sources/stub/a.txt', change: 'changed' }]);
		assert.ok(site.read('.refresh/pr-body.md').includes('## Source revisions'));
		assert.ok(site.read('.refresh/diff.patch').includes('+alpha, changed'));
		assert.equal(site.read('sources/stub/a.txt'), 'alpha\n', 'a dry run leaves the checkout untouched');
	});

	it('leaves out a changed mapping file that the procedure does not read', () => {
		const states = join(site.dir, 'procedures', 'config', 'states.json');
		const original = readFileSync(states, 'utf8');
		writeFileSync(states, original.replace('"To-do": "planned"', '"To-do": "idea"'));
		try {
			const run = site.refresh(['stub', '--dry-run', '--source', arg], env);
			assert.equal(run.code, 0, run.output);
			assert.ok(site.json('.refresh/summary.json').files.every((f) => !f.path.startsWith('procedures/')));
			assert.doesNotMatch(site.read('.refresh/diff.patch'), /procedures\/config/);
		} finally {
			writeFileSync(states, original);
		}
	});

	it('works on a base that has no procedures/config/ yet', () => {
		const bare = setup();
		bare.site.commit({ 'procedures/config/states.json': null, 'procedures/config/screenshots.json': null }, 'No mappings yet');
		const run = bare.site.refresh(['stub', '--dry-run', '--source', bare.arg], env);
		assert.equal(run.code, 0, run.output);
		assert.match(run.stdout, /outcome: delivered/);
	});

	it('fails (exit 2) and names the source when it cannot be reached, changing nothing', () => {
		const lockBefore = site.read('sources/stub/source.lock.json');
		const missing = join(tmpdir(), 'refresh-does-not-exist');
		const run = site.refresh(['stub', '--dry-run', '--source', `example/stub-source=${missing}`], env);
		assert.equal(run.code, 2, run.output);
		assert.match(run.stdout, /example\/stub-source/);
		assert.match(run.stdout, /outcome: failed/);
		assert.equal(site.read('sources/stub/source.lock.json'), lockBefore);
	});

	it('raises a decision (exit 3) into .refresh/decision.json', () => {
		const run = site.refresh(['stub', '--dry-run', '--source', arg], { ...env, STUB_MODE: 'decision' });
		assert.equal(run.code, 3, run.output);
		assert.match(run.stdout, /outcome: needs-decision/);
		const decision = site.json('.refresh/decision.json');
		assert.deepEqual(Object.keys(decision).sort(), ['key', 'options', 'procedure', 'question', 'subject', 'writeTo']);
		assert.equal(decision.procedure, 'refresh-stub');
	});

	it('runs the site steps after Apply and after Verify, delivering only its own site files and the answer it carries', () => {
		source.commit({ 'data/b.txt': 'beta, changed\n' });
		site.commit({ 'site/answer.json': '[]\n' }, 'An empty answer file');
		writeFileSync(join(site.dir, 'site', 'answer.json'), '["answered"]\n');
		try {
			const run = site.refresh(['stub', '--dry-run', '--source', arg], { ...env, STUB_MODE: 'site' });
			assert.equal(run.code, 0, run.output);
			assert.match(run.stdout, /^apply: stub site step$/m);
			const body = site.read('.refresh/pr-body.md');
			assert.ok(body.indexOf('## What changed') < body.indexOf('## Stub report'), body);
			assert.match(body, /## Stub after verify\n\nwrite=false/, 'a dry run never writes after Verify');
			const files = site.json('.refresh/summary.json').files;
			assert.deepEqual(files.filter((f) => f.path.startsWith('site/')), [
				{ path: 'site/answer.json', change: 'changed' },
				{ path: 'site/owned.json', change: 'added' },
			]);
			const diff = site.read('.refresh/diff.patch');
			assert.match(diff, /\+\["owned"\]/);
			assert.match(diff, /\+\["answered"\]/);
			assert.doesNotMatch(diff, /not owned/);
			assert.ok(!site.exists('site/owned.json'), 'a dry run leaves the checkout untouched');
		} finally {
			site.git(['checkout', '--', 'site/answer.json']);
		}
	});

	it('raises a decision from the step after Apply, which refresh:decide refuses with its own steps', () => {
		const run = site.refresh(['stub', '--dry-run', '--source', arg], { ...env, STUB_MODE: 'site-decision' });
		assert.equal(run.code, 3, run.output);
		assert.deepEqual(site.json('.refresh/decision.json').answerWith, ['Run `answer --rename`.', 'Run the refresh again.']);
		const decide = site.decide('stub', 'rename');
		assert.equal(decide.code, 1);
		assert.match(decide.stderr, /not answered with refresh:decide:\n1\. Run `answer --rename`\.\n2\. Run the refresh again\./);
	});

	it('accepts the refresh- prefix', () => {
		const run = site.refresh(['refresh-stub', '--dry-run', '--source', arg], env);
		assert.notEqual(run.code, 2, run.output);
		assert.match(run.stdout, /outcome: (current|delivered)/);
	});

	it('fails on an unknown id, listing the valid ids', () => {
		const run = site.refresh(['nonsense'], env);
		assert.equal(run.code, 2);
		assert.match(run.stdout, /valid ids are disl, screenshots, catalogue, hosts, all/);
	});

	it('accepts a procedure name with or without the prefix', async () => {
		const { loadProcedure, parseArgs } = await import('./run.mjs');
		assert.equal(parseArgs(['disl', '--dry-run']).id, 'disl');
		assert.equal(parseArgs(['refresh-disl']).id, 'disl');
		assert.equal((await loadProcedure('refresh-disl')).id, 'refresh-disl');
	});

	it('refuses to deliver a run that reads a local --source', () => {
		const run = site.refresh(['stub', '--source', arg], env);
		assert.equal(run.code, 2);
		assert.match(run.stdout, /can never be delivered/);
	});

	it('removes its temporary worktree after success and after failure', () => {
		const list = site.git(['worktree', 'list']);
		assert.equal(list.split('\n').length, 1, list);
	});
});

describe('automatic runs and the "Refresh blocked" issue', () => {
	function withStub() {
		const log = join(mkdtempSync(join(tmpdir(), 'refresh-gh-')), 'calls.jsonl');
		cleanups.push(() => rmSync(join(log, '..'), { recursive: true, force: true }));
		const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []);
		return { calls, env: { ...env, GITHUB_ACTIONS: 'true', REFRESH_GITHUB_MODULE: join(fixtures, 'github-stub.mjs'), STUB_GITHUB_LOG: log } };
	}

	it('opens or updates the issue on needs-decision in CI', () => {
		const { site, arg } = setup();
		const stub = withStub();
		const run = site.refresh(['stub', '--no-deliver', '--source', arg], { ...stub.env, STUB_MODE: 'decision' });
		assert.equal(run.code, 3, run.output);
		const upsert = stub.calls().find((c) => c.call === 'upsertIssue');
		assert.ok(upsert, run.output);
		assert.equal(upsert.args[0], 'Refresh blocked: refresh-stub');
		assert.match(upsert.args[1], /\*\*Question\*\*/);
		assert.deepEqual(upsert.args[2], ['refresh-blocked']);
	});

	it('closes the issue once a run no longer needs the decision', () => {
		const { site, arg } = setup();
		const stub = withStub();
		const run = site.refresh(['stub', '--no-deliver', '--source', arg], stub.env);
		assert.equal(run.code, 0, run.output);
		const close = stub.calls().find((c) => c.call === 'closeIssue');
		assert.ok(close, run.output);
		assert.equal(close.args[0], 'Refresh blocked: refresh-stub');
		assert.match(close.args[1], /^Resolved: run .* no longer needs a decision\.$/);
	});

	it('never touches issues in an interactive run', () => {
		const { site, arg } = setup();
		const stub = withStub();
		site.refresh(['stub', '--no-deliver', '--source', arg], { ...stub.env, GITHUB_ACTIONS: '', STUB_MODE: 'decision' });
		assert.deepEqual(stub.calls(), []);
	});
});
