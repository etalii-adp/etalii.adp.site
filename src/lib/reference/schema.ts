/**
 * The schema's `$defs` as browsable definitions, grouped by the layers of Appendix A.2 (research D8).
 */
import type { Heading as MdHeading, InlineCode, RootContent, Table } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { headingNumber } from './anchors';
import type { LoadedVersion } from './load';
import type { SchemaDefinition } from './types';

export interface SchemaModel {
	definitions: SchemaDefinition[];
	/** Layer labels in the order of Appendix A.2, each with its definitions in that order. */
	layers: { label: string; names: string[] }[];
	warnings: string[];
}

function refsOf(value: unknown, into: Set<string>): Set<string> {
	if (Array.isArray(value)) value.forEach((v) => refsOf(v, into));
	else if (value && typeof value === 'object') {
		for (const [key, v] of Object.entries(value)) {
			if (key === '$ref' && typeof v === 'string') {
				const name = /^#\/\$defs\/([^/]+)$/.exec(v)?.[1];
				if (name) into.add(name);
			} else refsOf(v, into);
		}
	}
	return into;
}

/** Appendix A.2's table: layer label → `$defs` names (contracts/source-inputs.md S1). */
export function layersFromAppendix(version: LoadedVersion): { label: string; names: string[] }[] | null {
	for (const section of version.split().sections) {
		const nodes: RootContent[] = section.nodes;
		const at = nodes.findIndex((n) => n.type === 'heading' && headingNumber(toString(n as MdHeading)) === 'A.2');
		if (at < 0) continue;
		// The first table of A.2, before the next heading.
		const end = nodes.findIndex((n, i) => i > at && n.type === 'heading');
		const table = nodes.slice(at + 1, end < 0 ? undefined : end).find((n): n is Table => n.type === 'table');
		if (!table || table.children.some((row) => row.children.length !== 2)) return null;
		return table.children.slice(1).map((row) => ({
			label: toString(row.children[0]).trim(),
			names: row.children[1].children.filter((c): c is InlineCode => c.type === 'inlineCode').map((c) => c.value),
		}));
	}
	return null;
}

export function schemaModel(version: LoadedVersion): SchemaModel {
	const defs = version.schema().$defs ?? {};
	const warnings: string[] = [];
	const layers = layersFromAppendix(version);
	if (!layers) warnings.push('Appendix A.2 is not a two-column table of layers and $defs names; definitions are shown without layer grouping.');
	const layerOf = new Map<string, string>();
	for (const layer of layers ?? []) for (const name of layer.names) layerOf.set(name, layer.label);

	const definitions = Object.entries(defs).map(([name, json]) => ({
		name,
		layer: layerOf.get(name) ?? null,
		json,
		refs: [...refsOf(json, new Set())].sort(),
		anchor: `def-${name}`,
	}));
	for (const definition of definitions) {
		if (layers && !definition.layer) warnings.push(`$defs/${definition.name} is not listed in Appendix A.2.`);
	}
	for (const [name] of layerOf) {
		if (!(name in defs)) warnings.push(`Appendix A.2 lists ${name}, which the schema does not define.`);
	}
	return { definitions, layers: (layers ?? []).map((l) => ({ label: l.label, names: l.names.filter((n) => n in defs) })), warnings };
}
