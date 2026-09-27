// Builds throwaway git repositories for the tests, which pass them to the scripts with `--source`.
import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

function git(dir, args) {
	return execFileSync('git', args, { cwd: dir, encoding: 'utf8', windowsHide: true }).trim();
}

function write(dir, files) {
	for (const [path, content] of Object.entries(files)) {
		const file = join(dir, path);
		if (content === null) {
			rmSync(file, { force: true });
			continue;
		}
		mkdirSync(dirname(file), { recursive: true });
		writeFileSync(file, content);
	}
}

/**
 * Creates a git repository in the system's temporary folder from an object of path → content (a string or a
 * Buffer; null removes the path in a later commit). It commits on branch `develop`, then applies each entry of
 * `commits` as a further commit, and puts each of `tags` on the final commit.
 * Returns `{ dir, head, commit(files, message), tag(name), cleanup() }`; `head` follows later commits.
 */
export function makeRepo(files, { commits = [], tags = [], prefix = 'refresh-source-' } = {}) {
	const dir = mkdtempSync(join(tmpdir(), prefix));
	git(dir, ['init', '--quiet', '--initial-branch=develop']);
	git(dir, ['config', 'user.name', 'Refresh tests']);
	git(dir, ['config', 'user.email', 'refresh-tests@example.invalid']);
	git(dir, ['config', 'core.autocrlf', 'false']);
	git(dir, ['config', 'commit.gpgsign', 'false']);
	git(dir, ['config', 'tag.gpgsign', 'false']);

	const repo = {
		dir,
		head: null,
		commit(changes, message = 'Change fixture') {
			write(dir, changes);
			git(dir, ['add', '--all']);
			git(dir, ['commit', '--quiet', '--allow-empty', '-m', message]);
			repo.head = git(dir, ['rev-parse', 'HEAD']);
			return repo.head;
		},
		tag(name) {
			git(dir, ['tag', name]);
		},
		git(args) {
			return git(dir, args);
		},
		cleanup() {
			rmSync(dir, { recursive: true, force: true });
		},
	};

	repo.commit(files, 'Initial fixture');
	for (const changes of commits) repo.commit(changes);
	for (const name of tags) repo.tag(name);
	return repo;
}

/** Reads every file under a fixture folder into the object form `makeRepo` takes, with `/` separators. */
export function readFixture(folder, into = '') {
	const files = {};
	const walk = (dir) => {
		for (const name of readdirSync(dir)) {
			const path = join(dir, name);
			if (statSync(path).isDirectory()) walk(path);
			else files[join(into, relative(folder, path)).replaceAll('\\', '/')] = readFileSync(path);
		}
	};
	walk(folder);
	return files;
}

/** Copies a folder into a new temporary folder, for tests that change a copy of real files. */
export function copyToTemp(folder, prefix = 'refresh-copy-') {
	const dir = mkdtempSync(join(tmpdir(), prefix));
	cpSync(folder, dir, { recursive: true });
	return dir;
}
