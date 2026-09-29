// npm run check:catalogue [-- --dist <dir>]
//
// Post-build checks of the catalogue's pages (spec 003 research D12), with the expectations taken from
// assembleCatalogue() over the same inputs as the build. Prints each failure with its page and exits 1 on any.
//   1. every tool page has a Sources list, and one adp:source meta per git source, each matching a lock entry (FR-009)
//   2. every <img> in a page's <main> has non-empty alt text (FR-012)
//   3. no tool that is below Prototype in every host has an image, on its page or its cards (FR-007)
//   4. the images a tool page loads weigh at most 1 MiB; the heaviest page is printed (FR-013)
//   5. every redirects.json entry has a page at its old address (FR-011)
//   6. every screenshot shown says why it matters (FR-015)
//   7. every internal link on a catalogue page resolves to a built file
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { assembleCatalogue, type AssembleOptions } from '../../src/lib/catalogue/assemble.ts';
import { readSources } from '../../src/lib/catalogue/sources.ts';
import { bestState, isUsable, showsScreenshots } from '../../src/lib/catalogue/states.ts';

export const imageBudget = 1_048_576;

export interface CheckResult {
	failures: string[];
	heaviest: { page: string; bytes: number } | null;
	pages: number;
}

function htmlFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return htmlFiles(path);
		return entry.name === 'index.html' ? [path] : [];
	});
}

const main_ = (html: string) => html.slice(html.indexOf('<main'), html.indexOf('</main>') + 1 || undefined);
const attribute = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];

/** The largest candidate of a srcset: the one with the highest `w` (or `x`) descriptor. */
function largest(srcset: string): string | undefined {
	const candidates = srcset
		.split(',')
		.map((part) => part.trim().split(/\s+/))
		.filter(([url]) => url)
		.map(([url, descriptor = '1x']) => ({ url, size: Number.parseFloat(descriptor) || 1 }));
	return candidates.sort((a, b) => b.size - a.size)[0]?.url;
}

export function check(options: AssembleOptions & { dist?: string } = {}): CheckResult {
	const dist = options.dist ?? 'dist';
	const catalogue = assembleCatalogue(options);
	const sources = readSources(options.sourcesRoot ?? process.env.ADP_SOURCES_DIR ?? 'sources');
	const locks = [...sources.catalogues.values(), ...sources.screenshots.values()].map((entry) => entry.lock);
	if (sources.hosts) locks.push(sources.hosts.lock);
	const lockEntries = new Set(locks.flatMap((lock) => lock.files.map((file) => `${file.repository}@${file.commit}:${file.sourcePath}`)));

	const failures: string[] = [];
	const fail = (page: string, message: string) => failures.push(`${page}: ${message}`);
	const pageOf = (origin: string) => join(dist, 'adp', 'tools', ...origin.split('/'), 'index.html');
	const fileFor = (src: string) => join(dist, decodeURI(src.split(/[?#]/)[0]));
	let heaviest: CheckResult['heaviest'] = null;

	const pages = htmlFiles(join(dist, 'adp', 'tools'));
	const html = new Map(pages.map((page) => [page, readFileSync(page, 'utf8')]));

	for (const tool of catalogue.tools) {
		const page = pageOf(tool.origin);
		const content = html.get(page);
		if (content === undefined) {
			fail(page, `no page for the tool ${tool.origin}`);
			continue;
		}
		// 1. Sources and adp:source metas.
		if (!/<ul class="adp-sources[^"]*">\s*<li/.test(content)) fail(page, 'has no Sources list');
		const metas = [...content.matchAll(/<meta name="adp:source" content="([^"]+)"/g)].map((match) => match[1]);
		const git = tool.sources.filter((record) => record.kind === 'git');
		if (metas.length < git.length || (git.length > 0 && metas.length === 0)) fail(page, `has ${metas.length} adp:source metas for ${git.length} git sources`);
		for (const meta of metas) if (!lockEntries.has(meta)) fail(page, `adp:source ${meta} matches no lock entry under sources/`);

		// 3. Nothing below Prototype shows an image.
		if (!showsScreenshots(bestState(tool.hosts)) && /<img\b/.test(main_(content))) fail(page, `${tool.origin} is not in progress in any host but its page shows an image`);

		// 4. The image budget.
		let bytes = 0;
		const images = [
			...[...content.matchAll(/<img\b[^>]*>/g)].map((match) => attribute(match[0], 'src')),
			...[...content.matchAll(/<picture\b[\s\S]*?<\/picture>/g)].flatMap((picture) =>
				[...picture[0].matchAll(/<source\b[^>]*>/g)].map((source) => largest(attribute(source[0], 'srcset') ?? '')),
			),
		].filter((src): src is string => !!src && src.startsWith('/'));
		for (const src of images) if (existsSync(fileFor(src))) bytes += statSync(fileFor(src)).size;
		if (bytes > imageBudget) fail(page, `loads ${bytes} bytes of images, more than ${imageBudget}`);
		if (!heaviest || bytes > heaviest.bytes) heaviest = { page, bytes };
	}

	for (const [page, content] of html) {
		// 2. Alt text, on the catalogue's own images; the header's logo is decorative beside the site's name.
		for (const img of main_(content).matchAll(/<img\b[^>]*>/g)) {
			if (!(attribute(img[0], 'alt') ?? '').trim()) fail(page, `an image has no alt text: ${img[0].slice(0, 120)}`);
		}
		// 3. Cards of tools that are not usable carry no image.
		for (const card of content.matchAll(/<li class="adp-tool[^"]*"[^>]*data-origin="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)) {
			const tool = catalogue.tools.find((candidate) => candidate.origin === card[1]);
			if (tool && !isUsable(bestState(tool.hosts)) && /<img\b/.test(card[2])) fail(page, `the card of ${card[1]} shows an image, but it is not usable in any host`);
		}
		// 6. Why it matters.
		for (const figure of content.matchAll(/<figure class="adp-screenshot[\s\S]*?<\/figure>/g)) {
			const why = /Why it matters:<\/strong>([\s\S]*?)<\/p>/.exec(figure[0])?.[1].replace(/<[^>]+>/g, '').trim();
			if (!why) fail(page, 'a screenshot does not say why it matters');
		}
		// 7. Internal links.
		for (const link of content.matchAll(/\shref="(\/adp\/[^"#?]*)/g)) {
			const target = link[1].endsWith('/') ? join(fileFor(link[1]), 'index.html') : fileFor(link[1]);
			if (!existsSync(target)) fail(page, `links to ${link[1]}, which was not built`);
		}
	}

	// 5. Redirects.
	for (const redirect of catalogue.redirects) {
		if (!html.has(pageOf(redirect.from))) fail(pageOf(redirect.from), `redirects.json has ${redirect.from}, but its old address has no page`);
	}
	return { failures, heaviest, pages: pages.length };
}

export function main(args: string[]): number {
	const index = args.indexOf('--dist');
	const result = check({ dist: index >= 0 ? args[index + 1] : undefined });
	for (const failure of result.failures) console.error(failure);
	const heaviest = result.heaviest ? `; heaviest tool page ${result.heaviest.page} loads ${result.heaviest.bytes} bytes of images` : '';
	console.log(`check:catalogue: ${result.pages} pages, ${result.failures.length} failures${heaviest}`);
	return result.failures.length > 0 ? 1 : 0;
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
