/** The fixed order of the entries in src/data/hosts.yaml and src/data/focus-areas.yaml, checked at build time. */
export const hostIds = ['standalone', 'intellij', 'vscode', 'eclipse'] as const;
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
