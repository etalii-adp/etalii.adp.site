import { readFileSync } from 'node:fs';
import { hostIds } from './order.ts';
import { facetStates } from '../lib/catalogue/states.ts';

/**
 * Moved addresses: old address → new address, ending in a slash (a query may follow). Astro prefixes the old
 * address with the base (/adp) itself, so it is written without it; the new address is written in full.
 * Astro writes a redirect page at each old address (research R4).
 */
export const redirects: Record<string, string> = {
	...facetRedirects(),
};

/**
 * The per-facet catalogue pages (spec 003, retired 2026-09-28): each now opens the designers overview with that one
 * option ticked, so a bookmarked or indexed facet address keeps resolving. Focus areas are read from
 * src/content/catalogue/focus-areas.json directly, since this file is loaded by astro.config.mjs, before content collections.
 */
function facetRedirects(): Record<string, string> {
	const focusAreas = JSON.parse(readFileSync(new URL('../content/catalogue/focus-areas.json', import.meta.url), 'utf8')) as { slug: string }[];
	const entries: [string, string][] = [
		...focusAreas.map(({ slug }): [string, string] => [`/designers/focus/${slug}/`, `/adp/designers/?focus=${slug}`]),
		...hostIds.map((id): [string, string] => [`/designers/hosts/${id}/`, `/adp/designers/?hosts=${id}`]),
		...facetStates.map((state): [string, string] => [`/designers/states/${state}/`, `/adp/designers/?state=${state}`]),
	];
	return Object.fromEntries(entries);
}
