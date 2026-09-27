/**
 * The examples of a version (research D9, FR-016): one per file of role `definition` or `document`, tied to
 * the section that embeds it, what that section says it demonstrates, the layers it fills, and whether the
 * embedded copy still equals the file (a mismatch is a warning for the source, never a failure).
 */
import type { Code, Heading as MdHeading, RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { headingId } from './anchors';
import type { LoadedVersion } from './load';
import { withoutInformative } from './split';
import type { Example, FileRecord } from './types';
import { layerCounts, localized } from './visuals';

export interface ExampleModel extends Example {
	/** The page slug of the embedding section's page. */
	sectionPage: string | null;
	/** The embedding section's heading text. */
	sectionTitle: string | null;
	/** "What it demonstrates": the section's text before the file, as Markdown nodes with positions into the prose. */
	demonstratesNodes: RootContent[];
	parsed: Record<string, unknown>;
	warnings: string[];
}

/** File name without extension, `.` → `-`: `timeline.document.json` → `timeline-document`. */
export function stemOf(name: string): string {
	return name.replace(/\.[^.]+$/, '').replace(/\./g, '-');
}

/** A JSON value with object keys sorted, so that two copies compare equal regardless of formatting. */
function normalised(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalised);
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.keys(value)
				.sort()
				.map((k) => [k, normalised((value as Record<string, unknown>)[k])])
		);
	}
	return value;
}

interface Embedding {
	heading: MdHeading;
	page: string;
	/** The section's nodes between its heading and the "File" line: the list or paragraphs saying what it shows. */
	intro: RootContent[];
	code: Code | null;
}

/** Where the prose embeds each file: the heading of the section holding ``File `…/<file>`:``, its introduction and the code block after the line. */
function embeddings(version: LoadedVersion): Map<string, Embedding> {
	const found = new Map<string, Embedding>();
	for (const section of version.split().sections) {
		let heading: MdHeading | null = null;
		// The section's nodes so far; null once its "File" line is found, so the embedded copy is not part of it.
		let intro: RootContent[] | null = null;
		section.nodes.forEach((node, index) => {
			if (node.type === 'heading') {
				heading = node as MdHeading;
				intro = [];
				return;
			}
			if (!heading || !intro) return;
			// "File `examples/<name>`:" — the path is matched by file name only (research, "Examples ↔ sections").
			const children = node.type === 'paragraph' ? node.children : [];
			const [before, code, after] = children;
			const isFileLine =
				children.length === 3 && before.type === 'text' && before.value === 'File ' && code.type === 'inlineCode' && after.type === 'text' && after.value === ':';
			if (!isFileLine) {
				intro.push(node);
				return;
			}
			const next = section.nodes[index + 1];
			found.set((code as { value: string }).value.split('/').pop()!, { heading, page: section.page.slug, intro, code: next?.type === 'code' ? (next as Code) : null });
			intro = null;
		});
	}
	return found;
}

export function examplesOf(version: LoadedVersion): ExampleModel[] {
	const embedded = embeddings(version);
	const files: FileRecord[] = version.record.files.filter((f) => f.role === 'definition' || f.role === 'document');
	return files.map((file) => {
		const warnings: string[] = [];
		const parsed = JSON.parse(version.file(file.name).toString('utf8')) as Record<string, unknown>;
		const embedding = embedded.get(file.name);
		const sectionTitle = embedding ? withoutInformative(toString(embedding.heading)) : null;
		if (!embedding) warnings.push(`No section embeds ${file.name} after a line "File \`…/${file.name}\`:"; its page has no "What it demonstrates" and no section link.`);

		let embeddedMatches: boolean | null = null;
		if (embedding?.code) {
			try {
				embeddedMatches = JSON.stringify(normalised(JSON.parse(embedding.code.value))) === JSON.stringify(normalised(parsed));
			} catch {
				embeddedMatches = false;
			}
			if (!embeddedMatches) warnings.push(`The copy of ${file.name} embedded in "${sectionTitle}" differs from the file.`);
		}

		const language = parsed.language as Record<string, unknown> | undefined;
		const isDefinition = file.role === 'definition';
		const docValue = language?.doc;
		const doc = typeof docValue === 'string' ? docValue : (localized((docValue as Record<string, unknown> | undefined)?.summary) ?? '');
		const label = isDefinition ? (localized(language?.label) ?? file.name) : (sectionTitle ?? file.name);

		return {
			file,
			stem: stemOf(file.name),
			label,
			doc: isDefinition ? doc : '',
			section: embedding ? headingId(toString(embedding.heading)) : null,
			sectionPage: embedding?.page ?? null,
			sectionTitle,
			demonstrates: embedding?.intro.length ? embedding.intro.map((n) => toString(n)).join('\n\n') : null,
			demonstratesNodes: embedding?.intro ?? [],
			layers: isDefinition ? layerCounts(parsed) : {},
			embeddedMatches,
			visuals: [],
			screenshots: [],
			parsed,
			warnings,
		};
	});
}
