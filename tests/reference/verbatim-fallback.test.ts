import { describe, expect, it } from 'vitest';
import { renderMarkdown } from '../../src/lib/reference/render';

const NOTE = 'Shown as written in the source.';

describe('faithful rendering (rules B1, B2, B4)', () => {
	it('renders every allowlisted node type normally', async () => {
		const md = [
			'### A heading',
			'',
			'A paragraph with *emphasis*, **strong**, ~~delete~~, `code`, a [link](https://example.org) and ![an image](x.png).  ',
			'A hard break before this line.[^1]',
			'',
			'> A quote',
			'',
			'- a list',
			'',
			'---',
			'',
			'| a | b |',
			'|---|---|',
			'| 1 | 2 |',
			'',
			'```',
			'plain',
			'```',
			'',
			'[^1]: A footnote.',
		].join('\n');
		const html = await renderMarkdown(md);
		expect(html).not.toContain('class="verbatim');
		for (const tag of ['<h3', '<em>', '<strong>', '<del>', '<code>', '<a href="https://example.org"', '<img', '<br>', '<blockquote>', '<ul>', '<hr>', '<table>', '<pre tabindex="0"><code>plain', 'data-footnote']) {
			expect(html, tag).toContain(tag);
		}
	});

	it('shows raw HTML as its source lines, with the note (B4)', async () => {
		const md = 'Before.\n\n<div align="center">\n  <b>raw</b>\n</div>\n\nAfter.';
		const html = await renderMarkdown(md);
		expect(html).toContain('<pre class="verbatim"><code>&#x3C;div align="center">\n  &#x3C;b>raw&#x3C;/b>\n&#x3C;/div></code></pre>');
		expect(html).toContain(NOTE);
		expect(html).not.toContain('<b>raw</b>');
		expect(html).toContain('<p>Before.</p>');
	});

	it('shows a paragraph holding inline HTML as its source lines', async () => {
		const html = await renderMarkdown('Text with <kbd>Ctrl</kbd> inside.');
		expect(html).toContain('<pre class="verbatim"><code>Text with &#x3C;kbd>Ctrl&#x3C;/kbd> inside.</code></pre>');
		expect(html).not.toContain('<kbd>');
	});

	it('shows an unknown node type as its source lines', async () => {
		const html = await renderMarkdown('[a]: https://example.org "definition"\n\nText.');
		expect(html).toContain('<pre class="verbatim"><code>[a]: https://example.org "definition"</code></pre>');
	});

	it('keeps code block text unchanged (B1)', async () => {
		const code = '{\n  "a": [1, 2],   "b": "<x>"\n}';
		const html = await renderMarkdown('```json\n' + code + '\n```\n\n```\n  spaced   text\n```');
		const text = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&#x3C;/g, '<').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&#x22;/g, '"');
		expect(text(html)).toContain(code);
		expect(text(html)).toContain('  spaced   text');
		expect(html).toContain('class="shiki');
	});

	it('wraps a table in a focusable, labelled scroll region (B2)', async () => {
		const html = await renderMarkdown('| Term | Meaning |\n|---|---|\n| a | b |');
		expect(html).toMatch(/<div class="table-scroll" role="region" tabindex="0" aria-label="Table: Term, Meaning"><table>/);
	});
});
