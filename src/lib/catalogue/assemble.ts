import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogueHosts, hostById } from './hosts.ts';
import { readNotionSnapshot, toNotionSourceRecord, type NotionRow } from './notion-snapshot.ts';
import { licenceOf, posix, readSources, toSourceRecord, type CatalogueRow, type Sources } from './sources.ts';
import { UnmappedStateError, bestState, defaultStatesConfig, isUsable, loadMapping, mapSourceState, states, type StateMapping } from './states.ts';
import type {
	CatalogueReport,
	Designer,
	FileFormat,
	FocusArea,
	GitSourceRecord,
	HostAvailability,
	HostId,
	Idea,
	Link,
	Redirect,
	Screenshot,
	SourceRecord,
	StateId,
} from './types.ts';

/**
 * Assembles the catalogue from committed files only (data-model.md): spec 004's `sources/`, the state mapping in
 * `procedures/config/states.json`, the Notion snapshot and the site-owned files in `src/content/catalogue/`.
 * It never reaches the network. It reports gaps instead of failing, and throws only for an unmapped state, a
 * redirect that contradicts the catalogue, or a malformed file; each message names the file and the origin.
 */

export const defaultContentDir = 'src/content/catalogue';

export interface AssembleOptions {
	/** Spec 004's output; `ADP_SOURCES_DIR` or `sources`. */
	sourcesRoot?: string;
	/** `ADP_STATES_CONFIG` or `procedures/config/states.json`. */
	configPath?: string;
	/** The site-owned files; `src/content/catalogue`. */
	contentDir?: string;
	/** `ADP_NOTION_SNAPSHOT` or `<contentDir>/notion.json`. */
	notionPath?: string;
}

export interface Catalogue {
	designers: Designer[];
	ideas: Idea[];
	focusAreas: FocusArea[];
	redirects: Redirect[];
	report: CatalogueReport;
	/** Every record the catalogue was assembled from, for the overview's footer (FR-009). */
	sources: SourceRecord[];
	/** Per origin, including ideas and origins in neither set: each host's state, for catalogue:report. */
	hostStates: Record<string, Record<HostId, { state: StateId; sourceState: string | null }>>;
}

const originPattern = /^[a-z0-9.-]+\/[a-z0-9.-]+$/;
const purposeLimit = 140;

function readJson<T>(file: string, fallback: T): T {
	if (!existsSync(file)) return fallback;
	try {
		return JSON.parse(readFileSync(file, 'utf8')) as T;
	} catch (error) {
		throw new Error(`${posix(file)}: cannot be read as JSON (${(error as Error).message}).`);
	}
}

function byKey<T>(key: (item: T) => string) {
	return (a: T, b: T) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
}

/** Records compare equal when every field does. */
function recordKey(record: SourceRecord): string {
	return record.kind === 'git' ? `git ${record.repository} ${record.path} ${record.revision}` : `notion ${record.page} ${record.revision}`;
}

function unique(records: SourceRecord[]): SourceRecord[] {
	const seen = new Map<string, SourceRecord>();
	for (const record of records) if (!seen.has(recordKey(record))) seen.set(recordKey(record), record);
	return [...seen.values()];
}

/** "5. Knowledge and semantics" → "Knowledge and semantics". */
function familyName(group: string): string {
	return group.replace(/^\s*\d+(\.\d+)*\.?\s+/, '').trim();
}

function isAbsolute(href: string): boolean {
	return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

/** URLs in free text, such as the Notion `Theory` column. */
function urlsIn(text: string | null): Link[] {
	return (text?.match(/https?:\/\/[^\s<>"')\]]+/g) ?? [])
		.map((url) => url.replace(/[.,;:]+$/, ''))
		.map((url) => ({ title: url.replace(/^https?:\/\//, '').replace(/\/$/, ''), url }));
}

export function assembleCatalogue(options: AssembleOptions = {}): Catalogue {
	const contentDir = options.contentDir ?? defaultContentDir;
	const configPath = options.configPath ?? process.env.ADP_STATES_CONFIG ?? defaultStatesConfig;
	const notionPath = options.notionPath ?? process.env.ADP_NOTION_SNAPSHOT ?? join(contentDir, 'notion.json');
	const sources = readSources(options.sourcesRoot ?? process.env.ADP_SOURCES_DIR ?? 'sources');
	const snapshot = readNotionSnapshot(notionPath);

	const focusAreas = readJson<FocusArea[]>(join(contentDir, 'focus-areas.json'), []).sort((a, b) => a.order - b.order);
	const screenshotNotes = readJson<Record<string, { whyItMatters: string }>>(join(contentDir, 'screenshot-notes.json'), {});
	const fileFormatNames = readJson<Record<string, { name: string }>>(join(contentDir, 'file-formats.json'), {});
	const redirects = readJson<Redirect[]>(join(contentDir, 'redirects.json'), []);
	const published = readJson<string[]>(join(contentDir, 'published.json'), []);

	const report: CatalogueReport = { gaps: [...sources.gaps], disagreements: [], pending: [], membership: [] };
	if (snapshot.rows.length === 0) report.gaps.push({ message: `no Notion rows in ${posix(notionPath)}; run npm run catalogue:notion` });
	for (const area of focusAreas) {
		if (!area.problem.trim()) report.gaps.push({ message: `focus area "${area.name}" has no problem statement in focus-areas.json` });
	}

	// The state mapping is needed only when there is something to map; without spec 004 on this branch there is not.
	let mapping: StateMapping | undefined;
	const map = (host: HostId, label: string, origin: string, file: string): StateId => {
		mapping ??= loadMapping(configPath);
		try {
			return mapSourceState(mapping, host, label);
		} catch (error) {
			if (error instanceof UnmappedStateError) error.message = `${file}: ${origin}: ${error.message}`;
			throw error;
		}
	};

	// Notion rows by origin.
	const notionByOrigin = new Map<string, NotionRow>();
	for (const row of snapshot.rows) {
		if (!row.origin) continue;
		if (!originPattern.test(row.origin)) {
			report.gaps.push({ message: `Notion row "${row.name ?? row.page}" has the origin "${row.origin}", which is not <vendor>/<type> in lower case; it is left out` });
			continue;
		}
		if (notionByOrigin.has(row.origin)) {
			report.disagreements.push({ origin: row.origin, message: `two Notion rows have the origin ${row.origin}; the first is used` });
			continue;
		}
		notionByOrigin.set(row.origin, row);
	}
	const notionRecord = (row: NotionRow) => toNotionSourceRecord(row, snapshot.retrievedAt ?? row.lastEditedTime);

	// Catalogue rows by origin, per host.
	const catalogueRows = new Map<string, Map<HostId, CatalogueRow>>();
	for (const [host, { rows, file }] of sources.catalogues) {
		for (const row of rows) {
			if (!originPattern.test(row.origin)) throw new Error(`${file}: the origin "${row.origin}" is not <vendor>/<type> in lower case.`);
			const perHost = catalogueRows.get(row.origin) ?? new Map<HostId, CatalogueRow>();
			if (perHost.has(host)) throw new Error(`${file}: ${row.origin} appears twice.`);
			perHost.set(host, row);
			catalogueRows.set(row.origin, perHost);
		}
	}
	const catalogueRecord = (host: HostId): GitSourceRecord => {
		const { lock } = sources.catalogues.get(host)!;
		return toSourceRecord(lock, `${host}/diagrams.md`);
	};

	const releaseFor = (host: HostId) => {
		const entry = sources.hosts?.entries.find((candidate) => candidate.host === host);
		if (!entry || entry.state !== 'available' || !entry.link || !entry.facts?.latestRelease) return null;
		const locks = [sources.catalogues.get(host)?.lock, sources.screenshots.get(host)?.lock, sources.hosts?.lock];
		const licensed = locks.flatMap((lock) => lock?.files ?? []).find((file) => file.repository === hostById(host).repository);
		if (!licensed || licenceOf(licensed) === null) return null;
		return { url: entry.link, label: `Install from ${entry.facts.latestRelease.tag}` };
	};

	const designers: Designer[] = [];
	const ideas: Idea[] = [];
	const hostStates: Catalogue['hostStates'] = {};
	const origins = [...new Set([...catalogueRows.keys(), ...notionByOrigin.keys()])].sort();

	for (const origin of origins) {
		const notion = notionByOrigin.get(origin);
		const rows = catalogueRows.get(origin) ?? new Map<HostId, CatalogueRow>();
		const firstRow = catalogueHosts.map((host) => rows.get(host.id)).find(Boolean);
		const name = notion?.name ?? firstRow?.name ?? origin;
		const primary: SourceRecord = firstRow
			? catalogueRecord(catalogueHosts.find((host) => rows.get(host.id) === firstRow)!.id)
			: notionRecord(notion!);
		const used: SourceRecord[] = [primary];
		if (notion) used.push(notionRecord(notion));

		const hosts = {} as Record<HostId, HostAvailability>;
		for (const { id: host, name: hostName } of catalogueHosts) {
			const notionValue = notion?.hosts[host] ?? null;
			let availability: HostAvailability;
			if (sources.catalogues.has(host)) {
				const row = rows.get(host);
				const file = sources.catalogues.get(host)!.file;
				const state = row ? map(host, row.developState, origin, file) : 'not-planned';
				availability = {
					state,
					sourceState: row?.developState ?? null,
					localName: row && row.name !== name ? row.name : null,
					install: null,
					build: null,
					source: catalogueRecord(host),
					notionDiffers: null,
				};
				if (notion) {
					const notionState = notionValue ? map(host, notionValue, origin, posix(notionPath)) : 'not-planned';
					if (notionState !== state) {
						availability.notionDiffers = notionValue ?? '(empty)';
						report.disagreements.push({
							origin,
							host,
							message: `${origin} · ${host}: Notion says ${notionValue ?? '(empty)'}, the ${hostName} catalogue says ${row?.developState ?? 'nothing'}`,
						});
					}
				}
			} else if (notion) {
				availability = {
					state: notionValue ? map(host, notionValue, origin, posix(notionPath)) : 'not-planned',
					sourceState: notionValue,
					localName: null,
					install: null,
					build: null,
					source: notionRecord(notion),
					notionDiffers: null,
				};
			} else {
				// The host has no catalogue and Notion has no row: nothing says it is planned there.
				availability = { state: 'not-planned', sourceState: null, localName: null, install: null, build: null, source: primary, notionDiffers: null };
			}
			if (availability.state === 'implemented') {
				const install = releaseFor(host);
				if (install) Object.assign(availability, { state: 'available', install });
			}
			used.push(availability.source);
			hosts[host] = availability;
		}

		const best = bestState(hosts);
		hostStates[origin] = Object.fromEntries(
			catalogueHosts.map(({ id }) => [id, { state: hosts[id].state, sourceState: hosts[id].sourceState }]),
		) as Record<HostId, { state: StateId; sourceState: string | null }>;
		const catalogueFamily = firstRow ? familyName(firstRow.group) : null;
		const family = catalogueFamily || notion?.family || 'Other';
		if (catalogueFamily && notion?.family && notion.family !== catalogueFamily) {
			report.disagreements.push({ origin, message: `${origin}: Notion puts it in the family "${notion.family}", the catalogue in "${catalogueFamily}"` });
		}

		// Theory: the catalogue's links, then the URLs in Notion's Theory text, de-duplicated by URL.
		const theory: Link[] = [];
		for (const [host, row] of rows) {
			const record = catalogueRecord(host);
			for (const link of row.theory ?? []) {
				if (isAbsolute(link.href)) theory.push({ title: link.label, url: link.href });
				else if (record.licence !== null) {
					const base = `https://github.com/${record.repository}/blob/${record.revision}/${record.path}`;
					theory.push({ title: link.label, url: new URL(link.href, base).href });
				}
			}
		}
		theory.push(...urlsIn(notion?.theory ?? null));
		const theoryLinks = theory.filter((link, index) => theory.findIndex((other) => other.url === link.url) === index);

		if (states[best].rank < states.idea.rank) continue;
		if (best === 'idea') {
			ideas.push({ origin, name, family, theory: theoryLinks, source: primary });
			continue;
		}

		// Text, from Notion; a gap is reported, never filled in by the site.
		let purpose = notion?.purpose ?? null;
		if (!purpose) {
			purpose = name;
			report.gaps.push({ origin, message: `${origin}: no one-line purpose in Notion; the name is shown instead` });
		}
		if (purpose.length > purposeLimit) {
			throw new Error(`${posix(notionPath)}: ${origin}: the one-line purpose is ${purpose.length} characters, more than ${purposeLimit}.`);
		}
		const task = notion?.description ?? null;
		if (!task) report.gaps.push({ origin, message: `${origin}: no Description (the task it serves) in Notion` });
		const whySpecialized = notion?.whySpecialized ?? null;
		if (!whySpecialized) report.gaps.push({ origin, message: `${origin}: no "Why specialized" in Notion` });
		const fileFormats: FileFormat[] = (notion?.fileExtension ?? '')
			.split(/[\s,]+/)
			.filter(Boolean)
			.map((extension) => (extension.startsWith('.') ? extension : `.${extension}`).toLowerCase())
			.filter((extension, index, all) => all.indexOf(extension) === index)
			.map((extension) => ({ extension, name: fileFormatNames[extension]?.name ?? extension, reads: true, writes: true }));
		if (fileFormats.length === 0) report.gaps.push({ origin, message: `${origin}: no file extension in Notion` });

		const focus: string[] = [];
		for (const option of notion?.focusAreas ?? []) {
			const area = focusAreas.find((candidate) => candidate.name === option);
			if (area) focus.push(area.slug);
			else report.gaps.push({ origin, message: `${origin}: the focus area "${option}" is not in focus-areas.json; run npm run catalogue:notion` });
		}

		// Screenshots: accepted images only, for a usable designer, from a host where it is usable (FR-007).
		const screenshots: Screenshot[] = [];
		for (const [host, { entries, lock }] of sources.screenshots) {
			for (const entry of entries.filter((candidate) => candidate.origin === origin)) {
				if (entry.status !== 'accepted') {
					report.pending.push({ origin, host, message: `${origin}: ${host} screenshot ${entry.file} was rejected by the screenshot refresh and is not shown` });
					continue;
				}
				if (!isUsable(best) || !isUsable(hosts[host].state)) {
					report.disagreements.push({ origin, host, message: `${origin}: ${host} has a screenshot ${entry.file}, but the designer is ${states[hosts[host].state].label.toLowerCase()} there, so it is not shown` });
					continue;
				}
				const record = toSourceRecord(lock, `${host}/${entry.file}`);
				const id = `${host}--${entry.file.replace(/\.png$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
				const whyItMatters = screenshotNotes[id]?.whyItMatters?.trim() ?? '';
				const publishable = record.licence !== null && whyItMatters !== '';
				if (record.licence === null) report.pending.push({ origin, host, message: `${origin}: ${id} is not publishable: its source has no licence` });
				else if (!whyItMatters) report.pending.push({ origin, host, message: `${origin}: ${id} is not publishable: screenshot-notes.json has no "why it matters"` });
				screenshots.push({
					id,
					host,
					file: posix(join(sources.root, 'screenshots', host, entry.file)),
					caption: `${hostById(host).name}, at ${record.revision.slice(0, 7)}`,
					alt: entry.expectation,
					visible: entry.expectation,
					whyItMatters,
					width: entry.width,
					height: entry.height,
					bytes: entry.bytes,
					publishable,
					source: record,
				});
				used.push(record);
			}
		}
		if (isUsable(best) && !screenshots.some((shot) => shot.publishable)) {
			report.pending.push({ origin, message: `${origin}: screenshot pending (usable, but no publishable screenshot)` });
		}

		const kind = (notion?.type ?? 'diagram').toLowerCase();
		designers.push({
			origin,
			name,
			kind: kind === 'designer' || kind === 'editor' ? kind : 'diagram',
			purpose,
			task,
			whySpecialized,
			fileFormats,
			family,
			focusAreas: focus,
			theory: theoryLinks,
			definition: null,
			hosts,
			screenshots,
			sources: unique(used),
		});
	}

	// Screenshots that name no designer or idea.
	for (const [host, { entries }] of sources.screenshots) {
		for (const entry of entries) {
			if (!catalogueRows.has(entry.origin) && !notionByOrigin.has(entry.origin)) {
				report.gaps.push({ origin: entry.origin, host, message: `${host} screenshot ${entry.file} names ${entry.origin}, which no catalogue or Notion row has` });
			}
		}
	}

	// Redirects must agree with the catalogue; published origins that disappeared need one (data-model § Membership).
	const live = new Set(designers.map((designer) => designer.origin));
	const redirectsFile = posix(join(contentDir, 'redirects.json'));
	for (const redirect of redirects) {
		if (live.has(redirect.from)) throw new Error(`${redirectsFile}: ${redirect.from} is redirected, but it is still a designer; remove the redirect or the designer.`);
		if (redirect.to !== null && !live.has(redirect.to)) throw new Error(`${redirectsFile}: ${redirect.from} is redirected to ${redirect.to}, which is not a designer.`);
	}
	const redirected = new Set(redirects.map((redirect) => redirect.from));
	for (const origin of published) {
		if (live.has(origin) || redirected.has(origin)) continue;
		const renamedTo = snapshot.rows.find((row) => row.previousOrigin === origin)?.origin;
		report.membership.push({
			origin,
			message: `${origin} is no longer in any source; it needs a redirect or withdrawal${renamedTo ? ` (Notion says it was renamed to ${renamedTo})` : ''}`,
		});
	}

	designers.sort(byKey((designer) => designer.origin));
	ideas.sort(byKey((idea) => idea.origin));
	return {
		designers,
		ideas,
		focusAreas,
		redirects: [...redirects].sort(byKey((redirect) => redirect.from)),
		report,
		sources: unique([...designers.flatMap((designer) => designer.sources), ...ideas.map((idea) => idea.source)]),
		hostStates,
	};
}
