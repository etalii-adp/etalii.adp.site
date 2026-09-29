/**
 * Reads the language registry and the snapshots of each language, validates them against
 * contracts/reference-data.schema.json and verifies every file's SHA-256 (data-model "Files").
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { splitProse, type Split } from './split';
import type { FileRecord, Language, Version } from './types';

/** Where the site's own reference data lives: the registry and, by default, the snapshots. */
export const REFERENCE_DIR = join('src', 'content', 'reference');
export const CONTRACT = join('specs', '002-dedl-reference', 'contracts', 'reference-data.schema.json');

/** The folder holding `<language>/<version>/` snapshots; `REFERENCE_CONTENT_DIR` points development builds and tests at a fixture. */
export function contentDir(): string {
	return process.env.REFERENCE_CONTENT_DIR || REFERENCE_DIR;
}

let validator: Ajv2020 | undefined;
function validate(def: 'Languages' | 'Version', data: unknown, where: string): void {
	if (!validator) {
		validator = new Ajv2020({ allErrors: true, strict: true });
		addFormats(validator);
		validator.addSchema(JSON.parse(readFileSync(CONTRACT, 'utf8')));
	}
	const check = validator.getSchema(`https://etalii.net/adp/site/contracts/reference-data.schema.json#/$defs/${def}`)!;
	if (!check(data)) {
		const errors = check.errors!.map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
		throw new Error(`${where} does not match $defs/${def} of ${CONTRACT}: ${errors}`);
	}
}

export function sha256(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

/** Orders version strings numerically: 0.2 < 0.10 < 1.0. */
export function compareVersions(a: string, b: string): number {
	const pa = a.split('.').map(Number);
	const pb = b.split('.').map(Number);
	for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
		const d = (pa[i] ?? 0) - (pb[i] ?? 0);
		if (d !== 0) return d;
	}
	return 0;
}

/** One published version, read from its snapshot. */
export interface LoadedVersion {
	language: Language;
	record: Version;
	/** The snapshot folder. */
	dir: string;
	file(name: string): Buffer;
	fileRecord(role: FileRecord['role']): FileRecord[];
	/** The prose, split into pages (computed once). */
	split(): Split;
	/** The schema, parsed. */
	schema(): { $id: string; $defs: Record<string, unknown> } & Record<string, unknown>;
}

const cache = new Map<string, unknown>();
function memo<T>(key: string, make: () => T): T {
	if (!cache.has(key)) cache.set(key, make());
	return cache.get(key) as T;
}

/** Every registered language, including those with `publish: false` that only the refresh reads. */
export function registeredLanguages(): Language[] {
	return memo('languages', () => {
		const path = join(REFERENCE_DIR, 'languages.json');
		const data = JSON.parse(readFileSync(path, 'utf8'));
		validate('Languages', data, path);
		return data as Language[];
	});
}

/** The languages the site publishes pages for: every registered language but those with `publish: false`. */
export function languages(): Language[] {
	return registeredLanguages().filter((language) => language.publish !== false);
}

/** The languages whose schema files the site serves: the published ones and those that moved (`movedTo`), so a moved
 * language's schema keeps its address (etalii.adp spec 002). */
export function schemaLanguages(): Language[] {
	return registeredLanguages().filter((language) => language.publish !== false || language.movedTo);
}

export function languageById(id: string): Language {
	const language = registeredLanguages().find((l) => l.id === id);
	if (!language) throw new Error(`No language "${id}" in ${join(REFERENCE_DIR, 'languages.json')}.`);
	return language;
}

function loadVersion(language: Language, dir: string): LoadedVersion {
	const path = join(dir, 'source.json');
	const record = JSON.parse(readFileSync(path, 'utf8')) as Version;
	validate('Version', record, path);
	if (record.language !== language.id) throw new Error(`${path} names language "${record.language}", not "${language.id}".`);

	const files = new Map<string, Buffer>();
	for (const file of record.files) {
		const bytes = readFileSync(join(dir, 'source', file.name));
		if (sha256(bytes) !== file.sha256) {
			throw new Error(`${join(dir, 'source', file.name)} does not match the SHA-256 in ${path}; snapshots are written by npm run reference:refresh only.`);
		}
		files.set(file.name, bytes);
	}
	for (const name of [language.prose, language.schema]) {
		if (!files.has(name)) throw new Error(`${path} lists no file "${name}".`);
	}

	const loaded: LoadedVersion = {
		language,
		record,
		dir,
		file(name) {
			const bytes = files.get(name);
			if (!bytes) throw new Error(`${path} lists no file "${name}".`);
			return bytes;
		},
		fileRecord(role) {
			return record.files.filter((f) => f.role === role);
		},
		split: () => memo(`split:${dir}`, () => splitProse(loaded.file(language.prose).toString('utf8'))),
		schema: () => memo(`schema:${dir}`, () => JSON.parse(loaded.file(language.schema).toString('utf8'))),
	};
	return loaded;
}

/** The published versions of a language, oldest first. */
export function versionsOf(languageId: string): LoadedVersion[] {
	const root = contentDir();
	return memo(`versions:${root}:${languageId}`, () => {
		const language = languageById(languageId);
		const dir = join(root, language.id);
		if (!existsSync(dir)) return [];
		return readdirSync(dir, { withFileTypes: true })
			.filter((entry) => entry.isDirectory())
			.map((entry) => loadVersion(language, join(dir, entry.name)))
			.sort((a, b) => compareVersions(a.record.version, b.record.version));
	});
}

/** The most recent published version, or undefined when none is published. */
export function latestOf(languageId: string): LoadedVersion | undefined {
	return versionsOf(languageId).at(-1);
}

export function versionOf(languageId: string, version: string): LoadedVersion {
	const found = versionsOf(languageId).find((v) => v.record.version === version);
	if (!found) throw new Error(`No published version ${version} of ${languageId}.`);
	return found;
}
