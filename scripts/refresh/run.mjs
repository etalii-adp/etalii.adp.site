// `npm run refresh -- <id> [options]`: runs a refresh procedure through its five stages, Resolve → Fetch → Apply →
// Verify → Deliver (research R4), and reports one outcome with the exit code of contracts/cli.md.
//
// A procedure module (scripts/refresh/procedures/<short>.mjs) default-exports:
//   { id, short, what, sources: [{ repository, ref: 'develop', paths: [globs], host }], usesReleases,
//     derivedFiles?: [globs under sources/<short>/], configFiles?: [names under procedures/config/],
//     siteFiles?: [paths outside sources/ that only it changes], carriedFiles?: [answer files, carried as configFiles],
//     lockEntries?(lock), apply(ctx), afterApply?(ctx, { log }), afterVerify?(ctx, { write, log }),
//     renderDetails(details, summary), title?(summary) }
// `apply(ctx)` returns `{ files: [{ path, from }], keep: [paths], derived: [{ path, content }], inputs: [source files],
// details, caveats, reviewNotes }`, where a source file is `{ repository, host, sourcePath, gitBlob, commit, licence,
// file }` as fetched into a temporary folder. It throws NeedsDecision when a mapping has no answer. `afterApply`
// runs in the worktree once sources/<short>/ is written, before Verify, and may also throw NeedsDecision;
// `afterVerify` runs after Verify, with `write` set only for a delivered run whose verification passed. Both
// return Markdown sections for the pull request body.
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmdirSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NeedsDecision } from './lib/decision.mjs';
import { LOCK_FILE, applyWithdrawals, compareResolved, parseLock, readLock, sameRecord, sha256, textHash, writeLock } from './lib/lock.mjs';
import { loadGithub, sourceReader } from './lib/local.mjs';
import { ALIASES, canonicalId } from './lib/names.mjs';
import { buildSummary, renderDecisionIssue, renderPrBody, renderPreviousRun, renderTitle, VERIFY_STEPS } from './lib/summary.mjs';
import { git, posix, run, runCaptured, short, writeJson } from './lib/util.mjs';
import { verify } from './verify.mjs';

const here = fileURLToPath(new URL('.', import.meta.url));
export const PROCEDURES = ['dedl', 'screenshots', 'catalogue', 'hosts'];
/** Every name `npm run refresh` accepts: the procedures, their aliases (lib/names.mjs) and `all`. */
export const NAMES = [...PROCEDURES, ...Object.keys(ALIASES), 'all'];
export const EXIT = { current: 0, delivered: 0, 'delivered-draft': 1, failed: 2, 'needs-decision': 3 };
const CI = process.env.GITHUB_ACTIONS === 'true';

class Failure extends Error {}

export function parseArgs(argv) {
	const options = { id: null, dryRun: false, deliver: true, base: 'develop', sources: {} };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === '--dry-run') options.dryRun = true;
		else if (arg === '--no-deliver') options.deliver = false;
		else if (arg === '--base') options.base = argv[++i];
		else if (arg === '--source') {
			const value = argv[++i] ?? '';
			const at = value.indexOf('=');
			if (at < 1) throw new Failure(`--source expects <owner/name>=<path>, got "${value}"`);
			options.sources[value.slice(0, at)] = resolve(value.slice(at + 1));
		} else if (arg.startsWith('--')) throw new Failure(`unknown option ${arg}`);
		else if (options.id === null) options.id = canonicalId(arg);
		else throw new Failure(`unexpected argument ${arg}`);
	}
	if (!options.id) throw new Failure(`name a procedure: one of ${NAMES.join(', ')}`);
	return options;
}

export async function loadProcedure(name) {
	const shortId = canonicalId(name);
	const extra = process.env.REFRESH_PROCEDURES_DIR;
	if (extra && existsSync(join(extra, `${shortId}.mjs`))) return (await import(pathToFileURL(resolve(extra, `${shortId}.mjs`)).href)).default;
	if (!PROCEDURES.includes(shortId)) throw new Failure(`unknown procedure "${shortId}": valid ids are ${NAMES.join(', ')} (with or without the refresh- prefix)`);
	return (await import(pathToFileURL(join(here, 'procedures', `${shortId}.mjs`)).href)).default;
}

function runLink() {
	const { GITHUB_SERVER_URL: server, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: id } = process.env;
	return CI && repo && id ? `${server ?? 'https://github.com'}/${repo}/actions/runs/${id}` : 'local';
}

let previousRun;
/** The previous scheduled run's date, looked up once per process: undefined outside CI, null when none (R5). */
async function previousScheduledRun() {
	if (!CI) return undefined;
	if (previousRun === undefined) {
		try {
			previousRun = await (await loadGithub()).previousScheduledRun('refresh.yml');
		} catch {
			previousRun = null;
		}
	}
	return previousRun;
}

async function hasOrigin(cwd) {
	try {
		await git(cwd, ['remote', 'get-url', 'origin']);
		return true;
	} catch {
		return false;
	}
}

async function showAt(cwd, ref, path) {
	try {
		return await git(cwd, ['show', `${ref}:${path}`], { encoding: 'buffer' }).then((b) => b.toString('utf8'));
	} catch {
		return null;
	}
}

function walk(dir, base = dir, out = []) {
	if (!existsSync(dir)) return out;
	for (const name of readdirSync(dir)) {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) walk(path, base, out);
		else out.push(posix(relative(base, path)));
	}
	return out;
}

function pruneEmpty(dir) {
	if (!existsSync(dir) || !statSync(dir).isDirectory()) return;
	for (const name of readdirSync(dir)) pruneEmpty(join(dir, name));
	if (!readdirSync(dir).length) rmdirSync(dir);
}

/** Links the invoking checkout's node_modules into a temporary worktree (a junction on Windows). */
function linkNodeModules(from, root) {
	const source = join(from, 'node_modules');
	const target = join(root, 'node_modules');
	if (from === root || !existsSync(source) || existsSync(target)) return null;
	symlinkSync(source, target, 'junction');
	return target;
}

function unlinkDir(link) {
	if (!link) return;
	try {
		if (process.platform === 'win32') rmdirSync(link);
		else unlinkSync(link);
	} catch {
		// Already gone.
	}
}

/**
 * Runs one procedure and returns `{ outcome, code, summary, prUrl, message, decision }`. `out` is the folder
 * for summary.json, pr-body.md and decision.json.
 */
export async function runProcedure(procedure, options, { cwd = process.cwd(), out = join(cwd, '.refresh'), log = console.log } = {}) {
	const shortId = procedure.short;
	const local = Object.keys(options.sources).length > 0 && procedure.sources.some((s) => options.sources[s.repository]);
	const deliver = options.deliver && !options.dryRun;
	const result = { procedure: procedure.id, outcome: 'failed', prUrl: null, message: '', summary: null, decision: null };
	mkdirSync(out, { recursive: true });
	for (const name of ['decision.json', 'pr-body.md', 'diff.patch']) rmSync(join(out, name), { force: true });

	let worktree = null;
	let nodeModulesLink = null;
	const tmp = mkdtempSync(join(tmpdir(), `refresh-${shortId}-`));
	const stage = (name, text) => log(`${name}: ${text}`);

	try {
		if (local && deliver) throw new Failure('a run that reads a local --source can never be delivered; add --dry-run or --no-deliver');

		// Resolve: the heads, the watched files with their blobs, and the latest releases; nothing is downloaded.
		let baseRef = options.base;
		if (await hasOrigin(cwd)) {
			try {
				await git(cwd, ['fetch', '--quiet', 'origin', options.base]);
			} catch (error) {
				throw new Failure(`cannot fetch ${options.base} from origin: ${(error.stderr || error.message).trim()}`);
			}
			baseRef = `origin/${options.base}`;
		}
		const lockText = await showAt(cwd, baseRef, `sources/${shortId}/${LOCK_FILE}`);
		const previous = lockText === null ? null : parseLock(lockText, { allowLocal: local });

		const sources = [];
		for (const declared of procedure.sources) {
			const reader = await sourceReader(declared.repository, options);
			const head = await reader.developHead(declared.ref);
			const listed = await reader.listTree(head, declared.paths);
			const release = procedure.usesReleases ? await reader.latestRelease() : undefined;
			sources.push({ ...declared, reader, head, release, files: listed.map((f) => ({ repository: declared.repository, host: declared.host, sourcePath: f.path, gitBlob: f.gitBlob })) });
			stage('resolve', `${declared.repository} ${declared.ref} at ${short(head)}: ${listed.length} watched file${listed.length === 1 ? '' : 's'}${procedure.usesReleases ? `, latest release ${release ? release.tag : 'none'}` : ''}`);
		}
		const resolved = sources.flatMap((s) => s.files);
		const releases = procedure.usesReleases ? Object.fromEntries(sources.map((s) => [s.repository, s.release])) : undefined;
		const compared = compareResolved(previous, resolved, releases, previous && procedure.lockEntries ? procedure.lockEntries(previous) : undefined);
		const config = Object.fromEntries((procedure.configFiles ?? []).filter((name) => existsSync(join(cwd, 'procedures/config', name))).map((name) => [`procedures/config/${name}`, textHash(join(cwd, 'procedures/config', name))]));
		const configChanged = Object.entries(config).some(([path, hash]) => previous?.config?.[path] !== hash);
		const after = Object.fromEntries(sources.map((s) => [s.repository, s.head]));

		if (compared.current && !configChanged) {
			stage('resolve', 'nothing changed since the last refresh');
			result.outcome = 'current';
			result.message = `content is current at ${Object.entries(after).map(([r, h]) => `${r}@${short(h)}`).join(', ')}`;
			if (deliver) await closeStalePr(procedure, after, stage);
			return finish(result, out, procedure, { after, before: previous?.sourceHeads ?? {} });
		}
		stage('resolve', `${compared.added.length} added, ${compared.changed.length} changed, ${compared.removed.length} removed${compared.releasesChanged ? ', releases changed' : ''}${configChanged ? ', mapping changed' : ''}`);

		// Fetch: every watched file at the resolved head, into a temporary folder. A failure changes nothing.
		for (const source of sources) {
			const licence = await source.reader.licence();
			for (const file of source.files) {
				file.commit = (await source.reader.lastCommitForPath(source.head, file.sourcePath)) ?? source.head;
				file.licence = licence;
				file.file = join(tmp, 'fetch', source.repository, file.sourcePath);
				await source.reader.downloadFile(source.head, file.sourcePath, file.file);
			}
			stage('fetch', `${source.files.length} file${source.files.length === 1 ? '' : 's'} from ${source.repository}`);
		}

		// Apply: in a temporary worktree of the base (or, with --no-deliver, the working tree on refresh/<short>).
		let root = cwd;
		if (options.dryRun || options.deliver) {
			root = join(tmp, 'worktree');
			await git(cwd, ['worktree', 'add', '--quiet', '--detach', root, baseRef]);
			worktree = root;
		} else {
			await git(cwd, ['switch', '--quiet', '-C', `refresh/${shortId}`, baseRef]);
		}
		// The mapping files this procedure reads, and the files its answers are written to, travel with it when they
		// differ from the base, so an answered decision is part of the same pull request (research R9); other
		// procedures' mappings stay out of it.
		const configCopied = [];
		const carried = [...(procedure.configFiles ?? []).map((name) => `procedures/config/${name}`), ...(procedure.carriedFiles ?? [])];
		for (const path of carried.filter((p) => existsSync(join(cwd, p)))) {
			const mine = readFileSync(join(cwd, path), 'utf8').replaceAll('\r\n', '\n');
			const base = await showAt(cwd, baseRef, path);
			if (base === null || base.replaceAll('\r\n', '\n') !== mine) {
				if (root !== cwd) {
					mkdirSync(dirname(join(root, path)), { recursive: true });
					writeFileSync(join(root, path), mine);
				}
				configCopied.push({ path, change: base === null ? 'added' : 'changed' });
			}
		}

		const target = join(root, 'sources', shortId);
		const ctx = {
			procedure,
			options,
			sources,
			previous,
			root,
			target,
			local,
			now: new Date(),
			config: loadConfig(root),
		};
		const applied = await procedure.apply(ctx);
		const lock = writeSources(ctx, applied, { releases, config, after });
		const files = [...changedFiles(previous, lock), ...configCopied];
		if (sameRecord(previous, lock) && !configCopied.length) {
			writeLock(target, previous);
			stage('apply', 'regenerated with no difference from the base');
			result.outcome = 'current';
			result.message = `content is current at ${Object.entries(after).map(([r, h]) => `${r}@${short(h)}`).join(', ')}`;
			if (deliver) await closeStalePr(procedure, after, stage);
			return finish(result, out, procedure, { after, before: previous?.sourceHeads ?? {} });
		}
		const sourced = files.filter((f) => f.path.startsWith('sources/'));
		const counts = ['added', 'changed', 'removed'].map((c) => `${sourced.filter((f) => f.change === c).length} ${c}`).join(', ');
		stage('apply', `${counts} in sources/${shortId}${configCopied.length ? ` and ${configCopied.length} mapping file${configCopied.length === 1 ? '' : 's'}` : ''}`);

		// The procedure's own site steps on the applied sources (spec 003's catalogue report), then Verify: the site's
		// build and checks when it defines them (R8), and always the source-record check.
		nodeModulesLink = linkNodeModules(cwd, root);
		const reports = [...((await procedure.afterApply?.(ctx, { log: (text) => stage('apply', text) })) ?? [])];
		const verification = await runVerification(root, local);
		stage('verify', verification.map((v) => `${v.step} ${v.status}`).join(', '));
		const failedStep = verification.some((v) => v.status === 'failed');
		reports.push(...((await procedure.afterVerify?.(ctx, { write: deliver && !failedStep, log: (text) => stage('verify', text) })) ?? []));
		const siteFiles = await changedSiteFiles(root, procedure.siteFiles ?? [], configCopied);
		files.push(...siteFiles);

		const summary = buildSummary({
			before: previous?.sourceHeads ?? {},
			after,
			files,
			details: applied.details ?? {},
			withdrawals: lock.newWithdrawals,
			caveats: applied.caveats ?? [],
			reviewNotes: applied.reviewNotes ?? [],
			verification,
			reports,
		});
		summary.title = renderTitle(procedure, summary);
		const body = renderPrBody(summary, { procedure, runLink: runLink(), previousScheduledRun: await previousScheduledRun() });
		result.summary = summary;
		result.outcome = failedStep ? 'delivered-draft' : 'delivered';

		// The paths a run may change; procedures/config/ only once the base or this run has it.
		const changedPaths = [
			`sources/${shortId}`,
			...(existsSync(join(root, 'procedures', 'config')) ? ['procedures/config'] : []),
			...new Set([...configCopied, ...siteFiles].map((f) => f.path).filter((p) => !p.startsWith('procedures/config/'))),
		];
		if (options.dryRun && worktree) {
			await git(root, ['add', '--all', '--', ...changedPaths]);
			writeFileSync(join(out, 'diff.patch'), await git(root, ['diff', '--cached', '--', ...changedPaths]).then((d) => `${d}\n`));
		}

		// Deliver: commit, force-push refresh/<short>, and create or update its one pull request (R6).
		if (deliver) {
			const github = await loadGithub();
			const branch = `refresh/${shortId}`;
			await github.ensureLabels(['refresh', `refresh:${shortId}`]);
			await git(root, ['add', '--all', '--', ...changedPaths]);
			await git(root, ['commit', '--quiet', '-m', `Refresh ${procedure.what}`, '-m', `Refreshed-by: ${procedure.id}`]);
			await git(root, ['push', '--quiet', '--force', 'origin', `HEAD:refs/heads/${branch}`]);
			const open = await github.findOpenPr(branch);
			if (open) {
				await github.updatePr(open.number, { title: summary.title, body, draft: failedStep, isDraft: open.isDraft });
				result.prUrl = open.url;
			} else {
				result.prUrl = await github.createPr({ base: options.base, head: branch, title: summary.title, body, draft: failedStep, labels: ['refresh', `refresh:${shortId}`] });
			}
			stage('deliver', `${open ? 'updated' : 'opened'} ${result.prUrl}${failedStep ? ' as a draft' : ''}`);
		} else {
			stage('deliver', options.dryRun ? 'dry run: nothing committed or pushed' : `--no-deliver: changes left in the working tree on refresh/${shortId}`);
		}
		writeFileSync(join(out, 'pr-body.md'), body);
		result.message = failedStep ? `verification failed: ${verification.filter((v) => v.status === 'failed').map((v) => v.step).join(', ')}` : '';
		return finish(result, out, procedure, summary);
	} catch (error) {
		if (error instanceof NeedsDecision) {
			result.outcome = 'needs-decision';
			result.decision = { procedure: procedure.id, ...error.decision };
			result.message = error.decision.question;
			writeJson(join(out, 'decision.json'), result.decision);
			log(`decision: ${error.decision.question}`);
			log(`options: ${error.decision.options.join(' | ')}`);
			return finish(result, out, procedure, {});
		}
		result.outcome = 'failed';
		result.message = error.message;
		log(`failed: ${error.message}`);
		return finish(result, out, procedure, {});
	} finally {
		// On Windows a file the site build still holds open can fail the first removal, so retry, then say so.
		unlinkDir(nodeModulesLink);
		if (worktree) await git(cwd, ['worktree', 'remove', '--force', worktree]).catch(() => {});
		try {
			rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 500 });
		} catch (error) {
			log(`cleanup: could not remove ${tmp}: ${error.message}`);
		}
		if (worktree) await git(cwd, ['worktree', 'prune']).catch(() => {});
	}
}

/** The procedure's site files that differ from the base in `root`, leaving out those already carried in. */
async function changedSiteFiles(root, paths, carried) {
	if (!paths.length) return [];
	const known = new Set(carried.map((f) => f.path));
	// Not through git(), which trims: the first line's leading space is part of its status.
	const status = await run('git', ['status', '--porcelain', '--untracked-files=all', '--', ...paths], { cwd: root });
	return status
		.split('\n')
		.map((line) => line.trimEnd())
		.filter(Boolean)
		.map((line) => ({ path: posix(line.slice(3)), change: line.startsWith('??') || line[0] === 'A' ? 'added' : line.includes('D') ? 'removed' : 'changed' }))
		.filter((f) => !known.has(f.path));
}

function loadConfig(root) {
	const read = (name) => {
		const file = join(root, 'procedures', 'config', name);
		return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
	};
	return { states: read('states.json'), screenshots: read('screenshots.json') };
}

/** Replaces sources/<short>/ from what the procedure applied, writes its lock and returns it with its new withdrawals. */
function writeSources(ctx, applied, { releases, config, after }) {
	const { target, previous, procedure } = ctx;
	const keep = new Set(applied.keep ?? []);
	const wanted = new Set([...(applied.files ?? []).map((f) => f.path), ...keep, ...(applied.derived ?? []).map((d) => d.path), LOCK_FILE]);
	for (const path of walk(target)) if (!wanted.has(path)) rmSync(join(target, path));
	pruneEmpty(target);

	const files = [];
	for (const { path, from } of applied.files ?? []) {
		const dest = join(target, path);
		mkdirSync(dirname(dest), { recursive: true });
		copyFileSync(from.file, dest);
		files.push({ path, repository: from.repository, sourcePath: from.sourcePath, commit: from.commit, gitBlob: from.gitBlob, sha256: sha256(dest), licence: from.licence });
	}
	for (const path of keep) {
		const entry = previous?.files.find((f) => f.path === path);
		if (entry) files.push(entry);
	}
	const derived = [];
	for (const { path, content } of applied.derived ?? []) {
		const dest = join(target, path);
		mkdirSync(dirname(dest), { recursive: true });
		writeFileSync(dest, content);
		derived.push({ path, sha256: sha256(dest) });
	}
	const lock = {
		procedure: procedure.id,
		refreshedAt: ctx.now.toISOString(),
		...(ctx.local ? { local: true } : {}),
		sourceHeads: after,
		...(releases ? { releases } : {}),
		...(Object.keys(config).length ? { config } : {}),
		files,
		inputs: (applied.inputs ?? []).map(({ repository, sourcePath, commit, gitBlob }) => ({ repository, sourcePath, commit, gitBlob })),
		derived,
		withdrawn: previous?.withdrawn ?? [],
	};
	const present = new Set(files.map((f) => f.path));
	const removed = (previous?.files ?? []).filter((f) => !present.has(f.path));
	const newWithdrawals = applyWithdrawals(lock, removed, ctx.now);
	const written = writeLock(target, lock);
	return Object.assign(written, { newWithdrawals });
}

/** Files added, changed or removed under sources/<short>/, by comparing the two locks' hashes. */
function changedFiles(previous, lock) {
	const hashes = (l) => new Map([...(l?.files ?? []), ...(l?.derived ?? [])].map((f) => [f.path, f.sha256]));
	const was = hashes(previous);
	const now = hashes(lock);
	const at = (path) => `sources/${lock.procedure.replace(/^refresh-/, '')}/${path}`;
	const files = [];
	for (const [path, hash] of now) {
		if (!was.has(path)) files.push({ path: at(path), change: 'added' });
		else if (was.get(path) !== hash) files.push({ path: at(path), change: 'changed' });
	}
	for (const path of was.keys()) if (!now.has(path)) files.push({ path: at(path), change: 'removed' });
	return files.sort((a, b) => a.path.localeCompare(b.path));
}

async function runVerification(root, local) {
	const pkgFile = join(root, 'package.json');
	const scripts = existsSync(pkgFile) ? (JSON.parse(readFileSync(pkgFile, 'utf8')).scripts ?? {}) : {};
	const results = [];
	for (const { step } of VERIFY_STEPS.filter((s) => s.step !== 'sources')) {
		if (!scripts[step]) {
			results.push({ step, status: 'not available', output: '' });
			continue;
		}
		const run = await runCaptured(`npm run ${step}`, { cwd: root });
		results.push({ step, status: run.ok ? 'passed' : 'failed', output: run.output });
	}
	const violations = await verify({ root, allowLocal: local });
	results.push({ step: 'sources', status: violations.length ? 'failed' : 'passed', output: violations.join('\n') });
	return results;
}

async function closeStalePr(procedure, after, stage) {
	const github = await loadGithub();
	const open = await github.findOpenPr(`refresh/${procedure.short}`);
	if (!open) return;
	const [repo, sha] = Object.entries(after)[0] ?? [];
	await github.closePr(open.number, `develop already matches ${repo}@${sha}; closing.`);
	stage('resolve', `closed ${open.url}: develop already matches the source`);
}

function finish(result, out, procedure, summary) {
	result.code = EXIT[result.outcome];
	writeJson(join(out, 'summary.json'), { procedure: procedure.id, outcome: result.outcome, prUrl: result.prUrl, message: result.message, ...summary });
	return result;
}

/** Opens or closes the "Refresh blocked" issue of an automatic run (research R9). Interactive runs never do. */
async function reportBlocked(procedure, result, options, log) {
	if (!CI || options.dryRun || !procedure) return;
	const title = `Refresh blocked: ${procedure.id}`;
	try {
		const github = await loadGithub();
		if (result.outcome === 'needs-decision') {
			await github.upsertIssue(title, renderDecisionIssue(result.decision), ['refresh-blocked']);
			log(`issue: opened or updated "${title}"`);
		} else if (result.outcome !== 'failed') {
			if (await github.closeIssue(title, `Resolved: run ${runLink()} no longer needs a decision.`)) log(`issue: closed "${title}"`);
		}
	} catch (error) {
		log(`issue: could not update "${title}": ${error.message}`);
	}
}

/** Runs the four procedures in turn, each on its own, and prints the summary table (research R13). */
export async function runAll(options, { cwd = process.cwd(), log = console.log } = {}) {
	const rows = [];
	for (const shortId of PROCEDURES) {
		log(`\n== refresh-${shortId}`);
		let procedure = null;
		let result;
		try {
			procedure = await loadProcedure(shortId);
			result = await runProcedure(procedure, options, { cwd, out: join(cwd, '.refresh', shortId), log });
		} catch (error) {
			result = { procedure: `refresh-${shortId}`, outcome: 'failed', code: EXIT.failed, message: error.message, prUrl: null };
		}
		await reportBlocked(procedure, result, options, log);
		log(`outcome: ${result.outcome}${result.prUrl ? ` ${result.prUrl}` : ''}`);
		rows.push({ procedure: `refresh-${shortId}`, outcome: result.outcome, code: result.code, link: result.prUrl, message: result.message });
	}
	const previous = await previousScheduledRun();
	const table = [
		'| Procedure | Outcome | Pull request or failure |',
		'|---|---|---|',
		...rows.map((r) => `| \`${r.procedure}\` | ${r.outcome} | ${r.link ?? (r.message ? r.message.replaceAll('|', '\\|').replaceAll('\n', ' ') : '')} |`),
		'',
		`Previous scheduled run: ${renderPreviousRun(previous)}.`,
	].join('\n');
	log(`\n${table}`);
	writeJson(join(cwd, '.refresh', 'summary.json'), { procedure: 'refresh-all', procedures: rows, previousScheduledRun: previous ?? null });
	if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Refresh\n\n${table}\n`);
	const code = Math.max(...rows.map((r) => r.code));
	return { code, rows };
}

async function main() {
	let options;
	try {
		options = parseArgs(process.argv.slice(2));
		if (options.id === 'all') {
			if (!options.deliver && !options.dryRun) throw new Failure('--no-deliver cannot be used with all: each procedure needs its own branch; use --dry-run');
			const { code } = await runAll(options);
			process.exit(code);
		}
		const procedure = await loadProcedure(options.id);
		const result = await runProcedure(procedure, options);
		await reportBlocked(procedure, result, options, console.log);
		console.log(`outcome: ${result.outcome}${result.prUrl ? ` ${result.prUrl}` : ''}${result.outcome === 'current' ? ` (${result.message})` : ''}`);
		process.exit(result.code);
	} catch (error) {
		console.log(`failed: ${error.message}`);
		mkdirSync(join(process.cwd(), '.refresh'), { recursive: true });
		writeJson(join(process.cwd(), '.refresh', 'summary.json'), { procedure: options?.id ? `refresh-${options.id}` : null, outcome: 'failed', message: error.message });
		console.log('outcome: failed');
		process.exit(EXIT.failed);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
