/** The four IDE hosts, the hosts whose repositories keep a catalogue (docs/tools.md) and screenshots. */
export const ideHostIds = ['standalone', 'intellij', 'vscode', 'eclipse'] as const;
/**
 * Every host, in the site's fixed order: the four IDE hosts, then Notion. The order of the entries in
 * src/data/hosts.yaml, of the host rows of the tool catalogue and of its Host filter; checked at build time.
 */
export const hostIds = [...ideHostIds, 'notion'] as const;
export const focusAreaIds = [
	'technology-assessment',
	'humans-and-agents',
	'textual-clarity',
	'systems-and-strategy',
	'knowledge-and-semantics',
	'software-delivery',
	'planning-and-roadmapping',
	'psychological-and-societal-insights',
] as const;

/** Sorts collection entries into the order of `ids`; getCollection() does not keep file order. */
export function inOrder<T extends { id: string }>(entries: T[], ids: readonly string[]): T[] {
	return [...entries].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
}
