import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { badgeOrigin, statsOrigin } from '../src/data/builds';
import { visitorCounterOrigin } from '../src/data/visitors';
import { examplesOf } from '../src/lib/reference/examples';
import { latestOf } from '../src/lib/reference/load';

// Every built page is checked (FR-012, FR-014, FR-015, FR-017, SC-003): the pages under dist/adp/ and the
// root 404 page. The root index.html is the redirect of FR-018 and is checked on its own below. Other pages that
// only redirect (a renamed tool's stub, spec 003 FR-011) navigate away as they load; tests/catalogue.spec.ts
// checks them, and their target is checked here.
const dist = 'dist';

function htmlFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return htmlFiles(path);
		return entry.name.endsWith('.html') ? [path] : [];
	});
}

function addressOf(file: string): string {
	const path = '/' + relative(dist, file).split(sep).join('/');
	return path.endsWith('/index.html') ? path.slice(0, -'index.html'.length) : path;
}

// The DISL and DID references (spec 002) build some sixty pages per version from one template each; its checks here
// cover one page of each kind (spec 002 quickstart 8): the landing, a cover, section 6, the schema browser,
// one example, the examples index, a latest copy and search. check:reference covers every page.
const referencePage = /^\/adp\/(?:disl|did)\/(?!$|search\/$)/;
const referenceSample = /^\/adp\/(?:disl|did)\/(?:[0-9.]+\/(?:layer-3-notation-visual-definition\/|schema\/|examples\/(?:statemachine\/)?)?|latest\/foundations\/)$/;
const redirectsAway = (file: string) => /<meta http-equiv="refresh"/.test(readFileSync(file, 'utf8'));
const pages = [...htmlFiles(join(dist, 'adp')), join(dist, '404.html')]
	.filter((file) => !redirectsAway(file))
	.map(addressOf)
	.filter((address) => !referencePage.test(address) || referenceSample.test(address))
	.sort();
const wcagTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page) {
	const { violations } = await new AxeBuilder({ page }).withTags(wcagTags).analyze();
	const summary = violations.map((v) => `${v.id}: ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`);
	expect(summary, 'axe WCAG 2.2 AA violations').toEqual([]);
}

test('the build contains the pages of this feature', () => {
	expect(pages).toEqual(expect.arrayContaining(['/404.html', '/adp/', '/adp/docs/', '/adp/docs/specification-and-definition/', '/adp/disl/', '/adp/did/', '/adp/tools/']));
});

for (const address of pages) {
	const isHome = address === '/adp/';
	const isNotFound = address.endsWith('404.html');

	test.describe(address, () => {
		// The schema browser holds every highlighted definition of a schema; axe needs longer there.
		if (/^\/adp\/(?:disl|did)\/[^/]+\/schema\/$/.test(address)) test.slow();
		for (const colorScheme of ['light', 'dark'] as const) {
			test(`passes WCAG 2.2 AA in the ${colorScheme} scheme`, async ({ browser }) => {
				const context = await browser.newContext({ colorScheme });
				const page = await context.newPage();
				await page.goto(address);
				await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
				await expectNoViolations(page);
				await context.close();
			});
		}

		test('fits a 360 px wide screen with its navigation visible', async ({ browser }) => {
			const context = await browser.newContext({ viewport: { width: 360, height: 800 } });
			const page = await context.newPage();
			await page.goto(address);
			const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
			expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(0);
			await expect(page.getByRole('navigation', { name: 'Site parts' }).getByRole('link', { name: 'About' })).toBeVisible();
			await expect(page.getByRole('navigation', { name: 'Site parts' }).getByRole('link', { name: 'Documentation' })).toBeVisible();
			await page.getByRole('navigation', { name: 'Site map' }).scrollIntoViewIfNeeded();
			await expect(page.getByRole('navigation', { name: 'Site map' })).toBeVisible();
			await context.close();
		});

		test('is complete with scripting disabled', async ({ browser }) => {
			const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 360, height: 800 } });
			const page = await context.newPage();
			await page.goto(address);
			await expect(page.locator('h1')).toHaveCount(1);
			await expect(page.locator('h1')).toBeVisible();
			await expect(page.locator('main')).toContainText(/\w{3,}/);
			const parts = page.getByRole('navigation', { name: 'Site parts' });
			await expect(parts.getByRole('link', { name: 'About' })).toBeVisible();
			await expect(parts.getByRole('link', { name: 'Documentation' })).toBeVisible();
			if (!isHome && !isNotFound) {
				await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
			}
			const siteMap = page.getByRole('navigation', { name: 'Site map' });
			await siteMap.scrollIntoViewIfNeeded();
			for (const name of ['Home', 'Introduction', 'Specification & Definition', 'DISL reference', 'DID reference', 'Tools']) {
				await expect(siteMap.getByRole('link', { name, exact: true })).toBeVisible();
			}
			await context.close();
		});

		test('loads nothing from another origin, bar the home page\'s build and statistics badges and the visitor counter, and sets no cookies', async ({ page, context, baseURL }) => {
			const origins = new Set<string>();
			page.on('request', (request) => {
				const url = new URL(request.url());
				// The build status and repository statistics badges on the home page are the allowed exceptions (FR-015).
				if (isHome && url.origin === badgeOrigin && url.pathname.endsWith('/badge.svg')) return;
				if (isHome && url.origin === statsOrigin && url.pathname.startsWith('/github/')) return;
				// So is the visitor counter in the header, amended 2026-09-28.
				if (url.origin === visitorCounterOrigin && url.pathname === '/api/hit') return;
				origins.add(url.origin);
			});
			await page.goto(address, { waitUntil: 'networkidle' });
			expect([...origins]).toEqual([new URL(baseURL!).origin]);
			expect(await context.cookies()).toEqual([]);
		});

		test('shows the Apache-2.0 licence in its footer', async ({ page }) => {
			await page.goto(address);
			await expect(page.locator('footer.adp-footer')).toContainText('Apache-2.0');
		});

		test('marks its part in the header', async ({ page }) => {
			await page.goto(address);
			const current = page.getByRole('navigation', { name: 'Site parts' }).locator('[aria-current="true"]');
			await expect(current).toHaveCount(1);
		});

		test('links internally only to addresses that end in a slash', async ({ page }) => {
			await page.goto(address);
			const hrefs = await page.locator('a[href^="/"]').evaluateAll((links) => links.map((a) => a.getAttribute('href')!));
			const withoutSlash = hrefs.filter((href) => !/\/(\?[^#]*)?(#.*)?$/.test(href) && !/\.[a-z0-9]+(#.*)?$/i.test(href));
			expect(withoutSlash).toEqual([]);
		});
	});
}

test.describe('addresses (contracts/site-addresses.md)', () => {
	test('the domain root redirects to /adp/ without scripting', async ({ request }) => {
		const html = await (await request.get('/')).text();
		expect(html).toContain('<meta http-equiv="refresh" content="0; url=/adp/">');
		expect(html).toContain('<link rel="canonical" href="https://etalii.net/adp/">');
		expect(html).toMatch(/<a href="\/adp\/">Continue to ADP – A Different Perspective<\/a>/);
		expect(html).not.toMatch(/<script|<img|<link rel="stylesheet"/);
	});

	test('the domain root lands on the home page', async ({ page }) => {
		await page.goto('/');
		await page.waitForURL('**/adp/');
		await expect(page.locator('h1')).toHaveText('A Different Perspective');
	});

	test('the page-not-found page carries the site navigation', async ({ page }) => {
		await page.goto('/404.html');
		await expect(page.locator('h1')).toHaveText('Page not found');
		await expect(page.getByRole('navigation', { name: 'Site parts' })).toBeVisible();
		await expect(page.getByRole('navigation', { name: 'Site map' })).toBeAttached();
		await expect(page.getByRole('main').getByRole('link', { name: 'Go to the home page' })).toHaveAttribute('href', '/adp/');
	});

	test('one sidebar: the reference of each language is a collapsible group under Specification & Definition (Peter, 2026-09-29)', async ({ page }) => {
		const references = ['disl', 'did'].map((id) => latestOf(id)).filter((version) => version !== undefined);
		expect(references.length).toBeGreaterThan(0);
		const sidebar = page.locator('.sidebar-content');
		const group = (label: string) => sidebar.locator('details').filter({ has: page.locator(':scope > summary', { hasText: label }) });
		await page.goto('/adp/docs/');
		// The documentation start page is the Introduction; the header keeps its Documentation part link.
		await expect(page.locator('h1')).toHaveText('Introduction');
		await expect(sidebar.getByRole('link').first()).toHaveText('Introduction');
		await expect(page.getByRole('navigation', { name: 'Site parts' }).getByRole('link', { name: 'Documentation' })).toHaveAttribute('href', '/adp/docs/');
		await expect(group('Specification & Definition').getByRole('link', { name: 'Overview' })).toHaveAttribute('href', '/adp/docs/specification-and-definition/');
		for (const version of references) {
			const label = `${version.language.short} ${version.record.version}`;
			const reference = group('Specification & Definition').locator('details').filter({ has: page.locator(':scope > summary', { hasText: label }) });
			const schema = reference.getByRole('link', { name: 'Schema', exact: true });
			await expect(schema).toBeHidden();
			await reference.locator(':scope > summary').click();
			await expect(schema).toBeVisible();
			await expect(schema).toHaveAttribute('href', `/adp/${version.language.id}/${version.record.version}/schema/`);
			// Every example is its own page in a collapsible Examples group.
			const examples = reference.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'Examples' }) });
			await examples.locator(':scope > summary').click();
			await expect(examples.getByRole('link', { name: 'Overview' })).toHaveAttribute('href', `/adp/${version.language.id}/${version.record.version}/examples/`);
			const stems = examplesOf(version).map((example) => example.stem);
			expect(stems.length).toBeGreaterThan(0);
			for (const stem of stems) await expect(examples.locator(`a[href="/adp/${version.language.id}/${version.record.version}/examples/${stem}/"]`)).toBeVisible();
		}
		// A reference page shows the same sidebar, its own language opened at the current page.
		const [first] = references;
		await page.goto(`/adp/${first.language.id}/${first.record.version}/schema/`);
		await expect(sidebar.getByRole('link', { name: 'Tools', exact: true })).toBeVisible();
		await expect(sidebar.locator('[aria-current="page"]')).toHaveText('Schema');
	});

	test('the part marker follows the page', async ({ page }) => {
		const current = page.getByRole('navigation', { name: 'Site parts' }).locator('[aria-current="true"]');
		await page.goto('/adp/');
		await expect(current).toHaveText('About');
		for (const address of ['/adp/docs/', '/adp/docs/specification-and-definition/', '/adp/disl/', '/adp/did/', '/adp/tools/']) {
			await page.goto(address);
			await expect(current).toHaveText('Documentation');
		}
	});

	test('a coming section shows its breadcrumbs', async ({ page }) => {
		await page.goto('/adp/disl/');
		const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
		await expect(crumbs.getByRole('link', { name: 'Documentation' })).toHaveAttribute('href', '/adp/docs/');
		await expect(crumbs.locator('[aria-current="page"]')).toHaveText('DISL reference');
	});
});
