// Catalogue data for pages and components: the content collections of src/content.config.ts, sorted, and the
// screenshots as image modules. Astro-only (it imports astro:content); plain logic lives in src/lib/catalogue/.
import type { ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import { bestState, isUsable } from '../../lib/catalogue/states';
import type { Designer, FocusArea, Idea, Redirect, SourceRecord } from '../../lib/catalogue/types';

const byOrigin = <T extends { origin: string }>(a: T, b: T) => (a.origin < b.origin ? -1 : a.origin > b.origin ? 1 : 0);

export async function catalogue() {
	const designers = (await getCollection('designers')).map((entry) => entry.data as Designer).sort(byOrigin);
	const ideas = (await getCollection('ideas')).map((entry) => entry.data as Idea).sort(byOrigin);
	const focusAreas = (await getCollection('catalogueFocusAreas')).map((entry) => entry.data as FocusArea).sort((a, b) => a.order - b.order);
	const sources = uniqueSources([...designers.flatMap((designer) => designer.sources), ...ideas.map((idea) => idea.source)]);
	return { designers, ideas, focusAreas, sources };
}

/** Retired designer addresses; read only by the designer page, since Astro warns on every read of an empty collection. */
export async function redirects(): Promise<Redirect[]> {
	return (await getCollection('catalogueRedirects')).map((entry) => entry.data as Redirect);
}

export function uniqueSources(records: SourceRecord[]): SourceRecord[] {
	const key = (record: SourceRecord) => (record.kind === 'git' ? `${record.repository}@${record.revision}:${record.path}` : `notion:${record.page}@${record.revision}`);
	return records.filter((record, index) => records.findIndex((other) => key(other) === key(record)) === index);
}

export function designerHref(origin: string): string {
	return `/adp/designers/${origin}/`;
}

export { bestState, isUsable };

// Screenshots are read from sources/ (spec 004's output). The fixture folder is what ADP_SOURCES_DIR points at when
// the site is built for the catalogue's tests; its images are never publishable, so they never reach a page.
const images = {
	...import.meta.glob<{ default: ImageMetadata }>('/sources/screenshots/**/*.png', { eager: true }),
	...import.meta.glob<{ default: ImageMetadata }>('/tests/unit/catalogue/fixtures/sources/screenshots/**/*.png', { eager: true }),
};

/** The image module for a screenshot's `file` (a path from the repository root). */
export function screenshotImage(file: string): ImageMetadata {
	const module = images[`/${file}`];
	if (!module) throw new Error(`${file}: no such screenshot under sources/screenshots/.`);
	return module.default;
}
