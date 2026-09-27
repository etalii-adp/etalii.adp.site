import { cpSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assembleCatalogue } from '../../../src/lib/catalogue/assemble.ts';
import { parseNotionPages, type NotionPage } from '../../../src/lib/catalogue/notion-api.ts';

// Shared by the catalogue unit tests: the fixtures of T007 and T008, assembled over a temporary content folder.

export const fixtures = 'tests/unit/catalogue/fixtures';
export const retrievedAt = '2026-09-27T00:30:00Z';

export function fixturePages(): NotionPage[] {
	return readdirSync(join(fixtures, 'notion'))
		.filter((name) => /^query-page-\d+\.json$/.test(name))
		.sort()
		.flatMap((name) => JSON.parse(readFileSync(join(fixtures, 'notion', name), 'utf8')).results);
}

/** A content folder holding the site-owned files of src/content/catalogue and the fixture Notion snapshot. */
export function contentDir(overrides: Record<string, unknown> = {}): string {
	const dir = mkdtempSync(join(tmpdir(), 'adp-catalogue-'));
	cpSync('src/content/catalogue', dir, { recursive: true });
	const { rows } = parseNotionPages(fixturePages());
	writeFileSync(join(dir, 'notion.json'), JSON.stringify({ retrievedAt, rows }, null, 2));
	for (const [file, value] of Object.entries(overrides)) writeFileSync(join(dir, file), JSON.stringify(value, null, 2));
	return dir;
}

export function assembleFixtures(overrides: Record<string, unknown> = {}) {
	return assembleCatalogue({ sourcesRoot: join(fixtures, 'sources'), configPath: join(fixtures, 'config/states.json'), contentDir: contentDir(overrides) });
}
