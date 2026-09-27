// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { redirects } from './src/data/redirects.ts';
import { sectionsOf } from './src/data/sections.ts';

// The documentation sidebar, from the documentation-part sections; "Coming" on those not written yet (research R6).
// Links, not slugs: the designer catalogue is made of Astro pages, not docs entries.
const sidebar = sectionsOf('documentation').map((section) => ({
	label: section.label,
	link: section.href,
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
			customCss: ['./src/styles/theme.css'],
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
