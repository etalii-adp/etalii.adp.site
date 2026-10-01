import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { after, before, describe, it } from 'node:test';
import { makeRepo } from '../fixtures/repo.mjs';
import { makeSite } from '../fixtures/site.mjs';

const CATALOGUE = 'docs/tools.md';
const markdown = readFileSync(fileURLToPath(new URL('../fixtures/standalone/docs/tools.md', import.meta.url)), 'utf8');
const cleanups = [];
after(() => cleanups.forEach((fn) => fn()));

const row = (state, origin, name) => `    <tr><td style="white-space: nowrap;">${state}</td><td style="white-space: nowrap;"><code>${origin}</code></td><td>${name}</td><td>—</td><td>—</td></tr>\n`;
const withRow = (md, extra) => md.replace('  </tbody>', `${extra}  </tbody>`);
const setState = (md, origin, from, to) => md.replace(`${from}</td><td style="white-space: nowrap;"><code>${origin}</code>`, `${to}</td><td style="white-space: nowrap;"><code>${origin}</code>`);

/** Standalone with the fixture catalogue released as v1.0.0; VS Code with one Implemented row and no release; the others empty. */
function setup() {
	const standalone = makeRepo({ [CATALOGUE]: markdown }, { tags: ['v1.0.0'] });
	const vscode = makeRepo({ [CATALOGUE]: `<table><tr><th>State</th><th>Origin</th><th>Diagram</th><th>Theory</th><th>Example</th></tr>\n${row('✅&nbsp;Implemented', 'generic/timeline', 'Timeline')}</table>\n` });
	const intellij = makeRepo({ 'README.md': 'FreeMind and draw.io tools, described in prose only.\n' });
	const eclipse = makeRepo({ 'README.md': 'eclipse\n' });
	const site = makeSite();
	cleanups.push(standalone.cleanup, vscode.cleanup, intellij.cleanup, eclipse.cleanup, site.cleanup);
	const repos = { standalone, vscode, intellij, eclipse };
	const args = Object.entries(repos).flatMap(([host, repo]) => ['--source', `etalii-adp/etalii.adp.ide.${host}=${repo.dir}`]);
	return { ...repos, site, run: (mode = '--dry-run') => site.refresh(['catalogue', mode, ...args]) };
}

describe('refresh-catalogue', () => {
	let env;
	const entry = (host, origin) => env.site.json(`sources/catalogue/${host}/catalogue.json`).find((e) => e.origin === origin);
	before(() => {
		env = setup();
		const first = env.run('--no-deliver');
		assert.equal(first.code, 0, first.output);
		env.site.accept('catalogue');
	});

	it('writes the verbatim catalogue and catalogue.json with mapped states', () => {
		assert.equal(env.site.read('sources/catalogue/standalone/tools.md'), markdown);
		assert.deepEqual(entry('standalone', 'freeplane/mindmap'), {
			origin: 'freeplane/mindmap',
			name: 'Mind map (radial/hierarchical, single central topic)',
			group: '10. Knowledge & informal modeling',
			developState: 'Prototype',
			releaseState: 'Prototype',
			state: 'prototype',
			theory: [{ label: 'Freeplane', href: 'https://www.freeplane.org/' }],
			example: [{ label: 'Freeplane example maps', href: 'https://www.freeplane.org/wiki/index.php/Gallery' }],
		});
		assert.equal(entry('standalone', 'generic/timeline').state, 'implemented');
		assert.equal(entry('standalone', 'c4/code').state, 'planned');
	});

	it('(d) shows a tool of a host without a release at its mapped state, never lowered', () => {
		assert.equal(entry('vscode', 'generic/timeline').state, 'implemented');
		assert.equal(entry('vscode', 'generic/timeline').releaseState, null);
	});

	it('(g) reports a host without docs/tools.md without failing', () => {
		assert.ok(!env.site.exists('sources/catalogue/intellij'));
		assert.match(env.site.read('.refresh/pr-body.md'), /- intellij: no catalogue at `docs\/tools\.md` in etalii-adp\/etalii\.adp\.ide\.intellij/);
	});

	it('(a) shows a tool implemented on develop as implemented, recording the release state', () => {
		env.standalone.commit({ [CATALOGUE]: setState(markdown, 'freeplane/mindmap', '⚗️&nbsp;Prototype', '✅&nbsp;Implemented') });
		const result = env.run('--no-deliver');
		assert.equal(result.code, 0, result.output);
		const summary = env.site.json('.refresh/summary.json');
		assert.deepEqual(summary.details.changes, [{ host: 'standalone', origin: 'freeplane/mindmap', from: 'prototype', to: 'implemented', developState: 'Implemented', releaseState: 'Prototype' }]);
		assert.ok(summary.files.some((f) => f.path === 'sources/catalogue/standalone/tools.md' && f.change === 'changed'));
		assert.equal(entry('standalone', 'freeplane/mindmap').state, 'implemented');
		env.site.accept('catalogue');
	});

	it('(b) records the new release state once a release has it, listing only that tool', () => {
		env.standalone.tag('v9.9.9');
		const result = env.run('--no-deliver');
		assert.equal(result.code, 0, result.output);
		const summary = env.site.json('.refresh/summary.json');
		assert.deepEqual(summary.details.changes.map((c) => [c.origin, c.from, c.to]), [['freeplane/mindmap', 'implemented', 'implemented']]);
		assert.match(env.site.read('.refresh/pr-body.md'), /\| `freeplane\/mindmap` \| standalone \| implemented \(unchanged\) \| Implemented \| Implemented \|/);
		assert.equal(env.site.json('sources/catalogue/source.lock.json').releases['etalii-adp/etalii.adp.ide.standalone'].tag, 'v9.9.9');
		env.site.accept('catalogue');
	});

	it('(c, f) shows a row absent from the release at its mapped state, and lists added and withdrawn tools', () => {
		const next = withRow(env.standalone.git(['show', `HEAD:${CATALOGUE}`]), row('✅&nbsp;Implemented', 'w3c/sparql', 'SPARQL query')).replace(/<tr>.*<code>uml\/class<\/code>.*<\/tr>\n/, '');
		env.standalone.commit({ [CATALOGUE]: next });
		const result = env.run();
		assert.equal(result.code, 0, result.output);
		const { details } = env.site.json('.refresh/summary.json');
		assert.deepEqual(details.added, [{ host: 'standalone', origin: 'w3c/sparql', name: 'SPARQL query', state: 'implemented' }]);
		assert.deepEqual(details.withdrawn, [{ host: 'standalone', origin: 'uml/class', name: 'Class diagram', state: 'idea' }]);
	});

	it('(h) fails on a duplicate origin, naming both rows', () => {
		const doubled = env.standalone.git(['show', `HEAD:${CATALOGUE}`]).replace('<code>c4/container</code>', '<code>c4/context</code>');
		env.standalone.commit({ [CATALOGUE]: doubled });
		const result = env.run();
		assert.equal(result.code, 2, result.output);
		assert.match(result.stdout, /duplicate origin "c4\/context" in the catalogue: line \d+ \(System Context\) and line \d+ \(Container\)/);
	});
});

describe('refresh-catalogue decisions', () => {
	it('(e) asks how an unknown source state maps, and a re-run after the answer delivers the mapping with it', () => {
		const env = setup();
		env.standalone.commit({ [CATALOGUE]: setState(markdown, 'wardley/map', '⚗️&nbsp;Prototype', '🧪&nbsp;Experimental') });
		const result = env.run();
		assert.equal(result.code, 3, result.output);
		assert.match(result.stdout, /outcome: needs-decision/);
		const decision = env.site.json('.refresh/decision.json');
		assert.equal(decision.question, 'How should the source state "Experimental" in standalone map to a site state?');
		assert.deepEqual(decision.options, env.site.json('procedures/config/states.json').siteStates);
		assert.equal(decision.writeTo, 'procedures/config/states.json');
		assert.deepEqual(decision.key, ['mappings', 'standalone', 'Experimental']);

		assert.equal(env.site.decide('catalogue', 'prototype').code, 0);
		const again = env.run();
		assert.equal(again.code, 0, again.output);
		assert.match(again.stdout, /outcome: delivered/);
		assert.ok(env.site.json('.refresh/summary.json').files.some((f) => f.path === 'procedures/config/states.json'));
		assert.match(env.site.read('.refresh/diff.patch'), /^\+\s+"Experimental": "prototype"$/m);
	});
});

describe('refresh-catalogue on docs/tools.md (etalii.adp spec 002)', () => {
	it('copies the Kind column of docs/tools.md, keeping the release state from the release', () => {
		const env = setup();
		const tools = markdown.replace('<th>Diagram</th>', '<th>Kind</th><th>Tool</th>').replace('<code>freeplane/mindmap</code></td>', '<code>freeplane/mindmap</code></td><td>Editor</td>').replace(/(<code>(?!freeplane\/mindmap)[^<]+<\/code><\/td>)/g, '$1<td>Diagram</td>');
		env.standalone.commit({ [CATALOGUE]: tools });
		const result = env.run('--no-deliver');
		assert.equal(result.code, 0, result.output);
		assert.equal(env.site.read('sources/catalogue/standalone/tools.md'), tools);
		const lock = env.site.json('sources/catalogue/source.lock.json');
		assert.equal(lock.files.find((f) => f.path === 'standalone/tools.md').sourcePath, 'docs/tools.md');
		const mindmap = env.site.json('sources/catalogue/standalone/catalogue.json').find((e) => e.origin === 'freeplane/mindmap');
		assert.equal(mindmap.name, 'Mind map (radial/hierarchical, single central topic)');
		assert.equal(mindmap.releaseState, 'Prototype');
		assert.equal(mindmap.kind, 'editor', 'the Kind column is copied');
		assert.equal(env.site.json('sources/catalogue/standalone/catalogue.json').find((e) => e.origin === 'c4/context').kind, 'diagram');
		assert.ok(!('kind' in env.site.json('sources/catalogue/vscode/catalogue.json')[0]), 'no Kind column, no kind');
	});

	it('no longer reads docs/diagrams.md: a host with only that file has no catalogue (T064)', () => {
		const env = setup();
		const old = env.vscode.git(['show', `HEAD:${CATALOGUE}`]);
		env.vscode.commit({ [CATALOGUE]: null, 'docs/diagrams.md': old });
		const result = env.run('--no-deliver');
		assert.equal(result.code, 0, result.output);
		assert.ok(!env.site.exists('sources/catalogue/vscode'));
		assert.ok(!env.site.json('sources/catalogue/source.lock.json').files.some((f) => f.sourcePath === 'docs/diagrams.md'));
		assert.match(env.site.read('.refresh/pr-body.md'), /- vscode: no catalogue at `docs\/tools\.md` in etalii-adp\/etalii\.adp\.ide\.vscode/);
	});
});
