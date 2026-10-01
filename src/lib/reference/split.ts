/**
 * Splits the prose into a cover page and one page per section and appendix
 * (contracts/rendering-rules.md S1–S5, research D4).
 */
import type { Heading as MdHeading, Root, RootContent, Table } from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { buildMaps, headingId, headingNumber, pageSlug } from './anchors';
import type { Heading, Page } from './types';

export interface SplitPage {
	page: Page;
	/** The page's nodes, its own top-level heading first (except on the cover, which starts with the H1). */
	nodes: RootContent[];
}

export interface HeadingInfo {
	informative: boolean;
}

export interface Split {
	/** The H1 of the prose. */
	title: string;
	titleId: string;
	version: string;
	status: string;
	date: string;
	cover: SplitPage;
	sections: SplitPage[];
	/** Every heading of the document, in order, the H1 first. */
	headings: Heading[];
	headingInfo: Map<string, HeadingInfo>;
	anchors: Map<string, string>;
	numbers: Map<string, Heading>;
	/** The prose, for rendering nodes verbatim from their source lines. */
	source: string;
}

const TOP_LEVEL = /^(?:(\d+)\. (.+)|Appendix ([A-Z]) — (.+))$/;
const TABLE_OF_CONTENTS = 'Table of contents';

/** Parses Markdown the way the reference renders it (GFM). */
export function parseMarkdown(markdown: string): Root {
	return unified().use(remarkParse).use(remarkGfm).parse(markdown);
}

/** A heading's text as GitHub slugs it, and whether it ends in `*(informative)*` (rule T6). */
export function headingText(node: MdHeading): { text: string; informative: boolean } {
	const last = node.children.at(-1);
	const informative = last?.type === 'emphasis' && toString(last).trim() === '(informative)';
	return { text: toString(node), informative };
}

/** The heading text without `(informative)` at its end. */
export function withoutInformative(text: string): string {
	return text.replace(/\s*\(informative\)$/, '');
}

function isTopLevel(node: RootContent): node is MdHeading {
	return node.type === 'heading' && node.depth === 2;
}

function dropTrailingBreaks(nodes: RootContent[]): RootContent[] {
	const result = [...nodes];
	while (result.at(-1)?.type === 'thematicBreak') result.pop();
	return result;
}

function metadataDate(nodes: RootContent[]): string | null {
	for (const node of nodes) {
		if (node.type !== 'table') continue;
		for (const row of (node as Table).children) {
			const [key, value] = row.children.map((cell) => toString(cell).trim());
			if (key === 'Date' && /^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return value;
		}
	}
	return null;
}

export function splitProse(markdown: string): Split {
	const tree = parseMarkdown(markdown);
	const children = tree.children;

	const h1 = children.find((n): n is MdHeading => n.type === 'heading' && n.depth === 1);
	if (!h1) throw new Error('The prose has no H1 title (contracts/source-inputs.md S1).');
	const title = toString(h1);

	const versionLine = /\*\*Specification, version (\d+\.\d+(?:\.\d+)?) \(([^)]+)\)\*\*/.exec(markdown);
	if (!versionLine) throw new Error('version not declared: the prose has no line "**Specification, version <v> (<status>)**".');

	// S1: the cover runs up to the first numbered top-level heading.
	const firstSection = children.findIndex((n) => isTopLevel(n) && TOP_LEVEL.test(toString(n)));
	if (firstSection < 0) throw new Error('The prose has no numbered top-level section "## 1. …".');

	const date = metadataDate(children.slice(0, firstSection));
	if (!date) throw new Error('The prose has no metadata table with a "Date" row (YYYY-MM-DD).');

	// S2: drop "## Table of contents" and its body.
	const coverNodes: RootContent[] = [];
	let inToc = false;
	for (const node of children.slice(0, firstSection)) {
		if (isTopLevel(node)) inToc = toString(node) === TABLE_OF_CONTENTS;
		if (!inToc) coverNodes.push(node);
	}

	// S3: each top-level heading after the first section starts a page; one that is neither numbered nor an appendix
	// ("## Changes from 0.1") is a page without a number.
	const groups: RootContent[][] = [];
	for (const node of children.slice(firstSection)) {
		if (isTopLevel(node)) {
			groups.push([node]);
		} else {
			groups.at(-1)!.push(node);
		}
	}

	const headings: Heading[] = [];
	const headingInfo = new Map<string, HeadingInfo>();
	const collect = (nodes: RootContent[], page: string): Heading[] =>
		nodes
			.filter((n): n is MdHeading => n.type === 'heading')
			.map((n) => {
				const { text, informative } = headingText(n);
				const heading: Heading = { id: headingId(text), depth: n.depth, number: headingNumber(text), text, page };
				headings.push(heading);
				headingInfo.set(heading.id, { informative });
				return heading;
			});

	// S4: breaks directly before a split are dropped.
	const cover: SplitPage = {
		page: { kind: 'cover', slug: '', title, number: null, informative: false, prev: null, next: null, headings: [] },
		nodes: dropTrailingBreaks(coverNodes),
	};
	cover.page.headings = collect(cover.nodes, '');

	const sections: SplitPage[] = groups.map((group) => {
		const head = group[0] as MdHeading;
		const { text, informative } = headingText(head);
		const match = TOP_LEVEL.exec(text);
		const slug = pageSlug(text);
		const page: Page = {
			kind: 'section',
			slug,
			title: withoutInformative(match ? (match[2] ?? match[4]) : text),
			number: match ? (match[1] ?? match[3]) : null,
			informative,
			prev: null,
			next: null,
			headings: [],
		};
		const nodes = dropTrailingBreaks(group);
		page.headings = collect(nodes, slug);
		return { page, nodes };
	});
	sections.forEach((section, index) => {
		section.page.prev = sections[index - 1]?.page.slug ?? null;
		section.page.next = sections[index + 1]?.page.slug ?? null;
	});

	const slugs = new Map<string, string>();
	for (const { page } of sections) {
		const other = slugs.get(page.slug);
		if (other) throw new Error(`The headings "${other}" and "${page.headings[0].text}" give the same page slug "${page.slug}".`);
		slugs.set(page.slug, page.headings[0].text);
	}

	const { anchors, numbers } = buildMaps(headings);
	return {
		title,
		titleId: headingId(title),
		version: versionLine[1],
		status: versionLine[2],
		date,
		cover,
		sections,
		headings,
		headingInfo,
		anchors,
		numbers,
		source: markdown,
	};
}
