// refresh-dedl: the DEDL specification, schema and examples from etalii-adp/etalii.adp into
// sources/dedl/<version>/, a frozen folder per version (research R12).
import { existsSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { compareSemver } from '../lib/util.mjs';

const SPEC = 'DEDL-specification.md';
const SCHEMA = 'dedl.schema.json';

/** The version in the specification's header (the text before its first `##` heading). */
export function headerVersion(markdown) {
	const header = markdown.split(/^## /m)[0];
	return header.match(/\bversion\b[\s|:*]*v?(\d+(?:\.\d+)+)/i)?.[1] ?? null;
}

/** The version segment of the schema's `$id`: `…/dedl/schema/<version>/dedl.schema.json`. */
export function schemaVersion(json) {
	const id = JSON.parse(json).$id ?? '';
	return id.match(/\/dedl\/schema\/([^/]+)\/dedl\.schema\.json$/)?.[1] ?? null;
}

/** Splits a specification on its `##` headings: `[{ heading, lines }]`, with the text before the first as "(header)". */
export function splitSections(markdown) {
	const sections = [];
	let current = { heading: '(header)', lines: [] };
	for (const line of markdown.replaceAll('\r\n', '\n').split('\n')) {
		if (line.startsWith('## ')) {
			sections.push(current);
			current = { heading: line.slice(3).trim(), lines: [] };
		} else {
			current.lines.push(line);
		}
	}
	sections.push(current);
	return sections;
}

/** Lines removed plus lines added between two texts, counted as multisets (a line moved within a section is free). */
function changedLines(before, after) {
	const counts = new Map();
	for (const line of before) counts.set(line, (counts.get(line) ?? 0) + 1);
	let added = 0;
	for (const line of after) {
		const n = counts.get(line) ?? 0;
		if (n) counts.set(line, n - 1);
		else added++;
	}
	const removed = [...counts.values()].reduce((a, b) => a + b, 0);
	return added + removed;
}

/** Compares two specifications section by section: `[{ heading, change, lines }]` for every section that differs. */
export function compareSections(before, after) {
	const was = new Map(splitSections(before ?? '').map((s) => [s.heading, s.lines]));
	const now = splitSections(after);
	const result = [];
	for (const section of now) {
		if (!was.has(section.heading)) result.push({ heading: section.heading, change: 'added', lines: section.lines.length });
		else {
			const lines = changedLines(was.get(section.heading), section.lines);
			if (lines) result.push({ heading: section.heading, change: 'changed', lines });
			was.delete(section.heading);
		}
	}
	if (before !== null) for (const [heading, lines] of was) result.push({ heading, change: 'removed', lines: lines.length });
	return result;
}

function versionsIn(lock) {
	return [...new Set((lock?.files ?? []).map((f) => f.path.split('/')[0]))].sort(compareSemver);
}

export default {
	id: 'refresh-dedl',
	short: 'dedl',
	what: 'DEDL reference',
	sources: [{ repository: 'etalii-adp/etalii.adp', ref: 'develop', paths: ['specifications/dedl/*'], host: null }],
	usesReleases: false,

	/** Only the newest version's files are compared with the source; older versions are frozen. */
	lockEntries(lock) {
		const latest = versionsIn(lock).at(-1);
		return lock.files.filter((f) => f.path.startsWith(`${latest}/`));
	},

	async apply(ctx) {
		const [source] = ctx.sources;
		const byName = new Map(source.files.map((f) => [basename(f.sourcePath), f]));
		const spec = byName.get(SPEC);
		const schema = byName.get(SCHEMA);
		if (!spec) throw new Error(`${source.repository}: ${source.paths[0]} has no ${SPEC} at ${source.head.slice(0, 7)}`);
		if (!schema) throw new Error(`${source.repository}: ${source.paths[0]} has no ${SCHEMA} at ${source.head.slice(0, 7)}`);

		const specText = readFileSync(spec.file, 'utf8');
		const fromHeader = headerVersion(specText);
		const fromSchema = schemaVersion(readFileSync(schema.file, 'utf8'));
		if (!fromHeader || !fromSchema || fromHeader !== fromSchema) {
			throw new Error(`${source.repository}: the DEDL version disagrees: the specification header says ${fromHeader ?? '(none)'}, the schema $id says ${fromSchema ?? '(none)'}`);
		}
		const version = fromHeader;
		const versions = versionsIn(ctx.previous);
		const latest = versions.at(-1) ?? null;
		if (latest && compareSemver(version, latest) < 0) {
			throw new Error(`${source.repository}: the source's DEDL version ${version} is older than the published ${latest}; an older version's folder is never rewritten`);
		}
		const newVersion = latest !== null && version !== latest;

		const files = source.files.map((from) => ({ path: `${version}/${basename(from.sourcePath)}`, from }));
		const keep = (ctx.previous?.files ?? []).map((f) => f.path).filter((path) => !path.startsWith(`${version}/`));

		const oldSpec = latest && existsSync(join(ctx.target, latest, SPEC)) ? readFileSync(join(ctx.target, latest, SPEC), 'utf8') : null;
		const previousEntries = new Map((ctx.previous?.files ?? []).filter((f) => f.path.startsWith(`${latest}/`)).map((f) => [basename(f.path), f]));
		const others = source.files
			.filter((f) => basename(f.sourcePath) !== SPEC)
			.map((f) => {
				const was = previousEntries.get(basename(f.sourcePath));
				return { file: basename(f.sourcePath), change: !was ? 'added' : was.gitBlob === f.gitBlob ? 'unchanged' : 'changed' };
			});
		for (const name of previousEntries.keys()) {
			if (name !== SPEC && !byName.has(name)) others.push({ file: name, change: 'removed' });
		}

		return {
			files,
			keep,
			details: {
				version,
				previousVersion: latest,
				newVersion,
				sections: compareSections(oldSpec === null ? null : oldSpec, specText),
				files: others.sort((a, b) => a.file.localeCompare(b.file)),
			},
		};
	},

	title(summary) {
		const d = summary.details;
		return d?.newVersion ? `Refresh DEDL reference: publish ${d.version} beside ${d.previousVersion}` : undefined;
	},

	renderDetails(d) {
		if (!d?.version) return '';
		const lines = [];
		if (d.newVersion) lines.push(`New version ${d.version} published beside ${d.previousVersion}; \`sources/dedl/${d.previousVersion}/\` is unchanged.`, '');
		else if (!d.previousVersion) lines.push(`Version ${d.version} imported for the first time.`, '');
		lines.push(`**Specification** (\`${d.version}/${SPEC}\`):`, '');
		if (!d.sections.length) lines.push('No section changed.');
		else {
			lines.push('| Section | Change | Lines changed |', '|---|---|---|');
			for (const s of d.sections) lines.push(`| ${s.heading.replaceAll('|', '\\|')} | ${s.change} | ${s.lines} |`);
		}
		lines.push('', '**Schema and examples**:', '', '| File | Change |', '|---|---|');
		for (const f of d.files) lines.push(`| \`${f.file}\` | ${f.change} |`);
		return lines.join('\n');
	},
};
