import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exampleExports } from '../../src/data/example-exports';

// The published flow pages (etalii.adp spec 074, FR-037, FR-039, FR-040).
const folder = join(process.cwd(), 'public', 'docs', 'causal-loop-flow-pages');
const pages = readdirSync(folder);
const links = exampleExports['systems/causal-loop-diagram'];

describe('the causal loop flow pages', () => {
	it('has one link per page, and one page per link', () => {
		expect(links.map((link) => link.href.split('/').at(-1)).sort()).toEqual([...pages].sort());
	});

	it('is one page per example, none holding a date in its name', () => {
		expect([...pages].sort()).toEqual(['business-philosophy.html', 'life-insurance.html', 'mental-health.html', 'on-call.html', 'reference.html', 'uk-cod-population.html']);
	});

	it.each(pages)('%s loads nothing from outside itself', (page) => {
		const text = readFileSync(join(folder, page), 'utf-8');
		expect(text.startsWith('<!doctype html>')).toBe(true);
		for (const reaching of ['src=', 'href=', 'url(', 'http://', 'https://', '@import']) {
			expect(text.includes(reaching), reaching).toBe(false);
		}
	});
});
