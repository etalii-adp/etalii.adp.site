// `node scripts/refresh/plan.mjs`: which procedures a run of .github/workflows/refresh.yml starts, as the JSON list
// its matrix ranges over. Read from the environment the workflow sets: EVENT (the event name), CHOSEN (the
// workflow_dispatch input), SOURCE (client_payload.repository of source-changed) and PATHS (client_payload.paths,
// optional: a JSON array of the paths the source changed). Writes `procedures=<list>` to $GITHUB_OUTPUT.
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalId } from './lib/names.mjs';

/**
 * The paths of etalii-adp/etalii.adp that the reference procedure reads: DISL and DID. A source-changed event that
 * lists its paths starts the procedure only when one of them is under these folders.
 */
export const REFERENCE_PATHS = ['specifications/disl/', 'specifications/did/'];

/** The procedures to run: `{ procedures: [...] }`, or `{ error }` for a source-changed event from an unknown source. */
export function plan({ event, chosen, source, paths }) {
	if (event === 'workflow_dispatch') return { procedures: [chosen ? canonicalId(chosen) : 'all'] };
	if (event !== 'repository_dispatch') return { procedures: ['all'] };
	const listed = Array.isArray(paths) ? paths : null;
	if (source === 'etalii-adp/etalii.adp') {
		const relevant = !listed || listed.some((path) => REFERENCE_PATHS.some((folder) => String(path).startsWith(folder)));
		return { procedures: relevant ? ['disl'] : [] };
	}
	if (/^etalii-adp\/etalii\.adp\.ide\.[^/]+$/.test(source ?? '')) return { procedures: ['screenshots', 'catalogue', 'hosts'] };
	return { error: `source-changed names no source of a refresh procedure: '${source ?? ''}'` };
}

/** PATHS as given by the workflow: empty or `null` when the payload has none, else a JSON array. */
export function parsePaths(text) {
	if (!text || text === 'null') return null;
	const value = JSON.parse(text);
	return Array.isArray(value) ? value : null;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	const { EVENT: event, CHOSEN: chosen, SOURCE: source, PATHS, GITHUB_OUTPUT } = process.env;
	const result = plan({ event, chosen, source, paths: parsePaths(PATHS) });
	if (result.error) {
		console.log(`::error::${result.error}`);
		process.exit(1);
	}
	const line = `procedures=${JSON.stringify(result.procedures)}`;
	console.log(line);
	if (GITHUB_OUTPUT) appendFileSync(GITHUB_OUTPUT, `${line}\n`);
}
