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
import type { LoadedVersion } from './load';
import { rehypeKeywords } from './rehype-keywords';
import { remarkVerbatimFallback, verbatimHandlers } from './rehype-verbatim-fallback';
import { glossaryOf, remarkLinkReferences, type Glossary, type LinkContext } from './remark-link-references';
import { parseMarkdown } from './split';
import type { Link } from './types';

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

// -- T6: informative headings ------------------------------------------------------------------------

/** A heading ending in `(informative)` keeps its text and gets an "Informative" label beside it. */
function rehypeInformative() {
	return (tree: HastRoot) => {
		visit(tree, 'element', (node: Element) => {
			if (!/^h[1-6]$/.test(node.tagName)) return;
			const last = node.children.at(-1);
			if (last?.type === 'element' && last.tagName === 'em' && hastToString(last).trim() === '(informative)') {
				node.properties.className = [...((node.properties.className as string[] | undefined) ?? []), 'ref-informative-heading'];
				node.children.push({
					type: 'element',
					tagName: 'span',
					properties: { className: ['ref-informative'], ariaHidden: 'true' },
					children: [{ type: 'text', value: 'Informative' }],
				});
			}
		});
	};
}

// -- Heading links (FR-005) --------------------------------------------------------------------------

/**
 * Gives every heading of level 2–6 a visible, keyboard-reachable link to itself, beside the heading and
 * never inside its text, so that the heading's own text and accessible name stay as in the source.
 */
function rehypeHeadingLinks() {
	return (tree: HastRoot) => {
		visit(tree, 'element', (node: Element, index, parent) => {
			if (!/^h[2-6]$/.test(node.tagName) || !parent || index === undefined || typeof node.properties.id !== 'string') return;
			const label = hastToString({ ...node, children: node.children.filter((c) => !(c.type === 'element' && (c.properties.className as string[] | undefined)?.includes('ref-informative'))) }).trim();
			parent.children[index] = {
				type: 'element',
				tagName: 'div',
				properties: { className: ['ref-heading', `ref-heading-${node.tagName}`] },
				children: [
					node,
					{
						type: 'element',
						tagName: 'a',
						properties: { className: ['heading-link'], href: `#${node.properties.id}`, ariaLabel: `Link to ${label}` },
						children: [{ type: 'element', tagName: 'span', properties: { ariaHidden: 'true' }, children: [{ type: 'text', value: '#' }] }],
					},
				],
			};
			return SKIP;
		});
	};
}

// -- A whole version ---------------------------------------------------------------------------------

export interface RenderedVersion {
	/** Page slug (empty for the cover) → its rendered body, without the page's own title heading. */
	pages: Map<string, Rendered>;
	/** Every link the linker made, across all pages (research D5). */
	graph: Link[];
	glossary: Glossary;
}

/** The remark and rehype plugins of a reference page, in the order of contracts/rendering-rules.md. */
export function referencePlugins(context: LinkContext): Pick<RenderOptions, 'remarkPlugins' | 'rehypePlugins'> {
	return {
		remarkPlugins: [[remarkLinkReferences, context]],
		rehypePlugins: [rehypeKeywords, rehypeInformative, rehypeHeadingLinks],
	};
}

const versions = new Map<string, Promise<RenderedVersion>>();

/** Renders every page of a version once, for one address segment (the version or `latest`). */
export function renderVersion(version: LoadedVersion, segment: string): Promise<RenderedVersion> {
	const key = `${version.dir}::${segment}`;
	if (!versions.has(key)) versions.set(key, doRenderVersion(version, segment));
	return versions.get(key)!;
}

async function doRenderVersion(version: LoadedVersion, segment: string): Promise<RenderedVersion> {
	const split = version.split();
	const glossary = glossaryOf(split);
	const graph: Link[] = [];
	const pages = new Map<string, Rendered>();
	const parts = [split.cover, ...split.sections];
	for (const part of parts) {
		const context: LinkContext = {
			language: version.language.id,
			segment,
			page: part.page.slug,
			anchors: split.anchors,
			numbers: split.numbers,
			glossary,
			defs: new Set(),
			graph,
		};
		// The page's own title heading (the H1 on the cover, the H2 of a section) is the page title.
		const body = part.nodes.filter((n, i) => !(i === 0 && n.type === 'heading') && !(n.type === 'heading' && n.depth === 1));
		pages.set(part.page.slug, await renderNodes(body, { source: split.source, shift: part.page.kind === 'cover' ? 0 : 1, ...referencePlugins(context) }));
	}
	return { pages, graph, glossary };
}
