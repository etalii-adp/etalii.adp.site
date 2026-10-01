import { toString } from 'mdast-util-to-string';
import { describe, expect, it } from 'vitest';
import { splitProse } from '../../src/lib/reference/split';
import { fixtureProse } from './fixture';

const prose = fixtureProse();
const split = splitProse(prose);

describe('splitting the prose (rules S1–S4)', () => {
	it('reads version, status and date', () => {
		expect(split.title).toBe('DEDL — Diagram Editor Definition Language');
		expect(split.version).toBe('0.1');
		expect(split.status).toBe('Working Draft');
		expect(split.date).toBe('2026-09-25');
	});

	it('makes a cover and 21 section pages, 22 in total', () => {
		expect(split.cover.page.kind).toBe('cover');
		expect(split.sections).toHaveLength(21);
		expect(split.sections.map((s) => s.page.number)).toEqual([
			...Array.from({ length: 17 }, (_, i) => String(i + 1)),
			'A',
			'B',
			'C',
			'D',
		]);
	});

	it('puts every H2 after the table of contents on a page (SC-001)', () => {
		const h2s = [...prose.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
		const afterToc = h2s.slice(h2s.indexOf('Table of contents') + 1);
		expect(split.sections.map((s) => s.page.headings[0].text)).toEqual(afterToc.map((t) => t.replace(/\*\(informative\)\*/, '(informative)')));
	});

	it('does not render the hand-written table of contents (S2)', () => {
		const coverText = split.cover.nodes.map((n) => toString(n)).join('\n');
		expect(coverText).toContain('Status of this document');
		expect(coverText).not.toContain('Table of contents');
		expect(split.cover.nodes.some((n) => n.type === 'list')).toBe(false);
	});

	it('drops thematic breaks directly before a split and keeps the others (S4)', () => {
		for (const part of [split.cover, ...split.sections]) {
			expect(part.nodes.at(-1)?.type).not.toBe('thematicBreak');
		}
		// The cover keeps the break between the metadata table and "Status of this document".
		expect(split.cover.nodes.filter((n) => n.type === 'thematicBreak')).toHaveLength(1);
	});

	it('marks informative headings', () => {
		const sectionOne = split.sections[0].page;
		const informative = sectionOne.headings.filter((h) => /\(informative\)$/.test(h.text));
		expect(informative.length).toBeGreaterThan(0);
		expect(split.headingInfo.get('12-how-dedl-is-intended-to-be-used-informative')?.informative).toBe(true);
		expect(split.headingInfo.get('11-what-dedl-is')?.informative).toBe(false);
	});

	it('titles pages without their number', () => {
		const layer1 = split.sections[3].page;
		expect(layer1.slug).toBe('layer-1-metamodel');
		expect(layer1.title).toBe('Layer 1 — Metamodel');
		expect(split.sections[19].page.title).toBe('Glossary');
		expect(split.sections[19].page.slug).toBe('appendix-c-glossary');
	});

	it('links previous and next in document order', () => {
		const pages = split.sections.map((s) => s.page);
		expect(pages[0].prev).toBeNull();
		expect(pages[0].next).toBe(pages[1].slug);
		expect(pages[5].prev).toBe(pages[4].slug);
		expect(pages.at(-1)!.next).toBeNull();
	});

	it('makes an unnumbered top-level heading a page without a number', () => {
		const split = splitProse(prose.replace('## Appendix D — Design rationale and open questions', '## Changes from 0.1'));
		const page = split.sections.find((s) => s.page.slug === 'changes-from-01')!.page;
		expect(page).toMatchObject({ number: null, title: 'Changes from 0.1' });
	});
});
