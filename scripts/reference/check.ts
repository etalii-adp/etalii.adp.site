/**
 * npm run check:reference — run after npm run build, over dist/ (contracts/refresh-cli.md, research D16).
 * Prints each failure as `CHECK <name>: <what> (<where>)` and each warning as `WARN <name>: …`;
 * exits 0 when every check passed, 1 otherwise. Set REFERENCE_CONTENT_DIR as for the build it checks.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { languages, versionsOf, type LoadedVersion } from '../../src/lib/reference/load';
import { LATEST, languageHref, pageHref, schemaFileHref, versionHref } from '../../src/lib/reference/site';

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

// -- Headings (SC-001) ------------------------------------------------------------------------------

checks.push({
	name: 'headings',
	run({ versions, html, fail }) {
		for (const version of versions) {
			const segments = version === versions.filter((v) => v.language.id === version.language.id).at(-1) ? [version.record.version, LATEST] : [version.record.version];
			for (const segment of segments) {
				for (const heading of version.split().headings) {
					const address = pageHref(version.language.id, segment, heading.page);
					const page = html(address);
					if (page === undefined) fail(`the page for "${heading.text}" is missing`, address);
					else if (!idsOf(page).has(heading.id)) fail(`heading "${heading.text}" has no element with id "${heading.id}"`, address);
				}
			}
		}
	},
});

// -- Internal links and fragments (SC-002) ------------------------------------------------------------

checks.push({
	name: 'links',
	run({ versions, pages, html, bytes, fail }) {
		for (const language of new Set(versions.map((v) => v.language.id))) {
			const prefix = languageHref(language);
			for (const address of pages(language)) {
				for (const href of hrefsOf(html(address)!)) {
					const target = href.startsWith('#') ? address + href : href;
					if (!target.startsWith(prefix)) continue;
					const [path, fragment] = target.split('#');
					if (bytes(path) === undefined) {
						fail(`link to ${target} leads nowhere`, address);
						continue;
					}
					if (fragment && path.endsWith('/') && !idsOf(html(path)!).has(decodeURIComponent(fragment))) {
						fail(`link to ${target} names a fragment the page does not have`, address);
					}
				}
			}
		}
	},
});

// -- Versions: banner, canonical, latest addresses (FR-006 to FR-008, SC-004) ----------------------------

checks.push({
	name: 'versions',
	run({ versions, pages, html, fail }) {
		for (const language of new Set(versions.map((v) => v.language.id))) {
			const own = versions.filter((v) => v.language.id === language);
			const latest = own.at(-1)!;
			for (const version of own) {
				const prefix = versionHref(language, version.record.version);
				for (const address of pages(language).filter((a) => a.startsWith(prefix))) {
					const page = html(address)!;
					if (version !== latest && !page.includes('ref-version-banner')) fail(`a page of superseded version ${version.record.version} lacks the newer-version banner`, address);
					if (version === latest && page.includes('ref-version-banner')) fail('a page of the latest version shows the newer-version banner', address);
				}
			}
			const latestPrefix = versionHref(language, LATEST);
			const twinPrefix = versionHref(language, latest.record.version);
			for (const address of pages(language).filter((a) => a.startsWith(latestPrefix))) {
				const page = html(address)!;
				if (page.includes('class="ref-stub"')) continue;
				const canonical = /<link rel="canonical" href="([^"]*)"/.exec(page)?.[1];
				const twin = new URL(twinPrefix + address.slice(latestPrefix.length), 'https://etalii.net').href;
				if (canonical !== twin) fail(`latest copy has rel="canonical" ${canonical ?? 'missing'}, expected ${twin}`, address);
				if (page.includes('data-pagefind-body')) fail('latest copy is marked for the search index', address);
			}
			for (const version of own) {
				for (const { page } of version.split().sections) {
					const address = pageHref(language, LATEST, page.slug);
					if (html(address) === undefined) fail(`${version.record.version} page "${page.slug}" does not resolve under latest/ (neither page nor stub)`, address);
				}
			}
		}
	},
});

// -- Examples valid against their schema (SC-003) -----------------------------------------------------

checks.push({
	name: 'examples',
	run({ versions, fail }) {
		for (const version of versions) {
			const schema = version.schema();
			// Draft 2020-12 with formats; not strict, because the schema may use annotation keywords ajv does not know.
			const ajv = new Ajv2020({ allErrors: true, strict: false });
			addFormats(ajv);
			ajv.addSchema(schema);
			for (const file of version.record.files.filter((f) => f.role === 'definition' || f.role === 'document')) {
				const validate = ajv.getSchema(file.role === 'definition' ? schema.$id : `${schema.$id}#/$defs/Document`);
				if (!validate) {
					fail(`the schema has no ${file.role === 'definition' ? 'root' : '$defs/Document'} to validate ${file.name} against`, version.dir);
					continue;
				}
				if (!validate(JSON.parse(version.file(file.name).toString('utf8')))) {
					const errors = validate.errors!.slice(0, 5).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
					fail(`${file.name} does not validate against ${version.language.schema} ${version.record.version}: ${errors}`, join(version.dir, 'source', file.name));
				}
			}
		}
	},
});

// -- Published files byte-identical to the snapshot (FR-009, FR-010) --------------------------------------

checks.push({
	name: 'bytes',
	run({ versions, bytes, fail }) {
		for (const version of versions) {
			const language = version.language.id;
			const expected: [string, string][] = [[schemaFileHref(version), version.language.schema]];
			const segments = version === versions.filter((v) => v.language.id === language).at(-1) ? [version.record.version, LATEST] : [version.record.version];
			for (const segment of segments) {
				expected.push([`${versionHref(language, segment)}${version.language.prose}`, version.language.prose]);
				for (const file of version.record.files.filter((f) => f.role === 'definition' || f.role === 'document')) {
					expected.push([`${versionHref(language, segment)}examples/files/${file.name}`, file.name]);
				}
			}
			for (const [address, name] of expected) {
				const published = bytes(address);
				if (!published) fail(`${name} is not published`, address);
				else if (!published.equals(version.file(name))) fail(`${name} differs from the snapshot`, address);
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
