import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import disl from '../procedures/disl.mjs';
import { buildSummary, renderDecisionIssue, renderPrBody, renderTitle } from './summary.mjs';

const BEFORE = '1a2b3c4d'.padEnd(40, '0');
const AFTER = '5d6e7f80'.padEnd(40, '1');
const REPO = 'etalii-adp/etalii.adp';

function sample(overrides = {}) {
	return buildSummary({
		before: { [REPO]: BEFORE },
		after: { [REPO]: AFTER },
		files: [{ path: 'sources/disl/0.1/DISL-specification.md', change: 'changed' }],
		details: { version: '0.1', previousVersion: '0.1', newVersion: false, sections: [{ heading: '2. Foundations', change: 'changed', lines: 2 }], files: [{ file: 'disl.schema.json', change: 'unchanged' }] },
		withdrawals: [],
		caveats: [],
		reviewNotes: [],
		verification: [
			{ step: 'build', status: 'passed', output: '' },
			{ step: 'check', status: 'failed', output: 'broken link: /adp/disl/missing/' },
			{ step: 'sources', status: 'not available', output: '' },
		],
		...overrides,
	});
}

const headings = (body) => body.split('\n').filter((line) => line.startsWith('## ')).map((line) => line.slice(3));

describe('renderPrBody', () => {
	it('renders the sections of contracts/pull-request.md in order, leaving out the optional ones when empty', () => {
		const body = renderPrBody(sample(), { procedure: disl });
		assert.deepEqual(headings(body), ['Source revisions', 'What changed', 'Withdrawn', 'Verification']);
		assert.ok(body.includes('## Withdrawn\n\nNone'));
	});

	it('includes Source caveats and Review notes when present, in their places', () => {
		const body = renderPrBody(
			sample({
				caveats: [{ title: 'Known artefact', repository: 'etalii-adp/etalii.adp.ide.standalone', sourcePath: 'docs/screenshots/readme.md', commit: AFTER, text: 'The committed set shows a developer session marker.' }],
				reviewNotes: ['Check each image shows what its expectation says.'],
				withdrawals: [{ path: '0.1/erd.dis', sourcePath: 'specifications/disl/erd.dis', withdrawnAt: '2026-09-27T00:00:00.000Z', lastCommit: BEFORE, replacedBy: null }],
			}),
			{ procedure: disl },
		);
		assert.deepEqual(headings(body), ['Source revisions', 'What changed', 'Source caveats', 'Withdrawn', 'Verification', 'Review notes']);
		assert.ok(body.includes('> The committed set shows a developer session marker.'));
		assert.ok(body.includes(`https://github.com/etalii-adp/etalii.adp.ide.standalone/blob/${AFTER}/docs/screenshots/readme.md`));
		assert.ok(body.includes('- `0.1/erd.dis` (from `specifications/disl/erd.dis`, last present at `1a2b3c4`)'));
	});

	it('shows short SHAs with commit and compare links', () => {
		const body = renderPrBody(sample(), { procedure: disl });
		assert.ok(body.includes(`| ${REPO} | [\`1a2b3c4\`](https://github.com/${REPO}/commit/${BEFORE}) | [\`5d6e7f8\`](https://github.com/${REPO}/compare/${BEFORE}...${AFTER}) |`));
	});

	it('marks each verification step and puts a failure’s output in a details block', () => {
		const body = renderPrBody(sample(), { procedure: disl });
		assert.ok(body.includes('| Site builds (`npm run build`) | ✅ passed |'));
		assert.ok(body.includes('| Links and accessibility (`npm run check`) | ❌ failed |'));
		assert.ok(body.includes('| Source records (`npm run refresh:verify`) | ⚪ not available |'));
		assert.match(body, /<details><summary><code>npm run check<\/code> output<\/summary>\n\n```text\nbroken link: \/adp\/disl\/missing\/\n```\n\n<\/details>/);
	});

	it('ends with the footer line naming the procedure, the run and the previous scheduled run', () => {
		const local = renderPrBody(sample(), { procedure: disl });
		assert.ok(local.trimEnd().endsWith('---\nOpened by procedure `refresh-disl` (procedures/refresh-disl.md), run local. Previous scheduled run: not checked (local run).'));
		const ci = renderPrBody(sample(), { procedure: disl, runLink: 'https://github.com/o/r/actions/runs/1', previousScheduledRun: null });
		assert.ok(ci.includes('run https://github.com/o/r/actions/runs/1. Previous scheduled run: none in 7 days: check that the Refresh workflow is enabled.'));
		const dated = renderPrBody(sample(), { procedure: disl, previousScheduledRun: '2026-09-27T07:17:00.000Z' });
		assert.ok(dated.includes('Previous scheduled run: 2026-09-27T07:17:00.000Z.'));
	});
});

describe('renderTitle', () => {
	it('reads Refresh <what>: <before7>..<after7>', () => {
		assert.equal(renderTitle(disl, sample()), 'Refresh DISL and DID reference: 1a2b3c4..5d6e7f8');
	});

	it('reads Refresh DISL and DID reference: publish <new> beside <old> for a new version', () => {
		const summary = sample({ details: { version: '0.2', previousVersion: '0.1', newVersion: true, sections: [], files: [] } });
		assert.equal(renderTitle(disl, summary), 'Refresh DISL and DID reference: publish 0.2 beside 0.1');
	});
});

describe('renderDecisionIssue', () => {
	it('states the question, the subject, the options as a checklist and how to answer', () => {
		const body = renderDecisionIssue({
			procedure: 'refresh-catalogue',
			question: 'How should the source state "Experimental" in standalone map to a site state?',
			subject: 'etalii-adp/etalii.adp.ide.standalone docs/tools.md',
			options: ['identified', 'prototype'],
			writeTo: 'procedures/config/states.json',
			key: ['mappings', 'standalone', 'Experimental'],
		});
		assert.ok(body.includes('**Question**: How should the source state "Experimental" in standalone map to a site state?'));
		assert.ok(body.includes('- [ ] `identified`\n- [ ] `prototype`'));
		assert.ok(body.includes('npm run refresh:decide -- catalogue <answer>'));
		assert.ok(body.includes('`mappings → standalone → Experimental` in `procedures/config/states.json`'));
	});

	it('gives the steps of a decision answered by another command, and no refresh:decide', () => {
		const body = renderDecisionIssue({
			procedure: 'refresh-catalogue',
			question: '`neo4j/cypher` is no longer in any source. Renamed to (origin) or withdrawn (reason)?',
			subject: 'src/content/catalogue/redirects.json: neo4j/cypher',
			options: ['rename', 'withdraw'],
			writeTo: 'src/content/catalogue/redirects.json',
			answerWith: ['Run the refresh with --no-deliver.', 'Answer with catalogue:report.'],
		});
		assert.ok(body.includes('1. Run the refresh with --no-deliver.\n2. Answer with catalogue:report.'));
		assert.ok(body.includes('add the entry to `src/content/catalogue/redirects.json`'));
		assert.ok(!body.includes('refresh:decide'));
	});
});
