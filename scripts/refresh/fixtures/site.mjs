// A throwaway checkout of "the site" for the tests: a git repository on `develop` with the real mapping files,
// in which the real scripts run as child processes, exactly as `npm run refresh` runs them.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeRepo } from './repo.mjs';

const scripts = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = join(scripts, '..', '..');

function realConfig(name, fallback) {
	const file = join(repoRoot, 'procedures', 'config', name);
	return existsSync(file) ? readFileSync(file, 'utf8') : `${JSON.stringify(fallback, null, 2)}\n`;
}

/**
 * Creates the site checkout. `config` replaces mapping files (name → object); `files` adds any other files.
 * Returns the repository helper of makeRepo plus `refresh(args, env)`, `decide(id, answer)`, `accept(short)`,
 * `read(path)` and `json(path)`.
 */
export function makeSite({ config = {}, files = {} } = {}) {
	const site = makeRepo(
		{
			'package.json': `${JSON.stringify({ name: 'fixture-site', private: true, type: 'module' }, null, 2)}\n`,
			'.gitignore': '.refresh/\nnode_modules/\n',
			'.gitattributes': 'sources/** -text\n',
			'sources/.gitkeep': '',
			'procedures/config/states.json': config['states.json'] ? `${JSON.stringify(config['states.json'], null, 2)}\n` : realConfig('states.json', {}),
			'procedures/config/screenshots.json': config['screenshots.json'] ? `${JSON.stringify(config['screenshots.json'], null, 2)}\n` : realConfig('screenshots.json', { standalone: {}, intellij: {}, vscode: {}, eclipse: {} }),
			...files,
		},
		{ prefix: 'refresh-site-' },
	);

	const node = (script, args, env = {}) => {
		const run = spawnSync(process.execPath, [join(scripts, script), ...args], {
			cwd: site.dir,
			encoding: 'utf8',
			env: { ...process.env, GITHUB_ACTIONS: '', GITHUB_STEP_SUMMARY: '', ...env },
			windowsHide: true,
		});
		return { code: run.status, stdout: run.stdout, stderr: run.stderr, output: `${run.stdout}${run.stderr}` };
	};

	return Object.assign(site, {
		refresh: (args, env) => node('run.mjs', args, env),
		decide: (id, answer) => node('decide.mjs', [id, answer]),
		verify: (args = []) => node('verify.mjs', args),
		/** Commits what a --no-deliver run left on refresh/<short> and merges it into develop, as the owner would. */
		accept(short) {
			execFileSync('git', ['add', '--all'], { cwd: site.dir });
			execFileSync('git', ['commit', '--quiet', '--allow-empty', '-m', `Refresh ${short}`], { cwd: site.dir });
			execFileSync('git', ['switch', '--quiet', 'develop'], { cwd: site.dir });
			execFileSync('git', ['merge', '--quiet', '--ff-only', `refresh/${short}`], { cwd: site.dir });
		},
		read: (path) => readFileSync(join(site.dir, path), 'utf8'),
		bytes: (path) => readFileSync(join(site.dir, path)),
		exists: (path) => existsSync(join(site.dir, path)),
		json: (path) => JSON.parse(readFileSync(join(site.dir, path), 'utf8')),
	});
}
