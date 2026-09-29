/**
 * Types of the DEDL reference: the stored snapshot (contracts/reference-data.schema.json) and the model
 * the build derives from it (data-model.md "Derived entities").
 */

// ---------------------------------------------------------------------------------------------------
// Stored: src/content/reference/languages.json and <language>/<version>/source.json
// ---------------------------------------------------------------------------------------------------

/** One registered definition language (`$defs/Language`). */
export interface Language {
	/** `^[a-z]+$`, not one of `designers`, `search`, `pagefind`; used in addresses: `dedl`. */
	id: string;
	/** `minLength` 1: "DEDL — Diagram Editor Definition Language". */
	name: string;
	/** `minLength` 1: "DEDL". */
	short: string;
	/** `^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$`: `etalii-adp/etalii.adp`. */
	repository: string;
	/** `minLength` 1: the branch the refresh reads by default. */
	branch: string;
	/** `minLength` 1: the folder of the specification in the repository. */
	path: string;
	/** `\.md$`: the prose file. */
	prose: string;
	/** `\.json$`: the schema file. */
	schema: string;
	/** `^/[a-z]+/schema/\{version\}/\{schema\}$`: must equal the path of the schema's `$id` under the site base. */
	schemaAddress: string;
	/**
	 * Optional, default true. `false` registers a language for `npm run reference:refresh` without publishing pages
	 * for it: DISL and DID while etalii.adp spec 002 renames DEDL, until their pages come (its Part 5).
	 */
	publish?: boolean;
}

/** What a file of a snapshot is (`$defs/FileRecord/role`): one of `prose`, `schema`, `definition`, `document`, `other`. */
export type FileRole = 'prose' | 'schema' | 'definition' | 'document' | 'other';

/** One file under `source/` (`$defs/FileRecord`). */
export interface FileRecord {
	/** `^[^/\\]+$`: the file name as in the source. */
	name: string;
	role: FileRole;
	/** `^[0-9a-f]{64}$`: SHA-256 of the bytes as stored. */
	sha256: string;
	/** `minimum` 0: bytes. */
	size: number;
}

/** Where a snapshot came from (`$defs/SourceRecord`). */
export interface SourceRecord {
	kind: 'git';
	/** `^[A-Za-z0-9-]+/[A-Za-z0-9._-]+$`. */
	repository: string;
	/** `minLength` 1: the folder, `specifications/dedl`. */
	path: string;
	/** `^[0-9a-f]{40}$`: the commit the refresh read. */
	revision: string;
	/** Required, `minLength` 1: SPDX identifier; a snapshot without one is refused (research D14). */
	licence: string;
	/** String or null: from the licence file, when stated. */
	copyright?: string | null;
}

/** One published version of a language (`$defs/Version`, `source.json`). */
export interface Version {
	/** `^[a-z]+$`. */
	language: string;
	/** `^\d+\.\d+(\.\d+)?$`, from the prose line `**Specification, version <v> (<status>)**`. */
	version: string;
	/** `minLength` 1: e.g. `Working Draft`. */
	status: string;
	/** Format `date`: the `Date` row of the prose's metadata table. */
	date: string;
	source: SourceRecord;
	/** `minItems` 2: one per file under `source/`. */
	files: FileRecord[];
	/** Format `date-time`: when the refresh read the source. */
	retrieved: string;
}

// ---------------------------------------------------------------------------------------------------
// Derived: computed by the build, never stored
// ---------------------------------------------------------------------------------------------------

export type PageKind = 'cover' | 'section' | 'schema' | 'examples-index' | 'example' | 'stub';

/** A heading of the prose (data-model "Heading"). */
export interface Heading {
	/** GitHub slug of the source heading text (rule S5), unique within the document. */
	id: string;
	/** 1–6 as in the source. */
	depth: number;
	/** Leading number such as `5.10`, `A.2`, `4` or `C`, or null. */
	number: string | null;
	/** Heading text as in the source (plain text). */
	text: string;
	/** Slug of the page the heading lands on (empty for the cover). */
	page: string;
}

/** One generated page of a version (data-model "Page"). */
export interface Page {
	kind: PageKind;
	/** Cover: empty; section: title slug without number (research D4). */
	slug: string;
	/** Heading text without its number and without the `*(informative)*` marker. */
	title: string;
	/** `1`…`17`, `A`…`D` for sections; null otherwise. */
	number: string | null;
	/** True when the heading carries `*(informative)*`. */
	informative: boolean;
	/** Slugs of the neighbouring section pages in document order; null at either end. */
	prev: string | null;
	next: string | null;
	/** Every heading on the page, the page's own H2 first. */
	headings: Heading[];
}

export type LinkKind = 'anchor' | 'number' | 'schema' | 'glossary' | 'example';

/** One edge of the link graph (data-model "Link"). */
export interface Link {
	from: { page: string; heading: string | null };
	/** Heading id, `def-<Name>`, example stem or glossary heading id, by `kind`. */
	to: { page: string; fragment: string | null };
	kind: LinkKind;
	/** The linked text. */
	text: string;
}

/** One `$defs` entry of the schema (data-model "SchemaDefinition"). */
export interface SchemaDefinition {
	name: string;
	/** Layer label from Appendix A.2, or null when A.2 does not list it. */
	layer: string | null;
	json: unknown;
	/** `$defs` names it references through `$ref`. */
	refs: string[];
	/** `def-<name>`. */
	anchor: string;
}

export type VisualKind = 'source-diagram' | 'metamodel' | 'layer-map' | 'document-structure';

/** A picture of a construct or an example (data-model "Visual"). */
export interface Visual {
	kind: VisualKind;
	mermaid: string;
	/** `accTitle`. */
	title: string;
	/** `accDescr`. */
	description: string;
	/** For generated visuals: "Generated from `<file>` at `<short revision>`". */
	caption: string;
}

/** An IDE screenshot of an example (data-model "Screenshot"; source-inputs S3). */
export interface Screenshot {
	host: 'standalone' | 'intellij' | 'vscode' | 'eclipse';
	/** `<language>/<version>/<file>`. */
	example: string;
	shows: 'definition' | 'diagram';
	image: string;
	alt: string;
	source: SourceRecord;
}

/** An example definition or document (data-model "Example"). */
export interface Example {
	file: FileRecord;
	/** File name without extension, `.` → `-`. */
	stem: string;
	label: string;
	doc: string;
	/** Id of the 17.x heading that embeds the file, or null. */
	section: string | null;
	/** That section's leading bullet list, as Markdown source, or null. */
	demonstrates: string | null;
	/** Definition only: item counts of the layer keys present. */
	layers: Record<string, number>;
	/** Whether the embedded copy equals the file after JSON normalisation; null when there is no embedded copy. */
	embeddedMatches: boolean | null;
	visuals: Visual[];
	screenshots: Screenshot[];
}
