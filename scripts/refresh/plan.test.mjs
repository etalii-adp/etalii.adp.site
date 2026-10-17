import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { ALL, plan } from './plan.mjs';
import { PROCEDURES } from './run.mjs';

describe('plan.mjs (the procedures a refresh.yml run starts)', () => {
	it('runs every procedure, each in its own job, on the schedule', () => {
		assert.deepEqual(plan({ event: 'schedule' }), { procedures: ['screenshots', 'catalogue', 'hosts'] });
	});

	it('expands all into every procedure on workflow_dispatch', () => {
		assert.deepEqual(plan({ event: 'workflow_dispatch', chosen: 'all' }), { procedures: ['screenshots', 'catalogue', 'hosts'] });
	});

	it('lists the procedures run.mjs runs for all', () => {
		assert.deepEqual(ALL, PROCEDURES);
	});

	it('runs the chosen procedure on workflow_dispatch, with or without the refresh- prefix', () => {
		assert.deepEqual(plan({ event: 'workflow_dispatch', chosen: 'refresh-catalogue' }), { procedures: ['catalogue'] });
		assert.deepEqual(plan({ event: 'workflow_dispatch', chosen: 'catalogue' }), { procedures: ['catalogue'] });
		assert.deepEqual(plan({ event: 'workflow_dispatch', chosen: 'hosts' }), { procedures: ['hosts'] });
		assert.deepEqual(plan({ event: 'workflow_dispatch', chosen: '' }), { procedures: ['screenshots', 'catalogue', 'hosts'] });
	});

	it('runs nothing on source-changed from etalii.adp, whose DISL and DID reference no procedure refreshes', () => {
		assert.deepEqual(plan({ event: 'repository_dispatch', source: 'etalii-adp/etalii.adp' }), { procedures: [] });
	});

	it('runs the host procedures on source-changed from an IDE host', () => {
		assert.deepEqual(plan({ event: 'repository_dispatch', source: 'etalii-adp/etalii.adp.ide.standalone' }), { procedures: ['screenshots', 'catalogue', 'hosts'] });
	});

	it('refuses a source-changed event from an unknown source', () => {
		assert.match(plan({ event: 'repository_dispatch', source: 'someone/else' }).error, /names no source of a refresh procedure: 'someone\/else'/);
	});

	it('is what refresh.yml offers and calls', () => {
		const workflow = readFileSync(new URL('../../.github/workflows/refresh.yml', import.meta.url), 'utf8');
		assert.match(workflow, /options: \[all, screenshots, catalogue, hosts\]/);
		assert.match(workflow, /run: node scripts\/refresh\/plan\.mjs/);
	});
});
