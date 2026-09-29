import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parsePaths, plan } from './plan.mjs';

describe('plan.mjs (the procedures a refresh.yml run starts)', () => {
	it('runs all on the schedule', () => {
		assert.deepEqual(plan({ event: 'schedule' }), { procedures: ['all'] });
	});

	it('runs the chosen procedure on workflow_dispatch, with dedl as the disl procedure', () => {
		assert.deepEqual(plan({ event: 'workflow_dispatch', chosen: 'dedl' }), { procedures: ['disl'] });
		assert.deepEqual(plan({ event: 'workflow_dispatch', chosen: 'disl' }), { procedures: ['disl'] });
		assert.deepEqual(plan({ event: 'workflow_dispatch', chosen: 'catalogue' }), { procedures: ['catalogue'] });
		assert.deepEqual(plan({ event: 'workflow_dispatch', chosen: '' }), { procedures: ['all'] });
	});

	it('runs the reference procedure on source-changed from etalii.adp without paths', () => {
		assert.deepEqual(plan({ event: 'repository_dispatch', source: 'etalii-adp/etalii.adp', paths: null }), { procedures: ['disl'] });
	});

	for (const path of ['specifications/dedl/DEDL-specification.md', 'specifications/disl/erd.disl', 'specifications/did/timeline.did']) {
		it(`runs the reference procedure for a change to ${path}`, () => {
			assert.deepEqual(plan({ event: 'repository_dispatch', source: 'etalii-adp/etalii.adp', paths: ['README.md', path] }), { procedures: ['disl'] });
		});
	}

	it('runs nothing for an etalii.adp change outside the specification folders', () => {
		assert.deepEqual(plan({ event: 'repository_dispatch', source: 'etalii-adp/etalii.adp', paths: ['docs/terminology.md', 'specifications/desl/DESL-specification.md'] }), { procedures: [] });
	});

	it('runs the host procedures on source-changed from an IDE host', () => {
		assert.deepEqual(plan({ event: 'repository_dispatch', source: 'etalii-adp/etalii.adp.ide.standalone' }), { procedures: ['screenshots', 'catalogue', 'hosts'] });
	});

	it('refuses a source-changed event from an unknown source', () => {
		assert.match(plan({ event: 'repository_dispatch', source: 'someone/else' }).error, /names no source of a refresh procedure: 'someone\/else'/);
	});

	it('reads the payload paths as the workflow passes them', () => {
		assert.equal(parsePaths(''), null);
		assert.equal(parsePaths('null'), null);
		assert.deepEqual(parsePaths('["specifications/disl/erd.disl"]'), ['specifications/disl/erd.disl']);
	});

	it('is what refresh.yml offers and calls', () => {
		const workflow = readFileSync(new URL('../../.github/workflows/refresh.yml', import.meta.url), 'utf8');
		assert.match(workflow, /options: \[all, disl, screenshots, catalogue, hosts, dedl\]/);
		assert.match(workflow, /run: node scripts\/refresh\/plan\.mjs/);
	});
});
