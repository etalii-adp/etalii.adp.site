/**
 * The address segments each language publishes: one per version, plus `latest` for the newest
 * (contracts/site-addresses.md, research D3). Every route under src/pages/[language]/[version]/ ranges over these.
 */
import { languages, versionsOf, type LoadedVersion } from './load';
import { LATEST } from './site';

export interface VersionRoute {
	language: string;
	/** The version string or `latest`. */
	segment: string;
	version: LoadedVersion;
	/** The newest published version of the language. */
	latest: LoadedVersion;
	/** True for the `latest` copy, which carries rel="canonical" to its versioned twin and stays out of search. */
	isLatestCopy: boolean;
	/** Every published version of the language, oldest first. */
	all: LoadedVersion[];
}

export function versionRoutes(): VersionRoute[] {
	return languages().flatMap((language) => {
		const all = versionsOf(language.id);
		const latest = all.at(-1);
		if (!latest) return [];
		const routes: VersionRoute[] = all.map((version) => ({ language: language.id, segment: version.record.version, version, latest, isLatestCopy: false, all }));
		routes.push({ language: language.id, segment: LATEST, version: latest, latest, isLatestCopy: true, all });
		return routes;
	});
}
