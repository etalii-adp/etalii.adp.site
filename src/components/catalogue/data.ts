// Catalogue data for pages and components: the content collections of src/content.config.ts, sorted, and the
// screenshots as image modules. Astro-only (it imports astro:content); plain logic lives in src/lib/catalogue/.
import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import { bestState, isUsable, showsScreenshots } from '../../lib/catalogue/states';
import type { Tool, FocusArea, Idea, Redirect, Screenshot, SourceRecord } from '../../lib/catalogue/types';

const byOrigin = <T extends { origin: string }>(a: T, b: T) => (a.origin < b.origin ? -1 : a.origin > b.origin ? 1 : 0);

type SiteCatalogue = { tools: Tool[]; ideas: Idea[]; focusAreas: FocusArea[]; sources: SourceRecord[] };
let loaded: Promise<SiteCatalogue> | undefined;

/** The catalogue, read once per build; Astro warns on every read of an empty collection. */
export function catalogue(): Promise<SiteCatalogue> {
	loaded ??= load();
	return loaded;
}

async function load(): Promise<SiteCatalogue> {
	const tools = (await getCollection('tools')).map((entry) => entry.data as Tool).sort(byOrigin);
	const ideas = (await getCollection('ideas')).map((entry) => entry.data as Idea).sort(byOrigin);
	const focusAreas = (await getCollection('catalogueFocusAreas')).map((entry) => entry.data as FocusArea).sort((a, b) => a.order - b.order);
	const sources = uniqueSources([...tools.flatMap((tool) => tool.sources), ...ideas.map((idea) => idea.source)]);
	return { tools, ideas, focusAreas, sources };
}

/** Retired tool addresses; read only by the tool page, since Astro warns on every read of an empty collection. */
export async function redirects(): Promise<Redirect[]> {
	return (await getCollection('catalogueRedirects')).map((entry) => entry.data as Redirect);
}

export function uniqueSources(records: SourceRecord[]): SourceRecord[] {
	const key = (record: SourceRecord) => (record.kind === 'git' ? `${record.repository}@${record.revision}:${record.path}` : `notion:${record.page}@${record.revision}`);
	return records.filter((record, index) => records.findIndex((other) => key(other) === key(record)) === index);
}

export function toolHref(origin: string): string {
	return `/adp/tools/${origin}/`;
}

export { bestState, isUsable, showsScreenshots };

/**
 * The image of a publishable screenshot, imported by the tools collection (src/content.config.ts). Only
 * publishable screenshots have one, so no other PNG under sources/ is ever emitted into the build.
 */
export function screenshotImage(screenshot: Screenshot): ImageMetadata | undefined {
	return (screenshot as Screenshot & { image?: ImageMetadata | null }).image ?? undefined;
}

/** The tools overview with one filter option ticked: `focus` (a focus-area slug), `hosts` (a host id) or `state`. */
export function filterHref(key: 'kind' | 'focus' | 'hosts' | 'state', value: string): string {
	return `/adp/tools/?${key}=${encodeURIComponent(value)}`;
}
