// The only module that calls `gh`: source reads, pull requests, labels, issues and workflow runs (research R3).
// Every failing call throws an error naming the repository and the call.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { globDirectory, matchGlob, run } from './util.mjs';

async function gh(args, { what, encoding = 'utf8', input } = {}) {
	try {
		return await run('gh', args, { encoding, input });
	} catch (error) {
		const detail = (error.stderr || error.message || '').trim().split('\n').slice(-3).join(' ');
		const failure = new Error(`${what}: ${detail}`);
		failure.notFound = /HTTP 404|Not Found/i.test(detail);
		throw failure;
	}
}

async function api(path, what, extra = []) {
	return JSON.parse(await gh(['api', ...extra, path], { what }));
}

function enc(path) {
	return path.split('/').map(encodeURIComponent).join('/');
}

/** The head commit of `ref` (normally `develop`). */
export async function developHead(repo, ref) {
	const commit = await api(`repos/${repo}/commits/${encodeURIComponent(ref)}`, `${repo}: read the head of ${ref}`);
	return commit.sha;
}

/** The latest commit on `ref` that touched `path`, or null when none did. */
export async function lastCommitForPath(repo, ref, path) {
	const commits = await api(`repos/${repo}/commits?sha=${encodeURIComponent(ref)}&path=${encodeURIComponent(path)}&per_page=1`, `${repo}: find the last commit touching ${path}`);
	return commits[0]?.sha ?? null;
}

/**
 * The files matching `globs` at `commit`, as `[{ path, gitBlob }]`. It lists the fixed folder of each glob with
 * the contents API, which gives each file's blob SHA without downloading it; a missing folder lists nothing.
 */
export async function listTree(repo, commit, globs) {
	const found = new Map();
	for (const dir of new Set(globs.map(globDirectory))) {
		let entries;
		try {
			entries = await api(`repos/${repo}/contents/${enc(dir)}?ref=${commit}`, `${repo}: list ${dir || '/'} at ${commit.slice(0, 7)}`);
		} catch (error) {
			if (error.notFound) continue;
			throw error;
		}
		for (const entry of Array.isArray(entries) ? entries : [entries]) {
			if (entry.type === 'file' && globs.some((glob) => matchGlob(glob, entry.path))) found.set(entry.path, { path: entry.path, gitBlob: entry.sha });
		}
	}
	return [...found.values()].sort((a, b) => a.path.localeCompare(b.path));
}

async function raw(repo, ref, path) {
	return gh(['api', '-H', 'Accept: application/vnd.github.raw', `repos/${repo}/contents/${enc(path)}?ref=${encodeURIComponent(ref)}`], {
		what: `${repo}: download ${path} at ${ref.slice(0, 12)}`,
		encoding: 'buffer',
	});
}

/** Downloads one file at `commit` to `dest`, byte for byte (the raw media type serves files up to 100 MB). */
export async function downloadFile(repo, commit, path, dest) {
	const bytes = await raw(repo, commit, path);
	mkdirSync(dirname(dest), { recursive: true });
	writeFileSync(dest, bytes);
}

/** A file's text at `ref`, or null when the file does not exist there. */
export async function readFileAt(repo, ref, path) {
	try {
		return (await raw(repo, ref, path)).toString('utf8');
	} catch (error) {
		if (error.notFound) return null;
		throw error;
	}
}

/** The latest published release as `{ tag, commit }`, or null when the repository has none. */
export async function latestRelease(repo) {
	let release;
	try {
		release = await api(`repos/${repo}/releases/latest`, `${repo}: read the latest release`);
	} catch (error) {
		if (error.notFound) return null;
		throw error;
	}
	const commit = await api(`repos/${repo}/commits/${encodeURIComponent(release.tag_name)}`, `${repo}: resolve release ${release.tag_name}`);
	return { tag: release.tag_name, commit: commit.sha };
}

/** The repository's SPDX licence id, or "unstated" when it states none GitHub recognises. */
export async function licence(repo) {
	try {
		const info = await api(`repos/${repo}/license`, `${repo}: read the licence`);
		const id = info.license?.spdx_id;
		return !id || id === 'NOASSERTION' ? 'unstated' : id;
	} catch (error) {
		if (error.notFound) return 'unstated';
		throw error;
	}
}

/** The open pull request whose head is `branch` in this repository, as `{ number, url, isDraft }`, or null. */
export async function findOpenPr(branch) {
	const list = JSON.parse(await gh(['pr', 'list', '--head', branch, '--state', 'open', '--json', 'number,url,isDraft'], { what: `this repository: list open pull requests from ${branch}` }));
	return list[0] ?? null;
}

/** Opens a pull request and returns its URL. */
export async function createPr({ base, head, title, body, draft, labels = [] }) {
	const args = ['pr', 'create', '--base', base, '--head', head, '--title', title, '--body-file', '-'];
	for (const label of labels) args.push('--label', label);
	if (draft) args.push('--draft');
	const out = await gh(args, { what: `this repository: open a pull request from ${head}`, input: body });
	return out.trim().split('\n').pop();
}

/** Updates an open pull request's title, body and draft state. */
export async function updatePr(number, { title, body, draft, isDraft }) {
	await gh(['pr', 'edit', String(number), '--title', title, '--body-file', '-'], { what: `this repository: update pull request #${number}`, input: body });
	if (draft !== undefined && draft !== isDraft) {
		await gh(draft ? ['pr', 'ready', String(number), '--undo'] : ['pr', 'ready', String(number)], { what: `this repository: mark pull request #${number} ${draft ? 'draft' : 'ready'}` });
	}
}

export async function closePr(number, comment) {
	await gh(['pr', 'close', String(number), '--comment', comment], { what: `this repository: close pull request #${number}` });
}

export async function ensureLabels(names) {
	for (const name of names) {
		await gh(['label', 'create', name, '--force', '--color', 'ededed'], { what: `this repository: create label ${name}` });
	}
}

async function findIssue(title) {
	const list = JSON.parse(await gh(['issue', 'list', '--state', 'open', '--search', `"${title}" in:title`, '--json', 'number,title'], { what: `this repository: search issues titled ${title}` }));
	return list.find((issue) => issue.title === title) ?? null;
}

/** Opens the issue titled `title`, or updates the body of the open one. */
export async function upsertIssue(title, body, labels = []) {
	await ensureLabels(labels);
	const existing = await findIssue(title);
	if (existing) {
		await gh(['issue', 'edit', String(existing.number), '--body-file', '-'], { what: `this repository: update issue #${existing.number}`, input: body });
		return existing.number;
	}
	const args = ['issue', 'create', '--title', title, '--body-file', '-'];
	for (const label of labels) args.push('--label', label);
	const url = (await gh(args, { what: `this repository: open issue ${title}`, input: body })).trim();
	return url;
}

/** Closes the open issue titled `title` with a comment; does nothing when there is none. */
export async function closeIssue(title, comment) {
	const existing = await findIssue(title);
	if (!existing) return false;
	await gh(['issue', 'close', String(existing.number), '--comment', comment], { what: `this repository: close issue #${existing.number}` });
	return true;
}

/**
 * The start date of the latest scheduled run of `workflowFile` other than the current one, or null when there
 * was none in the last 7 days (research R5).
 */
export async function previousScheduledRun(workflowFile) {
	const data = await api(`repos/{owner}/{repo}/actions/workflows/${workflowFile}/runs?event=schedule&per_page=5`, `this repository: list scheduled runs of ${workflowFile}`);
	const current = process.env.GITHUB_RUN_ID;
	const run = (data.workflow_runs ?? []).find((r) => String(r.id) !== current);
	if (!run) return null;
	const started = new Date(run.run_started_at ?? run.created_at);
	return Date.now() - started.getTime() > 7 * 24 * 3600 * 1000 ? null : started.toISOString();
}
