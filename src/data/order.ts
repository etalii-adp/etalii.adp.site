/**
 * The four IDE hosts whose repositories keep a catalogue (docs/tools.md) and screenshots. ThinkRail, the fifth IDE
 * host, keeps none yet, so it is listed after them in hostIds.
 */
export const ideHostIds = ['standalone', 'intellij', 'vscode', 'eclipse'] as const;
/**
 * Every host, in the site's fixed order: standalone, then desktop (the native duplicate of standalone), the other
 * three IDE hosts above, then ThinkRail, Notion and Claude. Desktop, ThinkRail, Notion and Claude keep no catalogue the
 * refresh reads, so their states come from their Notion column. The order of the entries in src/data/hosts.yaml, of
 * the host rows of the tool catalogue and of its Host filter; checked at build time.
 */
export const hostIds = ['standalone', 'desktop', 'intellij', 'vscode', 'eclipse', 'thinkrail', 'notion', 'claude'] as const;
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
