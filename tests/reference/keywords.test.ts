import { describe, expect, it } from 'vitest';
import { rehypeKeywords } from '../../src/lib/reference/rehype-keywords';
import { renderMarkdown } from '../../src/lib/reference/render';
import { fixtureProse } from './fixture';

const render = (md: string) => renderMarkdown(md, { rehypePlugins: [rehypeKeywords] });

describe('T5: normative key words', () => {
	it.each(['MUST', 'MUST NOT', 'REQUIRED', 'SHALL', 'SHALL NOT', 'SHOULD', 'SHOULD NOT', 'RECOMMENDED', 'MAY', 'OPTIONAL'])('marks bold %s', async (word) => {
		expect(await render(`A **${word}** b.`)).toContain(`<strong class="kw">${word}</strong>`);
	});

	it('does not mark bold text that is more than a key word, plain words or code', async () => {
		const html = await render('It **MUST be** so; it must; it MUST; `**MUST**`.');
		expect(html).not.toContain('class="kw"');
	});

	it('marks the 14 occurrences of the fixture', async () => {
		const html = await render(fixtureProse());
		expect(html.match(/<strong class="kw">/g)).toHaveLength(14);
	});
});
