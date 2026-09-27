import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { catalogueHostIds } from './hosts.ts';
import type { GitSourceRecord, HostId, ReportItem } from './types.ts';

/**
 * Reads what spec 004's procedures write under `sources/` (004 contracts/site-integration.md, data-model.md).
 * Nothing here writes under `sources/`. Each `sources/<short>/source.lock.json` holds the records of that folder,
 * with `path` relative to the folder, e.g. `standalone/diagrams.md`.
 */

export const defaultSourcesRoot = 'sources';

/** One entry of a lock's `files` (004 contracts/source-lock.schema.json). */
export interface LockEntry {
	path: string;
	repository: string;
	sourcePath: string;
	commit: string;
	gitBlob: string;
	sha256: string;
	/** An SPDX id, or `"unstated"`. */
	licence: string;
}

export interface SourceLock {
	procedure: string;
	refreshedAt: string;
	local?: true;
	sourceHeads: Record<string, string>;
	releases?: Record<string, { tag: string; commit: string } | null>;
	files: LockEntry[];
	withdrawn: { path: string; sourcePath: string; withdrawnAt: string; lastCommit: string; replacedBy?: string | null }[];
	/** Where this lock was read from, for error messages. */
	file: string;
}

/** A row of `sources/catalogue/<host>/catalogue.json` (004 data-model § Designer entry). */
export interface CatalogueRow {
	origin: string;
	name: string;
	group: string;
	developState: string;
	releaseState: string | null;
	state: string | null;
	theory: { label: string; href: string }[];
	example: string | { label: string; href: string } | null;
}

/** An entry of `sources/screenshots/<host>/screenshots.json` (004 data-model § Screenshot). */
export interface ScreenshotEntry {
	file: string;
	origin: string;
	expectation: string;
	document: string;
	bytes: number;
	width: number;
	height: number;
	budgetBytes: number;
	status: 'accepted' | 'rejected';
}

/** An entry of `sources/hosts/hosts.json` (004 data-model § Host state). */
export interface HostEntry {
	host: HostId;
	repository: string;
	state: 'planned' | 'in progress' | 'available';
	facts: {
		catalogueCommit: string | null;
		usableDesigners: number;
		designersInProgress: number;
		latestRelease: { tag: string; commit: string } | null;
		developHead: string;
	};
	link: string;
}

export interface Sources {
	root: string;
	catalogues: Map<HostId, { rows: CatalogueRow[]; lock: SourceLock; file: string }>;
	screenshots: Map<HostId, { entries: ScreenshotEntry[]; lock: SourceLock; file: string }>;
	hosts: { entries: HostEntry[]; lock: SourceLock } | undefined;
	gaps: ReportItem[];
}

function readJson<T>(file: string): T {
	try {
		return JSON.parse(readFileSync(file, 'utf8')) as T;
	} catch (error) {
		throw new Error(`${file}: cannot be read as JSON (${(error as Error).message}).`);
	}
}

function readLock(file: string): SourceLock | undefined {
	if (!existsSync(file)) return undefined;
	return { ...readJson<Omit<SourceLock, 'file'>>(file), file };
}

/** Posix path, as written into records and matched by `import.meta.glob`. */
export function posix(path: string): string {
	return path.replaceAll('\\', '/').replace(/^\.\//, '');
}

export function readSources(root: string = process.env.ADP_SOURCES_DIR ?? defaultSourcesRoot): Sources {
	const sources: Sources = { root: posix(root), catalogues: new Map(), screenshots: new Map(), hosts: undefined, gaps: [] };
	const catalogueLock = readLock(join(root, 'catalogue', 'source.lock.json'));
	const screenshotLock = readLock(join(root, 'screenshots', 'source.lock.json'));

	for (const host of catalogueHostIds) {
		const catalogueFile = join(root, 'catalogue', host, 'catalogue.json');
		if (existsSync(catalogueFile)) {
			if (!catalogueLock) throw new Error(`${catalogueFile}: there is no ${join(root, 'catalogue', 'source.lock.json')} to say where it came from.`);
			sources.catalogues.set(host, { rows: readJson<CatalogueRow[]>(catalogueFile), lock: catalogueLock, file: posix(catalogueFile) });
		} else {
			sources.gaps.push({ host, message: `no catalogue for ${host}` });
		}

		const screenshotFile = join(root, 'screenshots', host, 'screenshots.json');
		if (existsSync(screenshotFile)) {
			if (!screenshotLock) throw new Error(`${screenshotFile}: there is no ${join(root, 'screenshots', 'source.lock.json')} to say where it came from.`);
			sources.screenshots.set(host, { entries: readJson<ScreenshotEntry[]>(screenshotFile), lock: screenshotLock, file: posix(screenshotFile) });
		}
	}

	const hostsFile = join(root, 'hosts', 'hosts.json');
	if (existsSync(hostsFile)) {
		const lock = readLock(join(root, 'hosts', 'source.lock.json'));
		if (!lock) throw new Error(`${hostsFile}: there is no ${join(root, 'hosts', 'source.lock.json')} to say where it came from.`);
		const raw = readJson<HostEntry[] | { hosts: HostEntry[] }>(hostsFile);
		sources.hosts = { entries: Array.isArray(raw) ? raw : raw.hosts, lock };
	} else {
		sources.gaps.push({ message: 'no sources/hosts/hosts.json, so no host has a public release to install from' });
	}
	return sources;
}

/** The licence of a lock entry, with `"unstated"` as `null`. */
export function licenceOf(entry: Pick<LockEntry, 'licence'>): string | null {
	return !entry.licence || entry.licence === 'unstated' ? null : entry.licence;
}

/** A git SourceRecord for the file at `path` (relative to the lock's folder); throws if the lock does not list it. */
export function toSourceRecord(lock: SourceLock, path: string): GitSourceRecord {
	const entry = lock.files.find((file) => file.path === path);
	if (!entry) throw new Error(`${lock.file}: has no entry for ${path}.`);
	return { kind: 'git', repository: entry.repository, path: entry.sourcePath, revision: entry.commit, retrievedAt: lock.refreshedAt, licence: licenceOf(entry) };
}
