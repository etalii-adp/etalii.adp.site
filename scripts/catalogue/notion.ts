// npm run catalogue:notion [--dry-run] [--fixture <dir> | --export <file>] [--content-dir <dir>]
//
// Fetches the Notion "Tools" data source (etalii.adp: specs/etalii.adp.site/003-designer-catalogue/contracts/source-formats.md § S3) into
// src/content/catalogue/notion.json, and appends Notion focus-area options that focus-areas.json does not know.
// The build never calls Notion; this script is the only reader. Exit codes: 0 done, 1 Notion failed, 2 usage.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { addUnknownFocusAreas, pagesFromExport, parseNotionPages, type NotionExport, type NotionPage, type NotionQueryResponse } from '../../src/lib/catalogue/notion-api.ts';
import { notionDataSource, readNotionSnapshot, type NotionSnapshot } from '../../src/lib/catalogue/notion-snapshot.ts';
import type { FocusArea } from '../../src/lib/catalogue/types.ts';

export const notionApi = 'https://api.notion.com/v1';
export const notionVersion = '2025-09-03';

export function notionHeaders(token: string): Record<string, string> {
	return { Authorization: `Bearer ${token}`, 'Notion-Version': notionVersion, 'Content-Type': 'application/json' };
}

/** Every page of the data source, following `next_cursor` until `has_more` is false. */
export async function queryAll(token: string, fetchImpl: typeof fetch = fetch): Promise<NotionPage[]> {
	const pages: NotionPage[] = [];
	let cursor: string | null = null;
	do {
		const response = await fetchImpl(`${notionApi}/data_sources/${notionDataSource}/query`, {
			method: 'POST',
			headers: notionHeaders(token),
			body: JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
		});
		if (!response.ok) throw new Error(`Notion answered ${response.status} to the query of data source ${notionDataSource}: ${await response.text()}`);
		const body = (await response.json()) as NotionQueryResponse;
		pages.push(...body.results);
		cursor = body.has_more ? body.next_cursor : null;
	} while (cursor);
	return pages;
}

/** The recorded responses `query-page-1.json`, `query-page-2.json`, … of a fixture folder, in cursor order. */
export function fixturePagesFrom(dir: string): NotionPage[] {
	const files = readdirSync(dir)
		.filter((name) => /^query-page-\d+\.json$/.test(name))
		.sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]));
	const pages: NotionPage[] = [];
	for (const file of files) {
		const body = JSON.parse(readFileSync(join(dir, file), 'utf8')) as NotionQueryResponse;
		pages.push(...body.results);
		if (!body.has_more) break;
	}
	return pages;
}

export const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';

function option(args: string[], name: string): string | undefined {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
}

export async function main(args: string[], fetchImpl: typeof fetch = fetch): Promise<number> {
	const dryRun = args.includes('--dry-run');
	const fixture = option(args, '--fixture');
	// An agent's export through a Notion connector, for runs without a token (procedures/refresh-catalogue.md).
	const exportFile = option(args, '--export');
	const contentDir = option(args, '--content-dir') ?? 'src/content/catalogue';
	const token = process.env.NOTION_TOKEN;
	if (!fixture && !exportFile && !token) {
		console.error('NOTION_TOKEN is not set. Set it to the token of the Notion integration shared with the "Tools" database, or pass --fixture <dir> or --export <file>.');
		return 2;
	}

	const snapshotFile = join(contentDir, 'notion.json');
	const focusFile = join(contentDir, 'focus-areas.json');
	const previous = readNotionSnapshot(snapshotFile);
	let pages: NotionPage[];
	try {
		pages = fixture
			? fixturePagesFrom(fixture)
			: exportFile
				? pagesFromExport(JSON.parse(readFileSync(exportFile, 'utf8')) as NotionExport)
				: await queryAll(token!, fetchImpl);
	} catch (error) {
		console.error((error as Error).message);
		return 1;
	}

	const { rows, report } = parseNotionPages(pages, previous);
	const unchanged = JSON.stringify(rows) === JSON.stringify(previous.rows);
	const retrievedAt = unchanged && previous.retrievedAt ? previous.retrievedAt : new Date().toISOString();
	const snapshot: NotionSnapshot = { retrievedAt, rows };
	const focusBefore: FocusArea[] = existsSync(focusFile) ? JSON.parse(readFileSync(focusFile, 'utf8')) : [];
	const focus = addUnknownFocusAreas(focusBefore, rows, retrievedAt);

	const before = new Map(previous.rows.map((row) => [row.origin, JSON.stringify(row)]));
	const after = new Map(rows.map((row) => [row.origin, JSON.stringify(row)]));
	const lines = [
		...[...after.keys()].filter((origin) => !before.has(origin)).map((origin) => `added   ${origin}`),
		...[...after.keys()].filter((origin) => before.has(origin) && before.get(origin) !== after.get(origin)).map((origin) => `changed ${origin}`),
		...[...before.keys()].filter((origin) => !after.has(origin)).map((origin) => `removed ${origin}`),
	];
	console.log(`${rows.length} Notion rows with an origin; ${lines.length === 0 ? 'no changes' : `${lines.length} changes`}`);
	for (const line of lines) console.log(`  ${line}`);
	for (const item of [...report, ...focus.report]) console.log(`  gap: ${item.message}`);

	if (dryRun) {
		console.log('dry run: nothing written');
		return 0;
	}
	writeFileSync(snapshotFile, json(snapshot));
	if (focus.report.length > 0) writeFileSync(focusFile, json(focus.focusAreas));
	console.log(`wrote ${snapshotFile}${focus.report.length > 0 ? ` and ${focusFile}` : ''}`);
	return 0;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
