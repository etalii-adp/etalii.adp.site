/**
 * Stubs under `latest/` for pages an older version had and the latest lacks (research D13): "moved to"
 * when a heading with the same title, ignoring its number, exists in the latest version, else "removed in".
 */
import { compareVersions, type LoadedVersion } from './load';
import { withoutInformative } from './split';
import type { Heading } from './types';

export interface Stub {
	/** The old page slug, served at `/<language>/latest/<slug>/`. */
	slug: string;
	/** The page's title in the last version that had it. */
	title: string;
	/** The last version that had the page. */
	lastVersion: LoadedVersion;
	/** The heading in the latest version it moved to, or null when it was removed. */
	movedTo: Heading | null;
	/** The version in which it disappeared, for "removed in". */
	removedIn: string;
}

/** A heading's text without its number and without `(informative)`: `5.10 Snap rules` → `snap rules`. */
export function titleKey(text: string): string {
	return withoutInformative(text)
		.replace(/^Appendix [A-Z] — /, '')
		.replace(/^(?:\d+(?:\.\d+)*|[A-Z](?:\.\d+)+)\.?\s+/, '')
		.trim()
		.toLowerCase();
}

export function stubsOf(versions: LoadedVersion[]): Stub[] {
	const ordered = [...versions].sort((a, b) => compareVersions(a.record.version, b.record.version));
	const latest = ordered.at(-1);
	if (!latest) return [];
	const latestSlugs = new Set(latest.split().sections.map((s) => s.page.slug));
	const byTitle = new Map<string, Heading>();
	for (const heading of latest.split().headings) {
		const key = titleKey(heading.text);
		if (!byTitle.has(key)) byTitle.set(key, heading);
	}

	const stubs = new Map<string, Stub>();
	for (const [index, version] of ordered.slice(0, -1).entries()) {
		for (const { page } of version.split().sections) {
			if (latestSlugs.has(page.slug)) continue;
			const title = withoutInformative(page.headings[0].text);
			stubs.set(page.slug, {
				slug: page.slug,
				title,
				lastVersion: version,
				movedTo: byTitle.get(titleKey(title)) ?? null,
				removedIn: ordered[index + 1].record.version,
			});
		}
	}
	// A later version that also had the page overwrote the entry, so each stub names the last version that had it.
	return [...stubs.values()];
}
