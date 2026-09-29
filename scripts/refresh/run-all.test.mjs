import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { makePng } from './fixtures/png.mjs';
import { makeRepo, readFixture } from './fixtures/repo.mjs';
import { makeSite } from './fixtures/site.mjs';

const fixture = (name) => readFixture(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)));
const cleanups = [];
after(() => cleanups.forEach((fn) => fn()));

describe('refresh -- all', () => {
	let result;
	let site;
	let stepSummary;
	before(() => {
		const standalone = makeRepo({ ...fixture('standalone'), 'docs/screenshots/mindmap.png': makePng(1600, 900) }, { tags: ['v1.0.0'] });
		const others = ['intellij', 'vscode', 'eclipse'].map((host) => [host, makeRepo({ 'README.md': `${host}\n` })]);
		site = makeSite({ config: { 'screenshots.json': { standalone: { 'mindmap.png': 'freeplane/mindmap' }, intellij: {}, vscode: {}, eclipse: {} } } });
		const dir = mkdtempSync(join(tmpdir(), 'refresh-step-summary-'));
		stepSummary = join(dir, 'summary.md');
		writeFileSync(stepSummary, '# Earlier step\n');
		cleanups.push(standalone.cleanup, site.cleanup, () => rmSync(dir, { recursive: true, force: true }), ...others.map(([, repo]) => repo.cleanup));
		const args = [
			'--source', `etalii-adp/etalii.adp=${join(tmpdir(), 'refresh-does-not-exist')}`,
			'--source', `etalii-adp/etalii.adp.ide.standalone=${standalone.dir}`,
			...others.flatMap(([host, repo]) => ['--source', `etalii-adp/etalii.adp.ide.${host}=${repo.dir}`]),
		];
		result = site.refresh(['all', '--dry-run', ...args], { GITHUB_STEP_SUMMARY: stepSummary });
	});

	it('fails only the procedure whose source is unreachable, and still runs the others', () => {
		const rows = site.json('.refresh/summary.json').procedures;
		assert.deepEqual(rows.map((r) => [r.procedure, r.outcome]), [
			['refresh-disl', 'failed'],
			['refresh-screenshots', 'delivered'],
			['refresh-catalogue', 'delivered'],
			['refresh-hosts', 'delivered'],
		]);
		assert.match(rows[0].message, /etalii-adp\/etalii\.adp/);
	});

	it('exits with the highest code of the four', () => {
		assert.equal(result.code, 2, result.output);
	});

	it('prints the table with the columns procedure, outcome and pull request or failure', () => {
		assert.match(result.stdout, /\| Procedure \| Outcome \| Pull request or failure \|\n\|---\|---\|---\|\n\| `refresh-disl` \| failed \| .*etalii-adp\/etalii\.adp.* \|/);
		assert.match(result.stdout, /\| `refresh-hosts` \| delivered \| {2}\|/);
	});

	it('appends the table to $GITHUB_STEP_SUMMARY', () => {
		const text = readFileSync(stepSummary, 'utf8');
		assert.ok(text.startsWith('# Earlier step\n'));
		assert.match(text, /## Refresh\n\n\| Procedure \| Outcome \| Pull request or failure \|/);
	});

	it('writes each procedure’s files under .refresh/<short>/', () => {
		for (const short of ['disl', 'screenshots', 'catalogue', 'hosts']) assert.equal(site.json(`.refresh/${short}/summary.json`).procedure, `refresh-${short}`);
		assert.ok(site.read('.refresh/catalogue/pr-body.md').includes('## Source revisions'));
	});
});
