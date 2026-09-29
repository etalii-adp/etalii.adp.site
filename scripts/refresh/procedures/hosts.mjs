// refresh-hosts: each IDE host's state for the home page (spec 001), derived from the host's own catalogue and
// latest release (research R10) into sources/hosts/hosts.json.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATALOGUE_PATHS, catalogueFileOf, toolsFor, isUnderway, isUsable } from '../lib/catalogue-table.mjs';
import { HOSTS } from './catalogue.mjs';

const ide = (host) => ({ repository: `etalii-adp/etalii.adp.ide.${host}`, ref: 'develop', paths: [...CATALOGUE_PATHS], host });

/**
 * The three rules of research R10: available, else in progress, else planned. Usable tools are those at
 * prototype, implemented or available (spec 003, owner's decision of 2026-09-27). A host is available only with a
 * release to install (spec 003 research D3); until then usable tools count as in progress.
 */
export function hostState(entries, released = true) {
	const usableDesigners = entries.filter((e) => isUsable(e.state)).length;
	const designersInProgress = entries.filter((e) => e.developSite && isUnderway(e.developSite)).length;
	const state = usableDesigners > 0 && released ? 'available' : designersInProgress > 0 ? 'in progress' : 'planned';
	return { state, usableDesigners, designersInProgress };
}

export default {
	id: 'refresh-hosts',
	short: 'hosts',
	what: 'IDE host states',
	sources: HOSTS.map(ide),
	usesReleases: true,
	derivedFiles: ['hosts.json'],
	configFiles: ['states.json'],

	async apply(ctx) {
		const inputs = [];
		const hosts = [];
		for (const source of ctx.sources) {
			const catalogue = catalogueFileOf(source.files);
			let derived = { state: 'planned', usableDesigners: 0, designersInProgress: 0 };
			if (catalogue) {
				inputs.push(catalogue);
				const tools = await toolsFor(source.host, source.reader, { head: source.head, release: source.release, states: ctx.config.states });
				derived = hostState(tools.entries, Boolean(source.release));
			}
			hosts.push({
				host: source.host,
				repository: source.repository,
				state: derived.state,
				facts: {
					catalogueCommit: catalogue?.commit ?? null,
					usableDesigners: derived.usableDesigners,
					designersInProgress: derived.designersInProgress,
					latestRelease: source.release ?? null,
					developHead: source.head,
				},
				link: source.release ? `https://github.com/${source.repository}/releases/tag/${encodeURIComponent(source.release.tag)}` : `https://github.com/${source.repository}`,
			});
		}

		const previousFile = join(ctx.target, 'hosts.json');
		const previous = new Map(existsSync(previousFile) ? JSON.parse(readFileSync(previousFile, 'utf8')).map((h) => [h.host, h]) : []);
		const details = { hosts: hosts.map((h) => ({ host: h.host, from: previous.get(h.host)?.state ?? null, to: h.state, facts: h.facts })) };
		return { files: [], inputs, derived: [{ path: 'hosts.json', content: `${JSON.stringify(hosts, null, 2)}\n` }], details };
	},

	renderDetails(d) {
		if (!d) return '';
		const lines = ['| Host | State | Usable tools | Tools in progress | Latest release | Catalogue |', '|---|---|---|---|---|---|'];
		for (const h of d.hosts) {
			const state = h.from === null ? `${h.to} (new)` : h.from === h.to ? `${h.to} (unchanged)` : `${h.from} → ${h.to}`;
			const release = h.facts.latestRelease ? `${h.facts.latestRelease.tag} (\`${h.facts.latestRelease.commit.slice(0, 7)}\`)` : 'none';
			lines.push(`| ${h.host} | ${state} | ${h.facts.usableDesigners} | ${h.facts.designersInProgress} | ${release} | ${h.facts.catalogueCommit ? `\`${h.facts.catalogueCommit.slice(0, 7)}\`` : 'none'} |`);
		}
		return lines.join('\n');
	},
};
