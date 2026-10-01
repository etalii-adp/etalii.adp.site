import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { makeRepo } from '../fixtures/repo.mjs';
import { makeSite } from '../fixtures/site.mjs';

const CATALOGUE = 'docs/tools.md';
const table = (state) => `<table><tr><th>State</th><th>Origin</th><th>Diagram</th><th>Theory</th><th>Example</th></tr>\n<tr><td>${state}</td><td><code>generic/timeline</code></td><td>Timeline</td><td>—</td><td>—</td></tr></table>\n`;
const cleanups = [];
after(() => cleanups.forEach((fn) => fn()));

describe('refresh-hosts', () => {
	let repos;
	let site;
	let run;
	const host = (name) => site.json('sources/hosts/hosts.json').find((h) => h.host === name);
	before(() => {
		repos = {
			standalone: makeRepo({ [CATALOGUE]: table('✅&nbsp;Implemented') }, { tags: ['v1.0.0'] }),
			intellij: makeRepo({ 'README.md': 'intellij\n' }),
			vscode: makeRepo({ 'README.md': 'vscode: agent configuration only\n' }),
			eclipse: makeRepo({ 'README.md': 'eclipse\n' }),
		};
		site = makeSite();
		cleanups.push(site.cleanup, ...Object.values(repos).map((r) => r.cleanup));
		const args = Object.entries(repos).flatMap(([name, repo]) => ['--source', `etalii-adp/etalii.adp.ide.${name}=${repo.dir}`]);
		run = (mode = '--no-deliver') => site.refresh(['hosts', mode, ...args]);
		const first = run();
		assert.equal(first.code, 0, first.output);
		site.accept('hosts');
	});

	it('(a) derives planned for a host without docs/tools.md, and available for a released usable tool', () => {
		assert.equal(host('vscode').state, 'planned');
		assert.equal(host('vscode').facts.catalogueCommit, null);
		assert.equal(host('vscode').link, 'https://github.com/etalii-adp/etalii.adp.ide.vscode');
		assert.equal(host('standalone').state, 'available');
		assert.equal(site.json('sources/hosts/source.lock.json').files.length, 0);
		assert.deepEqual(site.json('sources/hosts/source.lock.json').derived.map((d) => d.path), ['hosts.json']);
	});

	it('reports current when no catalogue or release changed', () => {
		assert.match(run('--dry-run').stdout, /outcome: current/);
	});

	it('(b, d) derives in progress for a first Prototype tool without a release, with its facts, old → new in the body', () => {
		repos.vscode.commit({ [CATALOGUE]: table('⚗️&nbsp;Prototype') });
		const result = run();
		assert.equal(result.code, 0, result.output);
		assert.equal(host('vscode').state, 'in progress');
		assert.deepEqual(host('vscode').facts, { catalogueCommit: repos.vscode.head, usableTools: 1, toolsInProgress: 1, latestRelease: null, developHead: repos.vscode.head });
		assert.match(site.read('.refresh/pr-body.md'), /\| vscode \| planned → in progress \| 1 \| 1 \| none \| `[0-9a-f]{7}` \|/);
		site.accept('hosts');
	});

	it('(c) derives available once a release has the tool as Prototype, linking the release', () => {
		repos.vscode.tag('v0.1.0');
		const result = run();
		assert.equal(result.code, 0, result.output);
		assert.equal(host('vscode').state, 'available');
		assert.deepEqual(host('vscode').facts.latestRelease, { tag: 'v0.1.0', commit: repos.vscode.head });
		assert.equal(host('vscode').link, 'https://github.com/etalii-adp/etalii.adp.ide.vscode/releases/tag/v0.1.0');
		assert.match(site.read('.refresh/pr-body.md'), /\| vscode \| in progress → available \| 1 \| 1 \| v0\.1\.0/);
	});
});
