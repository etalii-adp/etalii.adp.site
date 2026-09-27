/**
 * npm run build:search — after astro build, indexes the reference with Pagefind (research D12). Only the
 * pages of published versions are indexed (`dist/adp/<language>/<version>/…`), never the `latest` copies or
 * stubs. The index, script and WebAssembly are written to dist/adp/pagefind/, served from the site itself.
 * With no published version there is nothing to index, and the step says so and succeeds.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import * as pagefind from 'pagefind';

const site = join('dist', 'adp');
const output = join(site, 'pagefind');

function htmlFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return htmlFiles(path);
		return entry.name.endsWith('.html') ? [path] : [];
	});
}

const languages = JSON.parse(readFileSync(join('src', 'content', 'reference', 'languages.json'), 'utf8')) as { id: string }[];
const files = languages.flatMap(({ id }) => {
	const dir = join(site, id);
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true })
		.filter((e) => e.isDirectory() && /^\d/.test(e.name))
		.flatMap((e) => htmlFiles(join(dir, e.name)));
});

if (files.length === 0) {
	console.log('build:search: no published reference version; nothing to index.');
	process.exit(0);
}

const { index, errors } = await pagefind.createIndex({});
if (!index) throw new Error(`Pagefind: ${errors.join('; ')}`);
const indexed: string[] = [];
for (const file of files) {
	const url = '/' + relative('dist', file).split(sep).join('/').replace(/index\.html$/, '');
	const result = await index.addHTMLFile({ url, content: readFileSync(file, 'utf8') });
	if (result.errors.length) throw new Error(`Pagefind could not index ${url}: ${result.errors.join('; ')}`);
	// Pages without data-pagefind-body are skipped by Pagefind and come back without words.
	if (result.file.uniqueWords > 0) indexed.push(url);
}
const written = await index.writeFiles({ outputPath: output });
if (written.errors.length) throw new Error(`Pagefind: ${written.errors.join('; ')}`);
// The list of indexed addresses, for check:reference (T063).
writeFileSync(join(output, 'indexed.json'), JSON.stringify(indexed.sort(), null, 2) + '\n');
await pagefind.close();
console.log(`build:search: indexed ${indexed.length} reference pages into ${output}.`);
