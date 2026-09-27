import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, describe, it } from 'node:test';
import { copyToTemp } from './fixtures/repo.mjs';

const script = fileURLToPath(new URL('./lint.mjs', import.meta.url));
const real = fileURLToPath(new URL('../../procedures', import.meta.url));
const dirs = [];
after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

function lint(dir) {
	const run = spawnSync(process.execPath, [script, '--dir', dir], { encoding: 'utf8', windowsHide: true });
	return { code: run.status, lines: run.stdout.trim().split('\n').filter((line) => !line.startsWith('refresh:lint:')) };
}

/** A temporary copy of procedures/, after `change(dir, edit)` has changed it; `edit(name, fn)` rewrites one file. */
function copy(change) {
	const dir = copyToTemp(real, 'refresh-lint-');
	dirs.push(dir);
	const edit = (name, fn) => writeFileSync(join(dir, name), fn(readFileSync(join(dir, name), 'utf8').replaceAll('\r\n', '\n')));
	change(dir, edit);
	return lint(dir);
}

const expectProblem = (result, pattern) => {
	assert.equal(result.code, 1, 'lint fails');
	assert.ok(result.lines.some((line) => pattern.test(line)), `expected a line matching ${pattern}, got:\n${result.lines.join('\n')}`);
};

describe('refresh:lint', () => {
	it('passes on the real procedures/ folder', () => {
		const result = lint(real);
		assert.equal(result.code, 0, result.lines.join('\n'));
	});

	it('names a missing section', () => {
		expectProblem(copy((dir, edit) => edit('refresh-hosts.md', (t) => t.replace(/## Verification\n[\s\S]*?(?=## Pull request)/, ''))), /refresh-hosts\.md: missing section "## Verification"/);
	});

	it('names sections out of order', () => {
		expectProblem(copy((dir, edit) => edit('refresh-hosts.md', (t) => t.replace('## Decisions', '## Swap').replace('## Steps', '## Decisions').replace('## Swap', '## Steps'))), /refresh-hosts\.md: sections out of order/);
	});

	it('names a procedure missing from the index, and an index row with no file', () => {
		const result = copy((dir, edit) => {
			edit('README.md', (t) => t.replace(/^\| \[`refresh-hosts`\].*\n/m, ''));
			unlinkSync(join(dir, 'refresh-dedl.md'));
		});
		expectProblem(result, /refresh-hosts\.md: not listed in the index/);
		expectProblem(result, /README\.md: the index lists refresh-dedl, but refresh-dedl\.md does not exist/);
	});

	it('names a Sources table that disagrees with the module', () => {
		const paths = copy((dir, edit) => edit('refresh-dedl.md', (t) => t.replace('`specifications/dedl/*`', '`specification/dedl/*`')));
		expectProblem(paths, /refresh-dedl\.md: Sources gives etalii-adp\/etalii\.adp the paths specification\/dedl\/\*, but the module reads specifications\/dedl\/\*/);
		const repo = copy((dir, edit) => edit('refresh-dedl.md', (t) => t.replace('| etalii-adp/etalii.adp |', '| etalii-adp/etalii.dedl |')));
		expectProblem(repo, /Sources lists no row for etalii-adp\/etalii\.adp, which the module reads/);
		expectProblem(repo, /Sources lists etalii-adp\/etalii\.dedl, which the module does not read/);
	});

	it('names a mapping value that is not a site state', () => {
		expectProblem(copy((dir, edit) => edit('config/states.json', (t) => t.replace('"Implemented": "implemented"', '"Implemented": "shipped"'))), /states\.json: mappings\.standalone\["Implemented"\] is "shipped", which is not a site state/);
	});

	it('names a screenshot origin that is not in the vendor/type form', () => {
		expectProblem(copy((dir, edit) => edit('config/screenshots.json', (t) => t.replace('"freeplane/mindmap"', '"Mind map"'))), /screenshots\.json: standalone\["mindmap\.png"\] is "Mind map", which is not a <vendor>\/<type> origin or "none"/);
	});

	it('names a step that edits sources/, and "ask the owner" outside Decisions', () => {
		const result = copy((dir, edit) =>
			edit('refresh-hosts.md', (t) => t.replace('## Decisions', '3. If a state looks wrong, edit sources/hosts/hosts.json to fix it.\n4. If unsure, ask the owner.\n\n## Decisions')),
		);
		expectProblem(result, /refresh-hosts\.md: a step tells the reader to edit a file under sources\//);
		expectProblem(result, /refresh-hosts\.md: "ask the owner" in "## Steps"/);
	});

	it('fails a copy of the template without Verification and without an index row, naming both (quickstart 10)', () => {
		const result = copy((dir, edit) => {
			writeFileSync(join(dir, 'refresh-example.md'), readFileSync(join(dir, '_template.md'), 'utf8'));
			edit('refresh-example.md', (t) => t.replace(/## Verification\n[\s\S]*?(?=## Pull request)/, ''));
		});
		expectProblem(result, /refresh-example\.md: missing section "## Verification"/);
		expectProblem(result, /refresh-example\.md: not listed in the index/);
	});
});
