// Builds the change summary (data-model.md § Change summary) and renders the pull request title and body
// (contracts/pull-request.md) and the "Refresh blocked" issue (research R9).
import { short } from './util.mjs';

const MAX_OUTPUT = 12000;

export const VERIFY_STEPS = [
	{ step: 'build', label: 'Site builds', command: 'npm run build' },
	{ step: 'check', label: 'Links and accessibility', command: 'npm run check' },
	{ step: 'sources', label: 'Source records', command: 'npm run refresh:verify' },
];

const ICON = { passed: '✅ passed', failed: '❌ failed', 'not available': '⚪ not available' };

export function buildSummary({ before = {}, after = {}, files = [], details = {}, withdrawals = [], caveats = [], reviewNotes = [], verification = [] }) {
	return { before, after, files, details, withdrawals, caveats, reviewNotes, verification };
}

const commitLink = (repo, sha) => `https://github.com/${repo}/commit/${sha}`;
const compareLink = (repo, from, to) => `https://github.com/${repo}/compare/${from}...${to}`;

/** The repository whose revision moved, for the title: the first that changed, or else the first listed. */
function mainRepository(summary) {
	const repos = Object.keys(summary.after);
	return repos.find((repo) => summary.before[repo] !== summary.after[repo]) ?? repos[0];
}

/** `Refresh <what>: <before7>..<after7>`, unless the procedure module words its own title (a new DEDL version). */
export function renderTitle(procedure, summary) {
	const own = procedure.title?.(summary);
	if (own) return own;
	const repo = mainRepository(summary);
	return `Refresh ${procedure.what}: ${short(summary.before[repo])}..${short(summary.after[repo])}`;
}

function fence(text) {
	let out = text.trimEnd();
	if (out.length > MAX_OUTPUT) out = `… (${out.length - MAX_OUTPUT} characters cut)\n${out.slice(-MAX_OUTPUT)}`;
	const ticks = out.includes('```') ? '````' : '```';
	return `${ticks}text\n${out}\n${ticks}`;
}

function renderRevisions(summary) {
	const lines = ['## Source revisions', '', '| Repository | Before | After |', '|---|---|---|'];
	for (const [repo, after] of Object.entries(summary.after)) {
		const before = summary.before[repo];
		const was = before ? `[\`${short(before)}\`](${commitLink(repo, before)})` : 'none';
		const now = before && before !== after ? `[\`${short(after)}\`](${compareLink(repo, before, after)})` : `[\`${short(after)}\`](${commitLink(repo, after)})`;
		lines.push(`| ${repo} | ${was} | ${now} |`);
	}
	return lines.join('\n');
}

function renderCaveats(caveats) {
	const lines = ['## Source caveats', ''];
	for (const caveat of caveats) {
		lines.push(`**${caveat.title}** (${caveat.repository}, [\`${caveat.sourcePath}\` at \`${short(caveat.commit)}\`](https://github.com/${caveat.repository}/blob/${caveat.commit}/${caveat.sourcePath})):`, '');
		lines.push(...caveat.text.trim().split('\n').map((line) => `> ${line}`), '');
	}
	return lines.join('\n').trimEnd();
}

function renderWithdrawn(withdrawals) {
	const lines = ['## Withdrawn', ''];
	if (!withdrawals.length) return [...lines, 'None'].join('\n');
	for (const w of withdrawals) {
		lines.push(`- \`${w.path}\` (from \`${w.sourcePath}\`, last present at \`${short(w.lastCommit)}\`)${w.replacedBy ? `, replaced by \`${w.replacedBy}\`` : ''}`);
	}
	return lines.join('\n');
}

function renderVerification(verification) {
	const lines = ['## Verification', '', '| Step | Result |', '|---|---|'];
	for (const { step, label, command } of VERIFY_STEPS) {
		const result = verification.find((v) => v.step === step);
		lines.push(`| ${label} (\`${command}\`) | ${ICON[result?.status ?? 'not available']} |`);
	}
	for (const result of verification.filter((v) => v.status === 'failed')) {
		const command = VERIFY_STEPS.find((s) => s.step === result.step)?.command ?? result.step;
		lines.push('', `<details><summary><code>${command}</code> output</summary>`, '', fence(result.output ?? ''), '', '</details>');
	}
	return lines.join('\n');
}

/**
 * The footer's "Previous scheduled run": a date, or null when none ran in 7 days (in CI), or undefined when it was
 * not looked up (a local run).
 */
export function renderPreviousRun(previousScheduledRun) {
	if (previousScheduledRun === undefined) return 'not checked (local run)';
	if (previousScheduledRun === null) return 'none in 7 days: check that the Refresh workflow is enabled';
	return previousScheduledRun;
}

/** The pull request body, section by section as contracts/pull-request.md orders them. */
export function renderPrBody(summary, { procedure, runLink = 'local', previousScheduledRun } = {}) {
	const sections = [renderRevisions(summary)];
	const details = procedure.renderDetails ? procedure.renderDetails(summary.details, summary) : '';
	sections.push(`## What changed\n\n${details?.trim() || renderFiles(summary.files)}`);
	if (summary.caveats.length) sections.push(renderCaveats(summary.caveats));
	sections.push(renderWithdrawn(summary.withdrawals));
	sections.push(renderVerification(summary.verification));
	if (summary.reviewNotes.length) sections.push(`## Review notes\n\n${summary.reviewNotes.join('\n\n')}`);
	const id = procedure.id;
	sections.push(`---\nOpened by procedure \`${id}\` (procedures/${id}.md), run ${runLink}. Previous scheduled run: ${renderPreviousRun(previousScheduledRun)}.`);
	return `${sections.join('\n\n')}\n`;
}

/** The plain list of changed files, for procedures without their own "What changed" rendering. */
export function renderFiles(files) {
	if (!files.length) return 'No file changed.';
	return files.map((f) => `- \`${f.path}\`: ${f.change}`).join('\n');
}

/** The body of the "Refresh blocked: refresh-<short>" issue an automatic run opens for a decision. */
export function renderDecisionIssue(decision) {
	const id = decision.procedure;
	const shortId = id.replace(/^refresh-/, '');
	const key = Array.isArray(decision.key) ? decision.key.join(' → ') : decision.key;
	return [
		`An automatic run of \`${id}\` stopped before opening a pull request, because it needs a decision that its sources cannot answer (research R9).`,
		'',
		`**Question**: ${decision.question}`,
		'',
		`**Subject**: ${decision.subject}`,
		'',
		'**Options**:',
		'',
		...decision.options.map((option) => `- [ ] \`${option}\``),
		'',
		'**How to answer** (either way, the next run proceeds and this issue closes itself):',
		'',
		`- Interactively: run \`npm run refresh -- ${shortId}\`, then \`npm run refresh:decide -- ${shortId} <answer>\` with one of the options, then \`npm run refresh -- ${shortId}\` again. The answer becomes part of the refresh pull request.`,
		`- Or in a pull request: set \`${key}\` in \`${decision.writeTo}\` to one of the options.`,
		'',
	].join('\n');
}
