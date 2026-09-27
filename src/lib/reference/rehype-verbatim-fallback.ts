/**
 * The node-type allowlist and the verbatim fallback (contracts/rendering-rules.md B4, research D7).
 * A block that is, or holds, a node outside the allowlist is shown as its source lines in
 * `<pre class="verbatim">` with a note, rather than rendered in a way that might change its meaning.
 * The replacement happens on the Markdown tree, before any other plugin, so it sees the source as parsed;
 * {@link verbatimHandlers} turn the replacement into HTML.
 */
import type { Element } from 'hast';
import type { Nodes, Parent, Root, RootContent } from 'mdast';
import type { State } from 'mdast-util-to-hast';

export const ALLOWED = new Set([
	'root',
	'paragraph',
	'heading',
	'thematicBreak',
	'blockquote',
	'list',
	'listItem',
	'table',
	'tableRow',
	'tableCell',
	'code',
	'inlineCode',
	'emphasis',
	'strong',
	'delete',
	'link',
	'image',
	'break',
	'text',
	'footnoteDefinition',
	'footnoteReference',
]);

export const VERBATIM_NOTE = 'Shown as written in the source.';

/** Blocks that hold other blocks; the fallback looks inside them instead of replacing them whole. */
const CONTAINERS = new Set(['list', 'listItem', 'blockquote', 'footnoteDefinition']);

export interface VerbatimNode {
	type: 'verbatim';
	value: string;
}

declare module 'mdast' {
	interface RootContentMap {
		verbatim: VerbatimNode;
	}
}

function holdsDisallowed(node: Nodes): boolean {
	if (!ALLOWED.has(node.type)) return true;
	return 'children' in node && (node.children as Nodes[]).some(holdsDisallowed);
}

function sourceLines(node: Nodes, source: string): string {
	const { start, end } = node.position ?? {};
	if (!start || !end) return '';
	return source.split('\n').slice(start.line - 1, end.line).join('\n').replace(/\r$/gm, '');
}

function replaceIn(parent: Parent, source: string): void {
	parent.children = parent.children.map((child) => {
		if (ALLOWED.has(child.type) && CONTAINERS.has(child.type)) {
			replaceIn(child as Parent, source);
			return child;
		}
		if (!holdsDisallowed(child as Nodes)) return child;
		return { type: 'verbatim', value: sourceLines(child as Nodes, source) } as unknown as RootContent;
	}) as Parent['children'];
}

/** Remark plugin: replaces blocks outside the allowlist by verbatim nodes. `source` is the text the tree's positions point into. */
export function remarkVerbatimFallback(options: { source: string }) {
	return (tree: Root) => {
		replaceIn(tree, options.source);
	};
}

/** remark-rehype handlers for the verbatim node. */
export const verbatimHandlers = {
	verbatim(_state: State, node: VerbatimNode): Element {
		return {
			type: 'element',
			tagName: 'div',
			properties: { className: ['verbatim-block'] },
			children: [
				{
					type: 'element',
					tagName: 'pre',
					properties: { className: ['verbatim'] },
					children: [{ type: 'element', tagName: 'code', properties: {}, children: [{ type: 'text', value: node.value }] }],
				},
				{ type: 'element', tagName: 'p', properties: { className: ['verbatim-note'] }, children: [{ type: 'text', value: VERBATIM_NOTE }] },
			],
		};
	},
};
