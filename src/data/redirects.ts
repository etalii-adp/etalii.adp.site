import { readFileSync } from 'node:fs';
import { ideHostIds } from './order.ts';
import { facetStates } from '../lib/catalogue/states.ts';
import { movedReferenceRedirects } from '../lib/reference/moved.ts';

/**
 * Moved addresses: old address → new address, ending in a slash (a query may follow). Astro prefixes the old
 * address with the base (/adp) itself, so it is written without it; the new address is written in full.
 * Astro writes a redirect page at each old address (research R4). Every redirect leads to a page that is not itself
 * a redirect, so no chain forms (etalii.adp spec 002, T050).
 */
export const redirects: Record<string, string> = {
	...facetRedirects(),
	...designerRedirects(),
	...movedReferenceRedirects(),
};

/**
 * The per-facet catalogue pages (spec 003, retired 2026-09-28): each now opens the tools overview with that one
 * option ticked, so a bookmarked or indexed facet address keeps resolving. Focus areas are read from
 * src/content/catalogue/focus-areas.json directly, since this file is loaded by astro.config.mjs, before content collections.
 */
function facetRedirects(): Record<string, string> {
	const focusAreas = JSON.parse(readFileSync(new URL('../content/catalogue/focus-areas.json', import.meta.url), 'utf8')) as { slug: string }[];
	const entries: [string, string][] = [
		...focusAreas.map(({ slug }): [string, string] => [`/designers/focus/${slug}/`, `/adp/tools/?focus=${slug}`]),
		...ideHostIds.map((id): [string, string] => [`/designers/hosts/${id}/`, `/adp/tools/?hosts=${id}`]),
		...facetStates.map((state): [string, string] => [`/designers/states/${state}/`, `/adp/tools/?state=${state}`]),
	];
	return Object.fromEntries(entries);
}

/**
 * The designer catalogue became the tool catalogue (etalii.adp spec 002): /adp/designers/ and the page of every tool
 * that was ever published there redirect to /adp/tools/. An origin the catalogue itself redirected (redirects.json)
 * goes straight to its new origin, so no chain forms; a withdrawn one goes to its withdrawal notice. Read from
 * src/content/catalogue/ directly, for the same reason as the focus areas.
 */
function designerRedirects(): Record<string, string> {
	const read = <T>(name: string): T => JSON.parse(readFileSync(new URL(`../content/catalogue/${name}`, import.meta.url), 'utf8')) as T;
	const published = read<string[]>('published.json');
	const moved = new Map(read<{ from: string; to: string | null }[]>('redirects.json').map((redirect) => [redirect.from, redirect.to ?? redirect.from]));
	const origins = new Set([...published, ...moved.keys()]);
	return Object.fromEntries([
		['/designers/', '/adp/tools/'],
		...[...origins].map((origin): [string, string] => [`/designers/${origin}/`, `/adp/tools/${moved.get(origin) ?? origin}/`]),
	]);
}
