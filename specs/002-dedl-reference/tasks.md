---

description: "Task list for the DEDL Reference"
---

# Tasks: DEDL Reference

**Input**: Design documents from `specs/002-dedl-reference/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: The plan asks for Vitest unit tests over a pinned fixture of the source (plan "Testing", research D16) and for `check:reference` after the build. Both are included. Unit tests are written first within their phase and must fail before the code they cover exists.

**Organization**: Tasks are grouped by user story so that each story can be built and checked on its own. Search (FR-014, FR-020) serves the reader of US1 and is its own phase after US4, labelled [US1], so the MVP does not wait for it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: the user story a task belongs to (US1–US4)
- Every task names the file it changes

## Path Conventions

One project, a static Astro site with its scripts beside it (plan "Project Structure"): `src/`, `scripts/`, `tests/` at the repository root, built under `base: '/adp'`. All routes are parameterised by `[language]` so a second language (D17) needs data, not code.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: bring spec 001's skeleton into this branch and add what the reference needs on top of it.

- [ ] T001 Gate: confirm that spec 001's site skeleton is on `develop` (Astro project with `base: '/adp'` in `astro.config.mjs`, the site layout under `src/layouts/`, documentation navigation, CI with site-wide link and WCAG 2.2 AA checks), then merge `develop` into `features/002-dedl-reference`. If it is not on `develop`, stop and report that this feature is blocked on spec 001 (plan "Dependencies on other work"); do not build a skeleton here.
- [ ] T002 Add the reference's dependencies to `package.json` (plan "Primary Dependencies"): `remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-stringify`, `github-slugger`, `mdast-util-to-string`, `unist-util-visit`, `rehype-mermaid`, `ajv`, `ajv-formats`; dev dependencies `playwright`, `pagefind`, `vitest`, `tsx`. Add scripts `test` (`vitest run`), `reference:refresh` (`tsx scripts/reference/refresh.ts`), `check:reference` (`tsx scripts/reference/check.ts`), and a post-build step that runs Pagefind over the build output (D12).
- [ ] T003 [P] Create `src/content/reference/languages.json` with one entry, valid against `$defs/Languages` in [contracts/reference-data.schema.json](contracts/reference-data.schema.json): `id` `dedl` (pattern `^[a-z]+$`, not one of `designers`, `search`, `pagefind`), `name` "DEDL — Diagram Editor Definition Language", `short` "DEDL", `repository` `etalii-adp/etalii.adp`, `branch` `develop`, `path` `specifications/dedl`, `prose` `DEDL-specification.md`, `schema` `dedl.schema.json`, `schemaAddress` `/dedl/schema/{version}/{schema}`.
- [ ] T004 [P] Create `src/lib/reference/types.ts` with TypeScript types `Language`, `Version`, `SourceRecord`, `FileRecord` mirroring [contracts/reference-data.schema.json](contracts/reference-data.schema.json), with each constraint quoted in a doc comment: `version` `^\d+\.\d+(\.\d+)?$`; `date` format `date`; `revision` `^[0-9a-f]{40}$`; `licence` required, `minLength` 1; `copyright` string or null; `files` `minItems` 2; `role` one of `prose`, `schema`, `definition`, `document`, `other`; `sha256` `^[0-9a-f]{64}$`; `name` `^[^/\\]+$`. Also the derived types `Page`, `Heading`, `Link`, `SchemaDefinition`, `Example`, `Visual`, `Screenshot` from [data-model.md](data-model.md) "Derived entities".
- [ ] T005 [P] Create the pinned test fixture `tests/reference/fixtures/dedl-aaef333/`: download the six files of `specifications/dedl/` from `etalii-adp/etalii.adp` at revision `aaef3334992b1b70bc6728b793d2f63bb71a40cb` with `gh api` (byte for byte, no line-ending conversion; add a `.gitattributes` rule `tests/reference/fixtures/** -text`), and write `tests/reference/fixtures/dedl-aaef333/source.json` in the `Version` shape with `licence` `NOASSERTION`, plus a `tests/reference/fixtures/README.md` saying the fixture is for tests and development builds only and is never published.
- [ ] T006 [P] Create `vitest.config.ts` that runs `tests/**/*.test.ts`, and add `npx playwright install chromium` (with its browser cache) to the site's CI build workflow under `.github/workflows/` created by spec 001 (research D10, "Cost").

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: read snapshots, split the prose into pages with GitHub heading ids, render it faithfully, and bring content in only through the refresh. Every story builds on this.

**⚠️ CRITICAL**: no user story work begins until this phase is complete.

### Tests for the foundation

- [ ] T007 [P] Write `tests/reference/anchors.test.ts` against the fixture: heading ids equal `github-slugger` output (e.g. `510-snap-rules`, `51-concepts`); page slugs drop the leading number and collapse runs of `-` (`## 4. Layer 1 — Metamodel` → `layer-1-metamodel`, `## Appendix C — Glossary` → `appendix-c-glossary`); numbers `5.10` and `A.2` are found; a slug equal to `latest`, `schema`, `search` or `examples` throws; two headings with the same slug throw, naming both.
- [ ] T008 [P] Write `tests/reference/split.test.ts` against the fixture: version `0.1`, status `Working Draft`, date `2026-09-25`; one cover page plus 21 section pages (17 sections, appendices A–D), 22 in total; every H2 after `## Table of contents` lands on a page (SC-001); the hand-written table of contents is not rendered (S2); thematic breaks directly before a split are dropped and others kept (S4); `informative` is true for headings ending `*(informative)*`; `prev`/`next` follow document order.
- [ ] T009 [P] Write `tests/reference/verbatim-fallback.test.ts`: every node type in the allowlist of [contracts/rendering-rules.md](contracts/rendering-rules.md) renders normally; raw HTML and an unknown node type render as their original source lines in `<pre class="verbatim">` with the note "Shown as written in the source." (B4); code block text is unchanged (B1); a table is wrapped in a focusable, labelled scroll region (B2).
- [ ] T010 [P] Write `tests/reference/refresh.test.ts` with the GitHub calls mocked: missing licence → exit `1`, "source has no licence", nothing written; version in the prose differs from the schema `$id` or an example's `$schema` → exit `1`, "schema version or address mismatch", nothing written; unreachable source → exit `1`, nothing written (FR-013); same revision and hashes as the existing snapshot → exit `3`; new version → a new folder is added and older ones are untouched; an unclassifiable file is stored as `other` and listed in the report.

### Implementation of the foundation

- [ ] T011 Implement `src/lib/reference/load.ts`: read `languages.json`; list the version folders of each language under the content root (default `src/content/reference`, overridden by the environment variable `REFERENCE_CONTENT_DIR` so development builds and tests can use the fixture before a licensed snapshot exists); validate each `source.json` against `$defs/Version` with `ajv`; verify every file's SHA-256 against `source.json` and fail naming the file on a mismatch; order versions numerically and expose the latest.
- [ ] T012 Implement `src/lib/reference/anchors.ts` to pass T007: heading ids with `github-slugger` over the source heading text (S5), leading numbers (`5.10`, `A.2`), page slugs per research D4, the reserved-slug and uniqueness failures, the anchor map (`id → page`) and the number map (`number → Heading`).
- [ ] T013 Implement `src/lib/reference/split.ts` to pass T008: parse the prose with `remark-parse` and `remark-gfm`; read version and status from `**Specification, version <v> (<status>)**` and the date from the metadata table's `Date` row; apply rules S1–S4 of [contracts/rendering-rules.md](contracts/rendering-rules.md); produce `Page` records with `kind`, `slug`, `title`, `number`, `informative`, `prev`, `next` and `headings`; fail the build naming the heading when a top-level H2 matches neither `## <n>. <title>` nor `## Appendix <X> — <title>`.
- [ ] T014 Implement `src/lib/reference/rehype-verbatim-fallback.ts` to pass T009: the node-type allowlist and the verbatim fallback (B4, research D7).
- [ ] T015 Implement `src/lib/reference/render.ts`: the unified pipeline for one page (`remark-parse` → `remark-gfm` → remark plugins → `remark-rehype` → rehype plugins → `rehype-stringify`), with the verbatim fallback, build-time Shiki highlighting of `json` code blocks (B1), and the table scroll region with `tabindex="0"`, `role="region"` and an `aria-label` naming the table (B2). Expose ordered slots for the remark and rehype plugins that later phases add.
- [ ] T016 Create `src/components/reference/ReferenceLayout.astro` (wrapping spec 001's site layout; `<main data-pagefind-body>`; slots for table of contents, banner, provenance and reverse links) and `src/components/reference/Toc.astro` (the generated table of contents of a version: cover, 17 sections, appendices A–D, with the current page marked by `aria-current="page"`).
- [ ] T017 Add the reference styles in `src/styles/reference.css` (or the stylesheet location spec 001 uses): table scroll regions that never make the page scroll sideways at 360 px, visible focus on the region, `pre.verbatim` with its note, light and dark schemes.
- [ ] T018 Implement `scripts/reference/refresh.ts` to pass T010, per [contracts/refresh-cli.md](contracts/refresh-cli.md): arguments `<language> [--revision <sha-or-ref>] [--dry-run]`; resolve the revision to 40 hex characters; download every file of the language's `path` through the GitHub contents API and the licence through the licence API; run the S1 checks of [contracts/source-inputs.md](contracts/source-inputs.md); classify each file's `role` from its extension and `$schema` (`…/$defs/Definition` → `definition`, `…/$defs/Document` → `document`); write `source.json` (with `retrieved`) and the files to a temporary folder, then move it into `src/content/reference/<language>/<version>/` in one step; exit `0` changed, `1` failed with nothing written, `3` current.
- [ ] T019 Add the Markdown report to `scripts/reference/refresh.ts`: language and version before and after (`new version` when added), revision before and after with compare links, changed files with sizes before and after, sections added, removed and changed (from `split.ts` heading lists of the old and new prose), and warnings.
- [ ] T020 Create `scripts/reference/check.ts` with the command frame of [contracts/refresh-cli.md](contracts/refresh-cli.md): read `dist/`, run registered checks, print each failure as `CHECK <name>: <what> (<where>)`, print warnings without failing, exit `0` or `1`. Register the licence check: every snapshot's `source.licence` is set (research D14). Later phases register their checks here.
- [ ] T021 Run `npm run reference:refresh -- dedl` against the real source and record the result in the pull request description. Today it must end in exit `1`, "source has no licence" (quickstart 1b), with `git status` clean. Once `etalii-adp/etalii.adp` has a `LICENSE`, rerun it and commit the snapshot it writes under `src/content/reference/dedl/0.1/`; never write or edit files there by hand.

**Checkpoint**: snapshots load and verify, the prose splits into 22 pages, and the refresh behaves as its contract says. Development builds use `REFERENCE_CONTENT_DIR=tests/reference/fixtures`.

---

## Phase 3: User Story 1 — Read the specification section by section (Priority: P1) 🎯 MVP

**Goal**: the specification as a cover page and one page per section and appendix, with a table of contents on every page, previous and next links, working cross-references, glossary links and marked normative key words.

**Independent Test**: build the reference for 0.1 and navigate from the table of contents to every section and back; follow `(12.3)` to "12.3 Contexts"; see bold **MUST** marked and plain "must" not (quickstart 3).

### Tests for User Story 1

- [ ] T022 [P] [US1] Write `tests/reference/link-references.test.ts` against the fixture: T1 rewrites `[text](#anchor)` to `<page>/#anchor`; T2 links only the number in `(12.3)`, `(12.3 step 9)`, `(see 5.8)`, `section 10`, `sections 5 and 6`, `Appendix B`, `Appendix B.7`, and leaves a number without a matching heading unlinked; T4 links only the first whole-word, case-insensitive occurrence per page of each Appendix C term, never in headings, links, code or Appendix C itself; nothing inside code, headings or existing links is touched; the text of every node is unchanged; each link is recorded in the graph with `from`, `to`, `kind` and `text`.
- [ ] T023 [P] [US1] Write `tests/reference/keywords.test.ts`: a `<strong>` whose whole text is one of MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, OPTIONAL gets `class="kw"`; `<strong>MUST be</strong>`, a plain "must" and a key word in code do not; the fixture has 14 marked occurrences.

### Implementation for User Story 1

- [ ] T024 [US1] Implement `src/lib/reference/remark-link-references.ts` to pass T022: rules T1, T2 and T4 of [contracts/rendering-rules.md](contracts/rendering-rules.md), using the anchor and number maps of `anchors.ts` and the glossary terms read from Appendix C's bold first column (warn when Appendix C is not a two-column table, source-inputs S1), and building the link graph (`Link` in [data-model.md](data-model.md)). Leave an extension point for T3 (schema) and example links, which US3 adds.
- [ ] T025 [P] [US1] Implement `src/lib/reference/rehype-keywords.ts` to pass T023 (rule T5, research D6), and style `strong.kw` in `src/styles/reference.css` in small caps and a distinct colour that keeps AA contrast in both schemes, still bold so it is not marked by colour alone.
- [ ] T026 [US1] Register `remark-link-references` and `rehype-keywords` in `src/lib/reference/render.ts`, and add rule T6: a heading ending `*(informative)*` keeps its text and gets an "Informative" label.
- [ ] T027 [US1] Create `src/pages/[language]/[version]/[section].astro`: `getStaticPaths` over every language in `languages.json`, every published version and every section page from `split.ts`; render with `render.ts` inside `ReferenceLayout`, with the page title and number, `Toc`, and previous and next links (US1 AS4).
- [ ] T028 [US1] Create `src/pages/[language]/[version]/index.astro`, the cover of a version: title, version line, status, date, metadata table, "Status of this document", and the generated table of contents (US1 AS1).
- [ ] T029 [US1] Create `src/pages/[language]/index.astro`, the language landing at `/adp/dedl/`: the latest version's cover and table of contents, the list of all published versions, and links to the schema, the examples and search (site-addresses "Pages").
- [ ] T030 [P] [US1] Create `src/components/reference/ReverseLinks.astro` and show "Referenced from" at the end of every section page, listing the sections that link to it (query over the link graph, research D5).
- [ ] T031 [P] [US1] Create `src/pages/[language]/[version]/[prose].ts`, serving the prose file byte-identical at `/adp/dedl/<v>/DEDL-specification.md` as `text/markdown`, and `src/pages/[language]/[version]/reference-links.json.ts`, serving the link graph as JSON.
- [ ] T032 [US1] Add `/adp/dedl/` to spec 001's documentation navigation in the navigation file spec 001 created (under `src/`), so that home → documentation → DEDL → a section takes three selections (SC-005, quickstart 9).
- [ ] T033 [US1] Register in `scripts/reference/check.ts`: the heading check (every heading of every snapshot has an element with its id on the expected page, SC-001) and the link check (every internal link and fragment under `/adp/dedl/` resolves, SC-002).

**Checkpoint**: US1 is complete; quickstart 3 passes against a fixture build.

---

## Phase 4: User Story 2 — Link to and cite an exact place (Priority: P1)

**Goal**: every heading has a copyable link; each version has permanent addresses; `/adp/dedl/latest/…` shows the newest version with fragments intact; superseded versions say so; removed pages leave stubs.

**Independent Test**: copy the link of heading 5.10, open it in a private window and land there; open the same heading under `latest/`; run the versioning simulation of quickstart 4.

- [ ] T034 [US2] Add a heading-link affordance in `src/lib/reference/render.ts`: each heading of depth 2–6 gets a visible, keyboard-reachable link to `#<id>` with an accessible name such as "Link to 5.10 Snap rules", added beside the heading text, never inside it (US2 AS1, FR-005).
- [ ] T035 [US2] Extend `getStaticPaths` in `src/pages/[language]/[version]/[section].astro`, `src/pages/[language]/[version]/index.astro` and every other page under `src/pages/[language]/[version]/` so that `[version]` ranges over the published versions plus `latest`; `latest` pages render the latest version with `<link rel="canonical">` to the versioned twin and `data-pagefind-ignore="all"` (research D3, D12).
- [ ] T036 [P] [US2] Create `src/components/reference/VersionBanner.astro` and show it in `ReferenceLayout` on every page of a version that is not the latest: "A newer version of DEDL exists: `<latest>`", linking to the same slug in the latest version when it exists there, else to its cover (FR-008, research D13).
- [ ] T037 [US2] Implement `src/lib/reference/stubs.ts`: for each page slug of an older version that the latest lacks, a stub saying "moved to …" when a heading with the same title, ignoring its number, exists in the latest version, else "removed in `<version>`", linking to the last version that had it (research D13).
- [ ] T038 [US2] Render the stubs of T037 at `/adp/<language>/latest/<old-slug>/` from `src/pages/[language]/[version]/[section].astro` (only for `latest`), inside `ReferenceLayout`.
- [ ] T039 [US2] Add the versioning fixture for quickstart 4: `tests/reference/fixtures/dedl-versioning/` holding the `0.1` fixture and a `0.2-test` copy with one section deleted from its prose (with a `source.json` whose hashes match), and a build mode `reference-versioning-test` in `astro.config.mjs` that points `REFERENCE_CONTENT_DIR` at it.
- [ ] T040 [US2] Register in `scripts/reference/check.ts`: every page of a superseded version has the newer-version banner, every `latest` page has `rel="canonical"` to its versioned twin, and every slug of an older version resolves under `latest/` (to a page or a stub, never a 404).

**Checkpoint**: US1 and US2 work together; quickstart 4 passes, including the versioning simulation.

---

## Phase 5: User Story 3 — Get the schema and examples (Priority: P2)

**Goal**: the schema served byte-identical at its `$id`, a schema browser linked both ways with the sections, and a documented, visualised page per example with the file downloadable, and IDE screenshots or the "no host" notice.

**Independent Test**: validate the three example definitions with `ajv-cli` against `http://localhost:4321/adp/dedl/schema/0.1/dedl.schema.json`; open `/adp/dedl/0.1/schema/#def-SnapRule` and `/adp/dedl/0.1/examples/statemachine/` and see what quickstart 5 lists.

### Tests for User Story 3

- [ ] T041 [P] [US3] Write `tests/reference/visuals.test.ts` against the fixture: for `statemachine.dedl` the metamodel view is a Mermaid `classDiagram` with its node types, relation types, typed attributes, inheritance and containment, and the layer map is a `flowchart` of the eight layers marking which are filled and with how many items; for `timeline.document.json` the document-structure view is a `flowchart` of elements and relations by id and type; every generated diagram has `accTitle` and `accDescr`; captions read "Generated from `<file>` at `<short revision>`".
- [ ] T042 [P] [US3] Add schema and example cases to `tests/reference/link-references.test.ts`: T3 links `` `$defs/Name` `` and a code span equal to one of the 141 `$defs` names to `schema/#def-Name`, and never inside code blocks.

### Implementation for User Story 3

- [ ] T043 [US3] Create `src/pages/[language]/schema/[version]/[file].ts`: emit the snapshot's schema bytes unchanged at `/adp/<language>/schema/<v>/<schema>`, the path of its `$id` (FR-009, research D8); fail the build if the path differs from `schemaAddress`.
- [ ] T044 [US3] Implement `src/lib/reference/schema.ts`: the `$defs` of the schema as `SchemaDefinition` records (`name`, `json`, `refs` from `$ref`, `anchor` `def-<name>`), and `layer` from Appendix A.2's two-column table; a definition that A.2 does not list gets `layer: null` and a warning (source-inputs S1).
- [ ] T045 [US3] Extend `src/lib/reference/remark-link-references.ts` with rule T3 to pass T042, recording links of kind `schema`.
- [ ] T046 [P] [US3] Create `src/components/reference/SchemaDefinition.astro`: the definition's name as a heading with id `def-<Name>`, its layer, its JSON pretty-printed with Shiki and each `$ref` turned into a link to its `#def-` anchor, and "Described in" (the sections that link to it, plus its layer's section).
- [ ] T047 [US3] Create `src/pages/[language]/[version]/schema.astro`: all `$defs` grouped by the layers of Appendix A.2 (ungrouped definitions last), a link to download the raw schema, inside `ReferenceLayout`.
- [ ] T048 [US3] Implement `src/lib/reference/examples.ts`: one `Example` per file of role `definition` or `document`, with `stem` (file name without extension, `.` → `-`), `label` and `doc` (`language.label`, `language.doc` for a definition; the embedding section's title for a document), `section` (the 17.x heading whose body contains ``File `…/<file>`:``, matched by file name only), `demonstrates` (that section's leading bullet list, layer names linked), `layers` (item counts of the eight layer keys present), and `embeddedMatches` (the embedded copy equals the file after JSON normalisation; a mismatch is a warning, never a failure).
- [ ] T049 [US3] Implement `src/lib/reference/visuals.ts` to pass T041: the metamodel, layer-map and document-structure generators of research D9, each returning a `Visual` with `kind`, `mermaid`, `title`, `description` and `caption`; layer-map nodes link to their layer's section.
- [ ] T050 [US3] Configure `rehype-mermaid` in `astro.config.mjs` with strategy `img-svg` and `dark: true`, and create `src/components/reference/Visual.astro`: a `<picture>` with the light SVG and a dark SVG chosen by `prefers-color-scheme`, alt text from `accTitle` and `accDescr`, the caption, and a `<details>` holding the Mermaid text (FR-018, research D10). Apply the same to `mermaid` fences in the prose (rule B3), taking alt text from the paragraph before when `accTitle`/`accDescr` are missing and reporting the gap as a warning (source-inputs S2).
- [ ] T051 [P] [US3] Create `src/components/reference/ExampleScreenshots.astro`: read screenshot rows through spec 003's shared screenshot reader, keep rows whose `Example` column names this example (`<language>/<version>/<file>`), group them by `Shows` (`definition`, `diagram`), and render them with spec 003's screenshot figure; drop and report rows from a repository without a licence or naming a version or file the reference does not have (source-inputs S3). With no rows, show "No IDE host runs this example yet." If spec 003's reader is not on `develop` yet, render the notice only and say so in the pull request description.
- [ ] T052 [US3] Create `src/pages/[language]/[version]/examples/[stem].astro`: name and purpose, "What it demonstrates", a link to its 17.x section, the generated visuals through `Visual`, the file highlighted with Shiki, a download link, and `ExampleScreenshots`; for a document, the note that its view shows the data, not the notation the designer draws (research D9, FR-016, FR-017).
- [ ] T053 [P] [US3] Create `src/pages/[language]/[version]/examples/index.astro` (each example with name, purpose and kind) and `src/pages/[language]/[version]/examples/files/[file].ts` (each example file byte-identical; `.json` as `application/json`).
- [ ] T054 [US3] Record example links (kind `example`) in the link graph from the 17.x sections to their example pages, and show "Illustrated by" on each layer section in `src/components/reference/ReverseLinks.astro`, listing the examples that fill that layer (research D5).
- [ ] T055 [US3] Register in `scripts/reference/check.ts`: every example of role `definition` validates against its version's schema with `ajv` in draft 2020-12 mode with `ajv-formats`, and the document against `$defs/Document` (SC-003); the published schema and every published example file are byte-identical to the snapshot.

**Checkpoint**: US3 is complete; quickstart 5 passes, including dark mode and JavaScript disabled.

---

## Phase 6: User Story 4 — Know where it came from (Priority: P2)

**Goal**: every reference page shows version, status, date, repository, revision linked to the source, generation date and licence, and sends error reports to the source repository.

**Independent Test**: open any reference page, follow its source link, and find the same text at that revision in `etalii-adp/etalii.adp` (quickstart 6).

- [ ] T056 [US4] Create `src/components/reference/Provenance.astro`: DEDL version, status and date; the repository `etalii-adp/etalii.adp`; the revision as 7 characters linking to the prose file at the full 40-character revision on GitHub; the generation date (build time); the licence from `source.licence` (FR-015); "Report a problem" linking to the source repository's issues (US4 AS2). Use spec 003's source-record rendering when it is on `develop`, so provenance looks the same across the site.
- [ ] T057 [US4] Render `Provenance` in `src/components/reference/ReferenceLayout.astro` so it appears on every reference page: covers, sections, stubs, schema browser, example pages and the landing.
- [ ] T058 [US4] Register in `scripts/reference/check.ts`: every page under `/adp/dedl/` has the provenance block with a 40-character revision and a licence (FR-011).

**Checkpoint**: US4 is complete; quickstart 6 passes.

---

## Phase 7: Search across the reference (FR-014, FR-020; serves US1)

**Goal**: a self-hosted, static search over one version at a time, the latest by default, with each hit naming its version and section.

**Independent Test**: on `/adp/dedl/search/`, `snapping` returns 0.1 hits each naming its section; with JavaScript disabled the page points to the table of contents, glossary and schema browser; the network panel shows no third-party requests (quickstart 7).

- [ ] T059 [US1] Mark pages for Pagefind in `src/components/reference/ReferenceLayout.astro`: filters `language` and `version` (`data-pagefind-filter`), meta fields `section` and `version` (`data-pagefind-meta`), on versioned pages only; `latest` copies and stubs stay excluded (research D12).
- [ ] T060 [US1] Configure the Pagefind post-build step in `package.json` so the index, script and WebAssembly are written under `/adp/pagefind/` in the build output, with no third-party requests.
- [ ] T061 [US1] Create `src/pages/[language]/search.astro`: the Pagefind UI filtered to one version, preselecting the latest, honouring `?v=<v>` and `?q=`, showing version and section for each result (FR-020); a `<noscript>` message that search needs scripting, with links to the table of contents, the glossary (Appendix C) and the schema browser.
- [ ] T062 [US1] Add a small search form to `src/components/reference/ReferenceLayout.astro` that submits to the search page with `q` and the current version, and that the script enhances.
- [ ] T063 [US1] Register in `scripts/reference/check.ts`: the Pagefind index holds every section page of the latest version.

**Checkpoint**: search works; quickstart 7 passes.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [ ] T064 [P] Add `npm run test` and, after `npm run build`, `npm run check:reference` to the CI workflow under `.github/workflows/` that spec 001 created, so a pull request fails when either fails (constitution, Development Workflow).
- [ ] T065 [P] Extend spec 001's WCAG 2.2 AA check and phone-width check to the landing, one section page (section 6), the schema page, one example page and the search page, and fix every violation in `src/components/reference/` or `src/styles/reference.css` (quickstart 8).
- [ ] T066 [P] Measure the built HTML of sections 6 and 17 (target about 150 KB each) and the CI build time including Mermaid (target under 3 minutes), and record both in the pull request description (plan "Performance Goals").
- [ ] T067 Draft the five upstream requests of [contracts/source-inputs.md](contracts/source-inputs.md) ("Requests to the source repository") as issues for `etalii-adp/etalii.adp`, and open them only after the owner confirms.
- [ ] T068 Run every scenario of [quickstart.md](quickstart.md) against a fixture build (and, once a licensed snapshot exists, against the real one) and record the results in the pull request description.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 blocks everything: this feature needs spec 001's skeleton on `develop`.
- **Foundational (Phase 2)**: depends on Setup; blocks all user stories.
- **US1 (Phase 3)**: depends on Foundational.
- **US2 (Phase 4)**: depends on Foundational and on US1's page routes (T027–T029), which it extends with `latest`.
- **US3 (Phase 5)**: depends on Foundational; T045 and T054 extend US1's `remark-link-references.ts` and `ReverseLinks.astro`, so do them after T024 and T030.
- **US4 (Phase 6)**: depends on Foundational only; it can run beside US1–US3 since it touches only `Provenance.astro` and `ReferenceLayout.astro`.
- **Search (Phase 7)**: depends on US1 pages; best after US2, because `latest` pages must be excluded from the index.
- **Polish (Phase 8)**: after the stories it covers.

### External dependencies (plan "Dependencies on other work")

- Spec 001 skeleton: blocks T001.
- `etalii-adp/etalii.adp` `LICENSE`: blocks the real snapshot (T021) and so the first publish; everything else is built and checked against the fixture.
- Spec 003's screenshot reader and source-record rendering: T051 and T056 use them when present and degrade as those tasks state.
- An IDE host that loads a DEDL definition: until then every example page shows the "no host" notice.

### Within each phase

- Tests before the code they cover (T007–T010 before T011–T019; T022–T023 before T024–T025; T041–T042 before T045, T049).
- `anchors.ts` before `split.ts` before `render.ts` before any page.
- Tasks that edit the same file (`render.ts`, `ReferenceLayout.astro`, `check.ts`, `remark-link-references.ts`) run in task order, never in parallel.

### Parallel Opportunities

- Setup: T003, T004, T005, T006.
- Foundational tests: T007, T008, T009, T010.
- US1: T022 and T023; then T025, T030 and T031 beside T024–T029.
- US2: T036 beside T037.
- US3: T041 and T042; then T046, T051 and T053 beside the rest.
- US4 as a whole beside US2 or US3.
- Polish: T064, T065, T066.

---

## Parallel Example: User Story 1

```text
# Tests first, together:
Task: "T022 [US1] link-references tests in tests/reference/link-references.test.ts"
Task: "T023 [US1] keyword tests in tests/reference/keywords.test.ts"

# Then, in parallel with the linker (T024):
Task: "T025 [US1] rehype-keywords in src/lib/reference/rehype-keywords.ts"
Task: "T030 [US1] ReverseLinks in src/components/reference/ReverseLinks.astro"
Task: "T031 [US1] prose and link-graph endpoints under src/pages/[language]/[version]/"
```

## Parallel Example: User Story 3

```text
Task: "T041 [US3] visuals tests in tests/reference/visuals.test.ts"
Task: "T042 [US3] T3 cases in tests/reference/link-references.test.ts"
# after T044:
Task: "T046 [US3] SchemaDefinition in src/components/reference/SchemaDefinition.astro"
Task: "T051 [US3] ExampleScreenshots in src/components/reference/ExampleScreenshots.astro"
Task: "T053 [US3] examples index and file endpoints"
```

---

## Implementation Strategy

### MVP first (User Story 1)

1. Phase 1, with T001 confirming spec 001's skeleton.
2. Phase 2: loading, splitting, faithful rendering, the refresh (which refuses until the source has a licence).
3. Phase 3: section pages, cross-references, glossary links, key words.
4. Stop and validate against the fixture build (quickstart 3). It cannot be published until the source has a licence (T021).

### Incremental delivery

1. MVP (US1), then US2 (citable, versioned addresses), then US3 (schema and examples), US4 (provenance), then search.
2. The first publish needs US1, US2, US4 and a licensed snapshot at least, because every published page must carry provenance (FR-011) and a licence (FR-015). Search and US3 may follow in later pull requests.

---

## Notes

- Nothing under `src/content/reference/<language>/` is written by hand; only `reference:refresh` writes there (FR-001, principle II).
- Every transformation of source text is listed in [contracts/rendering-rules.md](contracts/rendering-rules.md); a new one is added there first.
- Commit after each task or logical group, on `features/002-dedl-reference` in the worktree `C:\git\etalii.adp.site-002`.
