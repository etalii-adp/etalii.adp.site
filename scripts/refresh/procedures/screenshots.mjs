// refresh-screenshots: the screenshots committed in each IDE repository's docs/screenshots/, checked against the
// expectations and budgets of that folder's readme, into sources/screenshots/<host>/ (research R11). It only
// copies committed images; it never runs capture.mjs or retakes an image (FR-013).
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { NeedsDecision } from '../lib/decision.mjs';
import { CATALOGUE_PATH, designersFor, isUsable } from '../lib/catalogue-table.mjs';
import { readPngSize } from '../lib/png.mjs';

const README = 'docs/screenshots/readme.md';
const KB = 1024;
export const NOT_A_DESIGNER = 'none';

const ide = (host) => ({ repository: `etalii-adp/etalii.adp.ide.${host}`, ref: 'develop', paths: ['docs/screenshots/*.png', README, CATALOGUE_PATH], host });

const cells = (line) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
const unquote = (cell) => cell.replace(/^`(.*)`$/, '$1');

/**
 * Reads a screenshot readme: the images table (`{ file → { document, expectation } }`), the viewport, the budgets
 * (`budgetFor(file)` in bytes) and any "Known artefact" note, found by its heading or bold lead-in.
 */
export function parseReadme(markdown) {
	const lines = markdown.replaceAll('\r\n', '\n').split('\n');
	const images = new Map();
	for (let i = 0; i < lines.length; i++) {
		const header = cells(lines[i]).map((c) => c.toLowerCase());
		if (!lines[i].trim().startsWith('|') || !header.includes('image') || !header.some((c) => c.startsWith('what must be visible'))) continue;
		const at = { image: header.indexOf('image'), document: header.findIndex((c) => c.startsWith('document')), visible: header.findIndex((c) => c.startsWith('what must be visible')) };
		for (let j = i + 2; j < lines.length && lines[j].trim().startsWith('|'); j++) {
			const row = cells(lines[j]);
			images.set(unquote(row[at.image]), { document: row[at.document] ?? '', expectation: row[at.visible] ?? '' });
		}
		break;
	}

	const viewport = markdown.match(/viewport\W*(\d+)\s*[×x]\s*(\d+)/i);
	const budgetLine = lines.find((line) => /≤\s*\d/.test(line) && /budget/i.test(line)) ?? '';
	const budgets = [...budgetLine.matchAll(/([^,;:]*?)\s*≤\s*(\d+(?:\.\d+)?)\s*(KB|MB)/gi)].map((m) => ({
		phrase: m[1].trim().toLowerCase(),
		bytes: Math.round(Number(m[2]) * (m[3].toUpperCase() === 'MB' ? KB * KB : KB)),
	}));
	const fallback = budgets.find((b) => /each image/.test(b.phrase))?.bytes ?? null;
	const budgetFor = (file) => {
		const stem = basename(file, '.png').toLowerCase();
		const own = budgets.find((b) => !/each image/.test(b.phrase) && (b.phrase.includes(file.toLowerCase()) || b.phrase.split(/[^a-z0-9-]+/).includes(stem)));
		return own?.bytes ?? fallback;
	};

	return { images, viewport: viewport ? { width: Number(viewport[1]), height: Number(viewport[2]) } : null, budgetFor, caveat: knownArtefact(lines) };
}

/** The readme's "Known artefact" note as `{ title, text }`: a heading's section, or a bullet with a bold lead-in. */
function knownArtefact(lines) {
	for (let i = 0; i < lines.length; i++) {
		const heading = lines[i].match(/^(#+)\s+(Known artefact.*)$/i);
		if (heading) {
			const body = [];
			for (let j = i + 1; j < lines.length && !/^#{1,6}\s/.test(lines[j]); j++) body.push(lines[j]);
			return { title: heading[2].trim(), text: body.join('\n').trim() };
		}
		const bullet = lines[i].match(/^(\s*)[-*]\s+\*\*(Known artefact[^*]*)\*\*:?\s*(.*)$/i);
		if (bullet) {
			const body = [bullet[3]];
			for (let j = i + 1; j < lines.length && lines[j].trim() && !/^\s*[-*]\s/.test(lines[j]) && !/^#/.test(lines[j]); j++) body.push(lines[j].trim());
			return { title: bullet[2].trim(), text: body.join(' ').trim() };
		}
	}
	return null;
}

const size = (bytes) => (bytes >= KB * KB ? `${(bytes / KB / KB).toFixed(1)} MB` : `${Math.round(bytes / KB)} KB`);

/** The checks of research R11, in order; returns the first that fails as a reason, or null. */
function check(file, bytes, readme) {
	const expected = readme.images.get(file);
	if (!expected) return { reason: `not listed in the images table of ${README}` };
	let dimensions;
	try {
		dimensions = readPngSize(bytes);
	} catch (error) {
		return { reason: error.message };
	}
	const budget = readme.budgetFor(file);
	if (budget !== null && bytes.length > budget) return { reason: `over ${size(budget)} budget (${size(bytes.length)})`, dimensions, budget };
	const { viewport } = readme;
	if (viewport && (dimensions.width !== viewport.width || dimensions.height !== viewport.height)) {
		return { reason: `${dimensions.width}×${dimensions.height}, not the stated ${viewport.width}×${viewport.height} viewport`, dimensions, budget };
	}
	return { reason: null, dimensions, budget };
}

export default {
	id: 'refresh-screenshots',
	short: 'screenshots',
	what: 'screenshots',
	sources: ['standalone', 'intellij', 'vscode', 'eclipse'].map(ide),
	usesReleases: true,
	derivedFiles: ['*/screenshots.json'],
	configFiles: ['screenshots.json', 'states.json'],

	async apply(ctx) {
		const previous = new Map((ctx.previous?.files ?? []).map((f) => [f.path, f]));
		const result = { files: [], keep: [], derived: [], inputs: [], caveats: [], reviewNotes: [] };
		const details = { images: [], rejected: [], gaps: [], hosts: [] };
		const toReview = [];

		for (const source of ctx.sources) {
			const { host } = source;
			const readmeFile = source.files.find((f) => f.sourcePath === README);
			const catalogueFile = source.files.find((f) => f.sourcePath === CATALOGUE_PATH);
			const pngs = source.files.filter((f) => f.sourcePath.endsWith('.png'));
			result.inputs.push(...[readmeFile, catalogueFile].filter(Boolean));

			const designers = catalogueFile ? await designersFor(host, source.reader, { head: source.head, release: source.release, states: ctx.config.states }) : { missingCatalogue: true };
			if (!readmeFile && !pngs.length) {
				if (!designers.missingCatalogue) details.gaps.push(...gapsFor(host, designers.entries, new Set()));
				continue;
			}
			details.hosts.push(host);
			const readme = parseReadme(readmeFile ? readFileSync(readmeFile.file, 'utf8') : '');
			if (readme.caveat) result.caveats.push({ ...readme.caveat, repository: source.repository, sourcePath: README, commit: readmeFile.commit });

			const mapping = ctx.config.screenshots?.[host] ?? {};
			const shown = new Set();
			const entries = [];
			for (const png of pngs) {
				const file = basename(png.sourcePath);
				const path = `${host}/${file}`;
				if (!(file in mapping)) {
					const origins = designers.missingCatalogue ? [] : designers.entries.map((e) => e.origin);
					throw new NeedsDecision({
						question: `Which designer does the screenshot ${file} of ${host} show?`,
						subject: `${source.repository} docs/screenshots/${file}${readme.images.get(file) ? `: ${readme.images.get(file).expectation}` : ''}`,
						options: [...origins, NOT_A_DESIGNER],
						writeTo: 'procedures/config/screenshots.json',
						key: [host, file],
					});
				}
				const origin = mapping[file] === NOT_A_DESIGNER ? null : mapping[file];
				const bytes = readFileSync(png.file);
				const { reason, dimensions, budget } = check(file, bytes, readme);
				const was = previous.get(path);
				const change = !was ? 'added' : was.gitBlob === png.gitBlob ? 'unchanged' : 'changed';
				const expected = readme.images.get(file) ?? { document: '', expectation: '' };
				const entry = { file, origin, expectation: expected.expectation, document: expected.document, bytes: bytes.length, width: dimensions?.width ?? null, height: dimensions?.height ?? null, budgetBytes: budget ?? null, status: reason ? 'rejected' : 'accepted' };
				if (reason) {
					entry.reason = reason;
					entry.previousKept = Boolean(was);
					if (was) result.keep.push(path);
					details.rejected.push({ host, file, reason, previousKept: Boolean(was) });
					if (was && origin) shown.add(origin);
				} else {
					result.files.push({ path, from: png });
					if (origin) shown.add(origin);
					if (change !== 'unchanged') {
						details.images.push({ host, file, change, bytes: bytes.length, expectation: entry.expectation });
						toReview.push(`- \`${host}/${file}\`: ${entry.expectation}`);
					}
				}
				entries.push(entry);
			}
			result.derived.push({ path: `${host}/screenshots.json`, content: `${JSON.stringify(entries.sort((a, b) => a.file.localeCompare(b.file)), null, 2)}\n` });
			if (!designers.missingCatalogue) details.gaps.push(...gapsFor(host, designers.entries, shown));
		}

		if (toReview.length) result.reviewNotes.push(['Check each image shows what its expectation says:', '', ...toReview].join('\n'));
		result.details = details;
		return result;
	},

	renderDetails(d) {
		if (!d) return '';
		const lines = [];
		if (d.images.length) {
			lines.push('| Host | File | Change | Size | Expectation |', '|---|---|---|---|---|');
			for (const i of d.images) lines.push(`| ${i.host} | \`${i.file}\` | ${i.change} | ${size(i.bytes)} | ${i.expectation.replaceAll('|', '\\|')} |`);
		} else {
			lines.push('No image was added or changed.');
		}
		lines.push('', '**Rejected**:', '');
		if (!d.rejected.length) lines.push('None');
		for (const r of d.rejected) lines.push(`- ${r.host} \`${r.file}\`: ${r.reason}; ${r.previousKept ? 'previous copy kept' : 'not published (no previous copy)'}`);
		lines.push('', '**Gaps** (usable in a host, but no screenshot there):', '');
		if (!d.gaps.length) lines.push('None');
		for (const g of d.gaps) lines.push(`- ${g.host}: \`${g.origin}\` (${g.name}, ${g.state})`);
		return lines.join('\n');
	},
};

/** Designers that are prototype or available in `host` after the release cap, but have no screenshot there. */
function gapsFor(host, entries, shown) {
	return entries.filter((e) => isUsable(e.state) && !shown.has(e.origin)).map((e) => ({ host, origin: e.origin, name: e.name, state: e.state }));
}

