// `npm run refresh:decide -- <id> <answer>`: writes the answer to the pending decision into its mapping file
// (research R9), after which the procedure is run again.
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalId } from './lib/names.mjs';
import { writeJson } from './lib/util.mjs';

/** Finds the pending decision of procedure `shortId`: `.refresh/<short>/decision.json` (from `all`) or `.refresh/decision.json`. */
function findDecision(cwd, shortId) {
	for (const file of [join(cwd, '.refresh', shortId, 'decision.json'), join(cwd, '.refresh', 'decision.json')]) {
		if (!existsSync(file)) continue;
		const decision = JSON.parse(readFileSync(file, 'utf8'));
		if (decision.procedure === `refresh-${shortId}`) return decision;
	}
	return null;
}

/** Writes `answer` at the decision's key and returns the changed line; throws with a clear message otherwise. */
export function decide(id, answer, { cwd = process.cwd() } = {}) {
	if (!id || answer === undefined) throw new Error('usage: npm run refresh:decide -- <id> <answer>');
	const shortId = canonicalId(id);
	const decision = findDecision(cwd, shortId);
	if (!decision) {
		const any = existsSync(join(cwd, '.refresh', 'decision.json'));
		throw new Error(any ? `.refresh/decision.json is not a decision of refresh-${shortId}` : `no pending decision: .refresh/decision.json does not exist; run npm run refresh -- ${shortId} first`);
	}
	if (decision.answerWith) throw new Error(`this decision is not answered with refresh:decide:\n${decision.answerWith.map((step, i) => `${i + 1}. ${step}`).join('\n')}`);
	if (!decision.options.includes(answer)) throw new Error(`"${answer}" is not one of the options: ${decision.options.join(', ')}`);

	const file = join(cwd, decision.writeTo);
	const data = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
	const key = Array.isArray(decision.key) ? decision.key : String(decision.key).split('.');
	let node = data;
	for (const part of key.slice(0, -1)) {
		node[part] ??= {};
		node = node[part];
	}
	node[key.at(-1)] = answer;
	writeJson(file, data);
	return `${decision.writeTo}: ${JSON.stringify(key.at(-1))}: ${JSON.stringify(answer)}`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	try {
		const [id, answer] = process.argv.slice(2);
		console.log(decide(id, answer));
	} catch (error) {
		console.error(`refresh:decide: ${error.message}`);
		process.exit(1);
	}
}
