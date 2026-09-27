import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { assembleCatalogue } from '../../../src/lib/catalogue/assemble.ts';
import { main } from '../../../scripts/catalogue/sync-notion.ts';
import { fixtureOptions } from './helpers.ts';

const hostOptions = ['⛔ Not planned', '💡 Identified', '📝 Specified', '⏸️ To-do', '🛠️ Work-in-progress', '⚗️ Prototype', '✅ Implemented'];

/** A fetch that answers the data source read and records every call. */
function fakeNotion(options: string[] = hostOptions) {
	const calls: { method: string; url: string; body?: unknown }[] = [];
	const fetchImpl = (async (url: string, init: RequestInit = {}) => {
		const method = init.method ?? 'GET';
		calls.push({ method, url, body: init.body ? JSON.parse(init.body as string) : undefined });
		if (method === 'GET') {
			const select = { type: 'select', select: { options: options.map((name) => ({ name })) } };
			return Response.json({ object: 'data_source', properties: { Standalone: select, IntelliJ: select, 'VS Code': select, Eclipse: select } });
		}
		return Response.json({ object: 'page' });
	}) as typeof fetch;
	return { calls, fetchImpl };
}

async function sync(args: string[], overrides: Record<string, unknown> = {}, options = hostOptions) {
	const inputs = fixtureOptions(overrides);
	const notion = fakeNotion(options);
	const reportDir = mkdtempSync(join(tmpdir(), 'adp-refresh-'));
	const lines: string[] = [];
	const log = console.log;
	const error = console.error;
	console.log = (...parts: unknown[]) => lines.push(parts.join(' '));
	console.error = console.log;
	process.env.NOTION_TOKEN = 'test-token';
	try {
		const code = await main(args, { ...inputs, fetch: notion.fetchImpl, reportDir, delayMs: 0 });
		return { code, out: lines.join('\n'), calls: notion.calls, inputs, reportDir };
	} finally {
		console.log = log;
		console.error = error;
		delete process.env.NOTION_TOKEN;
	}
}

test('--dry-run reports the difference and sends no PATCH', async () => {
	const { code, out, calls, reportDir } = await sync(['--dry-run']);
	assert.equal(code, 0);
	assert.match(out, /wardley\/map · standalone · ⚗️ Prototype → ✅ Implemented/);
	assert.deepEqual(calls.filter((call) => call.method === 'PATCH'), []);
	assert.match(readFileSync(join(reportDir, 'catalogue-notion-sync.md'), 'utf8'), /Dry run/);
});

test('without --dry-run it sets only that select, then the snapshot agrees', async () => {
	const { code, calls, inputs } = await sync([]);
	assert.equal(code, 0);
	const patches = calls.filter((call) => call.method === 'PATCH');
	assert.equal(patches.length, 1);
	assert.equal(patches[0].url, 'https://api.notion.com/v1/pages/1a2b3c4d-0000-4000-8000-000000000002');
	assert.deepEqual(patches[0].body, { properties: { Standalone: { select: { name: '✅ Implemented' } } } });

	const after = assembleCatalogue(inputs).designers.find((designer) => designer.origin === 'wardley/map')!;
	assert.equal(after.hosts.standalone.notionDiffers, null);
});

test('it never writes a host that has no catalogue', async () => {
	const { calls } = await sync([]);
	for (const call of calls.filter((c) => c.method === 'PATCH')) {
		assert.deepEqual(Object.keys((call.body as { properties: object }).properties), ['Standalone']);
	}
});

test('an option missing from the Notion select is reported and skipped', async () => {
	const { code, out, calls } = await sync([], {}, hostOptions.filter((name) => name !== '✅ Implemented'));
	assert.equal(code, 0);
	assert.match(out, /wardley\/map · standalone: the Notion column "Standalone" has no option for "Implemented"; skipped/);
	assert.deepEqual(calls.filter((call) => call.method === 'PATCH'), []);
});

test('it refuses to run when the catalogue does not assemble', async () => {
	const redirect = { from: 'wardley/map', to: null, reason: 'Test', since: '2026-09-27', source: { kind: 'notion', page: '1a2b3c4d-0000-4000-8000-000000000002', revision: '2026-09-26T18:02:00.000Z', retrievedAt: '2026-09-27T00:30:00Z', licence: 'Apache-2.0' } };
	const { code, out, calls } = await sync([], { 'redirects.json': [redirect] });
	assert.equal(code, 1);
	assert.match(out, /does not assemble/);
	assert.deepEqual(calls, []);
});
