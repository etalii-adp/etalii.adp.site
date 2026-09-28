// The spec 003 catalogue steps a refresh runs between Apply and Verify, and after Verify: the Notion snapshot
// (`catalogue:notion`), the catalogue report (`catalogue:report`) and the Notion host columns (`catalogue:sync-notion`).
// Each runs in the run's worktree as `npm run <script>`, and only when that worktree's package.json defines it.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { NeedsDecision } from './decision.mjs';
import { runCaptured } from './util.mjs';

/** The catalogue files the site builds from; only refresh-catalogue changes them (spec 004 data-model § Procedure). */
export const CATALOGUE_SITE_FILES = [
	'src/content/catalogue/notion.json',
	'src/content/catalogue/published.json',
	'src/content/catalogue/redirects.json',
	'src/content/catalogue/focus-areas.json',
];
/** The file an answer to the report's question is written to, which travels into the next run like a mapping. */
export const REDIRECTS_FILE = 'src/content/catalogue/redirects.json';

function hasScript(root, name) {
	const file = join(root, 'package.json');
	return existsSync(file) && Boolean(JSON.parse(readFileSync(file, 'utf8')).scripts?.[name]);
}

function readReport(root, name) {
	const file = join(root, '.refresh', name);
	return existsSync(file) ? readFileSync(file, 'utf8').trim() : null;
}

const tail = (output) => output.trim().split('\n').slice(-20).join('\n');
const fenced = (output) => `\`\`\`text\n${tail(output)}\n\`\`\``;

/** Runs `npm run <script>` in `root`, or returns null when the site does not define it. */
async function npmRun(root, script, args = []) {
	if (!hasScript(root, script)) return null;
	return runCaptured(`npm run --silent ${script}${args.length ? ` -- ${args.join(' ')}` : ''}`, { cwd: root });
}

/**
 * Takes a new Notion snapshot when NOTION_TOKEN is set, or, without it, from NOTION_EXPORT: the file an agent
 * exported through a Notion connector (procedures/refresh-catalogue.md § Without a Notion token). Returns a note for
 * the pull request when it was skipped or came from an export, which is not a failure, and null otherwise. Throws
 * when Notion or the export cannot be read.
 */
export async function takeNotionSnapshot(root, { log = () => {} } = {}) {
	if (!hasScript(root, 'catalogue:notion')) return null;
	const exportFile = process.env.NOTION_EXPORT;
	if (!process.env.NOTION_TOKEN && exportFile) {
		const run = await npmRun(root, 'catalogue:notion', ['--export', `"${resolve(exportFile).replaceAll('\\', '/')}"`]);
		if (!run.ok) throw new Error(`npm run catalogue:notion -- --export failed (exit ${run.code}): ${tail(run.output)}`);
		log(run.output.trim().split('\n')[0]);
		return "## Notion\n\nTaken from an export made through a Notion connector (`NOTION_EXPORT`), since `NOTION_TOKEN` is not set. Notion's host columns were not updated.";
	}
	if (!process.env.NOTION_TOKEN) {
		log('NOTION_TOKEN is not set: Notion snapshot skipped');
		return "## Notion\n\nSkipped: `NOTION_TOKEN` is not set, so `src/content/catalogue/notion.json` is as on the base branch and Notion's host columns were not updated.";
	}
	const run = await npmRun(root, 'catalogue:notion');
	if (!run.ok) throw new Error(`npm run catalogue:notion failed (exit ${run.code}): ${tail(run.output)}`);
	log(run.output.trim().split('\n')[0]);
	return null;
}

/**
 * Runs the catalogue report and returns its Markdown for the pull request, or null when the site has no report.
 * `write: false` only reports, leaving published.json as it is. Exit 3 becomes the decision it asks; any other
 * failure throws.
 */
export async function catalogueReport(root, { write = true, procedure = 'refresh-catalogue' } = {}) {
	const run = await npmRun(root, 'catalogue:report', write ? [] : ['--no-write']);
	if (run === null) return null;
	if (run.code === 3) throw reportDecision(run.output, procedure);
	if (!run.ok) throw new Error(`npm run catalogue:report failed (exit ${run.code}): ${tail(run.output)}`);
	return readReport(root, 'catalogue-report.md');
}

/**
 * The report's question (a published designer that is no longer in any source) as a decision of `procedure`. It
 * is answered with catalogue:report's own flags, not with refresh:decide, so it carries `answerWith` instead of a key.
 */
export function reportDecision(output, procedure = 'refresh-catalogue') {
	const shortId = procedure.replace(/^refresh-/, '');
	const lines = output.split('\n').map((line) => line.trimEnd());
	const at = lines.findIndex((line) => /is no longer in any source/.test(line));
	const question = at >= 0 ? lines[at].trim() : 'A published designer is no longer in any source. Renamed or withdrawn?';
	const commands = lines
		.slice(at + 1)
		.filter((line) => /^\s+npm run catalogue:report -- /.test(line))
		.map((line) => `\`${line.trim()}\``);
	const origin = /`([^`]+)`/.exec(question)?.[1] ?? 'a designer';
	return new NeedsDecision({
		question,
		subject: `${REDIRECTS_FILE}: ${origin}`,
		options: ['rename', 'withdraw'],
		writeTo: REDIRECTS_FILE,
		answerWith: [
			`Run \`npm run refresh -- ${shortId} --no-deliver\`, which leaves the refreshed catalogue in the working tree.`,
			`Answer there with ${commands.length ? commands.join(' or ') : '`npm run catalogue:report -- --rename <old>=<new>` or `npm run catalogue:report -- --withdraw <origin> --reason "<why>"`'}.`,
			`Run \`npm run refresh -- ${shortId}\` again: the new entry in \`${REDIRECTS_FILE}\` travels into its pull request.`,
		],
	});
}

/**
 * Sets Notion's host columns to the catalogue's states (FR-017). It writes to Notion only when `write` is set (a
 * delivered run whose verification passed); otherwise it reports what it would write. Returns its Markdown for the
 * pull request, or null when it did not run. A failure is reported there, not thrown: the pull request still stands.
 */
export async function syncNotion(root, { write, log = () => {} }) {
	if (!process.env.NOTION_TOKEN) return null;
	const run = await npmRun(root, 'catalogue:sync-notion', write ? [] : ['--dry-run']);
	if (run === null) return null;
	if (!run.ok) {
		log(`catalogue:sync-notion failed (exit ${run.code})`);
		return `## Notion host columns\n\n\`npm run catalogue:sync-notion\` failed (exit ${run.code}), so Notion's host columns may still differ from the catalogue:\n\n${fenced(run.output)}`;
	}
	return readReport(root, 'catalogue-notion-sync.md');
}
