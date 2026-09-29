import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { assembleCatalogue } from '../../../src/lib/catalogue/assemble.ts';
import { parseNotionPages } from '../../../src/lib/catalogue/notion-api.ts';
import { readSources, toSourceRecord } from '../../../src/lib/catalogue/sources.ts';
import { assembleFixtures, fixtureOptions, fixturePages, fixtures } from './helpers.ts';

const catalogue = assembleFixtures();
const tool = (origin: string) => {
	const found = catalogue.tools.find((d) => d.origin === origin);
	assert.ok(found, `${origin} is a tool`);
	return found;
};
const reported = (items: { origin?: string; message: string }[], origin: string, pattern: RegExp) =>
	items.some((item) => item.origin === origin && pattern.test(item.message));

test('(a) membership follows the best state', () => {
	assert.deepEqual(
		catalogue.ideas.map((idea) => idea.origin),
		['rdf/turtle'],
	);
	assert.deepEqual(
		catalogue.tools.map((d) => d.origin),
		['ansible/playbook', 'freeplane/mindmap', 'generic/timeline', 'jgraph/drawio', 'neo4j/cypher', 'wardley/map'],
	);
});

test('(b) every tool has exactly four hosts; draw.io is implemented in IntelliJ from Notion', () => {
	for (const d of catalogue.tools) assert.deepEqual(Object.keys(d.hosts), ['standalone', 'intellij', 'vscode', 'eclipse'], d.origin);
	const drawio = tool('jgraph/drawio');
	assert.equal(drawio.hosts.intellij.state, 'implemented');
	assert.equal(drawio.hosts.intellij.source.kind, 'notion');
	assert.equal(drawio.hosts.standalone.state, 'not-planned');
});

test('(c) implemented without a public release is not available, and a differing Notion value is kept', () => {
	const wardley = tool('wardley/map');
	assert.equal(wardley.hosts.standalone.state, 'implemented');
	assert.equal(wardley.hosts.standalone.install, null);
	assert.equal(wardley.hosts.standalone.notionDiffers, '⚗️ Prototype');
	assert.ok(reported(catalogue.report.disagreements, 'wardley/map', /Prototype/));
});

test('(d) a git SourceRecord is built from a lock entry', () => {
	const sources = readSources(join(fixtures, 'sources'));
	const lock = sources.screenshots.get('standalone')!.lock;
	const entry = lock.files.find((file) => file.path === 'standalone/mindmap.png')!;
	assert.deepEqual(toSourceRecord(lock, 'standalone/mindmap.png'), {
		kind: 'git',
		repository: 'etalii-adp/etalii.adp.ide.standalone',
		path: entry.sourcePath,
		revision: entry.commit,
		retrievedAt: lock.refreshedAt,
		licence: null,
	});
	assert.throws(() => toSourceRecord(lock, 'standalone/absent.png'), /absent\.png/);
});

test('(e) screenshots of an unlicensed source are not publishable, and the tool is pending', () => {
	const mindmap = tool('freeplane/mindmap');
	assert.equal(mindmap.screenshots.length, 1);
	assert.equal(mindmap.screenshots[0].id, 'standalone--mindmap');
	assert.equal(mindmap.screenshots[0].publishable, false);
	assert.match(mindmap.screenshots[0].caption, /^Standalone, at [0-9a-f]{7}$/);
	assert.ok(reported(catalogue.report.pending, 'freeplane/mindmap', /screenshot pending/));
});

test('(f) a rejected screenshot is not attached, and it is reported', () => {
	assert.equal(tool('generic/timeline').screenshots.length, 0);
	assert.ok(reported(catalogue.report.pending, 'generic/timeline', /timeline\.png.*rejected/));
});

test('(g) a tool below Prototype in every host has no screenshots', () => {
	assert.equal(tool('neo4j/cypher').screenshots.length, 0);
	assert.ok(reported(catalogue.report.disagreements, 'neo4j/cypher', /cypher\.png/));
});

test('(h) a relative theory link is dropped without a licence; an absolute one is kept', () => {
	const unlicensed = assembleCatalogue(fixtureOptions({}, licencedAs('unstated')));
	const theory = unlicensed.tools.find((d) => d.origin === 'wardley/map')!.theory;
	assert.deepEqual(theory, [{ title: 'Wardley maps', url: 'https://learnwardleymapping.com/' }]);

	const licensed = tool('wardley/map').theory;
	assert.equal(licensed.length, 2);
	assert.match(licensed[0].url, /^https:\/\/github\.com\/etalii-adp\/etalii\.adp\.ide\.standalone\/blob\/[0-9a-f]{40}\/docs\/theory\/wardley\.md$/);
	assert.deepEqual(tool('freeplane/mindmap').theory, [
		{ title: 'Mind map', url: 'https://en.wikipedia.org/wiki/Mind_map' },
		{ title: 'docs.freeplane.org', url: 'https://docs.freeplane.org/' },
	]);
});

test('(i) an empty Notion purpose falls back to the catalogue name and is reported', () => {
	assert.equal(tool('neo4j/cypher').purpose, 'Cypher graph');
	assert.ok(reported(catalogue.report.gaps, 'neo4j/cypher', /purpose/));
});

test('(j) an unknown focus area is reported, not dropped silently', () => {
	assert.deepEqual(tool('wardley/map').focusAreas, ['systems-and-strategy']);
	assert.ok(reported(catalogue.report.gaps, 'wardley/map', /Diagramming practice/));
});

test('(k) a Notion row without an origin is reported', () => {
	const { report } = parseNotionPages(fixturePages());
	assert.ok(report.some((item) => /Untagged row/.test(item.message) && /no Origin/.test(item.message)));
});

test('(l) a redirect from a live tool is an error', () => {
	const redirect = { from: 'wardley/map', to: null, reason: 'Test', since: '2026-09-27', source: tool('wardley/map').sources[0] };
	assert.throws(() => assembleFixtures({ 'redirects.json': [redirect] }), /redirects\.json.*wardley\/map/);
});

test('a published origin that disappeared is a membership question', () => {
	const result = assembleFixtures({ 'published.json': ['gone/away', 'wardley/map'] });
	assert.ok(reported(result.report.membership, 'gone/away', /redirect or withdrawal/));
	assert.ok(!result.report.membership.some((item) => item.origin === 'wardley/map'));
});

test('without sources, a states configuration or a Notion snapshot, the catalogue is empty and says why', () => {
	const empty = mkdtempSync(join(tmpdir(), 'adp-empty-'));
	const result = assembleCatalogue({
		sourcesRoot: join(empty, 'sources'),
		configPath: join(empty, 'states.json'),
		contentDir: 'src/content/catalogue',
		notionPath: join(empty, 'notion.json'),
	});
	assert.deepEqual(result.tools, []);
	assert.ok(result.report.gaps.some((item) => /no catalogue for standalone/.test(item.message)));
});

/** A copy of the fixture sources whose catalogue lock carries `licence`. */
function licencedAs(licence: string): string {
	const dir = mkdtempSync(join(tmpdir(), 'adp-sources-'));
	cpSync(join(fixtures, 'sources'), dir, { recursive: true });
	const lockFile = join(dir, 'catalogue', 'source.lock.json');
	const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
	for (const file of lock.files) file.licence = licence;
	writeFileSync(lockFile, JSON.stringify(lock, null, 2));
	return dir;
}

test('implemented becomes available only with a public release and a licence', () => {
	const dir = mkdtempSync(join(tmpdir(), 'adp-sources-'));
	cpSync(join(fixtures, 'sources'), dir, { recursive: true });
	const hostsFile = join(dir, 'hosts', 'hosts.json');
	const hosts = JSON.parse(readFileSync(hostsFile, 'utf8'));
	hosts[0].state = 'available';
	hosts[0].facts.latestRelease = { tag: 'v0.2.0', commit: 'a'.repeat(40) };
	hosts[0].link = 'https://github.com/etalii-adp/etalii.adp.ide.standalone/releases/tag/v0.2.0';
	writeFileSync(hostsFile, JSON.stringify(hosts, null, 2));
	const options = fixtureOptions({}, dir);

	const standalone = assembleCatalogue(options).tools.find((d) => d.origin === 'wardley/map')!.hosts.standalone;
	assert.equal(standalone.state, 'available');
	assert.deepEqual(standalone.install, { url: hosts[0].link, label: 'Install from v0.2.0' });

	const lockFile = join(dir, 'catalogue', 'source.lock.json');
	const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
	lock.files[0].licence = 'unstated';
	writeFileSync(lockFile, JSON.stringify(lock, null, 2));
	assert.equal(assembleCatalogue(options).tools.find((d) => d.origin === 'wardley/map')!.hosts.standalone.state, 'implemented');
});

// etalii.adp spec 002: a host's docs/tools.md says each tool's kind in a Kind column, which the refresh copies into
// catalogue.json; the site reads it first and falls back to Notion's Kind (or Type).
test('a kind from the host catalogue wins over Notion, which stays the fallback', () => {
	const sourcesRoot = mkdtempSync(join(tmpdir(), 'adp-sources-'));
	cpSync(join(fixtures, 'sources'), sourcesRoot, { recursive: true });
	const file = join(sourcesRoot, 'catalogue', 'standalone', 'catalogue.json');
	const rows = JSON.parse(readFileSync(file, 'utf8'));
	for (const row of rows) {
		if (row.origin === 'freeplane/mindmap') row.kind = 'editor';
		if (row.origin === 'generic/timeline') row.kind = 'designer';
	}
	writeFileSync(file, JSON.stringify(rows, null, 2));
	const kinds = Object.fromEntries(assembleCatalogue(fixtureOptions({}, sourcesRoot)).tools.map((d) => [d.origin, d.kind]));
	assert.equal(kinds['freeplane/mindmap'], 'editor', 'the Kind column over Notion\'s Diagram');
	assert.equal(kinds['generic/timeline'], 'designer', 'the Kind column where Notion says nothing');
	assert.equal(kinds['jgraph/drawio'], 'designer', 'Notion, for a row without a Kind');
	assert.equal(kinds['wardley/map'], 'diagram');
});

// etalii.adp spec 002: ideas carry a kind too, so the overview's kind filter applies to them as to the tools.
test('an idea has the kind its Notion row gives, diagram by default', () => {
	const { ideas } = assembleCatalogue(fixtureOptions({}));
	assert.ok(ideas.length > 0, 'the fixture has ideas');
	for (const idea of ideas) assert.ok(['diagram', 'designer', 'editor'].includes(idea.kind), `${idea.origin} has kind ${idea.kind}`);
});
