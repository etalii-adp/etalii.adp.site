import type { NotionRow, NotionSnapshot } from './notion-snapshot.ts';
import { notionDataSource } from './notion-snapshot.ts';
import type { FocusArea, ReportItem } from './types.ts';

/**
 * Turns Notion data source query results into NotionRows (contracts/source-formats.md § S3). Pure, so the
 * `catalogue:notion` script and the tests share it; only the script reaches the network.
 */

type RichText = { plain_text: string }[];

export type NotionProperty =
	| { type: 'title'; title: RichText }
	| { type: 'rich_text'; rich_text: RichText }
	| { type: 'select'; select: { name: string } | null }
	| { type: 'multi_select'; multi_select: { name: string }[] }
	| { type: string; [key: string]: unknown };

export interface NotionPage {
	object: 'page';
	id: string;
	last_edited_time: string;
	properties: Record<string, NotionProperty>;
}

export interface NotionQueryResponse {
	results: NotionPage[];
	has_more: boolean;
	next_cursor: string | null;
}

/** The S3 properties, by the name of the NotionRow field they become. */
export const notionColumns = {
	name: 'Name',
	origin: 'Origin',
	purpose: 'One line purpose',
	description: 'Description',
	whySpecialized: 'Why specialized',
	fileExtension: 'File extension (if single file)',
	theory: 'Theory',
	type: 'Type',
	family: 'Family',
	subfamily: 'Subfamily',
	focusAreas: 'Focus areas',
	previousOrigin: 'Previous origin',
	standalone: 'Standalone Plugin Implementation',
	intellij: 'IntelliJ Plugin Implementation',
	vscode: 'VS Code Plugin Implementation',
	eclipse: 'Eclipse',
} as const;

/** Columns that may be missing without a gap being reported: `Previous origin` is optional (data-model § Redirect). */
const optionalColumns = new Set<string>([notionColumns.previousOrigin]);

/** The text fields where an empty Notion value keeps the snapshot's previous value (S3 "Empty values"). */
const keptTextFields = ['name', 'purpose', 'description', 'whySpecialized', 'fileExtension', 'theory'] as const;

function text(property: NotionProperty | undefined): string | null {
	if (!property) return null;
	const parts = property.type === 'title' ? (property.title as RichText) : property.type === 'rich_text' ? (property.rich_text as RichText) : null;
	if (!parts) return null;
	const value = parts.map((part) => part.plain_text).join('').trim();
	return value === '' ? null : value;
}

function select(property: NotionProperty | undefined): string | null {
	if (property?.type !== 'select') return null;
	const value = (property.select as { name: string } | null)?.name?.trim();
	return value ? value : null;
}

function multiSelect(property: NotionProperty | undefined): string[] {
	if (property?.type !== 'multi_select') return [];
	return (property.multi_select as { name: string }[]).map((option) => option.name.trim()).filter(Boolean);
}

export interface ParsedNotion {
	rows: NotionRow[];
	report: ReportItem[];
}

/**
 * Reads query result pages into rows, sorted by origin. A row without `Origin` is skipped and reported; a missing
 * column is reported once. An empty text property keeps the value `previous` holds for that page.
 */
export function parseNotionPages(pages: NotionPage[], previous: NotionSnapshot = { retrievedAt: null, rows: [] }): ParsedNotion {
	const report: ReportItem[] = [];
	const missing = new Set<string>();
	const before = new Map(previous.rows.map((row) => [row.page, row]));
	const rows: NotionRow[] = [];

	for (const page of pages) {
		const properties = page.properties ?? {};
		for (const column of Object.values(notionColumns)) {
			if (!(column in properties) && !optionalColumns.has(column)) missing.add(column);
		}
		const origin = text(properties[notionColumns.origin]);
		const name = text(properties[notionColumns.name]);
		if (!origin) {
			report.push({ message: `Notion row "${name ?? page.id}" (${page.id}) has no Origin, so it is left out` });
			continue;
		}
		const row: NotionRow = {
			page: page.id,
			lastEditedTime: page.last_edited_time,
			origin,
			name,
			type: select(properties[notionColumns.type]),
			purpose: text(properties[notionColumns.purpose]),
			description: text(properties[notionColumns.description]),
			whySpecialized: text(properties[notionColumns.whySpecialized]),
			fileExtension: text(properties[notionColumns.fileExtension]),
			focusAreas: multiSelect(properties[notionColumns.focusAreas]),
			family: select(properties[notionColumns.family]),
			subfamily: select(properties[notionColumns.subfamily]),
			theory: text(properties[notionColumns.theory]),
			hosts: {
				standalone: select(properties[notionColumns.standalone]),
				intellij: select(properties[notionColumns.intellij]),
				vscode: select(properties[notionColumns.vscode]),
				eclipse: select(properties[notionColumns.eclipse]),
			},
			previousOrigin: text(properties[notionColumns.previousOrigin]),
		};
		const earlier = before.get(page.id);
		if (earlier) {
			for (const field of keptTextFields) row[field] ??= earlier[field];
		}
		rows.push(row);
	}
	for (const column of missing) report.push({ message: `Notion has no "${column}" column` });
	rows.sort((a, b) => (a.origin! < b.origin! ? -1 : a.origin! > b.origin! ? 1 : 0));
	return { rows, report };
}

export function kebabCase(name: string): string {
	return name
		.normalize('NFKD')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

/**
 * Appends every `Focus areas` option that `focusAreas` does not name, with an empty problem statement, and reports
 * each one as a gap for the owner.
 */
export function addUnknownFocusAreas(focusAreas: FocusArea[], rows: NotionRow[], retrievedAt: string): { focusAreas: FocusArea[]; report: ReportItem[] } {
	const known = new Set(focusAreas.map((area) => area.name));
	const result = [...focusAreas];
	const report: ReportItem[] = [];
	let order = Math.max(0, ...focusAreas.map((area) => area.order));
	for (const row of rows) {
		for (const name of row.focusAreas) {
			if (known.has(name)) continue;
			known.add(name);
			order += 1;
			result.push({
				slug: kebabCase(name),
				name,
				problem: '',
				order,
				source: { kind: 'notion', page: notionDataSource, revision: row.lastEditedTime, retrievedAt, licence: 'Apache-2.0' },
			});
			report.push({ origin: row.origin ?? undefined, message: `new focus area "${name}" from Notion; its problem statement is empty` });
		}
	}
	return { focusAreas: result, report };
}

/**
 * An export of the "Diagrams" data source made by an agent through a Notion connector, for runs without
 * NOTION_TOKEN (procedures/refresh-catalogue.md § Without a Notion token). `rows` are the connector's rows as it
 * returns them: property name → value (a string; for a multi-select, an array of option names, a JSON array in a
 * string, or a comma-separated
 * string), and the page's `url`. The connector does not give a page's last edit, so `exportedAt` stands in for it.
 */
export interface NotionExport {
	exportedAt: string;
	dataSource: string;
	rows: Record<string, unknown>[];
}

const selectColumns = new Set<string>([notionColumns.type, notionColumns.family, notionColumns.subfamily, notionColumns.standalone, notionColumns.intellij, notionColumns.vscode, notionColumns.eclipse]);

/** The page id in a Notion page URL (its last 32 hex digits), as a dashed UUID. */
export function pageIdFromUrl(url: string): string | null {
	const hex = url.replace(/[?#].*$/, '').match(/([0-9a-f]{32})$/i)?.[1];
	return hex ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toLowerCase() : null;
}

/** Reads a connector export as query result pages, so it goes through parseNotionPages like an API response. */
export function pagesFromExport(exported: NotionExport): NotionPage[] {
	if (exported.dataSource !== notionDataSource) throw new Error(`The export is of data source ${exported.dataSource}, not ${notionDataSource}.`);
	const rich = (value: string): RichText => (value === '' ? [] : [{ plain_text: value }]);
	// The connector leaves a row's empty properties out; a column any row has is a column of the data source.
	const columns = [...new Set(exported.rows.flatMap((row) => Object.keys(row)))];
	return exported.rows.map((row, index) => {
		const id = pageIdFromUrl(String(row.url ?? ''));
		if (!id) throw new Error(`Export row ${index + 1} has no Notion page url.`);
		const properties: Record<string, NotionProperty> = {};
		for (const column of columns) {
			const raw = row[column];
			if (column === 'url') continue;
			if (column === notionColumns.focusAreas) {
				// An array, a JSON array in a string (as the connector returns it), or a comma-separated string.
				const listed = typeof raw === 'string' && raw.trim().startsWith('[') ? (JSON.parse(raw) as unknown[]) : raw;
				const names = Array.isArray(listed) ? listed.map(String) : String(listed ?? '').split(',');
				properties[column] = { type: 'multi_select', multi_select: names.map((name) => name.trim()).filter(Boolean).map((name) => ({ name })) };
				continue;
			}
			const value = raw === null || raw === undefined ? '' : String(raw).trim();
			if (column === notionColumns.name) properties[column] = { type: 'title', title: rich(value) };
			else if (selectColumns.has(column)) properties[column] = { type: 'select', select: value ? { name: value } : null };
			else properties[column] = { type: 'rich_text', rich_text: rich(value) };
		}
		return { object: 'page', id, last_edited_time: exported.exportedAt, properties };
	});
}
