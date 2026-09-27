import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { main } from '../../../scripts/catalogue/report.ts';
import { fixtureOptions, fixtures } from './helpers.ts';

/**
 * Runs catalogue:report over a copy of the fixture sources changed by `change`, against the unchanged fixtures as
 * the baseline, with `published` as the designers that had a page.
 */
function setup(change: (rows: { origin: string; developState: string }[]) => void, published: string[]) {
	const sources = mkdtempSync(join(tmpdir(), 'adp-report-sources-'));
	cpSync(join(fixtures, 'sources'), sources, { recursive: true });
	const file = join(sources, 'catalogue', 'standalone', 'catalogue.json');
	const rows = JSON.parse(readFileSync(file, 'utf8'));
	change(rows);
	writeFileSync(file, JSON.stringify(rows, null, 2));
	const options = { ...fixtureOptions({ 'published.json': published }, sources), baseline: fixtureOptions(), reportDir: mkdtempSync(join(tmpdir(), 'adp-report-')), today: '2026-09-27' };
	return {
		options,
		run(args: string[] = []) {
			const lines: string[] = [];
			const [log, error] = [console.log, console.error];
			console.log = console.error = (...parts: unknown[]) => void lines.push(parts.join(' '));
			try {
				return { code: main(args, options), out: lines.join('\n') };
			} finally {
				[console.log, console.error] = [log, error];
			}
		},
		read: (name: string) => JSON.parse(readFileSync(join(options.contentDir, name), 'utf8')),
		report: () => readFileSync(join(options.reportDir, 'catalogue-report.md'), 'utf8'),
	};
}

const allDesigners = ['ansible/playbook', 'freeplane/mindmap', 'generic/timeline', 'jgraph/drawio', 'neo4j/cypher', 'wardley/map'];
const setState = (origin: string, state: string) => (rows: { origin: string; developState: string }[]) => {
	rows.find((row) => row.origin === origin)!.developState = state;
};
const remove = (origin: string) => (rows: { origin: string }[]) => void rows.splice(rows.findIndex((row) => row.origin === origin), 1);

test('(a) a changed state is reported per host', () => {
	const run = setup(setState('wardley/map', 'Prototype'), allDesigners);
	const { code } = run.run();
	assert.equal(code, 0);
	assert.match(run.report(), /- wardley\/map · standalone · implemented → prototype/);
});

test('(b) an idea that is now specified moves to the catalogue, with its source states', () => {
	const run = setup(setState('rdf/turtle', 'Specified'), allDesigners);
	assert.equal(run.run().code, 0);
	assert.match(run.report(), /rdf\/turtle moved from ideas to catalogue \(standalone: Identified → Specified\)/);
	assert.deepEqual(run.read('published.json'), [...allDesigners, 'rdf/turtle'].sort());
});

test('(c) a published designer that disappeared is a question: exit 3, nothing written', () => {
	const run = setup(remove('neo4j/cypher'), allDesigners);
	const { code, out } = run.run();
	assert.equal(code, 3);
	assert.match(out, /`neo4j\/cypher` is no longer in any source\. Renamed to \(origin\) or withdrawn \(reason\)\?/);
	assert.deepEqual(run.read('published.json'), allDesigners);
	assert.deepEqual(run.read('redirects.json'), []);
});

test('(d) --withdraw records the withdrawal and unpublishes the designer', () => {
	const run = setup(remove('neo4j/cypher'), allDesigners);
	const { code } = run.run(['--withdraw', 'neo4j/cypher', '--reason', 'Covered by the property-graph designer.']);
	assert.equal(code, 0);
	const [redirect] = run.read('redirects.json');
	assert.deepEqual({ ...redirect, source: redirect.source.kind }, {
		from: 'neo4j/cypher',
		to: null,
		reason: 'Covered by the property-graph designer.',
		since: '2026-09-27',
		source: 'git',
	});
	assert.ok(!run.read('published.json').includes('neo4j/cypher'));
});

test('(e) --rename needs the new origin to be a designer', () => {
	const renamed = (rows: { origin: string }[]) => void (rows.find((row) => row.origin === 'neo4j/cypher')!.origin = 'neo4j/graph');
	const run = setup(renamed, allDesigners);
	assert.equal(run.run(['--rename', 'neo4j/cypher=neo4j/nothing']).code, 2);
	assert.deepEqual(run.read('redirects.json'), []);

	assert.equal(run.run(['--rename', 'neo4j/cypher=neo4j/graph']).code, 0);
	const [redirect] = run.read('redirects.json');
	assert.equal(redirect.from, 'neo4j/cypher');
	assert.equal(redirect.to, 'neo4j/graph');
	assert.ok(run.read('published.json').includes('neo4j/graph'));
});

test('(f) a second run makes no change', () => {
	const run = setup(remove('neo4j/cypher'), allDesigners);
	run.run(['--withdraw', 'neo4j/cypher', '--reason', 'Withdrawn.']);
	const files = () => [readFileSync(join(run.options.contentDir, 'redirects.json'), 'utf8'), readFileSync(join(run.options.contentDir, 'published.json'), 'utf8')];
	const first = files();
	assert.equal(run.run().code, 0);
	assert.deepEqual(files(), first);
});

test('--no-write only reports: no question, and published.json and redirects.json stay as they are', () => {
	const run = setup(remove('neo4j/cypher'), allDesigners);
	const { code } = run.run(['--no-write']);
	assert.equal(code, 0);
	assert.match(run.report(), /## Designer catalogue/);
	assert.deepEqual(run.read('published.json'), allDesigners);
	assert.deepEqual(run.read('redirects.json'), []);
	assert.equal(run.run(['--no-write', '--withdraw', 'neo4j/cypher', '--reason', 'x']).code, 2);
});
