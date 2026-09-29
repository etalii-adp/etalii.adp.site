import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { CATALOGUE_PATHS, catalogueFileOf, designersFor, isUnderway, isUsable, mapState, parseCatalogue, stripStateEmoji } from './catalogue-table.mjs';

const markdown = readFileSync(new URL('../fixtures/standalone/docs/diagrams.md', import.meta.url), 'utf8');
const states = JSON.parse(readFileSync(new URL('../../../procedures/config/states.json', import.meta.url), 'utf8'));

describe('parseCatalogue', () => {
	const rows = parseCatalogue(markdown);
	const row = (origin) => rows.find((r) => r.origin === origin);

	it('reads every designer row and skips the group rows', () => {
		assert.equal(rows.length, 11);
		assert.deepEqual(rows.slice(0, 3).map((r) => r.origin), ['uml/class', 'c4/context', 'c4/container']);
	});

	it('reads origin, name, group, state, theory and example', () => {
		assert.deepEqual(row('freeplane/mindmap'), {
			origin: 'freeplane/mindmap',
			name: 'Mind map (radial/hierarchical, single central topic)',
			group: '10. Knowledge & informal modeling',
			developState: 'Prototype',
			theory: [{ label: 'Freeplane', href: 'https://www.freeplane.org/' }],
			example: [{ label: 'Freeplane example maps', href: 'https://www.freeplane.org/wiki/index.php/Gallery' }],
		});
	});

	it('takes the nearest <h3> or <h4> as the group', () => {
		assert.equal(row('uml/class').group, '1a. Structural diagrams');
		assert.equal(row('c4/context').group, '2. The C4 Model');
	});

	it('keeps <code> text, reads text-only cells as a reference without a link, and "—" as none', () => {
		assert.equal(row('generic/timeline').name, 'Timeline diagram (.tml — Timeline Markup Language)');
		assert.deepEqual(row('generic/timeline').theory, [{ label: 'Distinct from mermaid/gantt: placement is authored on both axes', href: null }]);
		assert.deepEqual(row('generic/timeline').example, []);
		assert.equal(row('azure-devops/pipeline').theory.length, 2);
	});

	it('reads Markdown ### headings as groups too', () => {
		const md = `### Loose group\n\n<table><tr><th>State</th><th>Origin</th><th>Diagram</th><th>Theory</th><th>Example</th></tr>\n<tr><td>✅&nbsp;Implemented</td><td><code>a/b</code></td><td>AB</td><td>—</td><td>—</td></tr></table>`;
		assert.equal(parseCatalogue(md)[0].group, 'Loose group');
	});

	it('fails on a duplicate origin, naming both rows', () => {
		const doubled = markdown.replace('<code>c4/container</code>', '<code>c4/context</code>');
		assert.throws(() => parseCatalogue(doubled), (error) => /duplicate origin "c4\/context"/.test(error.message) && /System Context/.test(error.message) && /Container/.test(error.message));
	});
});

describe('stripStateEmoji and mapState', () => {
	it('strips the emoji before lookup', () => {
		assert.equal(stripStateEmoji('⚗️ Prototype'), 'Prototype');
		assert.equal(stripStateEmoji('🛠️ Work-in-progress'), 'Work-in-progress');
		assert.equal(stripStateEmoji('⏸️ To-do'), 'To-do');
	});

	it('maps a known label and reports an unknown one', () => {
		assert.equal(mapState('standalone', 'Implemented', states), 'implemented');
		assert.equal(mapState('standalone', 'To-do', states), 'planned');
		assert.equal(mapState('standalone', 'Not planned', states), 'not-planned');
		assert.deepEqual(mapState('standalone', 'Experimental', states), { unmapped: 'Experimental' });
	});
});

describe('isUsable and isUnderway', () => {
	it('counts prototype, implemented and available as usable (spec 003, 2026-09-27)', () => {
		for (const state of ['prototype', 'implemented', 'available']) assert.equal(isUsable(state), true, state);
		for (const state of ['not-planned', 'idea', 'planned', 'in-progress']) assert.equal(isUsable(state), false, state);
	});

	it('counts in-progress and later as underway', () => {
		assert.equal(isUnderway('in-progress'), true);
		assert.equal(isUnderway('implemented'), true);
		assert.equal(isUnderway('planned'), false);
	});
});

// etalii.adp spec 002 renames a host's docs/diagrams.md to docs/tools.md ("Tool types", with a Kind column); until its
// Part 7 the refresh reads either.
describe('the catalogue as docs/tools.md or docs/diagrams.md', () => {
	const tools = markdown.replace('<tr><th>State</th><th>Origin</th><th>Diagram</th>', '<tr><th>State</th><th>Origin</th><th>Kind</th><th>Tool</th>').replace(/(<td style="white-space: nowrap;"><code>[^<]+<\/code><\/td>)/g, '$1<td>Diagram</td>');
	const reader = (files) => ({ async readFileAt(ref, path) { return files[`${ref}:${path}`] ?? null; } });

	it('tries docs/tools.md first', () => {
		assert.deepEqual(CATALOGUE_PATHS, ['docs/tools.md', 'docs/diagrams.md']);
		assert.equal(catalogueFileOf([{ sourcePath: 'docs/diagrams.md' }, { sourcePath: 'docs/tools.md' }]).sourcePath, 'docs/tools.md');
		assert.equal(catalogueFileOf([{ sourcePath: 'docs/diagrams.md' }]).sourcePath, 'docs/diagrams.md');
		assert.equal(catalogueFileOf([{ sourcePath: 'README.md' }]), undefined);
	});

	it('reads a "Tool" name column as it reads "Diagram", and a "Kind" column as the kind of each row', () => {
		assert.notEqual(tools, markdown);
		const rows = parseCatalogue(tools);
		assert.ok(rows.every((row) => row.kind === 'diagram'));
		assert.deepEqual(rows.map(({ kind, ...row }) => row), parseCatalogue(markdown));
		assert.ok(parseCatalogue(markdown).every((row) => !('kind' in row)), 'docs/diagrams.md has no Kind column, so no kind');
	});

	it('reads Diagram, Designer and Editor in the Kind column, and an empty one as none', () => {
		const table = (kind) => `<table><tr><th>State</th><th>Origin</th><th>Kind</th><th>Tool</th></tr><tr><td>Idea</td><td><code>a/b</code></td><td>${kind}</td><td>A tool</td></tr></table>`;
		assert.equal(parseCatalogue(table('Editor'))[0].kind, 'editor');
		assert.equal(parseCatalogue(table('Designer'))[0].kind, 'designer');
		assert.equal(parseCatalogue(table('Diagram'))[0].kind, 'diagram');
		assert.equal(parseCatalogue(table('—'))[0].kind, null);
		assert.equal(parseCatalogue(table('Editor'))[0].name, 'A tool');
		assert.throws(() => parseCatalogue(table('Widget')), /unknown kind "Widget" at line \d+ \(A tool\): one of Diagram, Designer, Editor/);
	});

	it('refuses a table without a name column, naming the columns it found', () => {
		assert.throws(() => parseCatalogue('<table><tr><th>State</th><th>Origin</th><th>Label</th></tr><tr><td>Idea</td><td>a/b</td><td>x</td></tr></table>'), /no name column: one of diagram, tool, name, tool type \(found state, origin, label\)/);
	});

	it('reads docs/tools.md at develop and falls back to docs/diagrams.md at the release', async () => {
		const found = await designersFor('standalone', reader({ 'head:docs/tools.md': tools, 'head:docs/diagrams.md': 'stale', 'v1:docs/diagrams.md': markdown }), { head: 'head', release: { commit: 'v1' }, states });
		assert.equal(found.path, 'docs/tools.md');
		assert.equal(found.entries.length, 11);
		assert.equal(found.entries.find((e) => e.origin === 'freeplane/mindmap').releaseState, 'Prototype');
	});

	it('falls back to docs/diagrams.md at develop, and reports a host with neither as missing', async () => {
		const found = await designersFor('standalone', reader({ 'head:docs/diagrams.md': markdown }), { head: 'head', release: null, states });
		assert.equal(found.path, 'docs/diagrams.md');
		assert.equal(found.entries.length, 11);
		assert.deepEqual(await designersFor('standalone', reader({}), { head: 'head', release: null, states }), { missingCatalogue: true });
	});
});
