/**
 * The one documentation sidebar, shown on docs pages and reference pages alike (Peter, 2026-09-29): the
 * documentation-part sections of sections.ts, with a section's children grouped under it. Specification & Definition
 * is a group holding its own page and each language's whole reference (cover, sections, appendices, schema, examples,
 * search) as a collapsible group, and Research a group of its articles, open by default (Peter, 2026-10-09); Starlight
 * opens the groups that hold the current page. A section not written yet carries "Coming" (research R6).
 */
import { latestOf } from '../lib/reference/load';
import { sidebarFor, SITE_BASE, type SidebarItem } from '../lib/reference/site';
import { researchArticles } from './research';
import { sectionsOf, type Section } from './sections';

/** The reference a page shows, which the sidebar lists instead of that language's latest version. */
export interface ShownReference {
	language: string;
	items: SidebarItem[];
}

// Links rather than docs slugs, because some sections are pages outside the docs collection; Starlight adds the base
// (/adp) to a sidebar link itself.
const unbased = (href: string) => href.slice(SITE_BASE.length);

function link(section: Section, label = section.label): SidebarItem {
	return {
		label,
		link: unbased(section.href),
		...(section.status === 'coming' ? { badge: { text: 'Coming', variant: 'caution' as const } } : {}),
	};
}

/** A language's reference as one group, or its landing page with "Coming" while no version is published. */
function reference(section: Section, shown?: ShownReference): SidebarItem {
	const items = shown?.language === section.id ? shown.items : undefined;
	const latest = items ? undefined : latestOf(section.id);
	const entries = items ?? (latest ? sidebarFor(latest, latest.record.version) : undefined);
	if (!entries) return link(section);
	// The cover link is labelled with the language and version ("DISL 0.1"), which names the group.
	const [cover, ...rest] = entries;
	return { label: cover.label, collapsed: true, items: [{ ...cover, label: 'Cover' }, ...rest] };
}

export function docsSidebar(shown?: ShownReference): SidebarItem[] {
	const sections = sectionsOf('documentation');
	return sections
		.filter((section) => !section.parent)
		.map((section) => {
			// Each research article is an item of its own (Peter, 2026-09-29), and the group starts open (Peter, 2026-10-09).
			if (section.id === 'research') {
				const articles = researchArticles().map((article) => ({ label: article.title, link: unbased(article.href) }));
				return { label: section.label, collapsed: false, items: [link(section, 'Overview'), ...articles] };
			}
			const children = sections.filter((child) => child.parent === section.id);
			if (children.length === 0) return link(section);
			return { label: section.label, items: [link(section, 'Overview'), ...children.map((child) => reference(child, shown))] };
		});
}
