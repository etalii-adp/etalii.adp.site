/**
 * Mermaid rendered at build time (research D10): rehype-mermaid with the `img-svg` strategy and a dark
 * variant, which gives a `<picture>` whose dark SVG is chosen by prefers-color-scheme. No script reaches
 * the reader. Each diagram is rendered once per build, however many pages show it.
 */
import type { Element, Root } from 'hast';
import { toHtml } from 'hast-util-to-html';
import rehypeMermaid from 'rehype-mermaid';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';

const cache = new Map<string, Promise<Element>>();

/** accTitle and accDescr of a Mermaid text, when it has them. */
export function accessibleText(mermaid: string): { title: string | null; description: string | null } {
	return {
		title: /^\s*accTitle\s*:\s*(.+)$/m.exec(mermaid)?.[1].trim() ?? null,
		description: /^\s*accDescr\s*:\s*(.+)$/m.exec(mermaid)?.[1].trim() ?? null,
	};
}

function render(mermaid: string): Promise<Element> {
	if (!cache.has(mermaid)) {
		cache.set(
			mermaid,
			(async () => {
				const tree: Root = {
					type: 'root',
					children: [
						{
							type: 'element',
							tagName: 'pre',
							properties: {},
							children: [{ type: 'element', tagName: 'code', properties: { className: ['language-mermaid'] }, children: [{ type: 'text', value: mermaid }] }],
						},
					],
				};
				const result = (await unified().use(rehypeMermaid, { strategy: 'img-svg', dark: true }).run(tree)) as Root;
				return result.children[0] as Element;
			})()
		);
	}
	return cache.get(mermaid)!;
}

/** The diagram as a light/dark `<picture>` (or `<img>`) element whose alt text is `alt`. */
export async function mermaidElement(mermaid: string, alt: string): Promise<Element> {
	const element = structuredClone(await render(mermaid));
	visit(element, 'element', (node: Element) => {
		// Every render numbers its diagrams from 0, so the ids would repeat on a page with several.
		delete node.properties.id;
		if (node.tagName === 'img') {
			node.properties.alt = alt;
			delete node.properties.title;
		}
	});
	return element;
}

/** {@link mermaidElement} as HTML. */
export async function mermaidPicture(mermaid: string, alt: string): Promise<string> {
	return toHtml(await mermaidElement(mermaid, alt));
}

/** Alt text for a diagram of the prose: its accTitle and accDescr, else the paragraph before it (contracts/source-inputs.md S2). */
export function proseDiagramAlt(mermaid: string, before: string | null): { alt: string; warning: string | null } {
	const { title, description } = accessibleText(mermaid);
	if (title || description) return { alt: [title, description].filter(Boolean).join('. '), warning: null };
	return {
		alt: before?.trim() || 'Diagram; its text follows.',
		warning: 'A Mermaid diagram in the prose has no accTitle or accDescr; its alt text is taken from the paragraph before it.',
	};
}
