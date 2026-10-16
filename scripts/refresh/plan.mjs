// `node scripts/refresh/plan.mjs`: which procedures a run of .github/workflows/refresh.yml starts, as the JSON list
// its matrix ranges over. Read from the environment the workflow sets: EVENT (the event name), CHOSEN (the
// workflow_dispatch input) and SOURCE (client_payload.repository of source-changed). Writes `procedures=<list>` to
// $GITHUB_OUTPUT.
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalId } from './lib/names.mjs';

/** The procedures to run: `{ procedures: [...] }`, or `{ error }` for a source-changed event from an unknown source. */
export function plan({ event, chosen, source }) {
	if (event === 'workflow_dispatch') return { procedures: [chosen ? canonicalId(chosen) : 'all'] };
	if (event !== 'repository_dispatch') return { procedures: ['all'] };
	// etalii-adp/etalii.adp is a known source that no procedure reads any more: the DISL and DID reference is
	// refreshed by `npm run reference:refresh`, not by a refresh procedure, so its event starts nothing.
	if (source === 'etalii-adp/etalii.adp') return { procedures: [] };
	if (/^etalii-adp\/etalii\.adp\.ide\.[^/]+$/.test(source ?? '')) return { procedures: ['screenshots', 'catalogue', 'hosts'] };
	return { error: `source-changed names no source of a refresh procedure: '${source ?? ''}'` };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { EVENT: event, CHOSEN: chosen, SOURCE: source, GITHUB_OUTPUT } = process.env;
	const result = plan({ event, chosen, source });
	if (result.error) {
		console.log(`::error::${result.error}`);
		process.exit(1);
	}
	const line = `procedures=${JSON.stringify(result.procedures)}`;
	console.log(line);
	if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `${line}\n`);
}
