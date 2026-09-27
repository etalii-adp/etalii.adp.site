import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PROCEDURES, loadProcedure } from '../run.mjs';
import { CATALOGUE_SITE_FILES, REDIRECTS_FILE, reportDecision } from './catalogue-site.mjs';
import { NeedsDecision } from './decision.mjs';

describe('the catalogue files as refresh targets', () => {
	it('are changed by refresh-catalogue alone, which carries the redirects answer into its run', async () => {
		const owners = new Map();
		for (const shortId of PROCEDURES) {
			const procedure = await loadProcedure(shortId);
			for (const path of procedure.siteFiles ?? []) owners.set(path, [...(owners.get(path) ?? []), procedure.id]);
			for (const path of procedure.carriedFiles ?? []) assert.ok(procedure.siteFiles?.includes(path), `${procedure.id} carries ${path}, which is not one of its site files`);
		}
		for (const path of CATALOGUE_SITE_FILES) assert.deepEqual(owners.get(path), ['refresh-catalogue'], path);
		assert.deepEqual((await loadProcedure('catalogue')).carriedFiles, [REDIRECTS_FILE]);
	});

	it('are run through by the screenshots refresh only for its report', async () => {
		const screenshots = await loadProcedure('screenshots');
		assert.equal(typeof screenshots.afterApply, 'function');
		assert.equal(screenshots.siteFiles, undefined);
		assert.equal(screenshots.afterVerify, undefined);
	});
});

describe('reportDecision', () => {
	const output = [
		'> etalii-adp-site@ catalogue:report',
		'`neo4j/cypher` is no longer in any source. Renamed to (origin) or withdrawn (reason)? Notion says it was renamed to neo4j/graph.',
		'  npm run catalogue:report -- --rename neo4j/cypher=neo4j/graph',
		'  npm run catalogue:report -- --withdraw neo4j/cypher --reason "<why>"',
	].join('\n');

	it('asks catalogue:report’s question, with its own commands as the answer', () => {
		const error = reportDecision(output);
		assert.ok(error instanceof NeedsDecision);
		const { question, subject, options, writeTo, key, answerWith } = error.decision;
		assert.match(question, /^`neo4j\/cypher` is no longer in any source\./);
		assert.equal(subject, `${REDIRECTS_FILE}: neo4j/cypher`);
		assert.deepEqual(options, ['rename', 'withdraw']);
		assert.equal(writeTo, REDIRECTS_FILE);
		assert.equal(key, undefined);
		assert.match(answerWith[0], /npm run refresh -- catalogue --no-deliver/);
		assert.match(answerWith[1], /`npm run catalogue:report -- --rename neo4j\/cypher=neo4j\/graph` or `npm run catalogue:report -- --withdraw neo4j\/cypher --reason "<why>"`/);
		assert.match(answerWith[2], /npm run refresh -- catalogue`/);
	});

	it('still asks when the output has no recognisable question', () => {
		const { question, answerWith } = reportDecision('something else', 'refresh-screenshots').decision;
		assert.match(question, /no longer in any source/);
		assert.match(answerWith[0], /npm run refresh -- screenshots --no-deliver/);
		assert.match(answerWith[1], /--rename <old>=<new>/);
	});
});
