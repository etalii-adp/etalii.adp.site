/**
 * Turns the source's references into links and records each one in the link graph
 * (contracts/rendering-rules.md T1–T4, research D5). Text is never changed: a rule only wraps existing
 * text in a link. Code, headings and existing links are never touched.
 */
import type { Heading as MdHeading, InlineCode, Link as MdLink, Parent, PhrasingContent, Root, RootContent, Table, Text } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { headingId } from './anchors';
import { pageHref, schemaPageHref } from './site';
import type { Split } from './split';
import type { Heading, Link, LinkKind } from './types';

export interface Glossary {
	/** Lower-cased term → the term as written and the id of its entry. */
	terms: Map<string, { term: string; id: string }>;
	/** Slug of the glossary page (Appendix C), or null when there is none. */
	page: string | null;
	warning?: string;
}

export interface LinkContext {
	language: string;
	/** A version or `latest`. */
	segment: string;
	/** Slug of the page being rendered. */
	page: string;
	anchors: Map<string, string>;
	numbers: Map<string, Heading>;
	glossary: Glossary;
	/** `$defs` names of the schema (rule T3); empty to leave schema names unlinked. */
	defs: Set<string>;
	/** The link graph; every link made is pushed here. */
	graph: Link[];
}

/** The id of a glossary entry. */
export function glossaryEntryId(term: string): string {
	return `term-${headingId(term)}`;
}

/** The glossary terms: the bold first column of Appendix C's two-column table (contracts/source-inputs.md S1). */
export function glossaryOf(split: Split): Glossary {
	const appendix = split.sections.find((s) => s.page.number === 'C' && /glossary/i.test(s.page.title));
	if (!appendix) return { terms: new Map(), page: null, warning: 'There is no Appendix C glossary; glossary terms are not linked (T4).' };
	const table = appendix.nodes.find((n): n is Table => n.type === 'table');
	if (!table || table.children.some((row) => row.children.length !== 2)) {
		return { terms: new Map(), page: appendix.page.slug, warning: 'Appendix C is not a two-column table; glossary terms are not linked (T4).' };
	}
	const terms = new Map<string, { term: string; id: string }>();
	for (const row of table.children.slice(1)) {
		const first = row.children[0].children;
		if (first.length === 1 && first[0].type === 'strong') {
			const term = toString(first[0]).trim();
			terms.set(term.toLowerCase(), { term, id: glossaryEntryId(term) });
		}
	}
	return { terms, page: appendix.page.slug };
}

// -- Recognising references in text ------------------------------------------------------------------

interface Match {
	start: number;
	end: number;
	to: { page: string; fragment: string | null };
	kind: LinkKind;
}

const NUM = String.raw`\d+(?:\.\d+)*`;
const DOTTED = String.raw`(?:\d+(?:\.\d+)+|[A-Z](?:\.\d+)+)`;
const SEP = String.raw`(?:\s*[,;–]\s*|\s+(?:and|or|to)\s+)`;
/** `(12.3)`, `(12.3 step 9)`, `(see 5.8)`, `(7.1–7.4)`. */
const PARENTHESISED = new RegExp(String.raw`\((?:see\s+)?(${DOTTED}(?:${SEP}${DOTTED})*)(?=[\s),;])`, 'g');
/** `section 10`, `sections 5 and 6`. */
const SECTIONS = new RegExp(String.raw`\b[Ss]ections?\s+(${NUM}(?:${SEP}${NUM})*)`, 'g');
/** `Appendix B`, `Appendix B.7`. */
const APPENDIX = /\bAppendix\s+([A-Z](?:\.\d+)*)(?![\w.]*\w)/g;
const TOKEN = /[A-Z](?:\.\d+)+|[A-Z]$|\d+(?:\.\d+)*/g;

function numberMatches(text: string, context: LinkContext): Match[] {
	const matches: Match[] = [];
	for (const pattern of [PARENTHESISED, SECTIONS, APPENDIX]) {
		for (const m of text.matchAll(pattern)) {
			const list = m[1];
			const listStart = m.index! + m[0].lastIndexOf(list);
			for (const t of list.matchAll(TOKEN)) {
				const heading = context.numbers.get(t[0]);
				if (!heading) continue;
				const start = listStart + t.index!;
				matches.push({ start, end: start + t[0].length, to: { page: heading.page, fragment: heading.id }, kind: 'number' });
			}
		}
	}
	return matches;
}

let termPattern: { key: Map<string, { term: string; id: string }>; pattern: RegExp } | undefined;
function glossaryPattern(glossary: Glossary): RegExp | null {
	if (glossary.terms.size === 0) return null;
	if (termPattern?.key !== glossary.terms) {
		const alternatives = [...glossary.terms.values()]
			.map((t) => t.term)
			.sort((a, b) => b.length - a.length)
			.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
		termPattern = { key: glossary.terms, pattern: new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives.join('|')})(?![\\p{L}\\p{N}_])`, 'giu') };
	}
	return termPattern.pattern;
}

function overlaps(a: Match, list: Match[]): boolean {
	return list.some((b) => a.start < b.end && b.start < a.end);
}

// -- The plugin -------------------------------------------------------------------------------------

function linkNode(url: string, kind: LinkKind, children: PhrasingContent[]): MdLink {
	return { type: 'link', url, title: null, children, data: { hProperties: { className: ['ref-link', `ref-${kind}`] } } };
}

export function remarkLinkReferences(context: LinkContext) {
	return (tree: Root) => {
		const { language, segment, page, glossary, graph } = context;
		const usedTerms = new Set<string>();
		const onGlossaryPage = glossary.page === page;
		const pattern = onGlossaryPage ? null : glossaryPattern(glossary);
		let current: string | null = null;

		const record = (to: Match['to'], kind: LinkKind, text: string) => graph.push({ from: { page, heading: current }, to, kind, text });

		const splitText = (node: Text): PhrasingContent[] | null => {
			const value = node.value;
			const numbers = numberMatches(value, context);
			const terms: Match[] = [];
			if (pattern) {
				for (const m of value.matchAll(pattern)) {
					const key = m[0].toLowerCase();
					const entry = glossary.terms.get(key);
					if (!entry || usedTerms.has(key)) continue;
					const match: Match = { start: m.index!, end: m.index! + m[0].length, to: { page: glossary.page!, fragment: entry.id }, kind: 'glossary' };
					if (overlaps(match, numbers) || overlaps(match, terms)) continue;
					usedTerms.add(key);
					terms.push(match);
				}
			}
			const all = [...numbers, ...terms].sort((a, b) => a.start - b.start);
			if (all.length === 0) return null;
			const parts: PhrasingContent[] = [];
			let at = 0;
			for (const m of all) {
				if (m.start < at) continue;
				if (m.start > at) parts.push({ type: 'text', value: value.slice(at, m.start) });
				const text = value.slice(m.start, m.end);
				parts.push(linkNode(pageHref(language, segment, m.to.page, m.to.fragment), m.kind, [{ type: 'text', value: text }]));
				record(m.to, m.kind, text);
				at = m.end;
			}
			if (at < value.length) parts.push({ type: 'text', value: value.slice(at) });
			return parts;
		};

		const walk = (parent: Parent) => {
			const children: RootContent[] = [];
			for (const child of parent.children as RootContent[]) {
				if (child.type === 'heading') {
					current = headingId(toString(child as MdHeading));
					children.push(child);
					continue;
				}
				if (child.type === 'link') {
					// T1: an explicit link to an anchor of the source points at the page holding it.
					const link = child as MdLink;
					if (link.url.startsWith('#')) {
						const id = decodeURIComponent(link.url.slice(1));
						const target = context.anchors.get(id);
						if (target !== undefined) {
							link.url = pageHref(language, segment, target, id);
							record({ page: target, fragment: id }, 'anchor', toString(link));
						}
					}
					children.push(child);
					continue;
				}
				if (child.type === 'inlineCode') {
					// T3: a `$defs/Name` code span, or one equal to a `$defs` name, links to the schema browser.
					const code = child as InlineCode;
					const name = /^\$defs\/([A-Za-z0-9_]+)$/.exec(code.value)?.[1] ?? code.value;
					if (context.defs.has(name)) {
						children.push(linkNode(schemaPageHref(language, segment, name), 'schema', [code]));
						record({ page: 'schema', fragment: `def-${name}` }, 'schema', code.value);
						continue;
					}
					children.push(child);
					continue;
				}
				if (child.type === 'text') {
					const parts = splitText(child as Text);
					children.push(...((parts ?? [child]) as RootContent[]));
					continue;
				}
				if (child.type === 'table' && onGlossaryPage) {
					// Entries of the glossary get ids, so that T4 links land on them.
					for (const row of (child as Table).children.slice(1)) {
						const cell = row.children[0];
						const term = toString(cell).trim();
						if (glossary.terms.has(term.toLowerCase())) {
							cell.data = { ...(cell.data ?? {}), hProperties: { id: glossaryEntryId(term) } };
						}
					}
				}
				if ('children' in child && child.type !== 'code') walk(child as Parent);
				children.push(child);
			}
			parent.children = children as Parent['children'];
		};

		walk(tree);
	};
}
