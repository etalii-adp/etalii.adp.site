/**
 * The two parts of the site and their top-level sections, in navigation order.
 * The header, sidebar, breadcrumbs and footer are built from this file; a specification that
 * delivers a new section adds it here (contracts/site-navigation.md).
 */

import { hasPublishedVersion } from '../lib/reference/published';

export type PartId = 'product' | 'documentation';

export interface Part {
	id: PartId;
	label: string;
	/** Start address of the part, under /adp/. */
	href: string;
}

export interface Section {
	/** Unique slug, used as `section` in page frontmatter. */
	id: string;
	label: string;
	part: PartId;
	/** Address under /adp/, ending in a slash. */
	href: string;
	status: 'available' | 'coming';
	/** The specification that delivers the section; required when `status` is `coming`. */
	deliveredBy: string;
}

export const parts: readonly Part[] = [
	{ id: 'product', label: 'Product', href: '/adp/' },
	{ id: 'documentation', label: 'Documentation', href: '/adp/docs/' },
];

export const sections: readonly Section[] = [
	{ id: 'home', label: 'Home', part: 'product', href: '/adp/', status: 'available', deliveredBy: '001' },
	{ id: 'docs', label: 'Documentation', part: 'documentation', href: '/adp/docs/', status: 'available', deliveredBy: '001' },
	// Coming until a version of DEDL is published (spec 002; its source needs a licence first).
	{ id: 'dedl', label: 'DEDL reference', part: 'documentation', href: '/adp/dedl/', status: hasPublishedVersion('dedl') ? 'available' : 'coming', deliveredBy: '002' },
	{ id: 'designers', label: 'Designers', part: 'documentation', href: '/adp/designers/', status: 'coming', deliveredBy: '003' },
];

export const sectionIds = sections.map((section) => section.id) as [string, ...string[]];

export function sectionsOf(part: PartId): Section[] {
	return sections.filter((section) => section.part === part);
}

export function partOf(id: PartId): Part {
	return parts.find((part) => part.id === id)!;
}

export function sectionById(id: string | undefined): Section | undefined {
	return sections.find((section) => section.id === id);
}
