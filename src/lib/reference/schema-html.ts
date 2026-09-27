/**
 * A schema definition's JSON, pretty-printed and highlighted at build time, with every `$ref` to another
 * definition turned into a link to its anchor on the schema page (research D8).
 */
import type { Element, ElementContent, Root, Text } from 'hast';
import { toHtml } from 'hast-util-to-html';
import { SKIP, visit } from 'unist-util-visit';
import { highlightJson } from './render';

const REF = /#\/\$defs\/([A-Za-z0-9_]+)/g;

export async function definitionHtml(json: unknown, names: Set<string>): Promise<string> {
	const pre = await highlightJson(JSON.stringify(json, null, 2));
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
