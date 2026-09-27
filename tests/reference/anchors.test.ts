import { describe, expect, it } from 'vitest';
import { buildMaps, headingId, headingNumber, pageSlug } from '../../src/lib/reference/anchors';
import { splitProse } from '../../src/lib/reference/split';
import type { Heading } from '../../src/lib/reference/types';
import { fixtureProse } from './fixture';

describe('heading ids (rule S5)', () => {
	it('equal the GitHub slug of the heading text', () => {
		expect(headingId('5.10 Snap rules')).toBe('510-snap-rules');
		expect(headingId('5.1 Concepts')).toBe('51-concepts');
		expect(headingId('4. Layer 1 — Metamodel')).toBe('4-layer-1--metamodel');
		expect(headingId('1.2 How DEDL is intended to be used (informative)')).toBe('12-how-dedl-is-intended-to-be-used-informative');
	});

	it('match every link of the source table of contents', () => {
		const prose = fixtureProse();
		const split = splitProse(prose);
		const targets = [...prose.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]);
		expect(targets.length).toBeGreaterThan(20);
		for (const target of targets) expect(split.anchors.has(target), target).toBe(true);
	});
});

describe('heading numbers', () => {
	it('are read from section, subsection and appendix headings', () => {
		expect(headingNumber('5.10 Snap rules')).toBe('5.10');
		expect(headingNumber('4. Layer 1 — Metamodel')).toBe('4');
		expect(headingNumber('A.2 Definitions by layer')).toBe('A.2');
		expect(headingNumber('Appendix C — Glossary')).toBe('C');
		expect(headingNumber('Status of this document')).toBeNull();
	});

	it('find 5.10 and A.2 in the fixture', () => {
		const split = splitProse(fixtureProse());
		expect(split.numbers.get('5.10')?.id).toBe('510-snap-rules');
		expect(split.numbers.get('A.2')?.id).toBe('a2-definitions-by-layer');
	});
});

describe('page slugs (research D4)', () => {
	it('drop the leading number and collapse runs of -', () => {
		expect(pageSlug('4. Layer 1 — Metamodel')).toBe('layer-1-metamodel');
		expect(pageSlug('Appendix C — Glossary')).toBe('appendix-c-glossary');
		expect(pageSlug('5. Layer 2 — Coordinate systems, placement and snapping')).toBe('layer-2-coordinate-systems-placement-and-snapping');
	});

	it('refuse the reserved slugs', () => {
		for (const reserved of ['Latest', 'Schema', 'Search', 'Examples']) {
			expect(() => pageSlug(`9. ${reserved}`)).toThrow(/reserved/);
		}
	});
});

describe('the anchor map', () => {
	it('fails on two headings with the same id, naming both', () => {
		const headings: Heading[] = [
			{ id: 'x-y', depth: 3, number: null, text: 'X y', page: 'one' },
			{ id: 'x-y', depth: 3, number: null, text: 'X: y', page: 'two' },
		];
		expect(() => buildMaps(headings)).toThrow(/"X y".*"X: y"/);
	});
});
