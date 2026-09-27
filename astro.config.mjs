// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { redirects } from './src/data/redirects.ts';
import { sectionsOf } from './src/data/sections.ts';

// The documentation sidebar, from the documentation-part sections; "Coming" on those not written yet (research R6).
const sidebar = sectionsOf('documentation').map((section) => ({
	label: section.label,
	slug: section.href.replace(/^\/adp\//, '').replace(/\/$/, ''),
	...(section.status === 'coming' ? { badge: { text: 'Coming', variant: /** @type {const} */ ('caution') } } : {}),
}));

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
			customCss: ['./src/styles/theme.css', './src/styles/reference.css'],
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
