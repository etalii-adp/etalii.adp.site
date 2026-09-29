// refresh-catalogue: each IDE host's tool catalogue (docs/tools.md, else docs/diagrams.md), copied verbatim and turned into
// sources/catalogue/<host>/catalogue.json with site states: the mapped `develop` state, with the release state recorded.
// Then spec 003's catalogue steps: the Notion snapshot and the catalogue report before Verify, and the Notion host
// columns after it. Only this procedure changes the catalogue files under src/content/catalogue/.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NeedsDecision } from '../lib/decision.mjs';
import { CATALOGUE_PATHS, catalogueFileOf, toolsFor } from '../lib/catalogue-table.mjs';
import { CATALOGUE_SITE_FILES, REDIRECTS_FILE, catalogueReport, syncNotion, takeNotionSnapshot } from '../lib/catalogue-site.mjs';

export const HOSTS = ['standalone', 'intellij', 'vscode', 'eclipse'];
const ide = (host) => ({ repository: `etalii-adp/etalii.adp.ide.${host}`, ref: 'develop', paths: [...CATALOGUE_PATHS], host });

/** Raises the decision for the first tool whose source state has no site state in the mapping. */
export function askForMapping(source, entries, states) {
	const entry = entries.find((e) => e.unmapped);
	if (!entry) return;
	throw new NeedsDecision({
		question: `How should the source state "${entry.unmapped}" in ${source.host} map to a site state?`,
		subject: `${source.repository} ${catalogueFileOf(source.files)?.sourcePath ?? CATALOGUE_PATHS.join(' or ')}: ${entry.origin} (${entry.name})`,
		options: states.siteStates,
		writeTo: 'procedures/config/states.json',
		key: ['mappings', source.host, entry.unmapped],
	});
}

const byGroupThenOrigin = (a, b) => (a.group ?? '').localeCompare(b.group ?? '') || a.origin.localeCompare(b.origin);

export default {
	id: 'refresh-catalogue',
	short: 'catalogue',
	what: 'tool catalogue',
	sources: HOSTS.map(ide),
	usesReleases: true,
	derivedFiles: ['*/catalogue.json'],
	configFiles: ['states.json'],
	siteFiles: CATALOGUE_SITE_FILES,
	carriedFiles: [REDIRECTS_FILE],

	async afterApply(ctx, { log }) {
		const skipped = await takeNotionSnapshot(ctx.root, { log });
		const report = await catalogueReport(ctx.root, { procedure: this.id });
		return [report, skipped].filter(Boolean);
	},

	// Notion's host columns are written only after the refresh pull request is merged (catalogue-sync.yml, owner's
	// decision of 2026-09-27), so Notion is never ahead of the site; the run only reports what that will write.
	async afterVerify(ctx, { log }) {
		const synced = await syncNotion(ctx.root, { write: false, log });
		return synced ? [synced] : [];
	},

	async apply(ctx) {
		const files = [];
		const derived = [];
		const details = { changes: [], added: [], withdrawn: [], missing: [] };
		for (const source of ctx.sources) {
			const { host } = source;
			const catalogue = catalogueFileOf(source.files);
			if (!catalogue) {
				details.missing.push({ host, repository: source.repository });
				continue;
			}
			const tools = await toolsFor(host, source.reader, { head: source.head, release: source.release, states: ctx.config.states });
			askForMapping(source, tools.entries, ctx.config.states);

			const entries = tools.entries
				.map(({ origin, name, kind, group, developState, releaseState, state, theory, example }) => ({ origin, name, ...(kind ? { kind } : {}), group, developState, releaseState, state, theory, example }))
				.sort(byGroupThenOrigin);
			files.push({ path: `${host}/${catalogue.sourcePath.split('/').pop()}`, from: catalogue });
			derived.push({ path: `${host}/catalogue.json`, content: `${JSON.stringify(entries, null, 2)}\n` });

			const previousFile = join(ctx.target, host, 'catalogue.json');
			const previous = new Map(existsSync(previousFile) ? JSON.parse(readFileSync(previousFile, 'utf8')).map((e) => [e.origin, e]) : []);
			for (const entry of entries) {
				const was = previous.get(entry.origin);
				if (!was) {
					if (previous.size) details.added.push({ host, origin: entry.origin, name: entry.name, state: entry.state });
				} else if (was.state !== entry.state || was.developState !== entry.developState || was.releaseState !== entry.releaseState) {
					details.changes.push({ host, origin: entry.origin, from: was.state, to: entry.state, developState: entry.developState, releaseState: entry.releaseState });
				}
				previous.delete(entry.origin);
			}
			for (const was of previous.values()) details.withdrawn.push({ host, origin: was.origin, name: was.name, state: was.state });
		}
		return { files, derived, details };
	},

	renderDetails(d) {
		if (!d) return '';
		const lines = [];
		if (d.changes.length) {
			lines.push('| Origin | Host | State | `develop` source state | Release source state |', '|---|---|---|---|---|');
			for (const c of d.changes) lines.push(`| \`${c.origin}\` | ${c.host} | ${c.from === c.to ? `${c.to} (unchanged)` : `${c.from} → ${c.to}`} | ${c.developState} | ${c.releaseState ?? 'not in the release'} |`);
		} else {
			lines.push('No tool’s state changed.');
		}
		lines.push('', '**Tools added**:', '', ...(d.added.length ? d.added.map((a) => `- ${a.host}: \`${a.origin}\` (${a.name}, ${a.state})`) : ['None']));
		lines.push('', '**Tools withdrawn**:', '', ...(d.withdrawn.length ? d.withdrawn.map((w) => `- ${w.host}: \`${w.origin}\` (${w.name})`) : ['None']));
		if (d.missing.length) lines.push('', ...d.missing.map((m) => `- ${m.host}: no catalogue at ${CATALOGUE_PATHS.map((p) => `\`${p}\``).join(' or ')} in ${m.repository}, so its tools are not listed.`));
		return lines.join('\n');
	},
};
