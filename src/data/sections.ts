/**
 * The two parts of the site and their top-level sections, in navigation order.
 * The header, sidebar, breadcrumbs and footer are built from this file; a specification that
 * delivers a new section adds it here (contracts/site-navigation.md).
 */

import { hasPublishedVersion } from '../lib/reference/published';

export type PartId = 'about' | 'documentation';

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
	/** A section listed under another one in the sidebar, in that section's group (Peter, 2026-09-29). */
	parent?: string;
}

export const parts: readonly Part[] = [
	{ id: 'about', label: 'About', href: '/adp/' },
	{ id: 'documentation', label: 'Documentation', href: '/adp/docs/' },
];

export const sections: readonly Section[] = [
	{ id: 'home', label: 'Home', part: 'about', href: '/adp/', status: 'available', deliveredBy: '001' },
	{ id: 'docs', label: 'Introduction', part: 'documentation', href: '/adp/docs/', status: 'available', deliveredBy: '001' },
	// The six languages in which tools are specified and stored (etalii.adp spec 002, research R7).
	{ id: 'specification', label: 'Specification & Definition', part: 'documentation', href: '/adp/docs/specification-and-definition/', status: 'available', deliveredBy: 'etalii.adp 002' },
	// Coming until a version is published (spec 002; its source needs a licence first). DEDL became DISL and DID
	// (etalii.adp spec 002), and its old addresses redirect to /adp/disl/.
	{ id: 'disl', label: 'DISL reference', part: 'documentation', href: '/adp/disl/', status: hasPublishedVersion('disl') ? 'available' : 'coming', deliveredBy: '002', parent: 'specification' },
	{ id: 'did', label: 'DID reference', part: 'documentation', href: '/adp/did/', status: hasPublishedVersion('did') ? 'available' : 'coming', deliveredBy: '002', parent: 'specification' },
	// FBL serves every kind: how a tool reads and writes a model in another tool's file (etalii.adp spec 005).
	{ id: 'fbl', label: 'FBL reference', part: 'documentation', href: '/adp/fbl/', status: hasPublishedVersion('fbl') ? 'available' : 'coming', deliveredBy: 'etalii.adp 005', parent: 'specification' },
	{ id: 'tools', label: 'Tools', part: 'documentation', href: '/adp/tools/', status: 'available', deliveredBy: '003' },
	// Analyses behind ADP, each written in etalii.adp under docs/research/ and shown here as an article page.
	{ id: 'research', label: 'Research', part: 'documentation', href: '/adp/docs/research/', status: 'available', deliveredBy: 'research' },
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
