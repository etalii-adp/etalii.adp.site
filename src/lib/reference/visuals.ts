/**
 * Views of an example generated from the example file itself (research D9): the metamodel as a class
 * diagram, the eight layers as a map, and a document's elements and relations. Each is Mermaid text with
 * accTitle and accDescr, captioned with the file and revision it was generated from (principle II).
 */
import type { LayerSection as SiteLayerSection } from './site';
import type { Visual } from './types';

export type LayerSection = Pick<SiteLayerSection, 'layer' | 'title' | 'href'>;

/** The eight layers of a definition and the keys that hold them (DEDL section 3). */
export const LAYERS: { layer: number; name: string; keys: string[] }[] = [
	{ layer: 1, name: 'Metamodel', keys: ['metamodel'] },
	{ layer: 2, name: 'Coordinates', keys: ['coordinates'] },
	{ layer: 3, name: 'Notation', keys: ['notation'] },
	{ layer: 4, name: 'Toolbox', keys: ['toolbox', 'forms'] },
	{ layer: 5, name: 'Constraints', keys: ['constraints'] },
	{ layer: 6, name: 'Behavior', keys: ['behavior'] },
	{ layer: 7, name: 'Layout', keys: ['layout'] },
	{ layer: 8, name: 'Persistence', keys: ['persistence'] },
];

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);

function caption(file: string, revision: string): string {
	return `Generated from \`${file}\` at \`${revision.slice(0, 7)}\``;
}

/** Mermaid text is a single line per statement; quotes and line breaks in labels are escaped. */
function label(text: string): string {
	return text.replace(/"/g, '#quot;').replace(/[\r\n]+/g, ' ');
}

function oneLine(text: string): string {
	return text.replace(/\s+/g, ' ').trim();
}

/** The definition's display name: `language.label`, in English when it is localised. */
export function localized(value: unknown): string | null {
	if (typeof value === 'string') return value;
	if (isObject(value)) {
		const en = value.en ?? Object.values(value)[0];
		return typeof en === 'string' ? en : null;
	}
	return null;
}

// -- Metamodel -------------------------------------------------------------------------------------

function typeNames(end: unknown): string[] {
	if (typeof end === 'string') return [end];
	if (Array.isArray(end)) return end.filter((e): e is string => typeof e === 'string');
	if (isObject(end) && Array.isArray(end.types)) return end.types.filter((e): e is string => typeof e === 'string');
	return [];
}

function members(attributes: unknown): string[] {
	if (!isObject(attributes)) return [];
	return Object.entries(attributes).map(([name, spec]) => {
		const type = isObject(spec) && typeof spec.type === 'string' ? spec.type : 'any';
		const many = isObject(spec) && spec.many === true ? '[]' : '';
		return `+${type}${many} ${name}`;
	});
}

function multiplicity(spec: Json): string {
	const min = typeof spec.min === 'number' ? spec.min : 0;
	const max = typeof spec.max === 'number' ? spec.max : '*';
	return min === max ? String(min) : `${min}..${max}`;
}

export function metamodelVisual(file: string, definition: Json, revision: string): Visual {
	const metamodel = isObject(definition.metamodel) ? definition.metamodel : {};
	const types = isObject(metamodel.types) ? metamodel.types : {};
	const relations = isObject(metamodel.relations) ? metamodel.relations : {};
	const name = localized(isObject(definition.language) ? definition.language.label : null) ?? file;
	const lines: string[] = [];
	const edges: string[] = [];

	for (const [typeName, spec] of Object.entries(types)) {
		const t = isObject(spec) ? spec : {};
		const body = [...(t.abstract === true ? ['<<abstract>>'] : []), ...(t.viewOnly === true ? ['<<view only>>'] : []), ...members(t.attributes)];
		lines.push(`  class ${typeName} {`, ...body.map((m) => `    ${m}`), '  }');
		for (const parent of typeNames(t.extends)) edges.push(`  ${parent} <|-- ${typeName}`);
		if (isObject(t.children)) {
			const allowed = typeNames(t.children.allowed);
			for (const child of allowed) edges.push(`  ${typeName} "1" *-- "${multiplicity(t.children)}" ${child} : contains`);
		}
	}
	for (const [relationName, spec] of Object.entries(relations)) {
		const r = isObject(spec) ? spec : {};
		const body = ['<<relation>>', ...(r.viewOnly === true ? ['<<view only>>'] : []), ...members(r.attributes)];
		lines.push(`  class ${relationName} {`, ...body.map((m) => `    ${m}`), '  }');
		for (const source of typeNames(r.source)) edges.push(`  ${relationName} --> ${source} : source`);
		for (const target of typeNames(r.target)) edges.push(`  ${relationName} --> ${target} : target`);
	}

	const typeCount = Object.keys(types).length;
	const relationCount = Object.keys(relations).length;
	const title = `Metamodel of the ${name} example`;
	const description = oneLine(
		`Class diagram of ${file}: ${typeCount} node types (${Object.keys(types).join(', ')}) and ${relationCount} relation types (${Object.keys(relations).join(', ') || 'none'}), with their typed attributes, inheritance, containment and relation ends.`
	);
	return {
		kind: 'metamodel',
		mermaid: ['classDiagram', `  accTitle: ${title}`, `  accDescr: ${description}`, ...lines, ...edges].join('\n'),
		title,
		description,
		caption: caption(file, revision),
	};
}

// -- Layer map -------------------------------------------------------------------------------------

function itemCount(value: unknown): number {
	if (Array.isArray(value)) return value.length;
	if (!isObject(value)) return value === undefined ? 0 : 1;
	return Object.values(value).reduce<number>((sum, v) => sum + (Array.isArray(v) ? v.length : isObject(v) ? Object.keys(v).length : 1), 0);
}

/** For each layer the definition fills, the number of items it declares there; absent layers are left out. */
export function layerCounts(definition: Json): Record<number, number> {
	const counts: Record<number, number> = {};
	for (const layer of LAYERS) {
		const present = layer.keys.filter((k) => definition[k] !== undefined);
		if (present.length) counts[layer.layer] = present.reduce((sum, k) => sum + itemCount(definition[k]), 0);
	}
	return counts;
}

export function layerMapVisual(file: string, definition: Json, revision: string, sections: LayerSection[]): Visual {
	const counts = layerCounts(definition);
	const nodes = LAYERS.map((layer) => {
		const title = sections.find((s) => s.layer === layer.layer)?.title ?? layer.name;
		const count = counts[layer.layer];
		return `  L${layer.layer}["${layer.layer} · ${label(title)}<br/>${count === undefined ? 'not used' : `${count} items`}"]`;
	});
	const classes = LAYERS.map((layer) => `  class L${layer.layer} ${counts[layer.layer] === undefined ? 'empty' : 'filled'}`);
	const filled = LAYERS.filter((l) => counts[l.layer] !== undefined);
	const empty = LAYERS.filter((l) => counts[l.layer] === undefined);
	const title = `Layers of ${file}`;
	const description = oneLine(
		`The eight DEDL layers in order. ${file} fills ${filled.length} of them: ${filled.map((l) => `${l.name} (${counts[l.layer]} items)`).join(', ')}.${empty.length ? ` It leaves ${empty.map((l) => l.name).join(', ')} empty.` : ''}`
	);
	return {
		kind: 'layer-map',
		mermaid: [
			'flowchart LR',
			`  accTitle: ${title}`,
			`  accDescr: ${description}`,
			...nodes,
			`  ${LAYERS.map((l) => `L${l.layer}`).join(' --> ')}`,
			'  classDef filled stroke-width:3px',
			'  classDef empty stroke-dasharray:4 4',
			...classes,
		].join('\n'),
		title,
		description,
		caption: caption(file, revision),
	};
}

// -- Document structure ----------------------------------------------------------------------------

export function documentStructureVisual(file: string, document: Json, revision: string): Visual {
	const elements = Array.isArray(document.elements) ? document.elements.filter(isObject) : [];
	const relations = Array.isArray(document.relations) ? document.relations.filter(isObject) : [];
	const nodes = elements.map((e) => {
		const attributes = isObject(e.attributes) ? e.attributes : {};
		const name = [attributes.title, attributes.name].find((v): v is string => typeof v === 'string');
		return `  ${e.id}["${label(String(e.type))}<br/>${e.id}${name ? `<br/>${label(name)}` : ''}"]`;
	});
	const parents = elements.filter((e) => typeof e.parent === 'string').map((e) => `  ${e.parent} -.->|contains| ${e.id}`);
	const edges = relations.map((r) => `  ${r.source} -->|${label(String(r.type))}| ${r.target}`);
	const title = `Structure of ${file}`;
	const description = oneLine(
		`Flowchart of the data in ${file}: ${elements.length} elements (${[...new Set(elements.map((e) => e.type))].join(', ')}) as boxes by type and id, and ${relations.length} relations (${[...new Set(relations.map((r) => r.type))].join(', ') || 'none'}) as arrows from source to target.`
	);
	return {
		kind: 'document-structure',
		mermaid: ['flowchart LR', `  accTitle: ${title}`, `  accDescr: ${description}`, ...nodes, ...parents, ...edges].join('\n'),
		title,
		description,
		caption: caption(file, revision),
	};
}
