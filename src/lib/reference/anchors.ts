/**
 * Heading ids, heading numbers and page slugs (research D4, rendering rule S5).
 * Heading ids are exactly GitHub's, so a link written against the source on GitHub maps onto the site.
 */
import { slug } from 'github-slugger';
import type { Heading } from './types';

/** Page slugs that are addresses of their own under a version or a language (contracts/site-addresses.md). */
export const RESERVED_SLUGS = ['latest', 'schema', 'search', 'examples'] as const;

/** The GitHub slug of a heading's text, without GitHub's `-1` suffix for repeats (repeats fail in {@link buildMaps}). */
export function headingId(text: string): string {
	return slug(text);
}

/** The leading number of a heading: `4`, `5.10`, `A.2`, or the letter of `Appendix C — …`; null when there is none. */
export function headingNumber(text: string): string | null {
	const appendix = /^Appendix ([A-Z])\b/.exec(text);
	if (appendix) return appendix[1];
	const numbered = /^(\d+(?:\.\d+)*|[A-Z](?:\.\d+)+)\.?\s/.exec(text);
	return numbered ? numbered[1] : null;
}

/**
 * The page slug of a top-level heading: its GitHub slug without the leading number, runs of `-` collapsed. When that
 * slug is reserved, the number stays (`10. Examples` gives `10-examples`), so a specification need not know the site's
 * addresses; an unnumbered heading that gives a reserved slug is refused.
 */
export function pageSlug(text: string): string {
	const collapse = (value: string): string => value.replace(/-{2,}/g, '-').replace(/^-|-$/g, '');
	const numbered = collapse(headingId(text));
	let result = collapse(headingId(text).replace(/^\d+-/, ''));
	if ((RESERVED_SLUGS as readonly string[]).includes(result)) result = numbered;
	if ((RESERVED_SLUGS as readonly string[]).includes(result)) {
		throw new Error(`The heading "${text}" gives the page slug "${result}", which is reserved (contracts/site-addresses.md).`);
	}
	return result;
}

export interface AnchorMaps {
	/** Heading id → page slug. */
	anchors: Map<string, string>;
	/** Heading number → heading. */
	numbers: Map<string, Heading>;
}

/** The anchor map and the number map of a document; fails when two headings share an id, naming both. */
export function buildMaps(headings: readonly Heading[]): AnchorMaps {
	const byId = new Map<string, Heading>();
	const numbers = new Map<string, Heading>();
	for (const heading of headings) {
		const existing = byId.get(heading.id);
		if (existing) {
			throw new Error(`The headings "${existing.text}" and "${heading.text}" have the same id "${heading.id}"; heading ids must be unique (contracts/source-inputs.md S1).`);
		}
		byId.set(heading.id, heading);
		if (heading.number && !numbers.has(heading.number)) numbers.set(heading.number, heading);
	}
	return { anchors: new Map([...byId].map(([id, h]) => [id, h.page])), numbers };
}
