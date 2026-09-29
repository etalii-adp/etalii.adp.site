import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The table of the six languages is written once, in the glossary of etalii.adp, and copied into two pages of this
// site (etalii.adp spec 002, research R7, T025). This check fails when either page's table differs from the
// glossary's in any cell. Links on the page (DISL and DID lead to their references) are not part of a cell's text.
// The glossary is read from etalii.adp's develop branch, or from a local file named by ADP_GLOSSARY.
const glossaryUrl = 'https://raw.githubusercontent.com/etalii-adp/etalii.adp/develop/docs/terminology.md';
const header = ['Kind', 'Specification language', 'Extension', 'Definition language', 'Extension'];

async function glossary(): Promise<string> {
	if (process.env.ADP_GLOSSARY) return readFileSync(process.env.ADP_GLOSSARY, 'utf8');
	const response = await fetch(glossaryUrl);
	if (!response.ok) throw new Error(`Reading ${glossaryUrl} failed: ${response.status} ${response.statusText}`);
	return response.text();
}

/** The rows of the Markdown table whose header is `header`, as the text of each cell (inline code without backticks). */
function markdownTable(markdown: string): string[][] {
	const lines = markdown.replaceAll('\r\n', '\n').split('\n');
	const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim().replaceAll('`', '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1'));
	const start = lines.findIndex((line) => line.trim().startsWith('|') && cells(line).join('|') === header.join('|'));
	if (start < 0) throw new Error(`The glossary has no table with the header ${header.join(' | ')}.`);
	const rows: string[][] = [header];
	for (const line of lines.slice(start + 2)) {
		if (!line.trim().startsWith('|')) break;
		rows.push(cells(line));
	}
	return rows;
}

for (const address of ['/adp/docs/specification-and-definition/', '/adp/docs/terminology/']) {
	test(`${address} shows the glossary's table of the six languages`, async ({ page }) => {
		const expected = markdownTable(await glossary());
		await page.goto(address);
		const table = page.locator('main table').filter({ has: page.locator('th', { hasText: 'Specification language' }) });
		await expect(table).toHaveCount(1);
		const actual = await table.locator('tr').evaluateAll((rows) => rows.map((row) => [...row.querySelectorAll('th, td')].map((cell) => (cell.textContent ?? '').trim())));
		expect(actual).toEqual(expected);
	});
}
