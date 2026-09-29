import { readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { assembleCatalogue } from '../src/lib/catalogue/assemble.ts';
import { catalogueHosts } from '../src/lib/catalogue/hosts.ts';
import { bestState, isUsable, showsScreenshots, states } from '../src/lib/catalogue/states.ts';

// The tool catalogue (spec 003). Every expectation is derived from assembleCatalogue() over the same inputs as
// the build (ADP_SOURCES_DIR, ADP_STATES_CONFIG and ADP_NOTION_SNAPSHOT when set), so nothing here is a hard-coded count.
const catalogue = assembleCatalogue();
const known = new Set(catalogue.focusAreas.map((area) => area.slug));
const others = catalogue.tools.filter((tool) => !tool.focusAreas.some((slug) => known.has(slug)));

test.describe('overview', () => {
	test('lists every tool with its purpose, origin and four host states, without scripting (FR-001)', async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto('/adp/tools/');
		for (const tool of catalogue.tools) {
			const card = page.locator(`.adp-tool[data-origin="${tool.origin}"]`).first();
			await expect(card, tool.origin).toContainText(tool.name);
			await expect(card).toContainText(tool.purpose);
			await expect(card.locator('.adp-origin')).toHaveText(tool.origin);
			const labels = card.locator('dd');
			await expect(labels).toHaveText(catalogueHosts.map((host) => states[tool.hosts[host.id].state].label));
			await expect(card.locator('dt')).toHaveText(catalogueHosts.map((host) => host.name));
		}
		await context.close();
	});

	test('groups tools by focus area, then "Other tools", then the ideas', async ({ page }) => {
		await page.goto('/adp/tools/');
		const headings = await page.locator('main .sl-markdown-content h2').allTextContents();
		const expected = [...catalogue.focusAreas.map((area) => area.name), ...(others.length > 0 ? ['Other tools'] : []), 'Ideas'];
		expect(headings.map((text) => text.trim())).toEqual(expected);
		for (const area of catalogue.focusAreas) {
			const group = page.locator(`section[aria-labelledby="focus-${area.slug}"]`);
			const members = catalogue.tools.filter((tool) => tool.focusAreas.includes(area.slug));
			if (members.length === 0) await expect(group).toContainText('No tools yet');
			else await expect(group.locator('.adp-tool')).toHaveCount(members.length);
		}
	});

	test('its filter has one checkbox per option and no links; the facet pages are gone (FR-002)', async ({ page, request }) => {
		await page.goto('/adp/tools/');
		await expect(page.locator('.adp-facets')).toHaveCount(0);
		const filter = page.locator('.adp-filter');
		await expect(filter.locator('a')).toHaveCount(0);
		await expect(filter.getByRole('checkbox')).toHaveCount(3 + catalogue.focusAreas.length + 4 + 6);
		for (const kind of ['Diagram', 'Designer', 'Editor']) {
			await expect(filter.getByRole('group', { name: 'Kind' }).getByRole('checkbox', { name: kind, exact: true })).toBeVisible();
		}
		for (const area of catalogue.focusAreas) {
			await expect(filter.getByRole('group', { name: 'Focus area' }).getByRole('checkbox', { name: area.name, exact: true })).toBeVisible();
			// A retired facet address opens the overview with that option ticked.
			const old = await request.get(`/adp/designers/focus/${area.slug}/`);
			expect(await old.text()).toContain(`/adp/tools/?focus=${area.slug}`);
		}
	});

	test('without scripting, the filter is hidden and the full list shows (FR-002)', async ({ browser }) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();
		await page.goto('/adp/tools/');
		await expect(page.locator('.adp-filter')).toBeHidden();
		await expect(page.locator('.adp-tool:visible')).toHaveCount(await page.locator('.adp-tool').count());
		await context.close();
	});

	// etalii.adp spec 002: the kind filter (Diagram, Designer, Editor) applies to tools and ideas alike.
	test('with scripting, ticking a kind narrows the list to the tools and ideas of that kind', async ({ page }) => {
		await page.goto('/adp/tools/');
		const status = page.locator('.adp-filter [aria-live="polite"]');
		for (const [kind, label] of [['diagram', 'Diagram'], ['designer', 'Designer'], ['editor', 'Editor']] as const) {
			const checkbox = page.getByRole('group', { name: 'Kind' }).getByRole('checkbox', { name: label, exact: true });
			await checkbox.check();
			const expected = catalogue.tools.filter((tool) => tool.kind === kind);
			const ideas = catalogue.ideas.filter((idea) => idea.kind === kind).length;
			await expect(status).toHaveText(`${expected.length} ${expected.length === 1 ? 'tool' : 'tools'} and ${ideas} ${ideas === 1 ? 'idea' : 'ideas'}`);
			const visible = await page.locator('.adp-tool:not([hidden])').evaluateAll((cards) => [...new Set(cards.map((card) => (card as HTMLElement).dataset.origin))]);
			expect(visible.sort()).toEqual(expected.map((tool) => tool.origin).sort());
			await checkbox.uncheck();
		}
	});

	test('with scripting, ticking a focus area narrows the list to its tools (US1 AS2)', async ({ page }) => {
		await page.goto('/adp/tools/');
		const status = page.locator('.adp-filter [aria-live="polite"]');
		for (const area of catalogue.focusAreas) {
			const checkbox = page.getByRole('group', { name: 'Focus area' }).getByRole('checkbox', { name: area.name, exact: true });
			await checkbox.check();
			const expected = catalogue.tools.filter((tool) => tool.focusAreas.includes(area.slug));
			const ideas = catalogue.ideas.filter((idea) => idea.focusAreas.includes(area.slug)).length;
			await expect(status).toHaveText(`${expected.length} ${expected.length === 1 ? 'tool' : 'tools'} and ${ideas} ${ideas === 1 ? 'idea' : 'ideas'}`);
			await expect(page.locator('.adp-idea:not([hidden])')).toHaveCount(ideas);
			const visible = await page.locator('.adp-tool:not([hidden])').evaluateAll((cards) => [...new Set(cards.map((card) => (card as HTMLElement).dataset.origin))]);
			expect(visible.sort()).toEqual(expected.map((tool) => tool.origin).sort());
			await checkbox.uncheck();
		}
	});

	test('one ticked option describes the selection and extends the breadcrumbs; none or several restore them (US1 AS4)', async ({ page }) => {
		const area = catalogue.focusAreas[0];
		await page.goto(`/adp/tools/?focus=${area.slug}`);
		const focus = page.getByRole('group', { name: 'Focus area' });
		await expect(focus.getByRole('checkbox', { name: area.name, exact: true })).toBeChecked();
		const intro = page.locator('[data-adp-filter-intro]');
		const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
		await expect(intro).toHaveText(area.problem);
		await expect(crumbs.locator('li')).toHaveText(['Documentation', 'Tools', area.name]);
		await expect(crumbs.getByRole('link', { name: 'Tools' })).toHaveAttribute('href', '/adp/tools/');
		await expect(crumbs.locator('[aria-current="page"]')).toHaveText(area.name);

		const host = catalogueHosts[0];
		await page.getByRole('group', { name: 'Host' }).getByRole('checkbox', { name: host.name }).check();
		await expect(intro).toContainText('Each ADP tool is made for one task');
		await expect(crumbs.locator('li')).toHaveText(['Documentation', 'Tools']);
		expect(new URL(page.url()).search).toBe(`?focus=${area.slug}&hosts=${host.id}`);

		await focus.getByRole('checkbox', { name: area.name, exact: true }).uncheck();
		await expect(intro).toContainText(`${host.name} has, or plans to have`);
		await expect(crumbs.locator('li')).toHaveText(['Documentation', 'Tools', host.name]);
		await page.getByRole('group', { name: 'Host' }).getByRole('checkbox', { name: host.name }).uncheck();
		await expect(crumbs.locator('li')).toHaveText(['Documentation', 'Tools']);
		expect(new URL(page.url()).search).toBe('');
	});

	test('the introduction sits between the filter and the list, and card names are link-coloured (FR-002)', async ({ page }) => {
		await page.goto('/adp/tools/');
		const order = await page.evaluate(() => {
			const filter = document.querySelector('.adp-filter')!;
			const intro = document.querySelector('[data-adp-filter-intro]')!;
			const list = document.querySelector('.adp-catalogue-group')!;
			return [filter.compareDocumentPosition(intro), intro.compareDocumentPosition(list)].every((position) => position & Node.DOCUMENT_POSITION_FOLLOWING);
		});
		expect(order).toBe(true);
		const name = page.locator('.adp-tool h3 a').first();
		if ((await name.count()) > 0) {
			const colours = await name.evaluate((link) => {
				const probe = document.createElement('span');
				probe.style.color = 'var(--sl-color-text-accent)';
				link.after(probe);
				const want = getComputedStyle(probe).color;
				probe.remove();
				return [getComputedStyle(link).color, want];
			});
			expect(colours[0]).toBe(colours[1]);
		}
	});

	test('a wide screen shows at least three tools side by side (FR-001)', async ({ browser }) => {
		test.skip(catalogue.tools.length < 3, 'needs three tools');
		const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
		const page = await context.newPage();
		await page.goto('/adp/tools/');
		const columns = await page.locator('.adp-tools').first().evaluate((list) => getComputedStyle(list).gridTemplateColumns.split(' ').length);
		expect(columns).toBeGreaterThanOrEqual(3);
		await context.close();
	});

	test('every card links its name to the tool page (FR-003)', async ({ page }) => {
		await page.goto('/adp/tools/');
		for (const tool of catalogue.tools) {
			await expect(page.locator(`.adp-tool[data-origin="${tool.origin}"] h3 a`).first()).toHaveAttribute('href', `/adp/tools/${tool.origin}/`);
		}
	});

	test('the host states line up at the bottom of the cards in a row', async ({ browser }) => {
		const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
		const page = await context.newPage();
		await page.goto('/adp/tools/');
		const rows = await page.locator('.adp-tools').evaluateAll((lists) =>
			lists.map((list) => {
				const byRow = new Map<number, number[]>();
				for (const card of list.querySelectorAll<HTMLElement>('.adp-tool')) {
					const top = Math.round(card.getBoundingClientRect().top);
					const hosts = card.querySelector('.adp-tool-hosts')!.getBoundingClientRect();
					byRow.set(top, [...(byRow.get(top) ?? []), Math.round(card.getBoundingClientRect().bottom - hosts.bottom)]);
				}
				return [...byRow.values()];
			}),
		);
		for (const row of rows.flat()) expect(new Set(row).size, `gaps under the host lists: ${row}`).toBe(1);
		await context.close();
	});

	test('the Idea state shows only the ideas, and hides the tool groups', async ({ page }) => {
		await page.goto('/adp/tools/?state=idea');
		const status = page.locator('.adp-filter [aria-live="polite"]');
		const n = catalogue.ideas.length;
		await expect(status).toHaveText(`0 tools and ${n} ${n === 1 ? 'idea' : 'ideas'}`);
		await expect(page.locator('.adp-idea:not([hidden])')).toHaveCount(n);
		await expect(page.locator('.adp-catalogue-group:not([hidden])')).toHaveCount(0);
	});

	test('no card shows a screenshot; they are on the tool pages (US1 AS1)', async ({ page }) => {
		await page.goto('/adp/tools/');
		await expect(page.locator('.adp-tool img')).toHaveCount(0);
	});

	test('a screenshot on a tool page opens large when clicked, and Escape closes it (FR-006)', async ({ page }) => {
		const tool = catalogue.tools.find((d) => d.screenshots.some((screenshot) => screenshot.publishable));
		test.skip(!tool, 'no tool has a publishable screenshot');
		await page.goto(`/adp/tools/${tool!.origin}/`);
		const link = page.locator('figure.adp-screenshot a[data-adp-enlarge]').first();
		const href = await link.getAttribute('href');
		await link.click();
		const viewer = page.locator('dialog.adp-lightbox');
		await expect(viewer).toBeVisible();
		await expect(viewer.locator('img')).toHaveAttribute('src', new RegExp(href!.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
		const size = await viewer.locator('img').boundingBox();
		expect(size!.width).toBeGreaterThan(page.viewportSize()!.width * 0.9);
		await page.keyboard.press('Escape');
		await expect(viewer).toBeHidden();
		expect(new URL(page.url()).pathname).toBe(`/adp/tools/${tool!.origin}/`);
	});

	test('a tool that is not usable anywhere has no image and says so (US1 AS3)', async ({ page }) => {
		await page.goto('/adp/tools/');
		for (const tool of catalogue.tools.filter((d) => !isUsable(bestState(d.hosts)))) {
			const cards = page.locator(`.adp-tool[data-origin="${tool.origin}"]`);
			await expect(cards.locator('img')).toHaveCount(0);
			await expect(cards.first()).toContainText('Not yet usable');
		}
	});

	test('lists the ideas after the catalogue, without tool pages (FR-014)', async ({ page }) => {
		await page.goto('/adp/tools/');
		const ideas = page.locator('section.adp-ideas');
		await expect(ideas.locator('.adp-idea')).toHaveCount(catalogue.ideas.length);
		for (const idea of catalogue.ideas) {
			const card = ideas.locator(`.adp-idea[data-origin="${idea.origin}"]`);
			await expect(card.locator('h3')).toHaveText(idea.name);
			await expect(card.locator('.adp-origin')).toHaveText(idea.origin);
			if (idea.purpose) await expect(card).toContainText(idea.purpose);
		}
		const hrefs = await ideas.locator('a').evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
		expect(hrefs.filter((href) => href.startsWith('/adp/tools/'))).toEqual([]);
		const last = await page.locator('main section').evaluateAll((sections) => sections.at(-1)?.className ?? '');
		expect(last).toContain('adp-ideas');
	});

	test('with scripting, one host and one state narrow the list and the count is announced', async ({ page }) => {
		await page.goto('/adp/tools/');
		const status = page.locator('.adp-filter [aria-live="polite"]');
		await expect(status).toHaveText(`${catalogue.tools.length} ${catalogue.tools.length === 1 ? 'tool' : 'tools'} and ${catalogue.ideas.length} ${catalogue.ideas.length === 1 ? 'idea' : 'ideas'}`);

		const host = catalogueHosts[0];
		const state = 'planned';
		await page.getByRole('group', { name: 'Host' }).getByLabel(host.name).check();
		await page.getByRole('group', { name: 'Best state' }).getByLabel(states[state].label).check();
		const expected = catalogue.tools.filter(
			(tool) => states[tool.hosts[host.id].state].rank >= states.planned.rank && bestState(tool.hosts) === state,
		);
		await expect(status).toHaveText(`${expected.length} ${expected.length === 1 ? 'tool' : 'tools'} and 0 ideas`);
		const visible = await page.locator('.adp-tool:not([hidden])').evaluateAll((cards) => [...new Set(cards.map((card) => (card as HTMLElement).dataset.origin))]);
		expect(visible.sort()).toEqual(expected.map((tool) => tool.origin).sort());
	});
});

test.describe('tool page', () => {
	test('"On this page" lists every heading each tool page shows', async ({ page }) => {
		for (const tool of catalogue.tools) {
			await page.goto(`/adp/tools/${tool.origin}/`);
			const shown = await page.locator('main .sl-markdown-content :is(h2, h3)').evaluateAll((headings) => headings.map((heading) => `#${heading.id}`));
			const listed = await page.locator('starlight-toc a').evaluateAll((links) => [...new Set(links.map((link) => link.getAttribute('href')!))].filter((href) => href !== '#_top'));
			expect(listed, tool.origin).toEqual(shown);
		}
	});

	for (const tool of catalogue.tools) {
		test(`${tool.origin} says what it is for, shows its screenshots and names its sources`, async ({ browser }) => {
			const context = await browser.newContext({ javaScriptEnabled: false });
			const page = await context.newPage();
			await page.goto(`/adp/tools/${tool.origin}/`);
			const content = page.locator('main .sl-markdown-content');
			await expect(page.locator('h1')).toHaveText(tool.name);
			await expect(content).toContainText(tool.origin);
			await expect(content).toContainText(tool.purpose);

			// FR-004: the task, why a specialized view helps, and the file formats, or "Not described yet".
			const purpose = page.locator('section[aria-labelledby="what-it-is-for"]');
			await expect(purpose).toContainText(tool.task ?? 'Not described yet');
			await expect(purpose).toContainText(tool.whySpecialized ?? 'Not described yet');
			if (tool.fileFormats.length === 0) await expect(purpose.locator('table')).toHaveCount(0);
			for (const format of tool.fileFormats) await expect(purpose.locator('table')).toContainText(format.extension);

			// FR-006, FR-007, FR-012, FR-015.
			const shown = tool.screenshots.filter((screenshot) => screenshot.publishable);
			if (!showsScreenshots(bestState(tool.hosts))) {
				await expect(content.locator('img')).toHaveCount(0);
				await expect(content.locator('#screenshots')).toHaveCount(0);
			} else if (shown.length === 0) {
				await expect(content).toContainText('Screenshot pending');
			}
			const figures = content.locator('figure.adp-screenshot');
			await expect(figures).toHaveCount(shown.length);
			// A tool in progress shows its screenshots marked as such (FR-007, amended 2026-09-28).
			await expect(figures.locator('.adp-in-progress')).toHaveCount(isUsable(bestState(tool.hosts)) ? 0 : shown.length);
			for (const [index, screenshot] of shown.entries()) {
				const figure = figures.nth(index);
				await expect(figure.locator('img')).toHaveAttribute('alt', screenshot.alt);
				await expect(figure.locator('figcaption')).toContainText(`${screenshot.caption}`);
				await expect(figure.locator('figcaption')).toContainText(`What is visible: ${screenshot.visible}`);
				await expect(figure.locator('figcaption')).toContainText(`Why it matters: ${screenshot.whyItMatters}`);
			}

			// US2 AS6: each focus area links to its facet page.
			const focus = page.locator('section[aria-labelledby="focus-areas"] a');
			await expect(focus).toHaveCount(tool.focusAreas.length);
			for (const slug of tool.focusAreas) await expect(page.locator(`a[href="/adp/tools/?focus=${slug}"]`).first()).toBeAttached();

			// FR-009: one entry per source record, and the adp:source metas of spec 004's site-integration contract.
			const sources = page.locator('ul.adp-sources li');
			const git = tool.sources.filter((record) => record.kind === 'git');
			const notion = tool.sources.filter((record) => record.kind === 'notion');
			await expect(sources).toHaveCount(tool.sources.length);
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
	for (const tool of catalogue.tools) {
		test(`${tool.origin} lists all four hosts with their state and how to get it (US3)`, async ({ page }) => {
			await page.goto(`/adp/tools/${tool.origin}/`);
			const table = page.locator('table.adp-availability');
			await expect(table.locator('caption')).toHaveText('Availability per IDE host');
			const rows = table.locator('tbody tr');
			await expect(rows).toHaveCount(4);
			for (const [index, host] of catalogueHosts.entries()) {
				const row = rows.nth(index);
				const availability = tool.hosts[host.id];
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

test.describe('redirects', () => {
	// etalii.adp spec 002: the designer catalogue moved to /adp/tools/; each old page redirects there in one hop.
	test('/adp/designers/ and every published tool page there redirect to /adp/tools/', async ({ request }) => {
		const published = JSON.parse(readFileSync('src/content/catalogue/published.json', 'utf8')) as string[];
		for (const origin of [...published, '']) {
			const from = origin ? `/adp/designers/${origin}/` : '/adp/designers/';
			const target = catalogue.redirects.find((redirect) => redirect.from === origin)?.to ?? origin;
			const to = target ? `/adp/tools/${target}/` : '/adp/tools/';
			const html = await (await request.get(from)).text();
			expect(html, from).toMatch(new RegExp(`http-equiv="refresh" content="0; ?url=${to}"`));
		}
	});
	for (const redirect of catalogue.redirects) {
		test(`${redirect.from} keeps resolving (FR-011)`, async ({ request }) => {
			const response = await request.get(`/adp/tools/${redirect.from}/`);
			expect(response.status()).toBe(200);
			const html = await response.text();
			expect(html).not.toContain('name="adp:sourced"');
			if (redirect.to) {
				const href = `/adp/tools/${redirect.to}/`;
				const tags = html.replaceAll(/\s*\/>/g, '>');
				expect(tags).toContain(`<meta http-equiv="refresh" content="0; url=${href}">`);
				expect(tags).toContain(`<link rel="canonical" href="https://etalii.net${href}">`);
				expect(tags).toContain('<meta name="robots" content="noindex">');
				expect(html).toMatch(new RegExp(`This tool is now at <a href="${href}"`));
			} else {
				expect(html).not.toContain('http-equiv="refresh"');
				expect(html).toContain(`This tool was withdrawn on <time datetime="${redirect.since}">${redirect.since}</time>: ${redirect.reason}`);
			}
		});
	}
});

test.describe('phone width and dark mode', () => {
	const addresses = ['/adp/tools/', ...(catalogue.tools.some((d) => d.origin === 'freeplane/mindmap') ? ['/adp/tools/freeplane/mindmap/'] : [])];
	for (const address of addresses) {
		test(`${address} fits 360 px in the dark scheme without axe violations`, async ({ browser }) => {
			const context = await browser.newContext({ viewport: { width: 360, height: 800 }, colorScheme: 'dark' });
			const page = await context.newPage();
			await page.goto(address);
			expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
			const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
			expect(violations.map((violation) => violation.id)).toEqual([]);
			await context.close();
		});
	}
});
