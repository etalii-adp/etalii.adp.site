/**
 * The catalogue's entities (specs/003-designer-catalogue/data-model.md). Plain, erasable TypeScript, so both
 * Astro and the Node scripts under scripts/catalogue/ import it. The rules a type cannot express are doc comments;
 * the content collections in src/content.config.ts enforce them at build time.
 */

export type HostId = 'standalone' | 'intellij' | 'vscode' | 'eclipse';

export type StateId = 'not-planned' | 'idea' | 'planned' | 'in-progress' | 'prototype' | 'implemented' | 'available';

/** Where a fact or image came from (constitution principle II). */
export type SourceRecord = GitSourceRecord | NotionSourceRecord;

export interface GitSourceRecord {
	kind: 'git';
	/** `owner/name`, e.g. `etalii-adp/etalii.adp.ide.standalone`. */
	repository: string;
	/** A path inside the repository. */
	path: string;
	/** The full 40-character commit SHA the file was read at. */
	revision: string;
	/** When the refresh read it (ISO 8601). */
	retrievedAt: string;
	/** The SPDX id of the source's licence; `null` blocks publication (research D10). */
	licence: string | null;
}

export interface NotionSourceRecord {
	kind: 'notion';
	/** The Notion page id of the row. */
	page: string;
	/** The page's `last_edited_time`. */
	revision: string;
	/** When `catalogue:notion` read it (ISO 8601). */
	retrievedAt: string;
	/** Notion text is site-owned and carries the site's licence. */
	licence: 'Apache-2.0';
}

export interface FocusArea {
	/** Kebab-case, unique; forms `designers/focus/<slug>/`. */
	slug: string;
	name: string;
	/** One or two sentences: the problem a specialized designer solves there. Empty until the owner writes it. */
	problem: string;
	/** Display order. */
	order: number;
	/** The Notion data source whose `Focus areas` option introduced it; `null` for the site's own. */
	source: SourceRecord | null;
}

export interface Link {
	title: string;
	url: string;
}

export interface ActionLink {
	url: string;
	label: string;
}

export interface HostAvailability {
	state: StateId;
	/** The source's own wording, e.g. `⚗️ Prototype`; `null` when the host has no entry. */
	sourceState: string | null;
	/** The host's own name for the designer when it differs from the designer's name. */
	localName: string | null;
	/** Present only for `available`. */
	install: ActionLink | null;
	/** How to build it from source, when the repository is public. */
	build: ActionLink | null;
	/** Where this host's state was read: the host's catalogue at a commit, or the Notion row when the host has none. */
	source: SourceRecord;
	/** The Notion host column's value when it maps differently from a repository-sourced state (FR-017). */
	notionDiffers: string | null;
}

export interface Screenshot {
	/** `<host>--<image-basename>`, unique within the designer. */
	id: string;
	host: HostId;
	/** Path from the repository root, e.g. `sources/screenshots/standalone/mindmap.png`. */
	file: string;
	/** Names the host and the short revision, e.g. "Standalone, at a1b2c3d". */
	caption: string;
	/** Non-empty; from the source's "What must be visible" (FR-012). */
	alt: string;
	/** The longer description of what is on screen. */
	visible: string;
	/** Why that matters for the designer's task; site-owned. Required when `publishable` is true (FR-015). */
	whyItMatters: string;
	width: number;
	height: number;
	bytes: number;
	/** False when the source has no licence or `whyItMatters` is empty. */
	publishable: boolean;
	source: GitSourceRecord;
}

export interface FileFormat {
	extension: string;
	name: string;
	reads: boolean;
	writes: boolean;
}

export interface Designer {
	/** `<vendor>/<diagram-type>`, matching `[a-z0-9.-]+/[a-z0-9.-]+`; the identity (FR-003). */
	origin: string;
	name: string;
	kind: 'diagram' | 'designer' | 'editor';
	/** One line, at most 140 characters (FR-001). */
	purpose: string;
	/** The task it serves (FR-004); `null` until Notion describes it. */
	task: string | null;
	/** Why a specialized visualization helps (FR-004); `null` until Notion describes it. */
	whySpecialized: string | null;
	/** May be empty until Notion names the file extension. */
	fileFormats: FileFormat[];
	family: string;
	/** FocusArea slugs. */
	focusAreas: string[];
	theory: Link[];
	/** The DEDL definition, when the designer has one (FR-008). */
	definition: { url: string; dedlVersion: string } | null;
	/** Exactly four entries, none omitted (US3 AS2). */
	hosts: Record<HostId, HostAvailability>;
	screenshots: Screenshot[];
	/** Every record this designer was assembled from. */
	sources: SourceRecord[];
}

export interface Idea {
	origin: string;
	name: string;
	family: string;
	theory: Link[];
	source: SourceRecord;
}

export interface Redirect {
	/** The old origin tag. */
	from: string;
	/** The new origin tag; `null` means withdrawn. */
	to: string | null;
	reason: string;
	/** When it was recorded (YYYY-MM-DD). */
	since: string;
	source: SourceRecord;
}

export interface ReportItem {
	origin?: string;
	host?: HostId;
	message: string;
}

export interface CatalogueReport {
	gaps: ReportItem[];
	disagreements: ReportItem[];
	pending: ReportItem[];
	membership: ReportItem[];
}
