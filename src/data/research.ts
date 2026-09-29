/**
 * The research articles under /adp/docs/research/, for the sidebar (Peter, 2026-09-29): every page in that folder but
 * its index, titled by its frontmatter, in the order the index lists them; one the index does not list yet follows,
 * by title. Read from the files because the sidebar is built before the content collections are.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const FOLDER = join('src', 'content', 'docs', 'docs', 'research');

export interface ResearchArticle {
	title: string;
	/** Address under /adp/, ending in a slash. */
	href: string;
}

function titleOf(source: string): string {
	const title = /^---\r?\n[\s\S]*?^title:\s*(.+?)\s*$/m.exec(source)?.[1];
	if (!title) throw new Error('A research article has no title in its frontmatter.');
	return title.replace(/^(['"])(.*)\1$/, '$2');
}

export function researchArticles(): ResearchArticle[] {
	const index = readFileSync(join(FOLDER, 'index.mdx'), 'utf8');
	const articles = readdirSync(FOLDER)
		.filter((file) => /\.mdx?$/.test(file) && !/^index\.mdx?$/.test(file))
		.map((file) => ({ title: titleOf(readFileSync(join(FOLDER, file), 'utf8')), href: `/adp/docs/research/${file.replace(/\.mdx?$/, '')}/` }));
	const listed = (article: ResearchArticle) => {
		const at = index.indexOf(`(${article.href})`);
		return at < 0 ? Number.POSITIVE_INFINITY : at;
	};
	return articles.sort((a, b) => listed(a) - listed(b) || a.title.localeCompare(b.title));
}
