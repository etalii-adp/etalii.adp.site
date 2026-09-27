/**
 * Helpers of the example pages: the address of each example file, and "What it demonstrates" rendered
 * from the section that embeds the example, with the layer names at the start of its items linked to their
 * layer sections (research D9).
 */
import type { Link as MdLink, Root, Strong } from 'mdast';
import { toString } from 'mdast-util-to-string';
import { visit, SKIP } from 'unist-util-visit';
import type { ExampleModel } from './examples';
import type { LoadedVersion } from './load';
import { glossaryOf, type LinkContext } from './remark-link-references';
import { referencePlugins, renderNodes } from './render';
import { examplesHref, layerSections, type LayerSection } from './site';
import { LAYERS } from './visuals';

export function exampleFileHref(language: string, segment: string, file: string): string {
	return `${examplesHref(language, segment)}files/${file}`;
}

/** Links a bold layer name such as `**Metamodel:**` to that layer's section. */
function remarkLayerNames(options: { sections: LayerSection[] }) {
	return (tree: Root) => {
		visit(tree, 'strong', (node: Strong, index, parent) => {
			if (!parent || index === undefined || parent.type === 'link') return;
			const name = toString(node).replace(/:$/, '').trim().toLowerCase();
			const layer = LAYERS.find((l) => l.name.toLowerCase() === name || l.keys.includes(name));
			const section = layer && options.sections.find((s) => s.layer === layer.layer);
			if (!section) return;
			const link: MdLink = { type: 'link', url: section.href, children: [node], data: { hProperties: { className: ['ref-link', 'ref-layer'] } } };
			parent.children[index] = link;
			return SKIP;
		});
	};
}

/** The example's "What it demonstrates", rendered with the same linking as the section it comes from. */
export async function renderDemonstrates(version: LoadedVersion, segment: string, example: ExampleModel): Promise<string | null> {
	if (!example.demonstratesNodes.length) return null;
	const split = version.split();
	const context: LinkContext = {
		language: version.language.id,
		segment,
		page: `examples/${example.stem}`,
		anchors: split.anchors,
		numbers: split.numbers,
		glossary: glossaryOf(split),
		defs: new Set(Object.keys(version.schema().$defs ?? {})),
		graph: [],
	};
	const plugins = referencePlugins(context);
	const rendered = await renderNodes(example.demonstratesNodes, {
		source: split.source,
		remarkPlugins: [[remarkLayerNames, { sections: layerSections(version, segment) }], ...(plugins.remarkPlugins ?? [])],
		rehypePlugins: plugins.rehypePlugins,
	});
	return rendered.html;
}
