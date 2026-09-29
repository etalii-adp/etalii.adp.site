// @ts-check
// First: `--mode reference-versioning-test` points the reference at its versioning fixture (spec 002, quickstart 4).
import './scripts/reference/versioning-mode.ts';
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { redirects } from './src/data/redirects.ts';
import { sectionsOf } from './src/data/sections.ts';

// The documentation sidebar, from the documentation-part sections; "Coming" on those not written yet (research R6).
// Links rather than docs slugs, because some sections (the DISL and DID reference, the tool catalogue) are pages
// outside the docs collection; Starlight adds the base (/adp) to a sidebar link itself. A section with a parent is
// indented under it by the adp-sidebar-child class (theme.css).
const sidebar = sectionsOf('documentation').map((section) => ({
	label: section.label,
	link: section.href.replace(/^\/adp\//, '/'),
	...(section.parent ? { attrs: { class: 'adp-sidebar-child' } } : {}),
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
