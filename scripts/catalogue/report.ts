// npm run catalogue:report [-- --withdraw <origin> --reason <text>] [-- --rename <old>=<new>] [-- --no-write]
//
// Run after spec 004's catalogue or screenshot refresh (spec 003 US4). It compares the catalogue assembled from the
// working tree with the one at HEAD, writes .refresh/catalogue-report.md for the pull request, and rewrites
// src/content/catalogue/published.json to the designers that now have a page. A published designer that no longer
// is one needs an answer, as any decision in spec 004: renamed (--rename) or withdrawn (--withdraw). Without one it
// exits 3, asks, and writes nothing. It never guesses a rename (data-model § Redirect). With --no-write it only
// writes the report and asks nothing: the screenshots refresh uses it, as the catalogue files are not its to change.
// Exit codes: 0 done, 1 the catalogue does not assemble, 2 usage or a wrong answer, 3 a question to answer.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { assembleCatalogue, defaultContentDir, type AssembleOptions, type Catalogue } from '../../src/lib/catalogue/assemble.ts';
import { catalogueHosts } from '../../src/lib/catalogue/hosts.ts';
import { catalogueSourceRecord, readSources } from '../../src/lib/catalogue/sources.ts';
import { defaultStatesConfig, states } from '../../src/lib/catalogue/states.ts';
import type { Redirect, SourceRecord } from '../../src/lib/catalogue/types.ts';
import { json } from './notion.ts';

export interface ReportOptions extends AssembleOptions {
	/** The inputs to compare with; by default their versions at HEAD. */
	baseline?: AssembleOptions;
	/** Where the report goes; `.refresh`. */
	reportDir?: string;
	/** The date recorded on a redirect (YYYY-MM-DD); today by default. */
	today?: string;
}

function resolved(options: AssembleOptions): Required<AssembleOptions> {
	const contentDir = options.contentDir ?? defaultContentDir;
	return {
		sourcesRoot: options.sourcesRoot ?? process.env.ADP_SOURCES_DIR ?? 'sources',
		configPath: options.configPath ?? process.env.ADP_STATES_CONFIG ?? defaultStatesConfig,
		contentDir,
		notionPath: options.notionPath ?? process.env.ADP_NOTION_SNAPSHOT ?? join(contentDir, 'notion.json'),
	};
}

/** Copies of the inputs as committed at HEAD, in a temporary folder. A path absent at HEAD stays absent. */
export function atHead(options: Required<AssembleOptions>): Required<AssembleOptions> {
	const dir = mkdtempSync(join(tmpdir(), 'adp-catalogue-head-'));
	for (const path of new Set(Object.values(options))) {
		let files: string[] = [];
		try {
			files = execFileSync('git', ['ls-tree', '-r', '--name-only', 'HEAD', '--', path], { encoding: 'utf8' }).split('\n').filter(Boolean);
		} catch {
			files = [];
		}
		for (const file of files) {
			const target = join(dir, file);
			mkdirSync(dirname(target), { recursive: true });
			writeFileSync(target, execFileSync('git', ['show', `HEAD:${file}`], { maxBuffer: 64 * 1024 * 1024 }));
		}
	}
	const inside = (path: string) => join(dir, path);
	return { sourcesRoot: inside(options.sourcesRoot), configPath: inside(options.configPath), contentDir: inside(options.contentDir), notionPath: inside(options.notionPath) };
}

type Membership = 'catalogue' | 'ideas' | 'neither';

function membership(catalogue: Catalogue, origin: string): Membership {
	if (catalogue.designers.some((designer) => designer.origin === origin)) return 'catalogue';
	if (catalogue.ideas.some((idea) => idea.origin === origin)) return 'ideas';
	return 'neither';
}

function option(args: string[], name: string): string | undefined {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
}

const readJson = <T>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, 'utf8')) as T) : fallback);

export function main(args: string[], options: ReportOptions = {}): number {
	const inputs = resolved(options);
	const reportDir = options.reportDir ?? '.refresh';
	const today = options.today ?? new Date().toISOString().slice(0, 10);
	const redirectsFile = join(inputs.contentDir, 'redirects.json');
	const publishedFile = join(inputs.contentDir, 'published.json');

	const withdraw = option(args, '--withdraw');
	const reason = option(args, '--reason');
	const rename = option(args, '--rename');
	const noWrite = args.includes('--no-write');
	if (noWrite && (withdraw || rename)) {
		console.error('--no-write cannot record an answer; leave it out with --withdraw or --rename.');
		return 2;
	}
	if (withdraw && !reason) {
		console.error('--withdraw needs --reason "<why>", which is shown on the withdrawal notice.');
		return 2;
	}
	if (rename && !/^[^=]+=[^=]+$/.test(rename)) {
		console.error('--rename takes <old origin>=<new origin>.');
		return 2;
	}

	let current: Catalogue;
	let previous: Catalogue | undefined;
	try {
		current = assembleCatalogue(inputs);
	} catch (error) {
		console.error(`The catalogue does not assemble: ${(error as Error).message}`);
		return 1;
	}
	try {
		previous = assembleCatalogue(options.baseline ?? atHead(inputs));
	} catch (error) {
		console.log(`note: the catalogue at HEAD does not assemble, so no changes are listed (${(error as Error).message})`);
	}

	// Answers to earlier questions: each becomes a redirect.
	const answers: { from: string; to: string | null; reason: string }[] = [];
	if (withdraw) answers.push({ from: withdraw, to: null, reason: reason! });
	if (rename) {
		const [from, to] = rename.split('=');
		answers.push({ from, to, reason: `Renamed to ${to}.` });
	}
	const redirects = readJson<Redirect[]>(redirectsFile, []);
	const live = new Set(current.designers.map((designer) => designer.origin));
	const sources = readSources(inputs.sourcesRoot);
	for (const answer of answers) {
		if (live.has(answer.from)) {
			console.error(`${answer.from} is still a designer, so it needs no redirect.`);
			return 2;
		}
		if (answer.to !== null && !live.has(answer.to)) {
			console.error(`${answer.to} is not a designer, so ${answer.from} cannot be renamed to it.`);
			return 2;
		}
		if (redirects.some((redirect) => redirect.from === answer.from)) {
			console.error(`${answer.from} already has a redirect in ${redirectsFile}.`);
			return 2;
		}
		// The source revision in which the origin disappeared: the catalogue of a host that had it, as it is now.
		const hadIt = previous ? catalogueHosts.filter(({ id }) => states[previous.hostStates[answer.from]?.[id]?.state ?? 'not-planned'].rank > 0) : [];
		const host = hadIt.find(({ id }) => sources.catalogues.has(id));
		const former = previous?.designers.find((designer) => designer.origin === answer.from);
		const source: SourceRecord | undefined = host ? catalogueSourceRecord(sources.catalogues.get(host.id)!.lock, host.id) : former?.sources[0];
		if (!source) {
			console.error(`${answer.from} was not a designer at HEAD, so there is nothing to redirect.`);
			return 2;
		}
		redirects.push({ from: answer.from, to: answer.to, reason: answer.reason, since: today, source });
	}
	if (answers.length > 0) {
		redirects.sort((a, b) => (a.from < b.from ? -1 : 1));
		writeFileSync(redirectsFile, json(redirects));
		current = assembleCatalogue(inputs);
	}

	// A published designer that disappeared without a redirect is a question, and nothing is written.
	if (current.report.membership.length > 0 && !noWrite) {
		for (const item of current.report.membership) {
			const renamedTo = /renamed to (\S+)\)/.exec(item.message)?.[1];
			console.log(
				`\`${item.origin}\` is no longer in any source. Renamed to (origin) or withdrawn (reason)?` +
					(renamedTo ? ` Notion says it was renamed to ${renamedTo}.` : ''),
			);
			console.log(`  npm run catalogue:report -- --rename ${item.origin}=${renamedTo ?? '<new origin>'}`);
			console.log(`  npm run catalogue:report -- --withdraw ${item.origin} --reason "<why>"`);
		}
		return 3;
	}

	const report = render(current, previous);
	mkdirSync(reportDir, { recursive: true });
	writeFileSync(join(reportDir, 'catalogue-report.md'), report);
	if (!noWrite) writeFileSync(publishedFile, json(current.designers.map((designer) => designer.origin)));
	console.log(report);
	return 0;
}

/** The report of contracts: state changes, membership, screenshots, Notion differences and gaps. */
export function render(current: Catalogue, previous: Catalogue | undefined): string {
	const stateChanges: string[] = [];
	const moves: string[] = [];
	if (previous) {
		const origins = [...new Set([...Object.keys(previous.hostStates), ...Object.keys(current.hostStates)])].sort();
		for (const origin of origins) {
			const before = previous.hostStates[origin];
			const after = current.hostStates[origin];
			const changedHosts = catalogueHosts.filter(({ id }) => (before?.[id]?.state ?? 'not-planned') !== (after?.[id]?.state ?? 'not-planned'));
			for (const { id } of changedHosts) {
				stateChanges.push(`${origin} · ${id} · ${before?.[id]?.state ?? 'not-planned'} → ${after?.[id]?.state ?? 'not-planned'}`);
			}
			const was = membership(previous, origin);
			const is = membership(current, origin);
			if (was !== is) {
				const detail = changedHosts
					.map(({ id }) => `${id}: ${before?.[id]?.sourceState ?? 'no entry'} → ${after?.[id]?.sourceState ?? 'no entry'}`)
					.join(', ');
				moves.push(`${origin} moved from ${was} to ${is}${detail ? ` (${detail})` : ''}`);
			}
		}
	}
	const list = (items: string[]) => (items.length > 0 ? items.map((item) => `- ${item}`) : ['- None.']);
	const messages = (items: { message: string }[]) => list(items.map((item) => item.message));
	const differs = current.designers.flatMap((designer) =>
		catalogueHosts
			.filter(({ id }) => designer.hosts[id].notionDiffers !== null)
			.map(({ id }) => `${designer.origin} · ${id} · Notion ${designer.hosts[id].notionDiffers} → ${designer.hosts[id].sourceState ?? 'no entry'}`),
	);
	return [
		'## Designer catalogue',
		'',
		`${current.designers.length} designers and ${current.ideas.length} ideas.${previous ? '' : ' The catalogue at HEAD did not assemble, so no changes are listed.'}`,
		'',
		'### State changes',
		'',
		...list(stateChanges),
		'',
		'### Membership',
		'',
		...list(moves),
		'',
		'### Screenshots',
		'',
		...messages(current.report.pending),
		'',
		'### Notion differences',
		'',
		...list(differs),
		'',
		'### Disagreements',
		'',
		...messages(current.report.disagreements),
		'',
		'### Gaps',
		'',
		...messages(current.report.gaps),
		'',
	].join('\n');
}

if (import.meta.main) process.exitCode = main(process.argv.slice(2));
