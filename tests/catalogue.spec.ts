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

test.describe('designer page', () => {
	for (const designer of catalogue.designers) {
		test(`${designer.origin} says what it is for, shows its screenshots and names its sources`, async ({ browser }) => {
			const context = await browser.newContext({ javaScriptEnabled: false });
			const page = await context.newPage();
			await page.goto(`/adp/designers/${designer.origin}/`);
			const content = page.locator('main .sl-markdown-content');
			await expect(page.locator('h1')).toHaveText(designer.name);
			await expect(content).toContainText(designer.origin);
			await expect(content).toContainText(designer.purpose);

			// FR-004: the task, why a specialized view helps, and the file formats, or "Not described yet".
			const purpose = page.locator('section[aria-labelledby="what-it-is-for"]');
			await expect(purpose).toContainText(designer.task ?? 'Not described yet');
			await expect(purpose).toContainText(designer.whySpecialized ?? 'Not described yet');
			if (designer.fileFormats.length === 0) await expect(purpose.locator('table')).toHaveCount(0);
			for (const format of designer.fileFormats) await expect(purpose.locator('table')).toContainText(format.extension);

			// FR-006, FR-007, FR-012, FR-015.
			const shown = designer.screenshots.filter((screenshot) => screenshot.publishable);
			if (!isUsable(bestState(designer.hosts))) {
				await expect(content.locator('img')).toHaveCount(0);
				await expect(content.locator('#screenshots')).toHaveCount(0);
			} else if (shown.length === 0) {
				await expect(content).toContainText('Screenshot pending');
			}
			const figures = content.locator('figure.adp-screenshot');
			await expect(figures).toHaveCount(shown.length);
			for (const [index, screenshot] of shown.entries()) {
				const figure = figures.nth(index);
				await expect(figure.locator('img')).toHaveAttribute('alt', screenshot.alt);
				await expect(figure.locator('figcaption')).toContainText(`${screenshot.caption}`);
				await expect(figure.locator('figcaption')).toContainText(`What is visible: ${screenshot.visible}`);
				await expect(figure.locator('figcaption')).toContainText(`Why it matters: ${screenshot.whyItMatters}`);
			}

			// US2 AS6: each focus area links to its facet page.
			const focus = page.locator('section[aria-labelledby="focus-areas"] a');
			await expect(focus).toHaveCount(designer.focusAreas.length);
			for (const slug of designer.focusAreas) await expect(page.locator(`a[href="/adp/designers/focus/${slug}/"]`).first()).toBeAttached();

			// FR-009: one entry per source record, and the adp:source metas of spec 004's site-integration contract.
			const sources = page.locator('ul.adp-sources li');
			const git = designer.sources.filter((record) => record.kind === 'git');
			const notion = designer.sources.filter((record) => record.kind === 'notion');
			await expect(sources).toHaveCount(designer.sources.length);
			for (const record of git) {
				const link = page.locator(`ul.adp-sources a[href="https://github.com/${record.repository}/blob/${record.revision}/${record.path}"]`);
				await expect(link.first()).toHaveText(`${record.repository}@${record.revision.slice(0, 7)}`);
			}
			for (const record of notion) await expect(page.locator('ul.adp-sources')).toContainText(`Notion, edited ${record.revision.slice(0, 10)}`);
			const metas = await page.locator('meta[name="adp:source"]').evaluateAll((elements) => elements.map((meta) => meta.getAttribute('content')));
			expect(metas.sort()).toEqual(git.map((record) => `${record.repository}@${record.revision}:${record.path}`).sort());
			await expect(page.locator('meta[name="adp:sourced"]')).toHaveAttribute('content', 'true');
			await context.close();
		});
	}
});

test.describe('availability', () => {
	for (const designer of catalogue.designers) {
		test(`${designer.origin} lists all four hosts with their state and how to get it (US3)`, async ({ page }) => {
			await page.goto(`/adp/designers/${designer.origin}/`);
			const table = page.locator('table.adp-availability');
			await expect(table.locator('caption')).toHaveText('Availability per IDE host');
			const rows = table.locator('tbody tr');
			await expect(rows).toHaveCount(4);
			for (const [index, host] of catalogueHosts.entries()) {
				const row = rows.nth(index);
				const availability = designer.hosts[host.id];
				await expect(row.locator('th')).toContainText(host.name);
				await expect(row.locator('td').nth(0)).toHaveText(states[availability.state].label);
				const how = row.locator('td').nth(1);
				if (availability.state === 'available') await expect(how.locator('a')).toHaveAttribute('href', availability.install!.url);
				else if (availability.state === 'implemented' || availability.state === 'prototype') await expect(how).toContainText('Not yet released');
				else if (availability.state === 'planned') await expect(how).toContainText('Planned');
				else if (availability.state === 'in-progress') await expect(how).toContainText('In progress');
				else await expect(how).toContainText('Not planned');
			}
		});
	}
});
