// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { redirects } from './src/data/redirects.ts';

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
			customCss: ['./src/styles/theme.css'],
			components: {
				SiteTitle: './src/components/Logo.astro',
				ThemeSelect: './src/components/Empty.astro',
			},
		}),
	],
});
