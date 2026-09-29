/**
 * The page addresses of a language that moved (`movedTo` in languages.json): DEDL became DISL and DID (etalii.adp
 * spec 002, research R4 and R6). Each of its former pages redirects, in one hop, to the landing of the language that
 * replaced it; its schema files are not pages and keep being served at their own addresses
 * (src/pages/[language]/schema/[version]/[file].ts). Read by src/data/redirects.ts, which Astro loads before the build.
 */
import { registeredLanguages, versionsOf } from './load';
import { stemOf } from './examples';
import { stubsOf } from './stubs';
import { LATEST, languageHref } from './site';

/** Old address without the base (`/dedl/0.1/schema/`) → new address with it (`/adp/disl/`). */
export function movedReferenceRedirects(): Record<string, string> {
	const entries: [string, string][] = [];
	for (const language of registeredLanguages().filter((candidate) => candidate.movedTo)) {
		const to = languageHref(language.movedTo!);
		const pages = new Set<string>(['', 'search/']);
		const versions = versionsOf(language.id);
		for (const version of versions) {
			for (const segment of [version.record.version, ...(version === versions.at(-1) ? [LATEST] : [])]) {
				pages.add(`${segment}/`);
				pages.add(`${segment}/schema/`);
				pages.add(`${segment}/examples/`);
				for (const { page } of version.split().sections) pages.add(`${segment}/${page.slug}/`);
				for (const file of version.record.files.filter((f) => f.role === 'definition' || f.role === 'document')) pages.add(`${segment}/examples/${stemOf(file.name)}/`);
			}
		}
		for (const stub of stubsOf(versions)) pages.add(`${LATEST}/${stub.slug}/`);
		for (const page of pages) entries.push([`/${language.id}/${page}`, to]);
	}
	return Object.fromEntries(entries);
}
