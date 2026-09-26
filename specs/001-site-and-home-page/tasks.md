---
description: "Task list for the site and home page"
---

# Tasks: Site and Home Page

**Input**: Design documents from `specs/001-site-and-home-page/`: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: the spec requires automated checks as part of the feature (FR-012, SC-003, SC-004), so the check suite is built as implementation work in US3 and US4, not as optional TDD tests.

**Organization**: tasks are grouped by user story so each story can be built and checked on its own. All paths are relative to the repository root of the worktree `C:/git/etalii.adp.site-001`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story the task belongs to (US1 to US4)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: replace the GitHub demo files with an Astro + Starlight project that builds.

- [X] T001 Delete the demo files `index.html` and `package.json` at the repository root (spec assumption: "The GitHub demo files are replaced by this feature")
- [X] T002 Create `package.json` with name `etalii-adp-site`, `"private": true`, `"type": "module"`, `"license": "Apache-2.0"`, `"engines": { "node": ">=24" }`, and scripts `dev` (`astro dev`), `build` (`astro build && node scripts/assemble-root.mjs`), `preview` (`sirv dist --port 4321`), `check:links`, `check:pages`, `check` (`npm run check:links && npm run check:pages`); `check:links` and `check:pages` may start as `echo "not yet"` placeholders that later tasks replace
- [X] T003 Install the current stable versions with `npm install astro @astrojs/starlight @fontsource-variable/space-grotesk` and `npm install -D @playwright/test @axe-core/playwright linkinator sirv-cli typescript`, committing the resulting `package-lock.json`
- [X] T004 [P] Create `tsconfig.json` extending `astro/tsconfigs/strict` with `include: [".astro/types.d.ts", "**/*"]` and `exclude: ["dist"]`
- [X] T005 [P] Create `.nvmrc` containing `24` and extend `.gitignore` with `.astro/`, `test-results/`, `playwright-report/` (keep the existing `dist/`, `node_modules/` entries)
- [X] T006 Create `astro.config.mjs` with `site: 'https://etalii.net'`, `base: '/adp'`, `trailingSlash: 'always'`, `outDir: './dist/adp'`, `build: { format: 'directory' }`, and the Starlight integration with `title: 'ADP'`, `defaultLocale` English (`lang: 'en'`), `pagefind: false`, `customCss: ['./src/styles/theme.css']` (research R1, R2, R10)
- [X] T007 Create a minimal `src/content/docs/index.mdx` (title "ADP", `template: splash`) and run `npm run build` to confirm `dist/adp/index.html` is produced; `scripts/assemble-root.mjs` may be an empty module for now

**Checkpoint**: `npm run build` succeeds and writes the site under `dist/adp/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the pieces every story builds on: frontmatter schema, sections, theme, brand, and the shape of the published artifact.

**⚠️ CRITICAL**: no user story work begins until this phase is complete.

- [X] T008 Create `src/data/sections.ts` exporting the parts (`product` → label "Product", start `/adp/`; `documentation` → label "Documentation", start `/adp/docs/`) and the sections in navigation order, typed per data-model "Section": `id` (unique slug), `label`, `part`, `href` (address under `/adp/`), `status` (`available` | `coming`), `deliveredBy` ("required when `status` is `coming`"); initial rows exactly as the data-model table: `home` Home product `/adp/` available 001; `docs` Documentation documentation `/adp/docs/` available 001; `dedl` DEDL reference documentation `/adp/dedl/` coming 002; `designers` Designers documentation `/adp/designers/` coming 003
- [X] T009 Create `src/content.config.ts` defining the `docs` collection with Starlight's `docsLoader()` and `docsSchema({ extend: z.object({ part: z.enum(['product','documentation']), section: z.string().optional() }) })`, and a refinement that `description` is required and non-empty on every page and `section`, when present, is an `id` from `src/data/sections.ts` (data-model "Page")
- [X] T010 [P] Create `src/styles/theme.css` with Starlight colour tokens per research R8: dark scheme (`:root[data-theme='dark']`, the default) background `#15181c`, raised surface `#1e2227`, text `#e6e9ec`, accent `#32cd32`, accent-high `#6ee76e`, dark-gray text on accent buttons; light scheme (`:root[data-theme='light']`) background `#f6f8f7`, text `#16191d`, accent `#16782a`; headings and `.site-wordmark` in `'Space Grotesk Variable'` imported from `@fontsource-variable/space-grotesk`; body keeps Starlight's system font stack
- [X] T011 [P] Copy `src/client/public/favicon.svg` verbatim from `etalii-adp/etalii.adp.ide.standalone` at revision `10704327ea90c2085f6755d13bbe60cb83b8a16b` (use `gh api repos/etalii-adp/etalii.adp.ide.standalone/contents/src/client/public/favicon.svg?ref=10704327ea90c2085f6755d13bbe60cb83b8a16b` and decode the content) to `src/assets/brand/adp-icon.svg` and `public/favicon.svg`, byte for byte (research R9)
- [X] T012 [P] Create `src/assets/brand/SOURCE.md` recording the icon's source record: repository `etalii-adp/etalii.adp.ide.standalone`, path `src/client/public/favicon.svg`, revision `10704327ea90c2085f6755d13bbe60cb83b8a16b`, taken 2026-09-26, method `manual`, licence `none` with the note "publication under Apache-2.0 to be confirmed by the owner before the first deploy" (data-model "Source record")
- [X] T013 Create `src/components/Logo.astro`: the icon from `src/assets/brand/adp-icon.svg` as `<img alt="">`, the wordmark "ADP" in class `site-wordmark`, and the caption "A Different Perspective" beneath it; the whole is one link to `/adp/` whose accessible name is "ADP – A Different Perspective, home" (research R8, R9)
- [X] T014 Wire the brand into `astro.config.mjs`: `favicon: '/favicon.svg'`, and the Starlight `components` override for `SiteTitle` pointing to `./src/components/Logo.astro`; replace `ThemeSelect` with an empty override `src/components/Empty.astro` so the site follows the system scheme (research R10)
- [X] T015 Create `root/index.html` exactly as the "Root redirect page" in [contracts/site-addresses.md](contracts/site-addresses.md): `lang="en"`, viewport meta, title "ADP – A Different Perspective", `<link rel="canonical" href="https://etalii.net/adp/">`, `<meta http-equiv="refresh" content="0; url=/adp/">`, an inline `<style>` using the dark-gray background and light text (and the light-scheme pair under `prefers-color-scheme: light`), and the visible link "Continue to ADP – A Different Perspective"; it loads nothing else (FR-018, research R3)
- [X] T016 Implement `scripts/assemble-root.mjs` (Node, no dependencies): after `astro build`, copy every file in `root/` into `dist/`, copy `dist/adp/404.html` to `dist/404.html`, and exit non-zero with a clear message if `dist/adp/index.html` or `dist/adp/404.html` is missing (research R2)
- [X] T017 Create `src/data/redirects.ts` exporting an empty `Record<string, string>` of old → new addresses (both under `/adp/`), and pass it as `redirects` in `astro.config.mjs` (research R4, data-model "Redirect")

**Checkpoint**: `npm run build` produces `dist/index.html` (redirect), `dist/404.html`, and `dist/adp/` with the logo and green-on-dark-gray theme.

---

## Phase 3: User Story 1 - Understand ADP in one visit (Priority: P1) 🎯 MVP

**Goal**: the home page at `/adp/` says what ADP is, its three focus areas, the four IDE hosts with their state, and where to go next.

**Independent Test**: build, open `dist/adp/index.html` through `npm run preview` at `http://localhost:4321/adp/`, and walk quickstart scenarios 1–4.

- [X] T018 [P] [US1] Take the initial host states by hand: for each of `etalii-adp/etalii.adp.ide.standalone`, `etalii.adp.ide.intellij`, `etalii.adp.ide.vscode`, `etalii.adp.ide.eclipse`, read `README.md` and releases with `gh`, note the `HEAD` commit SHA of the default branch and the visibility; confirm or correct research R7's initial states (standalone `in-progress`, IntelliJ `in-progress`, VS Code `planned`, Eclipse `planned`) and record the evidence in the pull request description
- [ ] T019 [US1] Create `src/data/hosts.yaml` with the four hosts in the fixed order `standalone`, `intellij`, `vscode`, `eclipse`, names "Standalone", "IntelliJ Platform", "Visual Studio Code", "Eclipse", a one-line `summary` each, the `state` from T018, no `link` while the repository is private and `unavailableNote: "Not public yet"`, and a `source` record per host (`repository`, `path: README.md`, `revision` = the 40-hex SHA from T018, `taken: 2026-09-26`, `method: manual`, `licence` = the repository's SPDX id or `none`), valid against [contracts/hosts.schema.json](contracts/hosts.schema.json) (depends on T018)
- [ ] T020 [P] [US1] Create `src/data/focus-areas.yaml` with exactly three records (FR-005): technology assessment (constructive technology assessment), collaboration between humans and agents, and bringing clarity to textual data; each with `id` (unique slug), `name`, `problem` ("one or two sentences: the problem a specialized designer solves there") and `illustration` (a path under `src/assets/illustrations/`)
- [ ] T021 [US1] Add `hosts` and `focusAreas` collections to `src/content.config.ts` using Astro's `file()` loader and zod schemas that enforce data-model "IDE host" and "Focus area": host `id` in `standalone|intellij|vscode|eclipse` and all four present in order; `state` in `available|in-progress|planned`; `link` must be `https://`; `linkLabel` "required with `link`"; `unavailableNote` "required without `link`"; "`state: available` without a public `link` fails the build"; `source.revision` matches `^[0-9a-f]{40}$`; `source.method` in `manual|procedure`; exactly three focus areas (depends on T019, T020)
- [ ] T022 [P] [US1] Draw `src/assets/illustrations/hero.svg`: original abstract artwork (perspective grid receding to a vanishing point, a few nodes and connectors, one rounded frame echoing the icon's square) in the site greens and grays using CSS custom properties so it recolours per scheme, `viewBox` only (no fixed size), under 30 KB, nothing that resembles an editor window, toolbar or diagram canvas (research R11)
- [ ] T023 [P] [US1] Draw `src/assets/illustrations/focus-technology-assessment.svg`, `focus-humans-and-agents.svg` and `focus-textual-clarity.svg`: small abstract SVGs in the same style as T022, one motif per area (for example weighing scales of layered frames; two node clusters meeting; lines of text resolving into a structure), each under 15 KB (research R11)
- [ ] T024 [US1] Create `src/components/FocusAreas.astro`: reads the `focusAreas` collection and renders a list of three cards, each with its illustration as `<img alt="">` (decorative), an `<h3>` with the name and the problem text (US1 AS2)
- [ ] T025 [US1] Create `src/components/HostList.astro`: reads the `hosts` collection and renders the four hosts in order, each with name, summary, the state as a visible text label ("Available", "In progress", "Planned"), and either a link with `linkLabel` or the `unavailableNote` as plain text; below the list, "Host states from the IDE repositories, taken on" followed by the latest `source.taken`" (FR-006, US1 AS3, data-model "Source record", WCAG 1.4.1)
- [ ] T026 [US1] Write the home page `src/content/docs/index.mdx`: `template: splash`, `part: product`, `description` set; a `hero` with the title "A Different Perspective", the tagline catch phrase "The right view for every task.", the image `src/assets/illustrations/hero.svg`, and actions "Read the documentation" → `/adp/docs/` and "Browse the designers" → `/adp/designers/`; then, in order, a "What ADP is" section with one or two sentences stating ADP as specialized diagram, designer and text editors, each tuned for one task where a specialized visualization beats a generic diagram or plain text, never as an architecture tool (FR-004); "Focus areas" with `<FocusAreas />`; "Where ADP runs" with `<HostList />`; and "Source" linking the `etalii-adp` organisation on GitHub and this repository (FR-007, FR-008)
- [ ] T027 [US1] Style the home hero in `src/styles/theme.css`: the hero sits on a dark-gray band in both schemes with a subtle green radial glow and faint grid lines (CSS gradients only, no images), inspired by aspire.dev and speckit.org; focus-area and host cards in a responsive grid that collapses to one column below 50rem (research R8)
- [ ] T028 [P] [US1] Write the documentation start page `src/content/docs/docs/index.mdx`: `part: documentation`, `section: docs`, a short introduction and a list of the documentation sections from `src/data/sections.ts`, each with a one-line description (FR-007, FR-009)
- [ ] T029 [P] [US1] Write the "Coming" pages `src/content/docs/dedl/index.mdx` (`section: dedl`) and `src/content/docs/designers/index.mdx` (`section: designers`), both `part: documentation`: each says in two or three sentences what the section will hold and names the delivering specification (002, 003), and links back to `/adp/docs/`; neither presents itself as complete (US2 AS2, research R6)

**Checkpoint**: the home page is complete and truthful on its own; every link on it resolves inside the build.

---

## Phase 4: User Story 2 - Move between product and documentation (Priority: P1)

**Goal**: one navigation on every page that shows the current part, the sections of both parts, where the page sits, and "Coming" sections, all without scripting.

**Independent Test**: quickstart scenarios 5–8: from every page reach the home page and every section in at most two selections; the part marker and breadcrumbs are right.

- [ ] T030 [US2] Create `src/components/Header.astro` overriding Starlight's `Header`: the logo (`Logo.astro`); a `<nav aria-label="Site parts">` with "Product" (`/adp/`) and "Documentation" (`/adp/docs/`), the current part (from the page's `part` frontmatter) marked with `aria-current="true"` and visibly by underline and weight, not colour alone; a link "Source on GitHub" to `https://github.com/etalii-adp`; Starlight's mobile menu button kept; no search and no theme select; all visible at 360 px without horizontal scroll ([contracts/site-navigation.md](contracts/site-navigation.md) item 2, FR-003, FR-008)
- [ ] T031 [US2] Create `src/components/PageTitle.astro` overriding Starlight's `PageTitle`: on every page except the home page, a `<nav aria-label="Breadcrumb">` above the `<h1>` with part › section › page from `src/data/sections.ts` and the page frontmatter, each level above the current one a link, the current one with `aria-current="page"` (US2 AS3, contract item 4)
- [ ] T032 [US2] Create `src/components/Footer.astro` overriding Starlight's `Footer`: a site map with one list per part and every section from `src/data/sections.ts`, "Coming" beside `status: coming`; "Site text, images and code licensed under Apache-2.0" linking `https://github.com/etalii-adp/etalii.adp.site/blob/develop/LICENSE`; links to this repository and the `etalii-adp` organisation; "ADP icon from etalii-adp/etalii.adp.ide.standalone" (FR-017, FR-008, contract item 6)
- [ ] T033 [US2] Configure the Starlight `sidebar` in `astro.config.mjs` from the documentation-part sections of `src/data/sections.ts`, with `badge: { text: 'Coming', variant: 'caution' }` on `status: coming` entries, and register the `Header`, `PageTitle` and `Footer` overrides in `components` (US2 AS1, AS2, research R6)
- [ ] T034 [US2] Write the 404 page `src/content/docs/404.md` (Starlight's custom 404 page, frontmatter `template: splash`, `part: product`, no `section`): heading "Page not found", one sentence that the address does not exist, links to `/adp/` and `/adp/docs/`; confirm after `npm run build` that `dist/404.html` carries the header, breadcrumbs-free title and footer site map (FR-010, [contracts/site-addresses.md](contracts/site-addresses.md) "Page-not-found page")

**Checkpoint**: every page carries the same chrome; the part marker, breadcrumbs, footer site map and "Coming" badges are correct on all four pages and the 404.

---

## Phase 5: User Story 3 - Published from develop without a manual step (Priority: P2)

**Goal**: a pull request is checked and publishes nothing; a merge into `develop` builds, checks and deploys; a failing build deploys nothing.

**Independent Test**: quickstart "Pull request", "After merge" and "A broken build does not publish".

- [ ] T035 [US3] Replace the `check:links` placeholder in `package.json` with a linkinator run over `dist/` that serves `dist/` at the root, recurses, checks internal links only (skip any URL not on the local server), and fails on any broken link (FR-012, SC-004, research R12)
- [ ] T036 [P] [US3] Create `.github/workflows/ci.yml`: on `pull_request` into `develop`; one job on `ubuntu-latest` with `permissions: contents: read`; steps checkout, `actions/setup-node` with `node-version-file: .nvmrc` and npm cache, `npm ci`, `npx playwright install --with-deps chromium`, `npm run build`, `npm run check`; no Pages permissions and no upload (FR-011, FR-012)
- [ ] T037 [P] [US3] Create `.github/workflows/deploy.yml`: on `push` to `develop` and `workflow_dispatch`; `concurrency: { group: pages, cancel-in-progress: false }`; job `build` with the same steps as `ci.yml` followed by `actions/upload-pages-artifact` with `path: dist`; job `deploy` with `needs: build`, `permissions: { pages: write, id-token: write }`, `environment: { name: github-pages, url: ${{ steps.deployment.outputs.page_url }} }`, step `actions/deploy-pages` with `id: deployment` (FR-011, FR-013)
- [ ] T038 [P] [US3] Delete `.github/workflows/proof-html.yml`, which `ci.yml` replaces (research R12)

**Checkpoint**: a pull request shows build, link and page checks; only `develop` deploys, and only when all pass.

---

## Phase 6: User Story 4 - Read the site on any device (Priority: P2)

**Goal**: every page passes WCAG 2.2 AA automated checks in light and dark, works at phone width and without scripting, and loads nothing from other origins.

**Independent Test**: `npm run check:pages` passes; quickstart scenarios 9–11.

- [ ] T039 [US4] Create `playwright.config.ts`: `testDir: 'tests'`, Chromium only, `webServer` running `npx sirv dist --port 4321` with `url: 'http://localhost:4321/adp/'` and `reuseExistingServer: !process.env.CI`, `use.baseURL: 'http://localhost:4321'`
- [ ] T040 [US4] Create `tests/site.spec.ts`: enumerate every `.html` file under `dist/adp/` (plus `dist/404.html`) at load time and generate, per page: (a) axe via `@axe-core/playwright` with tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa`, run under `colorScheme: 'light'` and `'dark'`, zero violations; (b) at viewport 360 × 800, `document.documentElement.scrollWidth <= window.innerWidth` and the header part links and footer site map are visible; (c) in a context with `javaScriptEnabled: false`, the `<h1>`, the main text, the part links, breadcrumbs (except home) and footer links are present and visible; (d) every request's origin equals the test server's origin (FR-015); (e) `context.cookies()` is empty after load (FR-015); (f) the footer contains "Apache-2.0" (FR-017) (FR-014, SC-003, research R12)
- [ ] T041 [US4] Add address tests to `tests/site.spec.ts` for what can be checked locally per [contracts/site-addresses.md](contracts/site-addresses.md): `/` has a meta refresh to `/adp/`, a canonical `https://etalii.net/adp/` and a visible link; `/404.html` has the site header and footer site map; every page's internal links end in `/` (trailing slash)
- [ ] T042 [US4] Replace the `check:pages` placeholder in `package.json` with `playwright test`, run `npm run build && npm run check`, and fix every failure in `src/styles/theme.css` and the components until all pass (contrast values in research R8 may move to pass; record final values in `src/styles/theme.css` comments)

**Checkpoint**: `npm run check` passes locally over every page in both schemes, at phone width and without scripting.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: the last checks and documentation before the pull request.

- [ ] T043 [P] Measure the home page's first-load transfer (sum of `dist/adp/index.html` and every asset it references) and keep it under 500 KB (plan, Performance Goals); record the figure in the pull request description
- [ ] T044 [P] Update `README.md` with how to run the site locally (`npm ci`, `npm run dev`, `npm run build`, `npm run check`) and where publishing happens (the `deploy` workflow on `develop`)
- [ ] T045 Run every local scenario of [quickstart.md](quickstart.md) (1–11) against `npm run preview` and note the results in the pull request description
- [ ] T046 Ask the owner of `etalii-adp/etalii.adp.ide.standalone` to confirm the ADP icon may be published under this site's Apache-2.0 licence (or to add a licence to that repository), and update `src/assets/brand/SOURCE.md` with the answer; the pull request must not be merged before this is settled (plan, Dependencies; research R9)
- [ ] T047 After the pull request is merged into `develop`, run the "After merge" checks of [quickstart.md](quickstart.md) (`curl` for HTTP→HTTPS, `www`, `/adp` without slash, the root redirect and two 404s) and report the results on the merged pull request

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup; blocks every story.
- **US1 (Phase 3)** and **US2 (Phase 4)**: depend on Foundational. US2's chrome can be built alongside US1; both touch `astro.config.mjs` (T033 after T014/T017) and `src/styles/theme.css` (T027), so those tasks run one at a time.
- **US3 (Phase 5)**: depends on Foundational (a build to check); its `ci.yml` and `deploy.yml` run `npm run check`, which is complete only after US4's T042.
- **US4 (Phase 6)**: depends on US1 and US2 for the pages and chrome it checks.
- **Polish (Phase 7)**: after all stories; T047 after merge.

### Within Each Story

- US1: T018 → T019; T019, T020 → T021; T021, T022, T023 → T024, T025 → T026 → T027; T028, T029 any time after T009.
- US2: T030, T031, T032 → T033 → T034.
- US3: T035 before T036, T037 are useful; T036, T037, T038 in parallel.
- US4: T039 → T040 → T041 → T042.

## Parallel Examples

```text
# Foundational
T010 theme.css | T011 icon copy | T012 SOURCE.md

# User Story 1
T018 host evidence | T020 focus-areas.yaml | T022 hero.svg | T023 focus SVGs
then T028 docs start page | T029 coming pages

# User Story 3
T036 ci.yml | T037 deploy.yml | T038 remove proof-html.yml
```

## Implementation Strategy

### MVP first (User Story 1)

1. Phases 1 and 2.
2. Phase 3: the home page with its data, illustrations and link targets.
3. Stop and validate with quickstart scenarios 1–4 on `npm run preview`.

### Incremental delivery

1. Setup + Foundational → a themed, branded, empty site with root redirect and 404.
2. Add US1 → the home page (MVP).
3. Add US2 → navigation between the parts on every page.
4. Add US3 → CI and publishing from `develop`.
5. Add US4 → the accessibility, phone-width, no-script and privacy checks, all green.
6. Polish, then one pull request into `develop` for the whole feature (the site is not published until this merges).

## Notes

- [P] tasks touch different files and do not depend on an unfinished task.
- Commit after each task or logical group; end agent commit messages with the `Co-Authored-By:` trailer.
- The pull request goes from `features/001-site-and-home-page` into `develop` and is merged with a merge commit.
