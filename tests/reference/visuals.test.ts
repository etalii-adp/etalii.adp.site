import { describe, expect, it } from 'vitest';
import { documentStructureVisual, layerCounts, layerMapVisual, metamodelVisual, type LayerSection } from '../../src/lib/reference/visuals';
import { fixtureFile, fixtureRevision } from './fixture';

const json = (name: string) => JSON.parse(fixtureFile(name).toString('utf8'));
const statemachine = json('statemachine.dedl');
const document = json('timeline.document.json');

const sections: LayerSection[] = [
	'Metamodel',
	'Coordinate systems, placement and snapping',
	'Notation (visual definition)',
	'Toolbox, context tools and forms',
	'Constraints',
	'Behavior',
	'Layout',
	'Persistence',
].map((title, i) => ({ layer: i + 1, title, href: `/adp/dedl/0.1/layer-${i + 1}/` }));

function expectAccessible(mermaid: string) {
	expect(mermaid).toMatch(/^\s*accTitle: \S.+$/m);
	expect(mermaid).toMatch(/^\s*accDescr: \S.+$/m);
}

describe('the metamodel view (research D9)', () => {
	const visual = metamodelVisual('statemachine.dedl', statemachine, fixtureRevision);

	it('is a class diagram of node types and relation types', () => {
		expect(visual.kind).toBe('metamodel');
		expect(visual.mermaid).toMatch(/^classDiagram\b/);
		for (const type of ['Vertex', 'State', 'InitialState', 'FinalState', 'Choice', 'Comment']) expect(visual.mermaid).toMatch(new RegExp(`class ${type}\\b`));
		for (const relation of ['Transition', 'Anchor']) expect(visual.mermaid).toMatch(new RegExp(`class ${relation} \\{[^}]*<<relation>>`, 's'));
	});

	it('shows typed attributes, abstract types, inheritance and containment', () => {
		expect(visual.mermaid).toMatch(/class State \{[^}]*\+string name/s);
		expect(visual.mermaid).toMatch(/class Vertex \{[^}]*<<abstract>>/s);
		expect(visual.mermaid).toContain('Vertex <|-- State');
		expect(visual.mermaid).toMatch(/State "[^"]*" \*-- "[^"]*" Vertex : contains/);
		expect(visual.mermaid).toContain('Transition --> Vertex : source');
	});

	it('is described and captioned', () => {
		expectAccessible(visual.mermaid);
		expect(visual.title).toContain('State machine');
		expect(visual.caption).toBe('Generated from `statemachine.dedl` at `aaef333`');
	});
});

describe('the layer map', () => {
	const visual = layerMapVisual('statemachine.dedl', statemachine, fixtureRevision, sections);

	it('is a flowchart of the eight layers with the item count of each filled one', () => {
		expect(visual.kind).toBe('layer-map');
		expect(visual.mermaid).toMatch(/^flowchart\b/);
		for (let n = 1; n <= 8; n++) expect(visual.mermaid).toMatch(new RegExp(`L${n}\\["${n} · `));
		const counts = layerCounts(statemachine);
		expect(counts[1]).toBeGreaterThan(0);
		expect(visual.mermaid).toContain(`${counts[1]} items`);
		expect(visual.mermaid).toMatch(/class L1 filled/);
	});

	it('marks the layers an example leaves empty', () => {
		const partial = { ...statemachine, layout: undefined };
		const map = layerMapVisual('x.dedl', partial, fixtureRevision, sections);
		expect(map.mermaid).toMatch(/L7\["7 · Layout<br\/>not used"\]/);
		expect(map.mermaid).toMatch(/class L7 empty/);
	});

	it('is described and captioned', () => {
		expectAccessible(visual.mermaid);
		expect(visual.caption).toBe('Generated from `statemachine.dedl` at `aaef333`');
	});
});

describe('the document-structure view', () => {
	const visual = documentStructureVisual('timeline.document.json', document, fixtureRevision);

	it('is a flowchart of elements and relations by id and type', () => {
		expect(visual.kind).toBe('document-structure');
		expect(visual.mermaid).toMatch(/^flowchart\b/);
		for (const element of document.elements) expect(visual.mermaid).toContain(`${element.id}["${element.type}<br/>${element.id}`);
		for (const relation of document.relations) expect(visual.mermaid).toContain(`${relation.source} -->|${relation.type}| ${relation.target}`);
	});

	it('is described and captioned', () => {
		expectAccessible(visual.mermaid);
		expect(visual.caption).toBe('Generated from `timeline.document.json` at `aaef333`');
	});
});
