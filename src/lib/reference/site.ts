/**
 * Addresses and navigation of the reference (contracts/site-addresses.md). Every address sits under the
 * site base /adp and ends in a slash, as the rest of the site does.
 */
import type { LoadedVersion } from './load';

export const SITE_BASE = '/adp';
export const LATEST = 'latest';

/** `/adp/<language>/`. */
export function languageHref(language: string): string {
	return `${SITE_BASE}/${language}/`;
}

/** `/adp/<language>/<segment>/`, where the segment is a version or `latest`. */
export function versionHref(language: string, segment: string): string {
	return `${SITE_BASE}/${language}/${segment}/`;
}

/** The address of a page of a version: the cover for an empty slug. */
export function pageHref(language: string, segment: string, slug: string, fragment?: string | null): string {
	const path = slug ? `${versionHref(language, segment)}${slug}/` : versionHref(language, segment);
	return fragment ? `${path}#${fragment}` : path;
}

export function schemaPageHref(language: string, segment: string, name?: string): string {
	return `${versionHref(language, segment)}schema/${name ? `#def-${name}` : ''}`;
}

export function examplesHref(language: string, segment: string, stem?: string): string {
	return `${versionHref(language, segment)}examples/${stem ? `${stem}/` : ''}`;
}

export function searchHref(language: string): string {
	return `${languageHref(language)}search/`;
}

/** The address of the schema file, which equals the path of its `$id` (FR-009). */
export function schemaFileHref(version: LoadedVersion): string {
	const { language } = version;
	return SITE_BASE + language.schemaAddress.replace('{version}', version.record.version).replace('{schema}', language.schema);
}

export interface TocEntry {
	href: string;
	/** "4. Layer 1 — Metamodel", "Appendix C — Glossary". */
	label: string;
	slug: string;
	appendix: boolean;
}

/** The generated table of contents of a version: the 17 sections and the appendices, in order. */
export function tocEntries(version: LoadedVersion, segment: string): TocEntry[] {
	return version.split().sections.map(({ page }) => ({
		href: pageHref(version.language.id, segment, page.slug),
		label: page.headings[0].text.replace(/\s*\(informative\)$/, ''),
		slug: page.slug,
		appendix: /^[A-Z]$/.test(page.number ?? ''),
	}));
}

type SidebarItem = { label: string; link: string } | { label: string; items: SidebarItem[] };

/** Starlight's sidebar for a version: cover, sections, appendices, schema, examples and search. */
export function sidebarFor(version: LoadedVersion, segment: string): SidebarItem[] {
	const language = version.language.id;
	const entries = tocEntries(version, segment);
	// Starlight adds the base to sidebar links itself.
	const unbased = (items: SidebarItem[]): SidebarItem[] =>
		items.map((item) => ('link' in item ? { ...item, link: item.link.slice(SITE_BASE.length) } : { ...item, items: unbased(item.items) }));
	return unbased([
		{ label: `${version.language.short} ${version.record.version}`, link: pageHref(language, segment, '') },
		{ label: 'Sections', items: entries.filter((e) => !e.appendix).map((e) => ({ label: e.label, link: e.href })) },
		{ label: 'Appendices', items: entries.filter((e) => e.appendix).map((e) => ({ label: e.label, link: e.href })) },
		{ label: 'Schema', link: schemaPageHref(language, segment) },
		{ label: 'Examples', link: examplesHref(language, segment) },
		{ label: 'Search', link: searchHref(language) },
	]);
}

/** Short revision as shown on pages. */
export function shortRevision(revision: string): string {
	return revision.slice(0, 7);
}

export interface LayerSection {
	/** 1–8. */
	layer: number;
	/** "Metamodel", "Coordinate systems, placement and snapping". */
	title: string;
	href: string;
	slug: string;
}

/** The sections that define the layers: `Layer <n> — <title>` (the "Layer n" sections of the prose). */
export function layerSections(version: LoadedVersion, segment: string): LayerSection[] {
	return version
		.split()
		.sections.map(({ page }) => ({ page, match: /^Layer (\d+) — (.+)$/.exec(page.title) }))
		.filter(({ match }) => match)
		.map(({ page, match }) => ({ layer: Number(match![1]), title: match![2], href: pageHref(version.language.id, segment, page.slug), slug: page.slug }));
}

/** The layer section of an Appendix A.2 layer label such as `2 · Coordinates`, if it has one. */
export function sectionOfLayerLabel(label: string | null, sections: LayerSection[]): LayerSection | undefined {
	const n = label ? /^(\d+)\s*·/.exec(label)?.[1] : undefined;
	return n ? sections.find((s) => s.layer === Number(n)) : undefined;
}
