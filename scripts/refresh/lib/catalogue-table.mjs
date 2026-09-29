// Reads a host's designer catalogue (`docs/tools.md`, or `docs/diagrams.md` before etalii.adp spec 002 renames it:
// an HTML table inside Markdown) and applies the site's
// state mapping. By the owner's decision of 2026-09-27 (spec 003) the `develop` state is shown as mapped, never
// capped at the release; the release state is only recorded. Shared by the screenshot, catalogue and hosts procedures, so
// that each stays independent of the others' output.
import { parse } from 'parse5';

/**
 * Where a host keeps its catalogue, in the order they are tried: `docs/tools.md` (the "Tool types" of etalii.adp
 * spec 002, naming convention alignment), then `docs/diagrams.md`, its name before, until that spec's Part 7.
 */
export const CATALOGUE_PATHS = ['docs/tools.md', 'docs/diagrams.md'];
/** The catalogue's name before etalii.adp spec 002, which the refresh still reads when a host has no `docs/tools.md`. */
export const CATALOGUE_PATH = 'docs/diagrams.md';

/** The catalogue among a source's watched files: `docs/tools.md` when it has one, else `docs/diagrams.md`, else undefined. */
export function catalogueFileOf(files) {
	for (const path of CATALOGUE_PATHS) {
		const file = files.find((f) => f.sourcePath === path);
		if (file) return file;
	}
	return undefined;
}

/** The catalogue text at `ref`, from the first of CATALOGUE_PATHS that exists there: `{ path, text }`, or null. */
async function readCatalogueAt(reader, ref) {
	for (const path of CATALOGUE_PATHS) {
		const text = await reader.readFileAt(ref, path);
		if (text !== null) return { path, text };
	}
	return null;
}

/** The site states in rising order (spec 003 data-model § State), and those that claim a user can use a designer. */
const ORDER = ['not-planned', 'idea', 'planned', 'in-progress', 'prototype', 'implemented', 'available'];
const USABLE = ['prototype', 'implemented', 'available'];

const text = (node) => {
	if (node.nodeName === '#text') return node.value;
	return (node.childNodes ?? []).map(text).join('');
};

const clean = (value) => value.replace(/[\s ]+/g, ' ').trim();

const children = (node, name) => (node.childNodes ?? []).filter((child) => child.nodeName === name);

function links(node, found = []) {
	if (node.nodeName === 'a') {
		const href = node.attrs.find((attr) => attr.name === 'href')?.value ?? null;
		found.push({ label: clean(text(node)), href });
		return found;
	}
	for (const child of node.childNodes ?? []) links(child, found);
	return found;
}

/** A Theory or Example cell as `[{ label, href }]`: its links, or its text with no link; empty for "—". */
function references(cell) {
	const found = links(cell);
	if (found.length) return found;
	const value = clean(text(cell));
	return value && value !== '—' && value !== '-' ? [{ label: value, href: null }] : [];
}

/** A state label without its leading emoji, for lookup in the mapping: `⚗️ Prototype` → `Prototype`. */
export function stripStateEmoji(label) {
	return clean(label).replace(/^[^\p{L}\p{N}]+/u, '');
}

/**
 * The column that names a row: "Diagram" in `docs/diagrams.md`; "Tool", "Name" or "Tool type" in `docs/tools.md`
 * (etalii.adp spec 002).
 */
const NAME_COLUMNS = ['diagram', 'tool', 'name', 'tool type'];

/**
 * Parses the catalogue table: rows `{ origin, name, group, developState, theory, example }`, where `group` is the
 * nearest preceding `<h3>`/`<h4>` (or Markdown `###`/`####`) heading and `developState` the State label without
 * its emoji. A duplicate origin fails, naming both rows.
 */
export function parseCatalogue(markdown) {
	const document = parse(markdown, { sourceCodeLocationInfo: true });
	const rows = [];
	const seen = new Map();
	let group = null;
	let columns = null;
	let nameColumn = null;

	const visit = (node) => {
		if (node.nodeName === '#text') {
			for (const match of node.value.matchAll(/^#{3,4}\s+(.+?)\s*#*\s*$/gm)) group = clean(match[1]);
			return;
		}
		if (node.nodeName === 'h3' || node.nodeName === 'h4') {
			group = clean(text(node));
			return;
		}
		if (node.nodeName === 'tr') {
			const headers = children(node, 'th').map((th) => clean(text(th)).toLowerCase());
			if (headers.includes('origin') && headers.includes('state')) {
				columns = Object.fromEntries(headers.map((name, index) => [name, index]));
				nameColumn = NAME_COLUMNS.find((name) => name in columns);
				if (!nameColumn) throw new Error(`the catalogue table has no name column: one of ${NAME_COLUMNS.join(', ')} (found ${headers.join(', ')})`);
				return;
			}
			const cells = children(node, 'td');
			if (columns && cells.length >= Object.keys(columns).length) {
				addRow(cells, node.sourceCodeLocation?.startLine);
				return;
			}
		}
		for (const child of node.childNodes ?? []) visit(child);
		if (node.content) visit(node.content);
	};

	const addRow = (cells, line) => {
		const cell = (name) => cells[columns[name]];
		const origin = clean(text(cell('origin')));
		const name = clean(text(cell(nameColumn)));
		const where = `line ${line} (${name})`;
		if (seen.has(origin)) throw new Error(`duplicate origin "${origin}" in the catalogue: ${seen.get(origin)} and ${where}`);
		seen.set(origin, where);
		rows.push({
			origin,
			name,
			group,
			developState: stripStateEmoji(text(cell('state'))),
			theory: columns.theory === undefined ? [] : references(cell('theory')),
			example: columns.example === undefined ? [] : references(cell('example')),
			// docs/tools.md lists diagrams, designers and editors and says which in a Kind column (etalii.adp spec
			// 002); the site falls back to Notion's Kind (or Type) for a catalogue without one.
			...(columns.kind === undefined ? {} : { kind: kindOf(text(cell('kind')), where) }),
		});
	};

	visit(document);
	return rows;
}

/** The kinds of tool (etalii.adp docs/terminology.md): the Kind column's values, lowercased. */
export const KINDS = ['diagram', 'designer', 'editor'];

/** A Kind cell as `diagram`, `designer` or `editor`, or null when it is empty or "—"; any other value fails, naming the row. */
function kindOf(value, where) {
	const kind = stripStateEmoji(value).toLowerCase();
	if (!kind || kind === '—' || kind === '-') return null;
	if (!KINDS.includes(kind)) throw new Error(`unknown kind "${clean(value)}" at ${where}: one of Diagram, Designer, Editor`);
	return kind;
}

/** The site state for a source label in `host`, or `{ unmapped: label }` when the mapping has none. */
export function mapState(host, label, states) {
	const site = states.mappings?.[host]?.[label];
	return site === undefined ? { unmapped: label } : site;
}

const rank = (state) => ORDER.indexOf(state);

export function isUsable(state) {
	return USABLE.includes(state);
}

/** Whether a mapped state is `in-progress` or later (Work-in-progress, Prototype or Implemented). */
export function isUnderway(state) {
	return rank(state) >= rank('in-progress');
}

/**
 * Reads the catalogue (`docs/tools.md`, else `docs/diagrams.md`) of `host` at `head` (the `develop` head) and at
 * `release.commit`, each with its own fallback, and returns `{ entries, text, path }` with each entry's `developState`, `releaseState` (or null) and mapped `state`, or
 * `{ missingCatalogue: true }` when the file does not exist. An entry whose label the mapping lacks gets
 * `unmapped: <label>` and `state: null`.
 */
export async function designersFor(host, reader, { head, release, states }) {
	const develop = await readCatalogueAt(reader, head);
	if (develop === null) return { missingCatalogue: true };
	const developText = develop.text;
	const releaseText = release ? ((await readCatalogueAt(reader, release.commit))?.text ?? null) : null;
	const releaseRows = new Map(releaseText === null ? [] : parseCatalogue(releaseText).map((row) => [row.origin, row]));
	const entries = parseCatalogue(developText).map((row) => {
		const releaseState = releaseRows.get(row.origin)?.developState ?? null;
		const develop = mapState(host, row.developState, states);
		const released = releaseState === null ? null : mapState(host, releaseState, states);
		const unmapped = typeof develop === 'object' ? develop.unmapped : typeof released === 'object' && released !== null ? released.unmapped : undefined;
		const entry = { ...row, releaseState, developSite: typeof develop === 'string' ? develop : null };
		entry.state = unmapped ? null : develop;
		if (unmapped) entry.unmapped = unmapped;
		return entry;
	});
	return { entries, text: developText, path: develop.path };
}
