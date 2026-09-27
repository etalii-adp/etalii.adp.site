import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { assembleCatalogue } from '../../../src/lib/catalogue/assemble.ts';
import { check } from '../../../scripts/catalogue/check.ts';
import { fixtureOptions } from './helpers.ts';

type Pages = Record<string, string>;

/** A hand-made dist/ with one correct page per fixture designer, changed by `pages` and `files`. */
function run(pages: Pages = {}, files: Record<string, Buffer> = {}, overrides: Record<string, unknown> = {}) {
	const options = fixtureOptions(overrides);
	const dist = mkdtempSync(join(tmpdir(), 'adp-dist-'));
	const write = (address: string, html: string) => {
		const dir = join(dist, ...address.split('/').filter(Boolean));
		mkdirSync(dir, { recursive: true });
		writeFileSync(join(dir, 'index.html'), html);
	};
	const catalogue = assembleCatalogue(options);
	for (const designer of catalogue.designers) {
		const metas = designer.sources
			.filter((record) => record.kind === 'git')
			.map((record) => `<meta name="adp:source" content="${record.repository}@${record.revision}:${record.path}">`)
			.join('');
		write(`/adp/designers/${designer.origin}/`, page(metas, '<ul class="adp-sources"><li>source</li></ul>'));
	}
	write('/adp/designers/', page('', '<a href="/adp/designers/wardley/map/">Wardley map</a>'));
	for (const [address, html] of Object.entries(pages)) write(address, html);
	for (const [path, bytes] of Object.entries(files)) {
		mkdirSync(join(dist, ...path.split('/').slice(0, -1).filter(Boolean)), { recursive: true });
		writeFileSync(join(dist, ...path.split('/').filter(Boolean)), bytes);
	}
	return check({ ...options, dist }).failures.join('\n');
}

function page(head: string, main: string): string {
	return `<!doctype html><html><head>${head}</head><body><header><img src="/adp/logo.svg" alt=""></header><main>${main}</main></body></html>`;
}

const sources = '<ul class="adp-sources"><li>source</li></ul>';
const wardleyMetas = () =>
	assembleCatalogue(fixtureOptions())
		.designers.find((designer) => designer.origin === 'wardley/map')!
		.sources.filter((record) => record.kind === 'git')
		.map((record) => `<meta name="adp:source" content="${record.repository}@${record.revision}:${record.path}">`)
		.join('');

test('a correct build passes', () => {
	assert.equal(run(), '');
});

test('1. a designer page needs its sources and adp:source metas that match a lock', () => {
	assert.match(run({ '/adp/designers/wardley/map/': page('', sources) }), /wardley.*adp:source metas/);
	assert.match(run({ '/adp/designers/wardley/map/': page(wardleyMetas(), '<p>no list</p>') }), /no Sources list/);
	const stale = `<meta name="adp:source" content="etalii-adp/etalii.adp.ide.standalone@${'0'.repeat(40)}:docs/diagrams.md">`;
	assert.match(run({ '/adp/designers/wardley/map/': page(wardleyMetas() + stale, sources) }), /matches no lock entry/);
});

test('2. an image in the content needs alt text', () => {
	assert.match(run({ '/adp/designers/': page('', '<img src="/adp/x.webp">') }), /no alt text/);
});

test('3. a designer that is not usable shows no image, on its page or its card', () => {
	const cypher = assembleCatalogue(fixtureOptions()).designers.find((designer) => designer.origin === 'neo4j/cypher')!;
	const metas = cypher.sources
		.filter((record) => record.kind === 'git')
		.map((record) => `<meta name="adp:source" content="${record.repository}@${record.revision}:${record.path}">`)
		.join('');
	assert.match(run({ '/adp/designers/neo4j/cypher/': page(metas, `${sources}<img src="/adp/x.webp" alt="A graph">`) }), /not usable in any host but its page shows an image/);
	const card = '<ul><li class="adp-designer" data-origin="neo4j/cypher"><img src="/adp/x.webp" alt="A graph"></li></ul>';
	assert.match(run({ '/adp/designers/': page('', card) }), /card of neo4j\/cypher shows an image/);
});

test('4. a designer page loads at most 1 MiB of images', () => {
	const big = Buffer.alloc(1_100_000);
	const picture = '<picture><source srcset="/adp/_astro/small.webp 600w, /adp/_astro/big.webp 1200w"><img src="/adp/_astro/small.webp" alt="A map"></picture>';
	const failures = run({ '/adp/designers/wardley/map/': page(wardleyMetas(), sources + picture) }, { '/adp/_astro/big.webp': big, '/adp/_astro/small.webp': Buffer.alloc(10) });
	assert.match(failures, /wardley.*loads 1100010 bytes of images, more than 1048576/);
});

test('5. every redirect has a page at its old address', () => {
	const redirect = { from: 'gone/thing', to: null, reason: 'Withdrawn.', since: '2026-09-27', source: { kind: 'notion', page: '1a2b3c4d-0000-4000-8000-000000000001', revision: '2026-09-26T18:01:00.000Z', retrievedAt: '2026-09-27T00:30:00Z', licence: 'Apache-2.0' } };
	assert.match(run({}, {}, { 'redirects.json': [redirect] }), /gone\/thing, but its old address has no page/);
});

test('6. a screenshot says why it matters', () => {
	const figure = '<figure class="adp-screenshot"><img src="/adp/x.webp" alt="A map"><figcaption><p><strong>Why it matters:</strong> </p></figcaption></figure>';
	assert.match(run({ '/adp/designers/wardley/map/': page(wardleyMetas(), sources + figure) }), /does not say why it matters/);
});

test('7. internal links resolve', () => {
	assert.match(run({ '/adp/designers/': page('', '<a href="/adp/designers/nowhere/">?</a>') }), /links to \/adp\/designers\/nowhere\/, which was not built/);
});
