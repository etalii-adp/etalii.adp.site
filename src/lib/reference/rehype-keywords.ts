/**
 * Marks the normative key words (contracts/rendering-rules.md T5, research D6): a `<strong>` whose whole
 * text is one of the RFC 2119 phrases gets `class="kw"`. The source's own rule says only bold capitals are
 * normative, so plain "must" and capitals in code are never marked.
 */
import type { Element, Root } from 'hast';
import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';

export const KEY_WORDS = new Set(['MUST', 'MUST NOT', 'REQUIRED', 'SHALL', 'SHALL NOT', 'SHOULD', 'SHOULD NOT', 'RECOMMENDED', 'MAY', 'OPTIONAL']);

export function rehypeKeywords() {
	return (tree: Root) => {
		visit(tree, 'element', (node: Element) => {
			if (node.tagName === 'strong' && KEY_WORDS.has(toString(node))) {
				node.properties.className = [...((node.properties.className as string[] | undefined) ?? []), 'kw'];
			}
		});
	};
}
