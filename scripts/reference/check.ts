/**
 * npm run check:reference — run after npm run build, over dist/ (contracts/refresh-cli.md, research D16).
 * Prints each failure as `CHECK <name>: <what> (<where>)` and each warning as `WARN <name>: …`;
 * exits 0 when every check passed, 1 otherwise. Set REFERENCE_CONTENT_DIR as for the build it checks.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { languages, versionsOf, type LoadedVersion } from '../../src/lib/reference/load';

export interface CheckContext {
	/** The build output, `dist/`. */
	dist: string;
	/** Every published version of every language. */
	versions: LoadedVersion[];
	/** Addresses (`/adp/…/`) of every HTML page under `/adp/<language>/`, per language. */
	pages(language: string): string[];
	/** The HTML of a page by address, or undefined when there is none. */
	html(address: string): string | undefined;
	/** The bytes of a file by address, or undefined. */
	bytes(address: string): Buffer | undefined;
	fail(what: string, where: string): void;
	warn(what: string, where: string): void;
}

export interface Check {
	name: string;
	run(context: CheckContext): void | Promise<void>;
}

/** The registered checks, run in order. Later phases add theirs below. */
export const checks: Check[] = [];

// -- Helpers shared by the checks ---------------------------------------------------------------------

function decode(value: string): string {
	return value
		.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
		.replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
		.replace(/&quot;/g, '"')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

/** Every `id` attribute of a page. */
export function idsOf(html: string): Set<string> {
	return new Set([...html.matchAll(/\sid="([^"]*)"/g)].map((m) => decode(m[1])));
}

/** Every `href` of an `<a>` element of a page. */
export function hrefsOf(html: string): string[] {
	return [...html.matchAll(/<a\s[^>]*?href="([^"]*)"/g)].map((m) => decode(m[1]));
}

// -- Licence (research D14) -------------------------------------------------------------------------

checks.push({
	name: 'licence',
	run({ versions, fail }) {
		for (const version of versions) {
			const licence = version.record.source.licence;
			if (!licence || licence === 'NOASSERTION') {
				fail(`${version.language.short} ${version.record.version} has no licence the source states ("${licence}"); it cannot be published (FR-015)`, join(version.dir, 'source.json'));
			}
		}
	},
});

// -- Runner -----------------------------------------------------------------------------------------

function htmlFiles(dir: string): string[] {
	if (!existsSync(dir)) return [];
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return htmlFiles(path);
		return entry.name.endsWith('.html') ? [path] : [];
	});
}

function fileOf(dist: string, address: string): string {
	const path = decodeURIComponent(address.split('#')[0].split('?')[0]);
	return join(dist, ...(path.endsWith('/') ? `${path}index.html` : path).split('/').filter(Boolean));
}

export async function runChecks(dist = 'dist'): Promise<{ failures: string[]; warnings: string[] }> {
	const failures: string[] = [];
	const warnings: string[] = [];
	const cache = new Map<string, Buffer | undefined>();
	const bytes = (address: string) => {
		if (!cache.has(address)) {
			const file = fileOf(dist, address);
			cache.set(address, existsSync(file) ? readFileSync(file) : undefined);
		}
		return cache.get(address);
	};
	const versions = languages().flatMap((l) => versionsOf(l.id));
	for (const check of checks) {
		const context: CheckContext = {
			dist,
			versions,
			pages: (language) =>
				htmlFiles(join(dist, 'adp', language))
					.map((file) => '/' + relative(dist, file).split(sep).join('/'))
					.map((address) => address.replace(/index\.html$/, ''))
					.sort(),
			html: (address) => bytes(address)?.toString('utf8'),
			bytes,
			fail: (what, where) => failures.push(`CHECK ${check.name}: ${what} (${where})`),
			warn: (what, where) => warnings.push(`WARN ${check.name}: ${what} (${where})`),
		};
		await check.run(context);
	}
	return { failures, warnings };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
	if (!existsSync('dist')) {
		console.error('check:reference: dist/ is missing; run npm run build first.');
		process.exit(1);
	}
	const { failures, warnings } = await runChecks();
	for (const line of warnings) console.log(line);
	for (const line of failures) console.log(line);
	console.log(`check:reference: ${checks.length} checks, ${failures.length} failure(s), ${warnings.length} warning(s).`);
	process.exitCode = failures.length ? 1 : 0;
}
