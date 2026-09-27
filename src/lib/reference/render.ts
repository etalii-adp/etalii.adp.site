/**
 * Renders a page of the prose to HTML: remark-parse → remark-gfm → remark plugins → remark-rehype →
 * rehype plugins → rehype-stringify. Every transformation it applies is listed in
 * contracts/rendering-rules.md; none changes text.
 */
import type { Element, ElementContent, Root as HastRoot } from 'hast';
import { toString as hastToString } from 'hast-util-to-string';
import type { Heading as MdHeading, Root, RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import rehypeStringify from 'rehype-stringify';
import remarkRehype from 'remark-rehype';
import { createHighlighter, type Highlighter } from 'shiki';
import { unified, type PluggableList } from 'unified';
import { visit, SKIP } from 'unist-util-visit';
import { headingId } from './anchors';
import { remarkVerbatimFallback, verbatimHandlers } from './rehype-verbatim-fallback';
import { parseMarkdown } from './split';

/** A heading as Starlight's "On this page" list takes it. */
export interface RenderedHeading {
	depth: number;
	slug: string;
	text: string;
}

export interface RenderOptions {
	/** The text the nodes' positions point into, for the verbatim fallback. */
	source: string;
	/** Rendered heading level = source level − shift (1 on section pages, whose H2 is the page title). */
	shift?: number;
	/** Remark plugins, run after the verbatim fallback and the heading ids, in order. */
	remarkPlugins?: PluggableList;
	/** Rehype plugins, run after tables, code and highlighting, in order. */
	rehypePlugins?: PluggableList;
}

export interface Rendered {
	html: string;
	headings: RenderedHeading[];
}

// -- Remark: heading ids (S5) and levels ------------------------------------------------------------

function remarkHeadingIds(options: { shift: number }) {
	return (tree: Root) => {
		visit(tree, 'heading', (node: MdHeading) => {
			const data = (node.data ??= {});
			const depth = Math.min(6, Math.max(1, node.depth - options.shift));
			data.hName = `h${depth}`;
			data.hProperties = { ...(data.hProperties ?? {}), id: headingId(toString(node)) };
		});
	};
}

// -- Rehype: tables (B2), focusable code blocks, JSON highlighting (B1) ------------------------------

function cellTexts(table: Element): string[] {
	const head = table.children.find((c): c is Element => c.type === 'element' && c.tagName === 'thead');
	const row = head?.children.find((c): c is Element => c.type === 'element' && c.tagName === 'tr');
	return (row?.children ?? []).filter((c): c is Element => c.type === 'element').map((c) => hastToString(c).trim());
}

function rehypeTableRegions() {
	return (tree: HastRoot) => {
		visit(tree, 'element', (node: Element, index, parent) => {
			if (node.tagName !== 'table' || !parent || index === undefined) return;
			const columns = cellTexts(node).filter(Boolean);
			const wrapper: Element = {
				type: 'element',
				tagName: 'div',
				properties: { className: ['table-scroll'], role: 'region', tabIndex: 0, ariaLabel: columns.length ? `Table: ${columns.join(', ')}` : 'Table' },
				children: [node],
			};
			parent.children[index] = wrapper;
			return SKIP;
		});
	};
}

let highlighter: Promise<Highlighter> | undefined;
export function getHighlighter(): Promise<Highlighter> {
	highlighter ??= createHighlighter({ themes: ['github-light', 'github-dark'], langs: ['json'] });
	return highlighter;
}

/** Highlights JSON text to a `<pre class="shiki">` element; the text is unchanged. */
export async function highlightJson(code: string): Promise<Element> {
	const hast = (await getHighlighter()).codeToHast(code, {
		lang: 'json',
		themes: { light: 'github-light', dark: 'github-dark' },
		defaultColor: false,
	});
	return hast.children[0] as Element;
}

function rehypeCode() {
	return async (tree: HastRoot) => {
		const jobs: Promise<void>[] = [];
		visit(tree, 'element', (node: Element, index, parent) => {
			if (node.tagName !== 'pre' || !parent || index === undefined) return;
			const classes = (node.properties.className as string[] | undefined) ?? [];
			if (classes.includes('verbatim')) return SKIP;
			const code = node.children.find((c): c is Element => c.type === 'element' && c.tagName === 'code');
			const language = ((code?.properties.className as string[] | undefined) ?? []).find((c) => c.startsWith('language-'));
			if (code && language === 'language-json') {
				jobs.push(
					highlightJson(hastToString(code).replace(/\n$/, '')).then((pre) => {
						parent.children[index] = pre as ElementContent;
					})
				);
			} else {
				node.properties.tabIndex = 0;
			}
			return SKIP;
		});
		await Promise.all(jobs);
	};
}

// -- The pipeline ------------------------------------------------------------------------------------

function collectHeadings(tree: HastRoot): RenderedHeading[] {
	const headings: RenderedHeading[] = [];
	visit(tree, 'element', (node: Element) => {
		const match = /^h([1-6])$/.exec(node.tagName);
		if (match && typeof node.properties.id === 'string') {
			const clone: Element = { ...node, children: node.children.filter((c) => !(c.type === 'element' && (c.properties.className as string[] | undefined)?.includes('heading-link'))) };
			headings.push({ depth: Number(match[1]), slug: node.properties.id, text: hastToString(clone).trim() });
		}
	});
	return headings;
}

/** Renders Markdown nodes (with positions into `options.source`) to HTML. */
export async function renderNodes(nodes: RootContent[], options: RenderOptions): Promise<Rendered> {
	const root: Root = { type: 'root', children: structuredClone(nodes) };
	const mdast = await unified()
		.use(remarkVerbatimFallback, { source: options.source })
		.use(remarkHeadingIds, { shift: options.shift ?? 0 })
		.use(options.remarkPlugins ?? [])
		.run(root);
	const hast = (await unified()
		.use(remarkRehype, { handlers: verbatimHandlers as never })
		.use(rehypeTableRegions)
		.use(rehypeCode)
		.use(options.rehypePlugins ?? [])
		.run(mdast as Root)) as HastRoot;
	const headings = collectHeadings(hast);
	const html = unified().use(rehypeStringify).stringify(hast);
	return { html, headings };
}

/** Renders a Markdown text with the default pipeline (tests and small fragments). */
export async function renderMarkdown(markdown: string, options: Partial<RenderOptions> = {}): Promise<string> {
	const tree = parseMarkdown(markdown);
	return (await renderNodes(tree.children, { source: markdown, ...options })).html;
}
