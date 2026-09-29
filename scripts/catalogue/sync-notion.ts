// npm run catalogue:sync-notion [--dry-run]
//
// Keeps the Notion "Tools" host columns in step with the IDE repositories (spec 003 FR-017, research D13,
// contracts/source-formats.md § S3w). For every Notion row and every host that has its own catalogue under
// sources/catalogue/<host>/, it sets the host's select to the catalogue's state. It writes nothing else in Notion,
// and nothing for a host without a catalogue, where Notion is the source. Every change is printed and written to
// .refresh/catalogue-notion-sync.md for spec 004's pull request. Exit codes: 0 done, 1 failed, 2 usage.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assembleCatalogue, defaultContentDir, type AssembleOptions } from '../../src/lib/catalogue/assemble.ts';
import { catalogueHosts } from '../../src/lib/catalogue/hosts.ts';
import { notionDataSource, readNotionSnapshot } from '../../src/lib/catalogue/notion-snapshot.ts';
import { readSources } from '../../src/lib/catalogue/sources.ts';
import { bareLabel } from '../../src/lib/catalogue/states.ts';
import type { HostId } from '../../src/lib/catalogue/types.ts';
import { json, notionApi, notionHeaders } from './notion.ts';

export interface SyncOptions extends AssembleOptions {
	fetch?: typeof fetch;
	/** Where the report goes; `.refresh`. */
	reportDir?: string;
	/** Pause between writes, for Notion's rate limit of about three requests a second. */
	delayMs?: number;
}

export interface Change {
	origin: string;
	host: HostId;
	page: string;
	column: string;
	before: string | null;
	after: string;
}

export async function main(args: string[], options: SyncOptions = {}): Promise<number> {
	const dryRun = args.includes('--dry-run');
	const fetchImpl = options.fetch ?? fetch;
	const contentDir = options.contentDir ?? defaultContentDir;
	const snapshotFile = options.notionPath ?? process.env.ADP_NOTION_SNAPSHOT ?? join(contentDir, 'notion.json');
	const reportDir = options.reportDir ?? '.refresh';
	const token = process.env.NOTION_TOKEN;
	if (!token) {
		console.error('NOTION_TOKEN is not set. Set it to the token of the Notion integration shared with the "Tools" database.');
		return 2;
	}

	// The write-back never runs on a catalogue that does not assemble (S3w "When").
	try {
		assembleCatalogue(options);
	} catch (error) {
		console.error(`The catalogue does not assemble, so Notion is left as it is: ${(error as Error).message}`);
		return 1;
	}

	const sources = readSources(options.sourcesRoot ?? process.env.ADP_SOURCES_DIR ?? 'sources');
	const snapshot = readNotionSnapshot(snapshotFile);
	const hosts = catalogueHosts.filter((host) => sources.catalogues.has(host.id));

	// The options of each host's select, read once.
	const response = await fetchImpl(`${notionApi}/data_sources/${notionDataSource}`, { method: 'GET', headers: notionHeaders(token) });
	if (!response.ok) {
		console.error(`Notion answered ${response.status} to reading data source ${notionDataSource}: ${await response.text()}`);
		return 1;
	}
	const dataSource = (await response.json()) as { properties: Record<string, { type: string; select?: { options: { name: string }[] } }> };
	const optionsOf = (column: string) => dataSource.properties[column]?.select?.options.map((option) => option.name) ?? [];
	// Each host's column under the name the data source has now: the new name or the old one (etalii.adp spec 002).
	const columnOf = (host: (typeof hosts)[number]) => host.notionColumns.find((name) => name in dataSource.properties) ?? host.notionColumns[0];

	const changes: Change[] = [];
	const skipped: string[] = [];
	for (const row of snapshot.rows) {
		if (!row.origin) continue;
		for (const host of hosts) {
			const catalogueRow = sources.catalogues.get(host.id)!.rows.find((candidate) => candidate.origin === row.origin);
			const target = catalogueRow?.developState ?? 'Not planned';
			const before = row.hosts[host.id];
			if (bareLabel(before ?? 'Not planned') === bareLabel(target)) continue;
			const column = columnOf(host);
			const option = optionsOf(column).find((name) => bareLabel(name) === bareLabel(target));
			if (!option) {
				skipped.push(`${row.origin} · ${host.id}: the Notion column "${column}" has no option for "${target}"; skipped`);
				continue;
			}
			changes.push({ origin: row.origin, host: host.id, page: row.page, column, before, after: option });
		}
	}

	const lines = changes.map((change) => `${change.origin} · ${change.host} · ${change.before ?? '(empty)'} → ${change.after}`);
	console.log(`${changes.length === 0 ? 'Notion agrees with the catalogues' : `${changes.length} Notion host values differ from the catalogues`}${dryRun ? ' (dry run)' : ''}`);
	for (const line of [...lines, ...skipped]) console.log(`  ${line}`);

	const written: Change[] = [];
	if (!dryRun) {
		for (const change of changes) {
			const patch = await fetchImpl(`${notionApi}/pages/${change.page}`, {
				method: 'PATCH',
				headers: notionHeaders(token),
				body: JSON.stringify({ properties: { [change.column]: { select: { name: change.after } } } }),
			});
			if (!patch.ok) {
				console.error(`Notion answered ${patch.status} to setting ${change.origin} · ${change.host}: ${await patch.text()}`);
				break;
			}
			written.push(change);
			snapshot.rows.find((row) => row.page === change.page)!.hosts[change.host] = change.after;
			if (options.delayMs ?? 350) await new Promise((resolve) => setTimeout(resolve, options.delayMs ?? 350));
		}
		if (written.length > 0) writeFileSync(snapshotFile, json(snapshot));
	}

	mkdirSync(reportDir, { recursive: true });
	const report = [
		'## Notion host columns',
		'',
		dryRun ? 'Dry run: nothing was written to Notion.' : `${written.length} of ${changes.length} values written to Notion.`,
		'',
		...(lines.length > 0 ? lines.map((line) => `- ${line}`) : ['- Notion agrees with the catalogues.']),
		...skipped.map((line) => `- ${line}`),
		'',
	].join('\n');
	writeFileSync(join(reportDir, 'catalogue-notion-sync.md'), report);
	return written.length === changes.length || dryRun ? 0 : 1;
}

if (import.meta.main) process.exitCode = await main(process.argv.slice(2));
