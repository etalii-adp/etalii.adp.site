// refresh-catalogue: each IDE host's designer catalogue (docs/diagrams.md), copied verbatim and turned into
// sources/catalogue/<host>/catalogue.json with site states: the mapped `develop` state, with the release state recorded.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NeedsDecision } from '../lib/decision.mjs';
import { CATALOGUE_PATH, designersFor } from '../lib/catalogue-table.mjs';

export const HOSTS = ['standalone', 'intellij', 'vscode', 'eclipse'];
const ide = (host) => ({ repository: `etalii-adp/etalii.adp.ide.${host}`, ref: 'develop', paths: [CATALOGUE_PATH], host });

/** Raises the decision for the first designer whose source state has no site state in the mapping. */
export function askForMapping(source, entries, states) {
	const entry = entries.find((e) => e.unmapped);
	if (!entry) return;
	throw new NeedsDecision({
		question: `How should the source state "${entry.unmapped}" in ${source.host} map to a site state?`,
		subject: `${source.repository} ${CATALOGUE_PATH}: ${entry.origin} (${entry.name})`,
		options: states.siteStates,
		writeTo: 'procedures/config/states.json',
		key: ['mappings', source.host, entry.unmapped],
	});
}

const byGroupThenOrigin = (a, b) => (a.group ?? '').localeCompare(b.group ?? '') || a.origin.localeCompare(b.origin);

export default {
	id: 'refresh-catalogue',
	short: 'catalogue',
	what: 'designer catalogue',
	sources: HOSTS.map(ide),
	usesReleases: true,
	derivedFiles: ['*/catalogue.json'],
	configFiles: ['states.json'],

	async apply(ctx) {
		const files = [];
		const derived = [];
		const details = { changes: [], added: [], withdrawn: [], missing: [] };
		for (const source of ctx.sources) {
			const { host } = source;
			const catalogue = source.files.find((f) => f.sourcePath === CATALOGUE_PATH);
			if (!catalogue) {
				details.missing.push({ host, repository: source.repository });
				continue;
			}
			const designers = await designersFor(host, source.reader, { head: source.head, release: source.release, states: ctx.config.states });
			askForMapping(source, designers.entries, ctx.config.states);

			const entries = designers.entries
				.map(({ origin, name, group, developState, releaseState, state, theory, example }) => ({ origin, name, group, developState, releaseState, state, theory, example }))
				.sort(byGroupThenOrigin);
			files.push({ path: `${host}/${CATALOGUE_PATH.split('/').pop()}`, from: catalogue });
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
			lines.push('No designer’s state changed.');
		}
		lines.push('', '**Designers added**:', '', ...(d.added.length ? d.added.map((a) => `- ${a.host}: \`${a.origin}\` (${a.name}, ${a.state})`) : ['None']));
		lines.push('', '**Designers withdrawn**:', '', ...(d.withdrawn.length ? d.withdrawn.map((w) => `- ${w.host}: \`${w.origin}\` (${w.name})`) : ['None']));
		if (d.missing.length) lines.push('', ...d.missing.map((m) => `- ${m.host}: no catalogue at \`${CATALOGUE_PATH}\` in ${m.repository}, so its designers are not listed.`));
		return lines.join('\n');
	},
};
