---

description: "Task list for Designer Catalogue"
---

# Tasks: Designer Catalogue

**Input**: Design documents from `specs/003-designer-catalogue/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md); spec 004's [site-integration contract](../004-content-refresh-procedures/contracts/site-integration.md) and [data model](../004-content-refresh-procedures/data-model.md)

**Tests**: Included. The plan names unit tests for the parsers and state mapping, and post-build checks (research D12); quickstart scenarios 2 and 3 require them.

**Organization**: Tasks are grouped by user story. US1 and US2 are both P1; US1 (the overview) is the MVP.

## Decisions taken at task generation (2026-09-27, owner)

1. **Build on spec 004.** The catalogue consumes what spec 004's procedures write: `sources/catalogue/<host>/`, `sources/screenshots/<host>/`, `sources/hosts/hosts.json` and `procedures/config/states.json`. It does not parse `diagrams.md` or import screenshots itself. This honours 004's site-integration contract ("The plans of specs 001, 002 and 003 MUST honour it").
2. **One state set: 003's seven.** `procedures/config/states.json` is amended to `not-planned, idea, planned, in-progress, prototype, implemented, available` (data-model § State). 004's release cap ("usable above the latest release becomes in progress") is replaced by the rule of research D3: nothing is downgraded, and `available` needs a public install. This is a change to 004's code, made here once 004 is on `develop` (T011).

## Deviations from plan.md that follow from these decisions

The plan, research, data model and quickstart are brought in line in T057.

| Plan says | Tasks do | Why |
|---|---|---|
| `scripts/catalogue/sources/standalone-diagrams.ts`, `screenshots.ts`, `releases.ts` (S1, S2, S4) | Dropped. S1, S2 and S4 are read from 004's `sources/` output | Decision 1 |
| `screenshot-designers.yaml` join key (complexity tracking) | Dropped. 004's `procedures/config/screenshots.json` is the join key | Decision 1; the tracked deviation moves to 004 |
| `src/lib/catalogue/states.ts` holds the mapping | `states.ts` holds labels, ranks and "usable"; the mapping is read from `procedures/config/states.json` | Decision 2, and 004's contract |
| Refresh writes `src/content/catalogue/designers/<vendor>/<type>.json` | Designers are assembled at build time from committed files (`sources/` plus the Notion snapshot and site-owned files) by a content loader; nothing per designer is generated | Keeps one copy of each fact; the build still never reaches the network |
| `catalogue:refresh` | `catalogue:notion` (fetch Notion into `src/content/catalogue/notion.json`) and `catalogue:report` (assemble, report, record the published set) | Only Notion still needs fetching |
| Vitest | `node --test` with Node 24's TypeScript type stripping | No new dependency (principle VI); spec 004 uses `node:test` too |
| `yaml`, `parse5` dependencies | None added; site-owned files are JSON | Principle VI |
| `redirects.yaml` | `src/content/catalogue/redirects.json` | No YAML parser in Node scripts |
| Contract: `whySpecialized`, `task` and `fileFormats` required, non-empty | These may be `null` or empty. The page shows "Not described yet" and the report lists the gap | Notion has no `Why specialized` column yet (D10.4); without this, no designer page could be built |
| The spec 001 skeleton is "not planned yet" | It exists: Astro 7 with Starlight, Playwright with axe (`tests/site.spec.ts`), `src/data/`. Pages use `StarlightPage` | Current `develop` |

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: The user story the task belongs to (US1–US4)
- Every path is relative to the repository root of the worktree `C:\git\etalii.adp.site-003`

## Path conventions

- Build-side catalogue logic (plain, erasable TypeScript, importable by Astro and by Node scripts): `src/lib/catalogue/`
- Components: `src/components/catalogue/`. Pages: `src/pages/designers/`
- Site-owned and Notion-fetched catalogue data (JSON): `src/content/catalogue/`
- Node scripts: `scripts/catalogue/*.ts`, run with `node` (type stripping, no build step)
- Unit tests: `tests/unit/catalogue/*.test.ts` (`node --test`). Fixtures: `tests/unit/catalogue/fixtures/`. Page tests: `tests/catalogue.spec.ts` (Playwright, which already serves `dist/`)

## Common rules for every task

- Read sourced content only from `sources/` (root overridable with `ADP_SOURCES_DIR`, for tests) and `procedures/config/`. Never write under `sources/`; spec 004's procedures own it.
- The build never reaches the network. Only `catalogue:notion` and `catalogue:sync-notion` call the Notion API.
- TypeScript in `src/lib/catalogue/` and `scripts/catalogue/` uses erasable syntax only (no `enum`, no `namespace`, no parameter properties), and imports with `.ts` extensions, so Node can run it directly.
- JSON written by a script is 2-space indented, sorted by `origin` (or `slug` or `id`), and ends in a newline. Running a script twice gives an empty `git diff` the second time.
- No new dependency in `package.json`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: the worktree, scripts, compiler settings and folders.

- [x] **T001** Create the worktree `C:\git\etalii.adp.site-003` on the existing branch `features/003-designer-catalogue` (`git worktree add ../etalii.adp.site-003 features/003-designer-catalogue`), then merge `origin/develop` into it. The branch predates the spec 001 skeleton; merging develop into a feature branch is allowed, the reverse is not. Copy `specs/003-designer-catalogue/tasks.md` from the main worktree if it is not yet on the branch. Check whether spec 004 is on `develop`: `scripts/refresh/run.mjs` and `procedures/config/states.json` exist. Record the answer in the first commit message. Phases 2–6 run against fixtures either way; T011, T047, T048 and T055 need 004.
- [x] **T002** Update `package.json` `scripts`. Add `"catalogue:notion": "node scripts/catalogue/notion.ts"`, `"catalogue:report": "node scripts/catalogue/report.ts"`, `"catalogue:sync-notion": "node scripts/catalogue/sync-notion.ts"`, `"check:catalogue": "node scripts/catalogue/check.ts"` and `"test:catalogue": "node --test \"tests/unit/catalogue/**/*.test.ts\""`. Change `"check"` to `"npm run check:links && npm run check:catalogue && npm run check:pages"`. If spec 004's `"test"` script exists, leave it and add nothing to it.
- [x] **T003** [P] In `tsconfig.json`, add `"compilerOptions": { "allowImportingTsExtensions": true, "erasableSyntaxOnly": true }` beside the existing `extends`.
- [x] **T004** [P] In `playwright.config.ts`, add `testIgnore: 'unit/**'` so Playwright does not pick up the `node --test` files under `tests/unit/`.
- [x] **T005** [P] Create the folders `src/lib/catalogue/`, `src/components/catalogue/`, `src/pages/designers/`, `src/content/catalogue/`, `scripts/catalogue/` and `tests/unit/catalogue/fixtures/`.
- [x] **T006** [P] In `.github/workflows/ci.yml`, add a step `- run: npm run test:catalogue` after `npm ci`, before `npm run build`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the fixtures, the state set, the reading of 004's output and of the Notion snapshot, the site-owned files, the assembly and the content collections. Every page reads the collections this phase defines.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete.

### Fixtures and tests for the foundation

- [x] **T007** [P] Create `tests/unit/catalogue/fixtures/sources/`, shaped exactly like spec 004's output (004 data-model § Designer entry, § Screenshot, § Host state; `source-lock.schema.json`).
  - `catalogue/standalone/catalogue.json` with rows `{ origin, name, group, developState, releaseState, state, theory: [{label, href}], example }`. Include one row per source state: `freeplane/mindmap` Prototype, `wardley/map` Implemented, `generic/timeline` Work-in-progress, `neo4j/cypher` Specified, `ansible/playbook` To-do, `rdf/turtle` Identified. Include one relative `href` and one absolute `href` in `theory`.
  - `catalogue/standalone/source.lock.json` with `licence: "Apache-2.0"`, and 40-hex `commit` and `gitBlob` values.
  - `screenshots/standalone/screenshots.json`, with entries `{ file, origin, expectation, document, bytes, width, height, budgetBytes, status }`: `mindmap.png` accepted, `wardley-map.png` accepted, `timeline.png` rejected. Add real 32×18 PNGs for `mindmap.png` and `wardley-map.png`, generated with a few lines of Node that write a valid PNG. Add a `source.lock.json` whose `licence` is `"unstated"`.
  - `hosts/hosts.json` with the four hosts, `standalone` `in-progress` with `latestRelease: null`, and its lock.
  - `config/states.json` in the seven-state shape of T011.
- [x] **T008** [P] Create `tests/unit/catalogue/fixtures/notion/query-page-1.json` and `query-page-2.json`: a recorded `POST /v1/data_sources/{id}/query` response, split in two with `has_more`/`next_cursor`. Include the rows `freeplane/mindmap`, `wardley/map`, `neo4j/cypher`, `rdf/turtle` and `jgraph/drawio`. `jgraph/drawio` has `IntelliJ` `✅ Implemented` and `Standalone` empty. Add one row without `Origin`. Use every S3 property with its exact name and type ([contracts/source-formats.md](contracts/source-formats.md) § S3): `Name` title, `Origin`, `One line purpose`, `Description`, `Why specialized`, `File extension (if single file)` and `Theory` rich_text, `Type`, `Family`, `Subfamily`, `Standalone`, `IntelliJ`, `VS Code` and `Eclipse` select, `Focus areas` multi_select. Include one unknown `Focus areas` option, `Diagramming practice`. Give `wardley/map` `Standalone` `⚗️ Prototype`, so that it differs from the catalogue. Leave one `One line purpose` empty.
- [x] **T009** [P] Write `tests/unit/catalogue/states.test.ts`:
  - every row of data-model § State maps to its site state and rank;
  - `bestState` is the highest rank over four hosts;
  - `isUsable` is true only for `prototype`, `implemented` and `available`;
  - an unmapped label throws `UnmappedStateError` naming the host and the label;
  - an emoji-prefixed label (`⚗️ Prototype`) and a bare label (`Prototype`) map alike.
- [x] **T010** [P] Write `tests/unit/catalogue/assemble.test.ts` against the fixtures of T007 and T008. Cover each of the following:
  - (a) membership (data-model § Membership): `rdf/turtle` is an Idea; `neo4j/cypher`, `ansible/playbook`, `generic/timeline`, `freeplane/mindmap`, `wardley/map` and `jgraph/drawio` are Designers.
  - (b) Every designer has exactly four `hosts`. `jgraph/drawio` has `intellij` `implemented`, with a `notion` source, and `standalone` `not-planned`.
  - (c) `wardley/map` `standalone` is `implemented`, not `available`, because `hosts.json` has no public release, and its `notionDiffers` is `⚗️ Prototype`.
  - (d) A git SourceRecord is built from a lock entry: `path` = `sourcePath`, `revision` = `commit`, `retrievedAt` = `refreshedAt`, and `licence` `"unstated"` becomes `null`.
  - (e) The screenshots of `freeplane/mindmap` have `publishable: false` because the screenshot lock's licence is `null`. The report lists "screenshot pending" for it.
  - (f) A rejected screenshot (`timeline.png`) is not attached, and it is reported.
  - (g) A designer below Prototype in every host has no screenshots, even if `screenshots.json` names it (FR-007).
  - (h) A relative theory `href` is dropped when the source licence is `null`, and an absolute one is kept, as `{ title, url }`.
  - (i) An empty Notion `One line purpose` falls back to the catalogue `name` and is reported as a gap.
  - (j) An unknown focus-area option is reported, not dropped.
  - (k) A row without `Origin` is reported.
  - (l) A redirect whose `from` is still a live designer is an error.

### Implementation for the foundation

- [ ] T011 Amend `procedures/config/states.json` (spec 004's file; needs 004 on `develop`, otherwise do this last in Phase 2 and use the fixture copy meanwhile).
  - Set `siteStates` to `["not-planned", "idea", "planned", "in-progress", "prototype", "implemented", "available"]`.
  - Set `mappings.standalone` to `{ "Not planned": "not-planned", "Identified": "idea", "Specified": "planned", "To-do": "planned", "Work-in-progress": "in-progress", "Prototype": "prototype", "Implemented": "implemented" }`. Use the same map for `intellij`, `vscode` and `eclipse`, the shared source vocabulary.
  - Keep `hostStates` unchanged; it is spec 001's.
  - In `scripts/refresh/lib/catalogue-table.mjs` and `scripts/refresh/procedures/catalogue.mjs`, replace the release cap: `state` is the mapped `developState`, never downgraded. Keep `releaseState` as recorded.
  - In `scripts/refresh/procedures/hosts.mjs`, count `usableDesigners` as rows at `prototype`, `implemented` or `available`.
  - Update their tests (`catalogue.test.mjs` case (a), `hosts.test.mjs`) to the new rule, and run `npm test` and `npm run refresh:lint`.
  - Say in the commit message that this changes spec 004's behaviour by the owner's decision of 2026-09-27.
- [x] **T012** [P] Write `src/lib/catalogue/types.ts` with the types of data-model.md, keeping every constraint as a doc comment.
  - `SourceRecord`: `kind` `'git' | 'notion'`; git: `repository` `owner/name`, `path`, `revision` "the full 40-character commit SHA"; notion: `page` id, `revision` "the page's `last_edited_time`"; `retrievedAt`; `licence` `string | null`, where "`null` blocks publication".
  - `FocusArea`: `slug`, "kebab-case, unique"; `name`, `problem`, `order`, `source`.
  - `HostId`, `StateId`.
  - `HostAvailability`: `state`, `sourceState`, `localName`; `install`, "present only for `available`"; `build`, `source`, `notionDiffers`.
  - `Screenshot`: `id` "`<host>--<image-basename>`"; `host`, `file`, `caption`, `alt` "non-empty"; `visible`; `whyItMatters`, "required when `publishable` is true"; `width`, `height`, `bytes`, `publishable`, `source`.
  - `Designer`: `origin` "`[a-z0-9.-]+/[a-z0-9.-]+`"; `name`, `kind` `'diagram' | 'designer' | 'editor'`; `purpose` "≤ 140 characters"; `task: string | null`, `whySpecialized: string | null`, `fileFormats`, `family`, `focusAreas`, `theory`, `definition`, `hosts` "exactly four entries", `screenshots`, `sources`.
  - `Idea`, `Redirect` (`from`, `to: string | null`, `reason`, `since`, `source`), and `CatalogueReport` (`gaps`, `disagreements`, `pending`, `membership`), each a list of `{ origin?, host?, message }`.
- [x] **T013** [P] Write `src/lib/catalogue/hosts.ts`: the four hosts in the order of `hostIds` from `src/data/order.ts`, with `name` (Standalone, IntelliJ Platform, Visual Studio Code, Eclipse), `repository` (`etalii-adp/etalii.adp.ide.<id>`) and the Notion column name (`Standalone`, `IntelliJ`, `VS Code`, `Eclipse`).
- [x] **T014** Write `src/lib/catalogue/states.ts`, which makes T009 pass (depends on T012).
  - It defines the seven states with `label` (data-model § State: "Not planned", "Idea", "Planned", "In progress", "Prototype", "Implemented, not yet released", "Available"), `rank` 0–6 and `usable`.
  - `loadMapping(configPath = 'procedures/config/states.json')` reads the file and fails if `siteStates` is not exactly the seven ids in order.
  - `mapSourceState(mapping, host, label)` strips a leading emoji and whitespace, looks up `mappings[host]`, and throws `UnmappedStateError` otherwise.
  - It also exports `bestState(hosts)` and `isUsable(state)`.
- [x] **T015** Write `src/lib/catalogue/sources.ts` (depends on T012). `readSources(root = process.env.ADP_SOURCES_DIR ?? 'sources')` reads, per host, `catalogue/<host>/catalogue.json`, `screenshots/<host>/screenshots.json` and their `source.lock.json`, plus `hosts/hosts.json` and its lock.
  - It returns `{ catalogues: Map<HostId, {rows, lock}>, screenshots: Map<HostId, {entries, lock}>, hosts, gaps }`.
  - A missing host folder is `undefined`, with a gap "no catalogue for <host>". It is not an error.
  - `toSourceRecord(lock, sourcePath)` builds a git SourceRecord as described in T010 (d), and throws if the lock has no entry for that path.
- [x] **T016** Write `src/lib/catalogue/notion-snapshot.ts` (depends on T012).
  - The type `NotionRow`: `{ page, lastEditedTime, origin, name, type, purpose, description, whySpecialized, fileExtension, focusAreas: string[], family, subfamily, theory, hosts: { standalone, intellij, vscode, eclipse }, previousOrigin }`. Every text field is `string | null`.
  - `readNotionSnapshot(path = 'src/content/catalogue/notion.json')` returns `{ retrievedAt, rows }`, or an empty snapshot when the file is missing.
  - `toNotionSourceRecord(row, retrievedAt)` returns a record with `licence: "Apache-2.0"` (data-model § SourceRecord).
- [x] **T017** [P] Create the site-owned files in `src/content/catalogue/`:
  - `focus-areas.json`: the eight focus areas of research D11, in order, as `{ slug, name, problem, order, source: null }`. The first three reuse spec 001's ids and texts from `src/data/focus-areas.yaml` (`technology-assessment`, `humans-and-agents`, `textual-clarity`). The other five are `systems-and-strategy`, `knowledge-and-semantics`, `software-delivery`, `planning-and-roadmapping` and `psychological-and-societal-insights`, with the names of D11 and `problem: ""`, which the report lists as a gap for the owner.
  - `screenshot-notes.json`: `{}`, keyed by screenshot id → `{ "whyItMatters": string }`.
  - `file-formats.json`: `{}`, keyed by extension → `{ "name": string }`.
  - `redirects.json`: `[]`.
  - `published.json`: `[]`, the origins with a page at the last `catalogue:report`.
  - `notion.json`: `{ "retrievedAt": null, "rows": [] }`.
  - `README.md`: which files are site-owned and edited in review, which are written by `catalogue:notion` or `catalogue:report`, and that nothing here is a sourced fact.
- [x] **T018** Write `src/lib/catalogue/assemble.ts`, which makes T010 pass (depends on T014–T017). `assembleCatalogue({ sourcesRoot, configPath, contentDir })` returns `{ designers, ideas, focusAreas, redirects, report }`. It never throws for a gap, only for an unmapped state, a live-origin redirect or a malformed file, and each error message names the file and the origin.
  - **Join**: the origin tag across every host's `catalogue.json` rows and the Notion rows.
  - **Host state**:
    - When the host has a catalogue, `state` is `mapSourceState(developState)`, `sourceState` is the row's label and `source` is that catalogue's lock entry. A host that has a catalogue but no row for the origin is `not-planned`.
    - Otherwise the state comes from the Notion host column, where empty means `not-planned`, with a notion `source`.
    - `implemented` becomes `available` only when `hosts.json` gives that host `state: "available"` with a `link` to a release, and the release's repository licence is not `null`. Then `install` is `{ url: link, label: "Install from <tag>" }`.
    - `notionDiffers` is the raw Notion value when the host has a catalogue and the Notion value maps differently. The difference goes to `report.disagreements`.
  - **Text**:
    - `name` is Notion `Name`, else the catalogue `name`.
    - `kind` is the Notion `Type` in lower case, default `diagram`.
    - `purpose` is Notion `One line purpose`, else the catalogue `name`, with a gap. Over 140 characters is an error naming the origin and the length.
    - `task` is Notion `Description`, `whySpecialized` is Notion `Why specialized`, each `null` with a gap when empty.
    - `fileFormats` comes from `File extension (if single file)`, split on `,` and whitespace, as `{ extension, name: file-formats.json name ?? extension, reads: true, writes: true }`. It is empty, with a gap, when none.
    - `family` is the catalogue `group`; a differing Notion `Family` goes to `report.disagreements`.
    - `focusAreas` maps Notion option names to slugs through `focus-areas.json` `name`. An unknown option is reported.
    - `theory` is the catalogue's `{label, href}` as `{ title, url }`, with a relative `href` resolved to `https://github.com/<repo>/blob/<commit>/docs/<href>`, or dropped when the lock licence is `null`. URLs found in the Notion `Theory` text are added, de-duplicated by URL.
    - `definition` is `null`.
  - **Screenshots** come only from `status: "accepted"` entries, grouped by `origin`, and only when the designer's best state is usable and the screenshot's host is usable. Each is `{ id: "<host>--<basename without .png>", host, file: "<sourcesRoot>/screenshots/<host>/<file>", caption: "<Host name>, at <7-char revision>", alt: expectation, visible: expectation, whyItMatters: screenshot-notes.json[id]?.whyItMatters ?? "", width, height, bytes, publishable, source }`. `publishable` is true only when the licence is not `null` and `whyItMatters` is non-empty. A usable designer without a publishable screenshot goes to `report.pending`.
  - **Membership** follows data-model § Membership: an origin that is in `published.json` and is now neither a designer nor matched by a `redirects.json` entry goes to `report.membership` as "missing, needs a redirect or withdrawal". A Notion `previousOrigin` is offered as a rename.
  - **Sources**: every SourceRecord used, de-duplicated.
- [x] **T019** Extend `src/content.config.ts` (depends on T018).
  - Add a loader `catalogueLoader(part)` that calls `assembleCatalogue()` once per build (memoized in module scope) and `store.set`s the entries of `part`.
  - Add the collections `designers` (id = origin), `ideas` (id = origin), `catalogueFocusAreas` (id = slug) and `catalogueRedirects` (id = from).
  - Their zod schemas follow [contracts/catalogue-data.schema.json](contracts/catalogue-data.schema.json), with the deviations listed above: `task` and `whySpecialized` nullable, and `fileFormats` may be empty.
  - Keep the rules: `purpose` `.max(140)`; `hosts` exactly the four keys; `install` present if and only if `state === 'available'`; `whyItMatters` non-empty when `publishable`; git `revision` `/^[0-9a-f]{40}$/`.
  - Do not touch the existing `docs`, `hosts` and `focusAreas` collections of spec 001.
- [x] **T020** Write `scripts/catalogue/notion.ts` (`npm run catalogue:notion`, S3; depends on T016, T017). Add `tests/unit/catalogue/notion.test.ts`, run with `--fixture` against T008.
  - It sends `POST https://api.notion.com/v1/data_sources/3e7be2fd-05b6-8079-932d-000bfa0609af/query` with `Authorization: Bearer $NOTION_TOKEN`, `Notion-Version: 2025-09-03` and `page_size: 100`, following `next_cursor` until `has_more` is false. It uses Node's `fetch`, with no SDK.
  - It reads the properties of source-formats § S3 into `NotionRow`s.
  - A row without `Origin` is skipped and reported.
  - A text property that is empty keeps the value `notion.json` already holds for that page ("an empty text property leaves the site-side value as it is").
  - An unknown `Focus areas` option is appended to `focus-areas.json` as `{ slug: kebab-case(name), name, problem: "", order: next, source: { kind: "notion", … } }` and reported.
  - A missing column (`Focus areas`, `Why specialized`) is a gap, not an error.
  - It writes `src/content/catalogue/notion.json` sorted by origin, with `retrievedAt`.
  - Flags: `--dry-run` prints the changes and writes nothing; `--fixture <dir>` reads `query-page-*.json` instead of the network.
  - A missing `NOTION_TOKEN` without `--fixture` exits 2, naming the variable, and writes nothing.

**Checkpoint**: `npm run test:catalogue` passes, and `npm run build` succeeds with the collections loaded from `sources/` (or `ADP_SOURCES_DIR=tests/unit/catalogue/fixtures/sources`).

---

## Phase 3: User Story 1 - Find a designer for my task (Priority: P1) 🎯 MVP

**Goal**: `/adp/designers/` lists every designer, grouped by focus area, with name, purpose, thumbnail, origin tag and four host states as text, then the ideas list. Per-facet pages give filtering without scripting, and one optional script combines the filters.

**Independent Test**: build, open `/adp/designers/` with JavaScript disabled, find `freeplane/mindmap` and read its host states. Follow `/adp/designers/hosts/intellij/` (quickstart § 4, steps 1 and 5).

### Tests for User Story 1

- [x] **T021** [P] [US1] Write `tests/catalogue.spec.ts`, section "overview". Derive every expectation from `assembleCatalogue()` over the same inputs as the build, with no hard-coded counts.
  - With `javaScriptEnabled: false`, `/adp/designers/` contains every designer's name, purpose, origin tag and the four host state labels as text (FR-001).
  - Designers are grouped under their focus areas, with "Other designers" last. A focus area with no designers shows "No designers yet".
  - The facet links to every `focus/`, `hosts/` and `states/` page resolve (FR-002).
  - A designer whose best state is not usable has no `<img>` and carries the text "Not yet usable" (US1 AS3).
  - The ideas list comes after the catalogue, holds every idea's name and origin, and has no links to `/adp/designers/<vendor>/<type>/` (FR-014).
  - With JavaScript enabled, checking one host and one state narrows the list and updates the `aria-live="polite"` count.

### Implementation for User Story 1

- [x] **T022** [P] [US1] Write `src/components/catalogue/StateLabel.astro`: the state label as text inside `<span class="adp-state adp-state--<id>">`. Colour is only an addition (WCAG 1.4.1), and the contrast holds in both colour schemes (tokens in `src/styles/theme.css`).
- [x] **T023** [P] [US1] Write `src/components/catalogue/DesignerCard.astro`.
  - It shows the name linked to the designer page, the purpose, the origin in `<code>`, and a `<dl>` of the four hosts with `StateLabel`.
  - The thumbnail is the first publishable screenshot, through `astro:assets` `<Image>` in WebP at no more than 480 px wide, with `loading="lazy"`. The image comes from `import.meta.glob('/sources/screenshots/**/*.png', { eager: true })`, keyed by `file`. There is no image at all when none is publishable.
  - A designer whose best state is not usable adds "Not yet usable".
  - It carries `data-focus`, `data-hosts` (`host:state` pairs) and `data-state` (best state) for the filter.
- [x] **T024** [P] [US1] Write `src/components/catalogue/IdeasList.astro`: a heading "Ideas", one short sentence saying these are candidates not being built, and a list of name, origin and theory links. There are no thumbnails and no page links.
- [x] **T025** [P] [US1] Write `src/components/catalogue/FacetLinks.astro`: three `<nav>` link lists (focus areas in `order`; the four hosts; the states `planned` to `available`) to `/adp/designers/focus/<slug>/`, `/adp/designers/hosts/<id>/` and `/adp/designers/states/<id>/`. It marks the current facet with `aria-current="page"`.
- [x] **T026** [US1] Write `src/components/catalogue/CatalogueFilter.astro`, the only client script (depends on T023). It renders nothing without scripting. With scripting, it inserts a `<fieldset>` of checkboxes per facet and a `<p aria-live="polite">` "N designers shown". It hides non-matching cards with the `hidden` attribute: OR within a facet, AND across facets. It keeps no state across page loads.
- [x] **T027** [US1] Write `src/pages/designers/index.astro` with `StarlightPage` (frontmatter `title: "Designers"`, `description`, `part: "documentation"`, `section: "designers"`) (depends on T022–T026).
  - An intro paragraph; `FacetLinks`; the cards grouped by focus area in `order` (a designer appears under each of its areas), then "Other designers"; `CatalogueFilter`; `IdeasList`.
  - A footer line "Catalogue assembled from" listing each source as `repository@short-revision` (FR-009).
  - Delete `src/content/docs/designers/index.mdx`, which it replaces.
- [x] **T028** [P] [US1] Write `src/pages/designers/focus/[area].astro`: `getStaticPaths` over `catalogueFocusAreas`. It shows the name, the problem statement (when non-empty), `FacetLinks` and the cards of that area, or "No designers yet".
- [x] **T029** [P] [US1] Write `src/pages/designers/hosts/[host].astro`: `getStaticPaths` over the four hosts. It shows the cards grouped by that host's state, from `available` down to `planned`. Designers `not-planned` there are left out, and one line says how many were left out.
- [x] **T030** [P] [US1] Write `src/pages/designers/states/[state].astro`: `getStaticPaths` over `planned`, `in-progress`, `prototype`, `implemented` and `available` only (contracts/site-addresses.md: no `idea` or `not-planned` pages). It shows the cards whose best state is that state.
- [x] **T031** [US1] In `src/data/sections.ts`, set the `designers` section's `status` to `'available'`. In `tests/site.spec.ts`, add `/adp/designers/focus/technology-assessment/` to the pages the build must contain.
- [x] **T032** [P] [US1] In `src/components/FocusAreas.astro`, link each home-page focus-area card's heading to `/adp/designers/focus/<id>/` (the ids are shared with `focus-areas.json`, T017).

**Checkpoint**: `npm run build && npm run check` passes. The overview and facet pages work with scripting off, and axe finds no violations.

---

## Phase 4: User Story 2 - See what a designer does (Priority: P1)

**Goal**: `/adp/designers/<vendor>/<type>/` states the task, why a specialized visualization helps, the file formats, the screenshots with their descriptions, background links, focus areas and sources.

**Independent Test**: open `/adp/designers/freeplane/mindmap/` and say what it does and what file it edits (quickstart § 4, steps 3 and 4).

### Tests for User Story 2

- [x] **T033** [P] [US2] Add a section "designer page" to `tests/catalogue.spec.ts`. For every designer from `assembleCatalogue()`:
  - The page has its name, origin and purpose.
  - It has a "What it is for" section with the task, why a specialized visualization helps and the file formats, or "Not described yet" where they are null or empty (FR-004).
  - Every publishable screenshot is a `<figure>` with non-empty `alt`, a caption naming the host and the short revision, "What is visible" and "Why it matters" (FR-006, FR-012, FR-015).
  - A usable designer without one shows "Screenshot pending".
  - A designer that is not usable has no `<img>` (FR-007).
  - Each focus area links to `/adp/designers/focus/<slug>/` (US2 AS6).
  - The Sources list has one `repository@short-revision` per git SourceRecord, linked to `https://github.com/<repo>/blob/<revision>/<path>`, and "Notion, edited <date>" per Notion record (FR-009).
  - The page carries one `<meta name="adp:source" content="<repo>@<sha>:<path>">` per git source and `<meta name="adp:sourced" content="true">` (spec 004 site-integration § 3).

### Implementation for User Story 2

- [x] **T034** [P] [US2] Write `src/components/catalogue/ScreenshotFigure.astro`.
  - A `<figure>` with `astro:assets` `<Picture>` in WebP, `widths` `[600, 1200]`, `sizes="(max-width: 1240px) 100vw, 1200px"`, `alt` and `loading="lazy"`.
  - A `<figcaption>` holding the caption, then "What is visible:" `visible` and "Why it matters:" `whyItMatters`.
  - A link "Full-size PNG" to the original. Import it with `?url` so it is not loaded with the page.
  - The source licence is stated beside the image ("Licence: <spdx>").
  - It renders only when `publishable` is true.
- [x] **T035** [P] [US2] Write `src/components/catalogue/SourceList.astro`: a list of SourceRecords. A git record is `<a href="https://github.com/<repository>/blob/<revision>/<path>">repository@<7-char revision></a>`, then `path` and the licence, or "no licence, not published" when `null`. A Notion record is "Notion, edited <revision as a date>". A `compact` prop renders one line, for the overview footer.
- [x] **T036** [US2] Write `src/pages/designers/[vendor]/[type].astro` (depends on T034, T035). `getStaticPaths` covers every designer (the redirect stubs are added in T046). It uses `StarlightPage` with `title: name`, `description: purpose`, `part: "documentation"` and `section: "designers"`, and adds to the `head` the `adp:source` and `adp:sourced` metas described in T033. The page holds, in the order of contracts/site-addresses.md § A designer page:
  - (1) the origin and the purpose;
  - (2) a placeholder `<section id="availability">` holding the host states as a list of `StateLabel`s, which T041 replaces with the table;
  - (3) "What it is for": task, why specialized, and a table of file formats (extension, name, reads, writes);
  - (4) "Screenshots": `ScreenshotFigure` for each publishable screenshot, or "Screenshot pending" when the designer is usable and has none, or nothing when it is not usable;
  - (5) "Background": the theory links, then the DEDL definition and a link to `/adp/dedl/` when `definition` is set;
  - (6) "Focus areas", linked to their facet pages;
  - (7) "Sources": `SourceList`.
- [x] **T037** [US2] Add an "Example files" section to `src/content/catalogue/README.md`. It explains that `screenshot-notes.json` holds the site-owned "why it matters" per screenshot id, and that `file-formats.json` names each extension. Both are written in review of a refresh pull request, never by a script.

**Checkpoint**: every designer page builds, passes `npm run check`, and shows sources and metas.

---

## Phase 5: User Story 3 - Know where I can use it (Priority: P2)

**Goal**: an availability table with one row per host, each with its state, local name and an install or build link. Notion's host columns are kept in step with the repositories (FR-017).

**Independent Test**: compare `/adp/designers/freeplane/mindmap/`'s table with `sources/catalogue/*/catalogue.json` and the Notion row. Run `npm run catalogue:sync-notion -- --dry-run` (quickstart § 1, § 4 step 2).

### Tests for User Story 3

- [x] **T038** [P] [US3] Add a section "availability" to `tests/catalogue.spec.ts`.
  - Every designer page has a table with exactly four rows, Standalone, IntelliJ Platform, Visual Studio Code and Eclipse, in that order, never fewer (US3 AS2).
  - Each row has the state label as text.
  - An `available` row has an install link.
  - An `implemented` row says "Not yet released".
  - A `not-planned` or `planned` row says so.
- [x] **T039** [P] [US3] Write `tests/unit/catalogue/sync-notion.test.ts` against the fixtures and a fake `fetch`.
  - For `wardley/map`, `--dry-run` reports `wardley/map · standalone · ⚗️ Prototype → ✅ Implemented` and sends no `PATCH`.
  - Without `--dry-run`, it sends one `PATCH /v1/pages/<id>` with `{ "properties": { "Standalone": { "select": { "name": "✅ Implemented" } } } }`.
  - It never writes a host that has no catalogue (`intellij` for `jgraph/drawio`).
  - An option missing from the Notion select is reported and skipped.
  - It refuses to run when `assembleCatalogue()` throws.

### Implementation for User Story 3

- [x] **T040** [P] [US3] Write `src/components/catalogue/AvailabilityTable.astro`: a `<table>` with a `<caption>` "Availability per IDE host" and the columns Host, State and "How to get it".
  - "How to get it" is `install` as a link (`available`); "Not yet released" (`implemented` or `prototype`); "Planned" or "In progress"; or "Not planned".
  - Add `build` when present.
  - A `localName` that differs from the designer's name is shown as "(called <localName> here)".
  - A `notionDiffers` value is never shown to visitors; it is for the report.
- [x] **T041** [US3] In `src/pages/designers/[vendor]/[type].astro`, replace the placeholder section `availability` with `AvailabilityTable` (depends on T036 and T040).
- [x] **T042** [US3] Write `scripts/catalogue/sync-notion.ts` (`npm run catalogue:sync-notion [--dry-run]`, S3w, research D13), which makes T039 pass.
  - It runs `assembleCatalogue()` and stops if it throws.
  - For every designer and every host that has its own catalogue in `sources/catalogue/<host>/`, it compares the Notion column in `notion.json` with the host's `sourceState`.
  - It reads the select options once with `GET /v1/data_sources/3e7be2fd-05b6-8079-932d-000bfa0609af` and picks the option whose text, after stripping the emoji, equals the stripped `sourceState`.
  - It sends `PATCH /v1/pages/<page>` setting only that select. It writes nothing else in Notion.
  - It prints every change as `origin · host · before → after` and writes them to `.refresh/catalogue-notion-sync.md`, which spec 004's pull request body includes.
  - Afterwards it updates the row's host value in `src/content/catalogue/notion.json`, so `notionDiffers` clears.
  - Add `.refresh/` to `.gitignore` if spec 004 has not.

**Checkpoint**: all four hosts are shown on every page, and a second `catalogue:sync-notion --dry-run` after a real run lists no differences (SC-005).

---

## Phase 6: User Story 4 - Stay current (Priority: P2)

**Goal**: after spec 004's catalogue or screenshot refresh changes `sources/`, `catalogue:report` shows what changed in the catalogue, asks about disappeared origins, and keeps retired addresses resolving.

**Independent Test**: quickstart § 5. Change `wardley/map`'s state in a scratch source branch, run spec 004's catalogue refresh and then `npm run catalogue:report`, and see the change in the pull request.

### Tests for User Story 4

- [ ] T043 [P] [US4] Write `tests/unit/catalogue/report.test.ts` against copies of the fixtures in a temporary folder:
  - (a) changing `wardley/map`'s `developState` to `Prototype` reports `wardley/map · standalone · implemented → prototype`;
  - (b) changing `rdf/turtle` from Identified to Specified reports "moved from ideas to catalogue (standalone: Identified → Specified)";
  - (c) removing `neo4j/cypher`, with it in `published.json`, exits 3 and prints the question "`neo4j/cypher` is no longer in any source. Renamed to (origin) or withdrawn (reason)?" without writing;
  - (d) running with `--withdraw neo4j/cypher --reason "…"` appends `{ from, to: null, reason, since, source }` to `redirects.json` and removes `neo4j/cypher` from `published.json`;
  - (e) `--rename neo4j/cypher=neo4j/graph` appends `{ from, to }`, but only when `neo4j/graph` is a designer;
  - (f) a second run makes no change.
- [ ] T044 [P] [US4] Add a section "redirects" to `tests/catalogue.spec.ts`. For every `catalogueRedirects` entry, the old address returns a page. A rename has `<meta http-equiv="refresh">` to the new address, `rel=canonical` and a visible link. A withdrawal has no refresh, and shows the reason and the date (FR-011).

### Implementation for User Story 4

- [ ] T045 [US4] Write `scripts/catalogue/report.ts` (`npm run catalogue:report [--withdraw <origin> --reason <text>] [--rename <old>=<new>]`), which makes T043 pass.
  - It runs `assembleCatalogue()` over the working tree and over `git show HEAD:` copies of `sources/` and `src/content/catalogue/`, in a temporary folder.
  - It writes `.refresh/catalogue-report.md` with these sections:
    - "State changes": `origin · host · old → new`;
    - "Membership": designers added or removed, ideas ⇄ catalogue moves with the source states;
    - "Screenshots": pending, and not publishable with the reason;
    - "Notion differences": `notionDiffers`;
    - "Gaps": missing texts, empty focus-area problems, hosts without catalogues, missing prerequisites of plan § Dependencies.
  - An origin that disappeared without a redirect exits 3 with the question of T043 (c), offering Notion's `previousOrigin` as the likely rename. It never guesses a rename from similar names (data-model § Redirect).
  - Otherwise it rewrites `published.json` to the current designer origins and exits 0.
- [ ] T046 [US4] Extend `src/pages/designers/[vendor]/[type].astro` so `getStaticPaths` also covers every `catalogueRedirects` entry (depends on T036).
  - A rename renders the stub of contracts/site-addresses.md § Redirect stub inside `StarlightPage`, with `head` metas `refresh`, `canonical` and `robots noindex`, and the text "This designer is now at <link>".
  - A withdrawal renders a normal page with "This designer was withdrawn on <since>: <reason>".
  - Neither page carries `adp:sourced`.
- [ ] T047 [US4] In `procedures/refresh-catalogue.md` and `procedures/refresh-screenshots.md` (spec 004's, template sections kept), add to **Steps**, after Apply and before Verify:
  - `npm run catalogue:notion` (needs `NOTION_TOKEN`; skip with a note in the pull request when it is absent);
  - `npm run catalogue:report`, whose exit 3 is answered like any other decision, through `--withdraw` or `--rename`;
  - after a successful Verify, `npm run catalogue:sync-notion`.
  Add `src/content/catalogue/notion.json`, `published.json`, `redirects.json` and `focus-areas.json` to **Updates**, and include `.refresh/catalogue-report.md` and `.refresh/catalogue-notion-sync.md` in the pull request body. Then run `npm run refresh:lint`.
- [ ] T048 [US4] In `scripts/refresh/procedures/catalogue.mjs` and `screenshots.mjs` (spec 004), add the catalogue files of T047 to the procedure's allowed targets. Check first that no other procedure lists them, since targets never overlap (004 data-model § Procedure). Run `npm test`.

**Checkpoint**: quickstart § 5 passes end to end.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: the post-build catalogue checks, secrets, documentation and validation against the real sources.

- [ ] T049 Write `scripts/catalogue/check.ts` (`npm run check:catalogue`, research D12). It runs over `dist/adp/designers/**/index.html` and uses `assembleCatalogue()` for the expectations. It prints each failure with its page and exits 1 on any.
  - Every designer page has a Sources list and at least one `adp:source` meta, each matching a lock entry (FR-009).
  - Every `<img>` has non-empty `alt` (FR-012).
  - No page of a designer below Prototype in every host has an `<img>` inside `<main>` (FR-007).
  - For each designer page, the bytes of every `<img src>` plus the largest `srcset` candidate of each `<picture><source>`, resolved under `dist/`, total at most 1 048 576. It prints the heaviest page and its total (FR-013).
  - Every `redirects.json` entry has a page at its old address.
  - Every publishable screenshot shown has a non-empty "Why it matters" (FR-015).
- [ ] T050 [P] Write `tests/unit/catalogue/check.test.ts`, which runs `check.ts` over a tiny hand-made `dist/` in a temporary folder with one failing case per rule of T049.
- [ ] T051 [P] Store `NOTION_TOKEN` as a repository secret for spec 004's refresh workflow only (research D9). In `.github/workflows/` (spec 004's refresh workflow), pass it to the catalogue and screenshots jobs as `env: NOTION_TOKEN: ${{ secrets.NOTION_TOKEN }}`. Never pass it to `ci.yml` or `deploy.yml`. Tell the owner that the Notion integration must be shared with the "Diagrams" database (plan § Dependencies).
- [ ] T052 [P] Add a "Designers" row to the documentation index `src/content/docs/docs/index.mdx` if it lists sections by hand, linking `/adp/designers/`.
- [ ] T053 [P] Check phone width and dark mode (quickstart § 4 step 6). In `tests/catalogue.spec.ts`, at a 360 px viewport under `colorScheme: 'dark'`, `/adp/designers/` and `/adp/designers/freeplane/mindmap/` have `document.documentElement.scrollWidth <= 360` and no axe violations.
- [ ] T054 Run `npm run test:catalogue`, `npm run build` and `npm run check` in the worktree, and fix every failure.
- [ ] T055 With spec 004 on `develop`: run `npm run refresh -- catalogue`, `npm run refresh -- screenshots` and `npm run refresh -- hosts` (each `--dry-run` first), then `npm run catalogue:notion` and `npm run catalogue:report`. Check the expectations of quickstart § 1, adjusted for Decision 1:
  - 26 or more designers and 64 or fewer ideas;
  - the listed gaps: no licence for the standalone repository, no draw.io origin tag, no `Why specialized` or `Focus areas` column;
  - Notion and the catalogue disagree;
  - a second run leaves an empty diff.
  Do not commit anything under `sources/` by hand; those files arrive through 004's pull requests.
- [ ] T056 Run quickstart § 4 (visitor scenarios) and § 6 (failure scenarios) against `npm run preview`, and note each result in the pull request description.
- [ ] T057 Amend `specs/003-designer-catalogue/plan.md` (Summary, Technical Context, Project Structure, Complexity Tracking: remove the `screenshot-designers.yaml` row), `research.md` (D3: state the release rule and that the set lives in `procedures/config/states.json`; D12: `node --test`), `data-model.md` (§ Files: the files of T017; the nullable `task` and `whySpecialized`) and `quickstart.md` (commands: `catalogue:notion`, `catalogue:report`, `test:catalogue`; spec 004's `refresh` commands) to match the deviations table at the top of this file. Update `contracts/catalogue-data.schema.json` for the nullable fields.
- [ ] T058 Push `features/003-designer-catalogue` to `origin` and open a pull request into `develop`, to be merged with a merge commit. The body lists the owner decisions of 2026-09-27, the cross-feature changes to spec 004 (T011, T047, T048), and the gaps from `.refresh/catalogue-report.md`, and ends with the Claude Code attribution line.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: no dependencies.
- **Foundational (Phase 2)**: depends on Setup and blocks every story. T011 needs spec 004 on `develop`; until then the fixture `states.json` stands in, and T011 is done before T054.
- **US1 (Phase 3)** and **US2 (Phase 4)**: both depend only on Foundational, and can run in parallel. They share only `tests/catalogue.spec.ts`, where each adds its own `describe` section.
- **US3 (Phase 5)**: T041 depends on T036 (US2's page). The rest depends only on Foundational.
- **US4 (Phase 6)**: T046 depends on T036. T047 and T048 need spec 004 on `develop`. The rest depends only on Foundational.
- **Polish (Phase 7)**: T049–T054 after the stories. T055 needs spec 004 on `develop` and a `NOTION_TOKEN`; T056–T058 follow it.

### Story completion order

```text
Setup ─▶ Foundational ─┬─▶ US1 (overview, MVP) ──────────────┐
                       ├─▶ US2 (designer page) ─┬─▶ US3 ──────┤
                       │                        └─▶ US4 ──────┼─▶ Polish
                       └─ (spec 004 on develop) ─▶ T011, T047, T048, T055
```

### Within each story

Tests first, and they fail; then components ([P]), then pages, then integration.

---

## Parallel Examples

### Foundational

```text
Together: T007 source fixtures, T008 Notion fixtures, T009 states tests, T010 assemble tests, T012 types, T013 hosts, T017 site-owned files
Then:     T014 states.ts, T015 sources.ts, T016 notion-snapshot.ts  →  T018 assemble.ts  →  T019 content.config.ts, T020 notion.ts
```

### User Story 1

```text
Together: T021 overview tests, T022 StateLabel, T023 DesignerCard, T024 IdeasList, T025 FacetLinks, T032 home links
Then:     T026 CatalogueFilter → T027 overview page; T028, T029, T030 facet pages together; T031 sections
```

### User Story 2

```text
Together: T033 page tests, T034 ScreenshotFigure, T035 SourceList
Then:     T036 designer page → T037 README
```

### User Story 3

```text
Together: T038 availability tests, T039 sync tests, T040 AvailabilityTable
Then:     T041 page integration, T042 sync-notion.ts
```

### User Story 4

```text
Together: T043 report tests, T044 redirect tests
Then:     T045 report.ts, T046 stubs → T047 procedure docs → T048 004 targets
```

---

## Implementation Strategy

### MVP first (User Story 1)

1. Phase 1 and Phase 2, against fixtures (`ADP_SOURCES_DIR=tests/unit/catalogue/fixtures/sources`).
2. Phase 3: the overview and facet pages.
3. **Stop and validate**: quickstart § 4 steps 1 and 5, `npm run check`.

### Incremental delivery

1. Foundation, then US1: visitors can see what exists.
2. Add US2: every designer has its own page (with US1, both P1 stories are done).
3. Add US3: the availability table, and Notion kept in step.
4. Add US4: reports and stable addresses, and the catalogue wired into spec 004's procedures.
5. Polish, with real sources once spec 004 is on `develop`, then one pull request into `develop`.

## Notes

- [P] tasks touch different files and depend on no incomplete task.
- Commit after each task or logical group, with the `Co-Authored-By:` trailer naming the model.
- Principle III checkpoints: nothing below Prototype shows an image, `available` needs a public install, all four hosts are always listed, and ideas are kept apart.
