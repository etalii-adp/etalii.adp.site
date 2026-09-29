// @ts-check
// First: `--mode reference-versioning-test` points the reference at its versioning fixture (spec 002, quickstart 4).
import './scripts/reference/versioning-mode.ts';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { redirects } from './src/data/redirects.ts';
import { docsSidebar } from './src/data/sidebar.ts';

// The documentation sidebar, shared with the reference pages (src/data/sidebar.ts).
const sidebar = docsSidebar();

export default defineConfig({
	site: 'https://etalii.net',
	base: '/adp',
	trailingSlash: 'always',
	outDir: './dist/adp',
	build: { format: 'directory' },
	redirects,
	integrations: [
		starlight({
			title: 'ADP',
			defaultLocale: 'root',
			locales: { root: { label: 'English', lang: 'en' } },
			favicon: '/favicon.svg',
			pagefind: false,
			pagination: false,
			customCss: ['./src/styles/theme.css', './src/styles/reference.css', './src/styles/article.css'],
			sidebar,
			components: {
				Header: './src/components/Header.astro',
				PageTitle: './src/components/PageTitle.astro',
				Footer: './src/components/Footer.astro',
				SiteTitle: './src/components/Logo.astro',
				ThemeSelect: './src/components/Empty.astro',
			},
		}),
	],
});
