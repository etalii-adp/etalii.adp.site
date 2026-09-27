// Reads a source from a local checkout (`--source <owner/name>=<path>`), with the same interface as the
// source-read half of github.mjs, and picks the local or the GitHub reader per repository.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compareSemver, git, globDirectory, matchGlob } from './util.mjs';

let githubModule;

/** The GitHub module; tests replace it with a stub through REFRESH_GITHUB_MODULE. */
export async function loadGithub() {
	githubModule ??= await import(process.env.REFRESH_GITHUB_MODULE ? pathToFileURL(resolve(process.env.REFRESH_GITHUB_MODULE)).href : './github.mjs');
	return githubModule;
}

async function inRepo(dir, repo, what, args, options) {
	try {
		return await git(dir, args, options);
	} catch (error) {
		throw new Error(`${repo}: ${what} in local checkout ${dir}: ${(error.stderr || error.message).trim().split('\n').pop()}`);
	}
}

/** A reader over a local checkout at `dir`, standing in for `repo` on GitHub. */
export function localReader(repo, dir) {
	const root = resolve(dir);
	const call = (what, args, options) => {
		if (!existsSync(root)) return Promise.reject(new Error(`${repo}: local checkout ${root} does not exist`));
		return inRepo(root, repo, what, args, options);
	};
	return {
		repository: repo,
		local: true,
		async developHead() {
			return call('read HEAD', ['rev-parse', 'HEAD']);
		},
		async lastCommitForPath(ref, path) {
			return (await call(`find the last commit touching ${path}`, ['log', '-1', '--format=%H', ref === 'develop' ? 'HEAD' : ref, '--', path])) || null;
		},
		async listTree(commit, globs) {
			const dirs = [...new Set(globs.map(globDirectory))].map((d) => d || '.');
			const out = await call(`list ${dirs.join(', ')}`, ['-c', 'core.quotepath=off', 'ls-tree', '-r', '-z', commit, '--', ...dirs]);
			return out
				.split('\0')
				.filter(Boolean)
				.map((line) => {
					const [meta, path] = line.split('\t');
					const [, type, sha] = meta.split(' ');
					return { type, path, gitBlob: sha };
				})
				.filter((entry) => entry.type === 'blob' && globs.some((glob) => matchGlob(glob, entry.path)))
				.map(({ path, gitBlob }) => ({ path, gitBlob }))
				.sort((a, b) => a.path.localeCompare(b.path));
		},
		async downloadFile(commit, path, dest) {
			const bytes = await call(`read ${path}`, ['cat-file', 'blob', `${commit}:${path}`], { encoding: 'buffer' });
			mkdirSync(dirname(dest), { recursive: true });
			writeFileSync(dest, bytes);
		},
		async readFileAt(ref, path) {
			const rev = ref === 'develop' ? 'HEAD' : ref;
			try {
				return await git(root, ['cat-file', 'blob', `${rev}:${path}`], { encoding: 'buffer' }).then((b) => b.toString('utf8'));
			} catch {
				await call('read HEAD', ['rev-parse', 'HEAD']);
				return null;
			}
		},
		async latestRelease() {
			const tags = (await call('list tags', ['tag', '--merged', 'HEAD', '--list', 'v*'])).split('\n').filter(Boolean);
			if (!tags.length) return null;
			const tag = tags.sort(compareSemver).at(-1);
			return { tag, commit: await call(`resolve tag ${tag}`, ['rev-list', '-n', '1', tag]) };
		},
		async licence() {
			return 'unstated';
		},
	};
}

/** A reader over `repo` on GitHub, through github.mjs. */
export async function githubReader(repo) {
	const github = await loadGithub();
	return {
		repository: repo,
		local: false,
		developHead: (ref) => github.developHead(repo, ref),
		lastCommitForPath: (ref, path) => github.lastCommitForPath(repo, ref, path),
		listTree: (commit, globs) => github.listTree(repo, commit, globs),
		downloadFile: (commit, path, dest) => github.downloadFile(repo, commit, path, dest),
		readFileAt: (ref, path) => github.readFileAt(repo, ref, path),
		latestRelease: () => github.latestRelease(repo),
		licence: () => github.licence(repo),
	};
}

/** The local reader when `options.sources` (from `--source`) names `repo`, and the GitHub reader otherwise. */
export async function sourceReader(repo, options = {}) {
	const dir = options.sources?.[repo];
	return dir ? localReader(repo, dir) : githubReader(repo);
}
