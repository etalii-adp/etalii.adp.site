import { describe, expect, it } from 'vitest';
import { glossaryOf, remarkLinkReferences, type LinkContext } from '../../src/lib/reference/remark-link-references';
import { renderMarkdown } from '../../src/lib/reference/render';
import { splitProse } from '../../src/lib/reference/split';
import type { Link } from '../../src/lib/reference/types';
import { fixtureProse } from './fixture';

const split = splitProse(fixtureProse());
const glossary = glossaryOf(split);

const base = '/adp/disl/0.1/';
const layer2 = `${base}layer-2-coordinate-systems-placement-and-snapping/`;
const cel = `${base}the-cel-environment/`;

function context(page = 'foundations', extra: Partial<LinkContext> = {}): LinkContext {
	return {
		language: 'disl',
		segment: '0.1',
		page,
		anchors: split.anchors,
		numbers: split.numbers,
		glossary,
		defs: new Set(),
		graph: [],
		...extra,
	};
}

async function render(md: string, ctx = context()): Promise<string> {
	return renderMarkdown(md, { remarkPlugins: [[remarkLinkReferences, ctx]] });
}

const textOf = (html: string) => html.replace(/<[^>]+>/g, '');

describe('T1: explicit anchor links', () => {
	it('point at the page that holds the anchor', async () => {
		const html = await render('See [snap rules](#510-snap-rules).');
		expect(html).toContain(`<a href="${layer2}#510-snap-rules"`);
		expect(textOf(html)).toBe('See snap rules.');
	});
});

describe('T2: section numbers', () => {
	it.each([
		['(12.3)', '12.3', `${cel}#123-contexts`],
		['(12.3 step 9)', '12.3', `${cel}#123-contexts`],
		['(see 5.10)', '5.10', `${layer2}#510-snap-rules`],
		['section 10', '10', `${base}layer-7-layout/#10-layer-7--layout`],
		['Appendix B', 'B', `${base}appendix-b-built-in-catalogues/#appendix-b--built-in-catalogues`],
		['Appendix A.2', 'A.2', `${base}appendix-a-json-schema/#a2-definitions-by-layer`],
	])('links only the number in %s', async (phrase, number, href) => {
		const html = await render(`Text ${phrase} text.`);
		expect(html).toContain(`<a href="${href}" class="ref-link ref-number">${number}</a>`);
		expect(textOf(html)).toBe(`Text ${phrase} text.`);
	});

	it('links both numbers of "sections 5 and 6"', async () => {
		const html = await render('As sections 5 and 6 say.');
		expect(html.match(/class="ref-link ref-number"/g)).toHaveLength(2);
		expect(textOf(html)).toBe('As sections 5 and 6 say.');
	});

	it('leaves a number without a heading unlinked', async () => {
		const html = await render('A colour (0.62 0.12 165) and (99.9) and section 42.');
		expect(html).not.toContain('<a ');
	});

	it('touches nothing inside code, headings or existing links', async () => {
		const html = await render('### Relation to section 5\n\n`see (12.3)` and [section 5](https://example.org).\n\n```\n(12.3)\n```');
		expect(html).not.toContain('ref-number');
	});
});

describe('T4: glossary terms', () => {
	it('reads the terms of Appendix C', () => {
		expect(glossary.terms.size).toBe(27);
		expect(glossary.terms.get('bound placement')?.id).toBe('term-bound-placement');
		expect(glossary.page).toBe('appendix-c-glossary');
	});

	it('links the first whole-word, case-insensitive occurrence per page', async () => {
		const html = await render('A bound placement here, a Bound placement there, and unbound placements.');
		const links = html.match(/<a [^>]*ref-glossary[^>]*>[^<]*<\/a>/g) ?? [];
		expect(links).toEqual([`<a href="${base}appendix-c-glossary/#term-bound-placement" class="ref-link ref-glossary">bound placement</a>`]);
		expect(textOf(html)).toBe('A bound placement here, a Bound placement there, and unbound placements.');
	});

	it('never links in headings, links, code or Appendix C itself', async () => {
		const md = '### Bound placement\n\n[Bound placement](https://example.org) and `bound placement`.';
		expect(await render(md)).not.toContain('ref-glossary');
		expect(await render('A bound placement.', context('appendix-c-glossary'))).not.toContain('ref-glossary');
	});
});

describe('T3: schema definitions', () => {
	const defs = new Set(['SnapRule', 'Definition', 'Label']);
	const schemaContext = () => context('foundations', { defs });

	it('links `$defs/Name` and a code span equal to a $defs name to the schema browser', async () => {
		const html = await render('See `$defs/SnapRule`, a `Label` and `other`.', schemaContext());
		expect(html).toContain(`<a href="${base}schema/#def-SnapRule" class="ref-link ref-schema"><code>$defs/SnapRule</code></a>`);
		expect(html).toContain(`<a href="${base}schema/#def-Label" class="ref-link ref-schema"><code>Label</code></a>`);
		expect(html).toContain('<code>other</code>');
		expect(html).not.toContain('def-other');
	});

	it('never links inside code blocks', async () => {
		const html = await render(['```', '$defs/SnapRule', 'Label', '```'].join('\n'), schemaContext());
		expect(html).not.toContain('ref-schema');
	});

	it('records schema links in the graph', async () => {
		const graph: Link[] = [];
		await render('A `SnapRule`.', context('foundations', { defs, graph }));
		expect(graph).toEqual([{ from: { page: 'foundations', heading: null }, to: { page: 'schema', fragment: 'def-SnapRule' }, kind: 'schema', text: 'SnapRule' }]);
	});
});

describe('the link graph', () => {
	it('records every link with from, to, kind and text', async () => {
		const graph: Link[] = [];
		await render('### 2.1 Something\n\nSee (12.3) and a bound placement.', context('foundations', { graph }));
		expect(graph).toEqual([
			{ from: { page: 'foundations', heading: '21-something' }, to: { page: 'the-cel-environment', fragment: '123-contexts' }, kind: 'number', text: '12.3' },
			{ from: { page: 'foundations', heading: '21-something' }, to: { page: 'appendix-c-glossary', fragment: 'term-bound-placement' }, kind: 'glossary', text: 'bound placement' },
		]);
	});
});
