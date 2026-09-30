/**
 * npm run reference:refresh -- <language> [--revision <sha-or-ref>] [--dry-run]
 *
 * Brings the snapshot of a language up to its source (contracts/refresh-cli.md, research D15).
 * All or nothing: on any failure nothing is written (FR-013). Exit codes: 0 changed, 1 failed, 3 current.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { toString } from 'mdast-util-to-string';
import { REFERENCE_DIR, compareVersions, registeredLanguages } from '../../src/lib/reference/load';
import { splitProse, type Split } from '../../src/lib/reference/split';
import type { FileRecord, FileRole, Language, Version } from '../../src/lib/reference/types';

/** The GitHub calls the refresh makes; tests replace them. */
export interface GitHub {
	/** A ref or SHA → the full 40-character SHA. */
	resolve(repository: string, ref: string): Promise<string>;
	/** The file names in a folder at a revision. */
	list(repository: string, path: string, revision: string): Promise<string[]>;
	/** A file's bytes at a revision. */
	file(repository: string, path: string, revision: string): Promise<Buffer>;
	/** The repository's licence as GitHub identifies it, or null when it has none. */
	licence(repository: string, revision: string): Promise<{ spdx: string; copyright: string | null } | null>;
}

export interface RefreshOptions {
	language: Language;
	revision?: string;
	dryRun?: boolean;
	/** The folder holding `<language>/<version>/` snapshots. */
	contentRoot: string;
	github: GitHub;
	now?: Date;
}

export interface RefreshResult {
	code: 0 | 1 | 3;
	report: string;
}

const SITE = 'https://etalii.net/adp';

class RefreshError extends Error {}

function sha256(bytes: Buffer): string {
	return createHash('sha256').update(bytes).digest('hex');
}

interface Snapshot {
	record: Version;
	dir: string;
	file(name: string): Buffer;
}

function readSnapshot(dir: string): Snapshot | undefined {
	const path = join(dir, 'source.json');
	if (!existsSync(path)) return undefined;
	const record = JSON.parse(readFileSync(path, 'utf8')) as Version;
	return { record, dir, file: (name) => readFileSync(join(dir, 'source', name)) };
}

function snapshotsOf(contentRoot: string, language: string): Snapshot[] {
	const dir = join(contentRoot, language);
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true })
		.filter((e) => e.isDirectory() && !e.name.startsWith('.'))
		.map((e) => readSnapshot(join(dir, e.name)))
		.filter((s): s is Snapshot => !!s)
		.sort((a, b) => compareVersions(a.record.version, b.record.version));
}

/** The `$schema` address of an example of this language, for any version, with the `$defs` root it names. */
function exampleSchemaPattern(language: Language): RegExp {
	const path = language.schemaAddress.replace('{schema}', language.schema).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\{version\\}', '([^/]+)');
	return new RegExp(`^${SITE.replace(/[.]/g, '\\.')}${path}#/\\$defs/(Specification|Definition)$`);
}

/**
 * The role of an example by the `$defs` root its `$schema` names: a DISL `Specification` is what a tool engineer
 * writes, recorded as `definition`, and a DID `Definition` is a stored diagram, recorded as `document`.
 */
function exampleRole(language: Language, root: string): FileRole {
	return root === 'Definition' && language.id === 'did' ? 'document' : 'definition';
}

/** The file extensions of examples: DISL's and DID's, or JSON. */
const EXAMPLE = /\.(disl|did|json)$/;

function classify(name: string, bytes: Buffer, language: Language, version: string): { role: FileRole; warning?: string } {
	if (name === language.prose) return { role: 'prose' };
	if (name === language.schema) return { role: 'schema' };
	if (!EXAMPLE.test(name)) return { role: 'other', warning: `\`${name}\` is not a definition or document; stored as \`other\` and not published.` };
	let schema: unknown;
	try {
		schema = JSON.parse(bytes.toString('utf8')).$schema;
	} catch {
		return { role: 'other', warning: `\`${name}\` is not JSON; stored as \`other\` and not published.` };
	}
	const match = typeof schema === 'string' ? exampleSchemaPattern(language).exec(schema) : null;
	if (!match) return { role: 'other', warning: `\`${name}\` has no \`$schema\` of this language's schema; stored as \`other\` and not published.` };
	if (match[1] !== version) {
		throw new RefreshError(`schema version or address mismatch: \`${name}\` declares \`$schema\` version ${match[1]}, the prose declares ${version}.`);
	}
	return { role: exampleRole(language, match[2]) };
}

function topLevelTexts(split: Split): Map<string, string> {
	// Heading text → the section's source text, to tell changed sections from unchanged ones.
	const result = new Map<string, string>();
	for (const section of split.sections) {
		const first = section.nodes[0].position!.start.offset!;
		const last = section.nodes.at(-1)!.position!.end.offset!;
		result.set(toString(section.nodes[0]), split.source.slice(first, last));
	}
	return result;
}

function sectionDiff(before: Split | undefined, after: Split): { added: string[]; removed: string[]; changed: string[] } {
	const a = before ? topLevelTexts(before) : new Map<string, string>();
	const b = topLevelTexts(after);
	return {
		added: [...b.keys()].filter((k) => !a.has(k)),
		removed: [...a.keys()].filter((k) => !b.has(k)),
		changed: before ? [...b.keys()].filter((k) => a.has(k) && a.get(k) !== b.get(k)) : [],
	};
}

function mermaidWithoutAlt(prose: string): number {
	const blocks = [...prose.matchAll(/^```mermaid\r?\n([\s\S]*?)^```/gm)];
	return blocks.filter((m) => !/accTitle|accDescr/.test(m[1])).length;
}

function report(parts: {
	language: Language;
	before?: Snapshot;
	olderVersion?: Snapshot;
	after: Version;
	files: FileRecord[];
	diff: { added: string[]; removed: string[]; changed: string[] };
	warnings: string[];
	outcome: string;
}): string {
	const { language, before, after, files, diff, warnings, outcome } = parts;
	const repo = language.repository;
	const reference = before ?? parts.olderVersion;
	const revisionLine = reference
		? `\`${reference.record.source.revision.slice(0, 7)}\` → \`${after.source.revision.slice(0, 7)}\` ([compare](https://github.com/${repo}/compare/${reference.record.source.revision}...${after.source.revision}))`
		: `none → \`${after.source.revision.slice(0, 7)}\` ([tree](https://github.com/${repo}/tree/${after.source.revision}/${language.path}))`;
	const beforeFiles = new Map((before?.record.files ?? []).map((f) => [f.name, f]));
	const changedFiles = files.filter((f) => beforeFiles.get(f.name)?.sha256 !== f.sha256);
	const removedFiles = [...beforeFiles.values()].filter((f) => !files.some((g) => g.name === f.name));
	const lines = [
		`## Reference refresh: ${language.short}`,
		'',
		`**${outcome}**`,
		'',
		`- Language: \`${language.id}\``,
		`- Version: ${before ? before.record.version : parts.olderVersion ? parts.olderVersion.record.version : 'none'} → ${after.version} (${after.status}, ${after.date})${before ? '' : ' — new version'}`,
		`- Revision: ${revisionLine}`,
		`- Licence: ${after.source.licence}`,
		'',
		'### Files',
		'',
		...(changedFiles.length + removedFiles.length === 0
			? ['No file changed.']
			: [
					'| File | Role | Size before | Size after |',
					'|---|---|---|---|',
					...changedFiles.map((f) => `| \`${f.name}\` | ${f.role} | ${beforeFiles.get(f.name)?.size ?? '—'} | ${f.size} |`),
					...removedFiles.map((f) => `| \`${f.name}\` | ${f.role} | ${f.size} | removed |`),
				]),
		'',
		'### Sections',
		'',
		`- Added: ${diff.added.length ? diff.added.join('; ') : 'none'}`,
		`- Removed: ${diff.removed.length ? diff.removed.join('; ') : 'none'}`,
		`- Changed: ${diff.changed.length ? diff.changed.join('; ') : 'none'}`,
		'',
		'### Warnings',
		'',
		...(warnings.length ? warnings.map((w) => `- ${w}`) : ['None.']),
		'',
	];
	return lines.join('\n');
}

function failure(language: Language, message: string): RefreshResult {
	return { code: 1, report: `## Reference refresh: ${language.short}\n\n**Failed, nothing written:** ${message}\n` };
}

export async function refresh(options: RefreshOptions): Promise<RefreshResult> {
	const { language, github, contentRoot } = options;
	const now = options.now ?? new Date();

	// 1–2. Resolve the revision and download every file and the licence.
	let revision: string;
	const files = new Map<string, Buffer>();
	let licence: { spdx: string; copyright: string | null } | null;
	try {
		revision = await github.resolve(language.repository, options.revision ?? language.branch);
		if (!/^[0-9a-f]{40}$/.test(revision)) throw new Error(`"${options.revision ?? language.branch}" did not resolve to a commit.`);
		for (const name of (await github.list(language.repository, language.path, revision)).sort()) {
			files.set(name, await github.file(language.repository, `${language.path}/${name}`, revision));
		}
		licence = await github.licence(language.repository, revision);
	} catch (error) {
		return failure(language, `source unreachable: ${(error as Error).message}`);
	}

	// 3. The checks of contracts/source-inputs.md S1.
	const warnings: string[] = [];
	let record: Version;
	let split: Split;
	try {
		if (!licence || licence.spdx === 'NOASSERTION' || !licence.spdx) {
			throw new RefreshError(`source has no licence: \`${language.repository}\` has no licence GitHub can identify (FR-015, research D14).`);
		}
		const prose = files.get(language.prose);
		if (!prose) throw new RefreshError(`the source has no prose file \`${language.prose}\`.`);
		try {
			split = splitProse(prose.toString('utf8'));
		} catch (error) {
			throw new RefreshError((error as Error).message);
		}
		const schemaBytes = files.get(language.schema);
		if (!schemaBytes) throw new RefreshError(`the source has no schema file \`${language.schema}\`.`);
		let id: unknown;
		try {
			id = JSON.parse(schemaBytes.toString('utf8')).$id;
		} catch {
			throw new RefreshError(`\`${language.schema}\` is not JSON.`);
		}
		const expected = SITE + language.schemaAddress.replace('{version}', split.version).replace('{schema}', language.schema);
		if (id !== expected) {
			throw new RefreshError(`schema version or address mismatch: the schema's \`$id\` is \`${String(id)}\`, expected \`${expected}\` for version ${split.version}.`);
		}
		const records: FileRecord[] = [];
		for (const [name, bytes] of files) {
			const { role, warning } = classify(name, bytes, language, split.version);
			if (warning) warnings.push(warning);
			records.push({ name, role, sha256: sha256(bytes), size: bytes.length });
		}
		const unlabelled = mermaidWithoutAlt(prose.toString('utf8'));
		if (unlabelled) warnings.push(`${unlabelled} Mermaid diagram(s) in the prose have no \`accTitle\`/\`accDescr\`; their alt text is taken from the paragraph before (source-inputs S2).`);
		record = {
			language: language.id,
			version: split.version,
			status: split.status,
			date: split.date,
			source: { kind: 'git', repository: language.repository, path: language.path, revision, licence: licence.spdx, copyright: licence.copyright },
			files: records.sort((a, b) => a.name.localeCompare(b.name)),
			retrieved: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
		};
	} catch (error) {
		if (error instanceof RefreshError) return failure(language, error.message);
		throw error;
	}

	// 4. Compare with the snapshot of the same version, if any.
	const existing = snapshotsOf(contentRoot, language.id);
	const before = existing.find((s) => s.record.version === record.version);
	const olderVersion = before ? undefined : existing.filter((s) => compareVersions(s.record.version, record.version) < 0).at(-1);
	const reference = before ?? olderVersion;
	const beforeSplit = reference ? splitProse(reference.file(language.prose).toString('utf8')) : undefined;
	const diff = sectionDiff(beforeSplit, split);

	const current =
		before &&
		before.record.source.revision === record.source.revision &&
		before.record.files.length === record.files.length &&
		record.files.every((f) => before.record.files.some((g) => g.name === f.name && g.sha256 === f.sha256));
	if (current) {
		return { code: 3, report: report({ language, before, after: before.record, files: before.record.files, diff, warnings, outcome: 'Snapshot is current; nothing to do.' }) };
	}
	if (options.dryRun) {
		return { code: 0, report: report({ language, before, olderVersion, after: record, files: record.files, diff, warnings, outcome: 'Dry run: nothing written.' }) };
	}

	// 5. Write to a temporary folder, then move it into place.
	const languageDir = join(contentRoot, language.id);
	const target = join(languageDir, record.version);
	const temporary = join(languageDir, `.refresh-${record.version}-${process.pid}`);
	const retired = join(languageDir, `.retired-${record.version}-${process.pid}`);
	try {
		mkdirSync(join(temporary, 'source'), { recursive: true });
		for (const [name, bytes] of files) writeFileSync(join(temporary, 'source', name), bytes);
		writeFileSync(join(temporary, 'source.json'), JSON.stringify(record, null, 2) + '\n');
		if (existsSync(target)) renameSync(target, retired);
		renameSync(temporary, target);
		rmSync(retired, { recursive: true, force: true });
	} catch (error) {
		rmSync(temporary, { recursive: true, force: true });
		if (existsSync(retired) && !existsSync(target)) renameSync(retired, target);
		return failure(language, `could not write the snapshot: ${(error as Error).message}`);
	}

	return { code: 0, report: report({ language, before, olderVersion, after: record, files: record.files, diff, warnings, outcome: before ? 'Snapshot updated.' : 'New version added.' }) };
}

// -- Which languages a refresh reads ------------------------------------------------------------

/** Languages published together: DISL and DID share a version, so a refresh of either reads both (etalii.adp spec 002). */
const TOGETHER: string[][] = [['disl', 'did']];

/**
 * The languages a refresh of `id` reads: DISL and DID together, whichever of the two is named, and any other language
 * as itself. A language that moved (`movedTo` in languages.json) is not refreshed: its source is gone upstream.
 */
export function languagesToRefresh(id: string, registered: Language[] = registeredLanguages()): Language[] {
	const byId = (wanted: string): Language => {
		const language = registered.find((l) => l.id === wanted);
		if (!language) throw new Error(`No language "${wanted}" in ${join(REFERENCE_DIR, 'languages.json')}.`);
		return language;
	};
	const language = byId(id);
	if (language.movedTo) throw new Error(`"${id}" moved to "${language.movedTo}"; refresh ${language.movedTo} instead.`);
	return (TOGETHER.find((group) => group.includes(id)) ?? [id]).map(byId);
}

// -- The GitHub REST API, read without a token when none is available (the source is public) -------

function token(): string | undefined {
	if (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
	try {
		return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
	} catch {
		return undefined;
	}
}

export function httpGitHub(): GitHub {
	const auth = token();
	const get = async (path: string, accept: string): Promise<Response> => {
		const response = await fetch(`https://api.github.com${path}`, {
			headers: { accept, 'x-github-api-version': '2022-11-28', 'user-agent': 'etalii-adp-site-reference-refresh', ...(auth ? { authorization: `Bearer ${auth}` } : {}) },
		});
		return response;
	};
	const ok = async (response: Response, what: string): Promise<Response> => {
		if (!response.ok) throw new Error(`${what}: HTTP ${response.status}`);
		return response;
	};
	return {
		async resolve(repository, ref) {
			const response = await ok(await get(`/repos/${repository}/commits/${encodeURIComponent(ref)}`, 'application/vnd.github.sha'), `resolving ${ref} in ${repository}`);
			return (await response.text()).trim();
		},
		async list(repository, path, revision) {
			const response = await ok(await get(`/repos/${repository}/contents/${path}?ref=${revision}`, 'application/vnd.github+json'), `listing ${path}`);
			const entries = (await response.json()) as { name: string; type: string }[];
			return entries.filter((e) => e.type === 'file').map((e) => e.name);
		},
		async file(repository, path, revision) {
			const response = await ok(await get(`/repos/${repository}/contents/${path}?ref=${revision}`, 'application/vnd.github.raw+json'), `downloading ${path}`);
			return Buffer.from(await response.arrayBuffer());
		},
		async licence(repository, revision) {
			const response = await get(`/repos/${repository}/license?ref=${revision}`, 'application/vnd.github+json');
			if (response.status === 404) return null;
			await ok(response, `reading the licence of ${repository}`);
			const body = (await response.json()) as { license?: { spdx_id?: string }; content?: string };
			const text = body.content ? Buffer.from(body.content, 'base64').toString('utf8') : '';
			return { spdx: body.license?.spdx_id ?? 'NOASSERTION', copyright: copyrightOf(text) };
		},
	};
}

/** The licence's copyright line, skipping the Apache appendix template ("Copyright [yyyy] [name of copyright owner]") when it was never filled. */
export function copyrightOf(text: string): string | null {
	for (const match of text.matchAll(/^\s*(Copyright .+)$/gm)) {
		const line = match[1].trim();
		if (!/\[[^\]]*\]/.test(line)) return line;
	}
	return null;
}

// -- Command line ---------------------------------------------------------------------------------

async function main(argv: string[]): Promise<number> {
	const args = [...argv];
	const dryRun = args.includes('--dry-run');
	const revisionAt = args.indexOf('--revision');
	const revision = revisionAt >= 0 ? args[revisionAt + 1] : undefined;
	const positional = args.filter((a, i) => !a.startsWith('--') && (revisionAt < 0 || i !== revisionAt + 1));
	if (positional.length !== 1 || (revisionAt >= 0 && !revision)) {
		console.error('usage: npm run reference:refresh -- <language> [--revision <sha-or-ref>] [--dry-run]');
		return 1;
	}
	let chosen: Language[];
	const github = httpGitHub();
	try {
		chosen = languagesToRefresh(positional[0]);
	} catch (error) {
		console.error((error as Error).message);
		return 1;
	}
	// Exit codes combined: 1 when any failed, else 0 when any changed, else 3 (every one current).
	const codes: number[] = [];
	for (const language of chosen) {
		const result = await refresh({ language, revision, dryRun, contentRoot: REFERENCE_DIR, github });
		console.log(result.report);
		codes.push(result.code);
	}
	return codes.includes(1) ? 1 : codes.includes(0) ? 0 : 3;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	process.exitCode = await main(process.argv.slice(2));
}
