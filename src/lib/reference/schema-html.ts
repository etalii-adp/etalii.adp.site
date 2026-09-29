/**
 * A schema definition's JSON, pretty-printed and highlighted at build time, with every `$ref` to another
 * definition turned into a link to its anchor on the schema page (research D8), and its `description`
 * rendered as prose above it.
 */
import type { Element, ElementContent, Root, Text } from 'hast';
import { toHtml } from 'hast-util-to-html';
import { SKIP, visit } from 'unist-util-visit';
import type { LoadedVersion } from './load';
import type { LinkContext } from './remark-link-references';
import { highlightJson, referencePlugins, renderMarkdown } from './render';

const REF = /#\/\$defs\/([A-Za-z0-9_]+)/g;

/** A definition's own `description`, or null when it has none. */
export function descriptionOf(json: unknown): string | null {
	const description = json && typeof json === 'object' && !Array.isArray(json) ? (json as { description?: unknown }).description : undefined;
	return typeof description === 'string' && description.trim() ? description : null;
}

/**
 * The definition's `description` as prose, with its section numbers linked to their sections as in the
 * specification's own text. Glossary terms stay unlinked: in a hundred short paragraphs side by side they
 * would link the same few words over and over, and a property named like a term (cel) would link too.
 * Its links stay out of the link graph, so they do not add to any definition's "Described in".
 */
export async function descriptionHtml(version: LoadedVersion, segment: string, description: string): Promise<string> {
	const split = version.split();
	const context: LinkContext = {
		language: version.language.id,
		segment,
		page: 'schema',
		anchors: split.anchors,
		numbers: split.numbers,
		glossary: { terms: new Map(), page: null },
		defs: new Set(Object.keys(version.schema().$defs ?? {})),
		graph: [],
	};
	return renderMarkdown(description, referencePlugins(context));
}

/** The definition's JSON; its own `description` is left out, because the page shows it as prose above. */
export async function definitionHtml(json: unknown, names: Set<string>): Promise<string> {
	const shown = descriptionOf(json) === null ? json : Object.fromEntries(Object.entries(json as object).filter(([key]) => key !== 'description'));
	const pre = await highlightJson(JSON.stringify(shown, null, 2));
	const root: Root = { type: 'root', children: [pre] };
	visit(root, 'text', (node: Text, index, parent) => {
		if (!parent || index === undefined) return;
		const parts: ElementContent[] = [];
		let at = 0;
		for (const m of node.value.matchAll(REF)) {
			if (!names.has(m[1])) continue;
			if (m.index! > at) parts.push({ type: 'text', value: node.value.slice(at, m.index) });
			parts.push({ type: 'element', tagName: 'a', properties: { href: `#def-${m[1]}` }, children: [{ type: 'text', value: m[0] }] } as Element);
			at = m.index! + m[0].length;
		}
		if (parts.length === 0) return;
		if (at < node.value.length) parts.push({ type: 'text', value: node.value.slice(at) });
		parent.children.splice(index, 1, ...parts);
		return [SKIP, index + parts.length];
	});
	return toHtml(root);
}
