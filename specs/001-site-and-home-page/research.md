# Research: Site and Home Page

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-26

Each entry records a decision, why it was made, and what else was considered. Findings were taken on 2026-09-26.

## What is there today

- **This repository** (`etalii-adp/etalii.adp.site`, public, Apache-2.0) holds GitHub's demo files: an `index.html` with one heading, a `package.json` naming `@primer/css`, a `proof-html.yml` workflow that checks the whole repository on every push, and an unrelated `auto-assign.yml` for issues.
- **GitHub Pages** for this repository is already set up: build type `workflow` (deployed by GitHub Actions, not from a branch), custom domain `etalii.net`, domain verified, certificate approved for `etalii.net` and `www.etalii.net`, HTTPS enforced. There is no custom 404 yet.
- **IDE repositories** in `etalii-adp`: `etalii.adp.ide.standalone` (private, no licence, latest release `v0.1.709-alpha`), `etalii.adp.ide.intellij` (private, Apache-2.0, no release), `etalii.adp.ide.vscode` and `etalii.adp.ide.eclipse` (private, no licence, no release). `etalii.adp` (the specifications) is public. So no host has a public install today, and a link to any IDE repository ends in a 404 for a visitor.
- **The ADP icon** is `src/client/public/favicon.svg` in `etalii.adp.ide.standalone`, revision `10704327ea90c2085f6755d13bbe60cb83b8a16b` (2026-08-21): a vertical branch line with two nodes and a curve into a rounded square drawn in lime green, 32 × 32, with its own `prefers-color-scheme` styles (slate in light, near-white in dark). It is proposal 4 ("branch node") of the logo proposals in that repository's `docs/logo-proposals/`.
- **Sibling plans**: spec 003's plan (on its own branch, not merged) assumes Astro, `site: https://etalii.net`, `base: /adp` and addresses under `/adp/designers/`, and leaves the skeleton to this plan. Its research R1 still names Eleventy; the two must agree, and this plan decides (R1). Spec 002 has no plan yet.

## R1. Site generator

- **Decision**: Astro (current stable) with its documentation theme Starlight, static output only.
- **Rationale**: the site is a product site and a documentation site from the start (principle I). Starlight gives the documentation part what it would otherwise need built by hand: sidebar navigation with the current page marked, accessible dark and light themes following the system, a 404 route in the site's own layout, page frontmatter validated by a schema, and splash pages for product pages such as the home page. aspire.dev, one of the two sites named as inspiration, is built with it. Astro emits static HTML and only the scripts a page asks for, so reading without scripting is the default (principle IV). Content collections validate data files such as the host list at build time, which is how the source records of principle II are enforced. Spec 003's plan already assumes Astro.
- **Alternatives considered**: Eleventy 3 (lighter, but the documentation navigation, theming, 404 layout and accessibility work would all be written by hand, and spec 003 would build on that); Jekyll (Pages' native generator, but a Ruby toolchain next to the Node tooling specs 003 and 004 need); hand-written HTML (no shared layout, every page repeats the navigation).

## R2. Serving the whole domain from one Pages site

- **Decision**: build Astro with `site: 'https://etalii.net'`, `base: '/adp'`, `trailingSlash: 'always'` and `outDir: './dist/adp'`. A post-build step (`scripts/assemble-root.mjs`) writes `dist/index.html`, a redirect to `/adp/`, and copies `dist/adp/404.html` to `dist/404.html`. The deploy workflow uploads `dist/` as the Pages artifact.
- **Rationale**: the spec's review decision asks for one site if possible, and it is: GitHub Pages serves the artifact at the domain root, so `dist/adp/` appears at `/adp/` and `dist/index.html` at `/`. Pages serves the root `404.html` for every missing address on the domain, inside `/adp/` or outside it, so one page covers FR-010 and the last edge case; its links and assets are absolute under `/adp/`, so it works at any depth. The remaining edge cases are handled by Pages itself: it redirects `http://` to `https://` (HTTPS is enforced), `www.etalii.net` to `etalii.net` (both are on the certificate) and `/adp` to `/adp/` (a directory).
- **Alternatives considered**: a second repository for the root (ruled out by the constitution: this repository alone holds the domain); a JavaScript redirect at the root (fails without scripting); publishing the site at the root and redirecting `/adp` (contradicts FR-001).

## R3. The root redirect

- **Decision**: `root/index.html` is a minimal HTML page with `<meta http-equiv="refresh" content="0; url=/adp/">`, `<link rel="canonical" href="https://etalii.net/adp/">`, a visible link to `/adp/` and the same colour tokens as the site, so the one frame it may show is not a flash of white.
- **Rationale**: GitHub Pages cannot send an HTTP 301 for a path, so an immediate meta refresh is the only redirect that works without scripting. The canonical link tells search engines where the content lives. The visible link covers browsers that block meta refresh.
- **Alternatives considered**: JavaScript `location.replace` (requires scripting); a full landing page at the root (a second page to maintain for no requirement).

## R4. Moved pages

- **Decision**: moved addresses are listed in `src/data/redirects.ts` and passed to Astro's `redirects` option, which in static output writes a page at the old address with a meta refresh and a canonical link to the new one. The list is empty in this feature.
- **Rationale**: covers the "old link" edge case with the same mechanism the catalogue will use for moved designers (spec 003), and keeps every moved address in one reviewed file.
- **Alternatives considered**: hand-written stub pages (spread across the tree, easy to forget).

## R5. Navigation that works without scripting at phone width

- **Finding**: Starlight's sidebar is behind a menu button at narrow widths, and that button needs scripting. Without scripting, the sidebar is not reachable on a phone.
- **Decision**: the navigation a visitor needs to reach every page is in plain HTML that is visible at every width: the header holds the logo (a link to the home page) and the two part links, Product and Documentation, with `aria-current` on the current part; a breadcrumb trail above each page title shows where the page sits and links to each level above; the footer holds a site map listing every top-level section of both parts, with "Coming" beside those not yet written. The sidebar stays as an enhancement for the documentation part.
- **Rationale**: FR-014 and US4 AS1 require all navigation reachable at phone width with scripting off; FR-003 and US2 AS1 require the part to be visible; US2 AS3 requires the levels above to be visible and reachable; SC-005 (two selections) holds because the footer site map reaches every top-level section in one.
- **Alternatives considered**: a `<details>` menu replacing Starlight's mobile menu (reachable, but a heavier override of Starlight internals than the header and footer overrides, which Starlight supports by design).

## R6. Sections without content yet

- **Decision**: `src/data/sections.ts` lists the top-level sections of both parts with a `status` of `available` or `coming`. A section marked `coming` has a short page at its address that says what it will hold and which specification delivers it, and the header, sidebar and footer show a "Coming" badge beside it. In this feature, DEDL reference (`/adp/dedl/`) and Designers (`/adp/designers/`) are `coming`; specs 002 and 003 flip them to `available` when they replace the pages.
- **Rationale**: US2 AS2 allows hidden or clearly marked; marking is chosen because FR-007 requires the home page to link to the designer catalogue now, and a link to a hidden page is worse than a link to an honest "coming" page (principle III).
- **Alternatives considered**: hiding the sections (FR-007's link would then have no target); an empty page (forbidden by US2 AS2).

## R7. IDE host states and links

- **Decision**: `src/data/hosts.yaml` holds the four hosts in a fixed order (standalone, IntelliJ Platform, Visual Studio Code, Eclipse) with a state from the spec's set (`available`, `in-progress`, `planned`), an optional public link and a source record. A host links to its install page only when the target is public; otherwise the home page states "Not public yet" as text. The initial take is made by hand from each IDE repository's README and releases at a recorded revision (see plan, Complexity Tracking); spec 004 replaces the hand take with a procedure.
- **Initial states** (taken 2026-09-26, to be confirmed against each repository's README when the data file is written): standalone `in-progress` (an alpha release exists but is not public), IntelliJ Platform `in-progress` (two designers, install from disk, no public release), Visual Studio Code `planned`, Eclipse `planned`.
- **Rationale**: FR-006 and the edge case "no public install yet: say so"; principle III forbids linking a visitor to something they cannot reach or claiming availability that does not exist. The state is shown as a text label, never as colour alone (WCAG 1.4.1).
- **Alternatives considered**: linking the private repositories (every link would be a 404 for a visitor); linking the `etalii-adp` organisation page instead (FR-008 already requires that link, in the header and footer).

## R8. Look and feel

- **Decision**: a dark-gray and green identity, dark scheme first. Starlight's colour tokens are set in `src/styles/theme.css`:
  - Dark scheme: background near-black gray (`#15181c`), raised surfaces a step lighter (`#1e2227`), body text `#e6e9ec`, accent lime green (`#32cd32`, the icon's own green) with a lighter tint for links on dark (`#6ee76e`) and dark-gray text on green buttons.
  - Light scheme (followed when the system asks for it, FR-014): off-white background (`#f6f8f7`), text `#16191d`, accent a deep green (`#16782a`) that keeps 4.5:1 on the background.
  - The home page hero sits on a dark-gray band in both schemes, with a subtle green radial glow and grid lines, echoing aspire.dev's hero and speckit.org's terminal-dark look.
  - Every pairing is checked by axe in both schemes; the values above are starting points and may move to pass.
- **Logo**: the ADP icon (R9) beside the wordmark "ADP" set in Space Grotesk (variable, SIL OFL 1.1, self-hosted through `@fontsource-variable/space-grotesk`), with "A Different Perspective" as a small caption under it. Headings use the same display font; body text keeps Starlight's system font stack.
- **Catch phrase** (draft, for review in the pull request): "The right view for every task." It sits under the hero title; the one- or two-sentence statement of FR-004 follows it.
- **Rationale**: the review asked for green on dark gray, the existing icon with a strong font and a catch phrase, and aspire.dev and speckit.org as references. Space Grotesk is geometric with a technical edge, reads well at display sizes and is freely licensed. Self-hosting keeps FR-015.
- **Alternatives considered**: a web font from a CDN (a third-party request, FR-015); a wordmark drawn as SVG outlines (harder to change, and text in an image needs its own alt text); dark scheme forced for everyone (FR-014 requires the light scheme too).

## R9. The ADP icon

- **Decision**: copy `favicon.svg` verbatim from `etalii.adp.ide.standalone` at the revision above to `src/assets/brand/adp-icon.svg` and to `public/favicon.svg`, with `src/assets/brand/SOURCE.md` recording repository, path, revision, date and licence. The header shows it as an `<img>` with `alt=""` beside the text "ADP", so the link's accessible name is the text.
- **Rationale**: principle II (the site does not redraw what a source owns). The icon's own `prefers-color-scheme` styles match the site's colour scheme because the site follows the system scheme and has no manual theme switch (R10).
- **Open item**: the source repository is private and has no licence, so publishing the icon under this site needs its owner's confirmation or a licence on the source repository. This is listed in the plan's dependencies and must be settled before the first deploy.
- **Alternatives considered**: redrawing the icon in the site (retyping, principle II); another logo proposal (the review said "we have an icon already").

## R10. Scripts the site keeps and drops

- **Decision**: keep Starlight's own small scripts (mobile menu, table-of-contents highlight, theme detection), which enhance pages that are complete without them. Turn off Pagefind search (`pagefind: false`) and replace the theme selector with nothing, so the site follows the system colour scheme.
- **Rationale**: search has no requirement yet and would add an index and a script (principle VI); a manual theme switch would put the site and the icon's own scheme out of step (R9) and adds state in local storage for no requirement.
- **Alternatives considered**: keeping the theme selector (conflicts with R9); keeping search (no requirement; a later spec can add it).

## R11. Illustrations

- **Decision**: a hero illustration and one small illustration per focus area, drawn as original SVG for the site (abstract: perspective grids, nodes and connectors, layered frames echoing the icon), in the site's green and gray, stored under `src/assets/illustrations/` under Apache-2.0. They are decorative (`alt=""`) because the text beside each carries the meaning; none imitates an editor window, a toolbar or a diagram editor's canvas.
- **Rationale**: the review asked for "fancy images, even if placeholders"; principle III forbids mock-ups presented as the product, so the art is abstract and never framed as a screenshot. SVG keeps them light (the 500 KB budget), sharp at every size and recolourable per scheme with CSS custom properties.
- **Alternatives considered**: AI-generated raster images (heavy, and easily read as product shots); real screenshots (none are public yet; spec 003 brings them with their sources).

## R12. Checks and publishing

- **Decision**:
  - `npm run build` runs `astro build` and then `scripts/assemble-root.mjs`. Astro's content collections fail the build on a host or focus area without its required fields and source record.
  - `npm run check` runs `check:links` (linkinator over `dist/`, internal links only, recursive, served from the domain root so `/adp/…` resolves) and `check:pages` (Playwright). The Playwright suite serves `dist/` with `sirv-cli` at the domain root and, for every HTML file in `dist/`: runs axe with the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` in the light and dark schemes; at 360 px width, asserts no horizontal scroll and that the header part links and footer site map are visible; with scripting disabled, asserts the heading, main text and navigation links are present; records every request and fails on any to another origin; asserts no cookies are set; asserts the Apache-2.0 notice in the footer. It also asserts the addresses of [site-addresses.md](contracts/site-addresses.md) that can be tested locally (root redirect, 404 layout, trailing slash).
  - `ci.yml` runs on every pull request into `develop`: `npm ci`, `npm run build`, `npm run check`. It has no Pages permissions, so it cannot publish (FR-011, FR-012).
  - `deploy.yml` runs on every push to `develop` and on manual dispatch: the same three commands, then `actions/upload-pages-artifact` with `dist/` and `actions/deploy-pages`, with `concurrency: pages` so deploys never overlap. If any step before the upload fails, no artifact is deployed and the previously published site stays (FR-013).
  - `proof-html.yml` is removed; it checked the repository's source files, not the built site.
- **Rationale**: one set of commands for agents and CI (principle V); the constitution's merge gate (site builds; links, accessibility and source records pass) becomes CI's required checks. HTTPS, `www` and `/adp` without slash are properties of the Pages configuration, verified after deploy by the quickstart, not in CI.
- **Alternatives considered**: lychee for links (fast, but a separate binary agents must install; linkinator comes with `npm ci`); pa11y-ci for accessibility (runs axe too, but a second browser setup next to the Playwright one the other checks need); deploying from a `gh-pages` branch (a second branch to keep, and Pages is already set to deploy from a workflow).
