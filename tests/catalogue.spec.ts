import { expect, test } from '@playwright/test';
import { assembleCatalogue } from '../src/lib/catalogue/assemble.ts';
import { catalogueHosts } from '../src/lib/catalogue/hosts.ts';
import { bestState, isUsable, states } from '../src/lib/catalogue/states.ts';

// The designer catalogue (spec 003). Every expectation is derived from assembleCatalogue() over the same inputs as
// the build (ADP_SOURCES_DIR, ADP_STATES_CONFIG and ADP_NOTION_SNAPSHOT when set), so nothing here is a hard-coded count.
const catalogue = assembleCatalogue();
const known = new Set(catalogue.focusAreas.map((area) => area.slug));
const others = catalogue.designers.filter((designer) => !designer.focusAreas.some((slug) => known.has(slug)));

test.describe('overview', () => {
	test('lists every designer with its purpose, origin and four host states, without scripting (FR-001)', async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto('/adp/designers/');
		for (const designer of catalogue.designers) {
			const card = page.locator(`.adp-designer[data-origin="${designer.origin}"]`).first();
			await expect(card, designer.origin).toContainText(designer.name);
			await expect(card).toContainText(designer.purpose);
			await expect(card.locator('code')).toHaveText(designer.origin);
			const labels = card.locator('dd');
			await expect(labels).toHaveText(catalogueHosts.map((host) => states[designer.hosts[host.id].state].label));
			await expect(card.locator('dt')).toHaveText(catalogueHosts.map((host) => host.name));
		}
		await context.close();
	});

	test('groups designers by focus area, then "Other designers", then the ideas', async ({ page }) => {
		await page.goto('/adp/designers/');
		const headings = await page.locator('main .sl-markdown-content h2:not(.adp-facet-title)').allTextContents();
		const expected = [...catalogue.focusAreas.map((area) => area.name), ...(others.length > 0 ? ['Other designers'] : []), 'Ideas'];
		expect(headings.map((text) => text.trim())).toEqual(expected);
		for (const area of catalogue.focusAreas) {
			const group = page.locator(`section[aria-labelledby="focus-${area.slug}"]`);
			const members = catalogue.designers.filter((designer) => designer.focusAreas.includes(area.slug));
			if (members.length === 0) await expect(group).toContainText('No designers yet');
			else await expect(group.locator('.adp-designer')).toHaveCount(members.length);
		}
	});

	test('its facet links all resolve (FR-002)', async ({ page, request }) => {
		await page.goto('/adp/designers/');
		const hrefs = await page.locator('.adp-facets a').evaluateAll((links) => links.map((a) => a.getAttribute('href')!));
		expect(hrefs.length).toBe(catalogue.focusAreas.length + 4 + 5);
		for (const href of hrefs) expect((await request.get(href)).status(), href).toBe(200);
	});

	test('a designer that is not usable anywhere has no image and says so (US1 AS3)', async ({ page }) => {
		await page.goto('/adp/designers/');
		for (const designer of catalogue.designers.filter((d) => !isUsable(bestState(d.hosts)))) {
			const cards = page.locator(`.adp-designer[data-origin="${designer.origin}"]`);
			await expect(cards.locator('img')).toHaveCount(0);
			await expect(cards.first()).toContainText('Not yet usable');
		}
	});

	test('lists the ideas after the catalogue, without designer pages (FR-014)', async ({ page }) => {
		await page.goto('/adp/designers/');
		const ideas = page.locator('section.adp-ideas');
		for (const idea of catalogue.ideas) {
			await expect(ideas).toContainText(idea.name);
			await expect(ideas).toContainText(idea.origin);
		}
		const hrefs = await ideas.locator('a').evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
		expect(hrefs.filter((href) => href.startsWith('/adp/designers/'))).toEqual([]);
		const last = await page.locator('main section').evaluateAll((sections) => sections.at(-1)?.className ?? '');
		expect(last).toContain('adp-ideas');
	});

	test('with scripting, one host and one state narrow the list and the count is announced', async ({ page }) => {
		await page.goto('/adp/designers/');
		const status = page.locator('.adp-filter [aria-live="polite"]');
		await expect(status).toHaveText(`${catalogue.designers.length} ${catalogue.designers.length === 1 ? 'designer' : 'designers'} shown`);

		const host = catalogueHosts[0];
		const state = 'planned';
		await page.getByRole('group', { name: 'Host' }).getByLabel(host.name).check();
		await page.getByRole('group', { name: 'Best state' }).getByLabel(states[state].label).check();
		const expected = catalogue.designers.filter(
			(designer) => states[designer.hosts[host.id].state].rank >= states.planned.rank && bestState(designer.hosts) === state,
		);
		await expect(status).toHaveText(`${expected.length} ${expected.length === 1 ? 'designer' : 'designers'} shown`);
		const visible = await page.locator('.adp-designer:not([hidden])').evaluateAll((cards) => [...new Set(cards.map((card) => (card as HTMLElement).dataset.origin))]);
		expect(visible.sort()).toEqual(expected.map((designer) => designer.origin).sort());
	});
});
