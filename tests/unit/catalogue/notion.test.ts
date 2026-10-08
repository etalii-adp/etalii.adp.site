import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { columnIn, notionColumnNames, notionColumns, pagesFromExport, parseNotionPages, type NotionPage } from '../../../src/lib/catalogue/notion-api.ts';
import { notionDataSource } from '../../../src/lib/catalogue/notion-snapshot.ts';
import { queryAll } from '../../../scripts/catalogue/notion.ts';
import { fixturePages, fixtures } from './helpers.ts';

const notionFixtures = join(fixtures, 'notion');

/** The site-owned files of src/content/catalogue with an empty Notion snapshot, whatever the committed one holds. */
function content(): string {
	const dir = mkdtempSync(join(tmpdir(), 'adp-notion-'));
	cpSync('src/content/catalogue', dir, { recursive: true });
	writeFileSync(join(dir, 'notion.json'), JSON.stringify({ retrievedAt: null, rows: [] }, null, 2));
	return dir;
}

function run(args: string[], env: Record<string, string | undefined> = {}) {
	const result = spawnSync(process.execPath, ['scripts/catalogue/notion.ts', ...args], { encoding: 'utf8', env: { ...process.env, NOTION_TOKEN: undefined, ...env } });
	return { code: result.status, out: result.stdout + result.stderr };
}

const read = (dir: string, file: string) => JSON.parse(readFileSync(join(dir, file), 'utf8'));

test('--fixture writes notion.json sorted by origin and adds unknown focus areas', () => {
	const dir = content();
	const { code, out } = run(['--fixture', notionFixtures, '--content-dir', dir]);
	assert.equal(code, 0, out);
	const snapshot = read(dir, 'notion.json');
	assert.deepEqual(
		snapshot.rows.map((row: { origin: string }) => row.origin),
		['freeplane/mindmap', 'jgraph/drawio', 'neo4j/cypher', 'rdf/turtle', 'wardley/map'],
	);
	assert.match(snapshot.retrievedAt, /^\d{4}-\d{2}-\d{2}T/);
	const mindmap = snapshot.rows[0];
	assert.equal(mindmap.hosts.intellij, '✅ Implemented');
	assert.deepEqual(mindmap.focusAreas, ['Knowledge and semantics', 'Clarity in textual data']);
	assert.match(out, /Untagged row.*no Origin/);

	const areas = read(dir, 'focus-areas.json');
	const added = areas.at(-1);
	assert.equal(areas.length, 9);
	assert.deepEqual({ slug: added.slug, name: added.name, problem: added.problem, order: added.order, kind: added.source.kind }, {
		slug: 'diagramming-practice',
		name: 'Diagramming practice',
		problem: '',
		order: 9,
		kind: 'notion',
	});
	assert.match(out, /new focus area "Diagramming practice"/);
});

test('a second run changes nothing', () => {
	const dir = content();
	run(['--fixture', notionFixtures, '--content-dir', dir]);
	const first = [readFileSync(join(dir, 'notion.json'), 'utf8'), readFileSync(join(dir, 'focus-areas.json'), 'utf8')];
	const { out } = run(['--fixture', notionFixtures, '--content-dir', dir]);
	assert.match(out, /no changes/);
	assert.deepEqual([readFileSync(join(dir, 'notion.json'), 'utf8'), readFileSync(join(dir, 'focus-areas.json'), 'utf8')], first);
});

test('an empty text property keeps the value the snapshot already holds', () => {
	const dir = content();
	run(['--fixture', notionFixtures, '--content-dir', dir]);
	const snapshot = read(dir, 'notion.json');
	snapshot.rows.find((row: { origin: string }) => row.origin === 'neo4j/cypher').purpose = 'Kept from an earlier fetch.';
	writeFileSync(join(dir, 'notion.json'), JSON.stringify(snapshot));
	run(['--fixture', notionFixtures, '--content-dir', dir]);
	assert.equal(read(dir, 'notion.json').rows.find((row: { origin: string }) => row.origin === 'neo4j/cypher').purpose, 'Kept from an earlier fetch.');
});

test('a missing column is a gap, not an error', () => {
	const dir = content();
	const pages = mkdtempSync(join(tmpdir(), 'adp-pages-'));
	for (const file of readdirSync(notionFixtures).filter((name) => name.startsWith('query-page-'))) {
		const body = read(notionFixtures, file);
		for (const page of body.results) delete page.properties['Why specialized'];
		writeFileSync(join(pages, file), JSON.stringify(body));
	}
	const { code, out } = run(['--fixture', pages, '--content-dir', dir]);
	assert.equal(code, 0, out);
	assert.match(out, /Notion has no "Why specialized" column/);
	rmSync(pages, { recursive: true });
});

test('without NOTION_TOKEN and without --fixture it exits 2 and writes nothing', () => {
	const dir = content();
	const before = readFileSync(join(dir, 'notion.json'), 'utf8');
	const { code, out } = run(['--content-dir', dir]);
	assert.equal(code, 2);
	assert.match(out, /NOTION_TOKEN/);
	assert.equal(readFileSync(join(dir, 'notion.json'), 'utf8'), before);
});

test('--dry-run writes nothing', () => {
	const dir = content();
	const before = readFileSync(join(dir, 'notion.json'), 'utf8');
	const { code, out } = run(['--fixture', notionFixtures, '--content-dir', dir, '--dry-run']);
	assert.equal(code, 0);
	assert.match(out, /added {3}freeplane\/mindmap/);
	assert.equal(readFileSync(join(dir, 'notion.json'), 'utf8'), before);
});

test('queryAll follows next_cursor with the Notion headers', async () => {
	const bodies = ['query-page-1.json', 'query-page-2.json'].map((file) => readFileSync(join(notionFixtures, file), 'utf8'));
	const calls: { url: string; init: RequestInit }[] = [];
	const fakeFetch = (async (url: string, init: RequestInit) => {
		calls.push({ url, init });
		return new Response(bodies[calls.length - 1], { status: 200 });
	}) as typeof fetch;
	const pages = await queryAll('secret', fakeFetch);
	assert.equal(pages.length, 6);
	assert.equal(calls.length, 2);
	assert.equal(calls[0].url, 'https://api.notion.com/v1/data_sources/3e7be2fd-05b6-8079-932d-000bfa0609af/query');
	const headers = calls[0].init.headers as Record<string, string>;
	assert.equal(headers.Authorization, 'Bearer secret');
	assert.equal(headers['Notion-Version'], '2025-09-03');
	assert.deepEqual(JSON.parse(calls[1].init.body as string), { page_size: 100, start_cursor: 'cursor-page-2' });
});

test('the committed fixture snapshot matches the recorded responses', () => {
	const committed = read(notionFixtures, 'notion.json');
	assert.deepEqual(committed.rows, parseNotionPages(fixturePages()).rows);
});

test('--export reads a connector export like an API response, with focus areas and the export time', () => {
	const dir = content();
	const file = join(dir, 'export.json');
	writeFileSync(
		file,
		JSON.stringify({
			exportedAt: '2026-09-28T11:00:00.000Z',
			dataSource: '3e7be2fd-05b6-8079-932d-000bfa0609af',
			rows: [
				{
					url: 'https://app.notion.com/p/3e7be2fd05b68114a8bbe602d0e6ed63',
					Name: 'Ansible project structure',
					Description: 'Opens in [draw.io](http://draw.io) too.',
					Origin: 'ansible/structure',
					'One line purpose': 'See how playbooks, roles and inventories depend on each other.',
					Kind: 'Diagram',
					Family: 'Infrastructure / network / cloud diagrams',
					'Focus areas': '["Software delivery","Systems and strategy"]',
					Theory: '[Ansible directory layout](https://example.org/layout)',
				},
				{ url: 'https://app.notion.com/p/3e7be2fd05b68114a8bbe602d0e6ed64', Name: 'No origin', Origin: '' },
			],
		}),
	);
	const { code, out } = run(['--export', file, '--content-dir', dir]);
	assert.equal(code, 0, out);
	const snapshot = read(dir, 'notion.json');
	assert.equal(snapshot.rows.length, 1);
	const [row] = snapshot.rows;
	assert.equal(row.page, '3e7be2fd-05b6-8114-a8bb-e602d0e6ed63');
	assert.equal(row.lastEditedTime, '2026-09-28T11:00:00.000Z');
	assert.equal(row.name, 'Ansible project structure');
	assert.equal(row.type, 'Diagram');
	assert.deepEqual(row.focusAreas, ['Software delivery', 'Systems and strategy']);
	assert.equal(row.description, 'Opens in draw.io too.');
assert.equal(row.theory, '[Ansible directory layout](https://example.org/layout)');
	assert.match(out, /has no Origin/);
	rmSync(dir, { recursive: true, force: true });
});

test('a column missing from Notion is one gap', () => {
	const pages = fixturePages().map((page) => {
		const properties = { ...page.properties };
		delete properties.Kind;
		return { ...page, properties };
	});
	const { rows, report } = parseNotionPages(pages);
	assert.ok(rows.every((row) => row.type === null));
	assert.ok(rows.some((row) => row.hosts.standalone !== null), 'Standalone is read');
	assert.deepEqual(report.filter((item) => /column/.test(item.message)).map((item) => item.message), ['Notion has no "Kind" column']);
});

test('the column names are what the refresh reports and an export uses', () => {
	assert.equal(notionColumns.type, 'Kind');
	assert.equal(notionColumns.standalone, 'Standalone');
	assert.equal(notionColumns.intellij, 'IntelliJ');
	assert.equal(notionColumns.vscode, 'VS Code');
	assert.equal(notionColumns.eclipse, 'Eclipse');
	assert.equal(notionColumns.notion, 'Notion');
	assert.deepEqual(notionColumnNames.type, ['Kind']);
	assert.equal(columnIn({ Kind: {} }, 'type'), 'Kind');
	assert.equal(columnIn({}, 'type'), undefined);
});

{
	const columns = { kind: 'Kind', standalone: 'Standalone', vscode: 'VS Code' };
	test('a connector export reads its selects as selects', () => {
		const exported = {
			exportedAt: '2026-09-29T00:00:00.000Z',
			dataSource: notionDataSource,
			rows: [{ url: 'https://www.notion.so/Wardley-1a2b3c4d000040008000000000000002', Name: 'Wardley map', Origin: 'wardley/map', [columns.kind]: 'Diagram', [columns.standalone]: '⚗️ Prototype', [columns.vscode]: '' }],
		};
		const [row] = parseNotionPages(pagesFromExport(exported)).rows;
		assert.equal(row.type, 'Diagram');
		assert.equal(row.hosts.standalone, '⚗️ Prototype');
		assert.equal(row.hosts.vscode, null);
	});
}
