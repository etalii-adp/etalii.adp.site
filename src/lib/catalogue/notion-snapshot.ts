import { existsSync, readFileSync } from 'node:fs';
import type { NotionSourceRecord } from './types.ts';

/**
 * The Notion "Tools" data source as `catalogue:notion` last fetched it (contracts/source-formats.md § S3),
 * committed as `src/content/catalogue/notion.json`. The build reads this file and never the Notion API.
 */

export const notionDataSource = '3e7be2fd-05b6-8079-932d-000bfa0609af';
export const defaultNotionSnapshot = 'src/content/catalogue/notion.json';

export interface NotionRow {
	/** The Notion page id. */
	page: string;
	lastEditedTime: string;
	origin: string | null;
	name: string | null;
	type: string | null;
	purpose: string | null;
	description: string | null;
	whySpecialized: string | null;
	fileExtension: string | null;
	focusAreas: string[];
	family: string | null;
	subfamily: string | null;
	theory: string | null;
	/** The raw select values of the host columns, e.g. `⚗️ Prototype`; `null` when empty. */
	hosts: { standalone: string | null; intellij: string | null; vscode: string | null; eclipse: string | null };
	previousOrigin: string | null;
}

export interface NotionSnapshot {
	retrievedAt: string | null;
	rows: NotionRow[];
}

/** Reads the snapshot, or an empty one when the file is missing. */
export function readNotionSnapshot(path: string = process.env.ADP_NOTION_SNAPSHOT ?? defaultNotionSnapshot): NotionSnapshot {
	if (!existsSync(path)) return { retrievedAt: null, rows: [] };
	try {
		return JSON.parse(readFileSync(path, 'utf8')) as NotionSnapshot;
	} catch (error) {
		throw new Error(`${path}: cannot be read as JSON (${(error as Error).message}).`);
	}
}

/** A Notion SourceRecord for one row. Notion text is site-owned, so it carries the site's licence. */
export function toNotionSourceRecord(row: Pick<NotionRow, 'page' | 'lastEditedTime'>, retrievedAt: string): NotionSourceRecord {
	return { kind: 'notion', page: row.page, revision: row.lastEditedTime, retrievedAt, licence: 'Apache-2.0' };
}
