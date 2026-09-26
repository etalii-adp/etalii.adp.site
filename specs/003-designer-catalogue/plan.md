# Implementation Plan: Designer Catalogue

**Branch**: `features/003-designer-catalogue` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-designer-catalogue/spec.md`, as amended on 2026-09-26 from the owner's review comments (FR-015 screenshot descriptions, FR-016 focus areas maintained in Notion, FR-017 per-host availability in the Notion table, FR-010 descriptive text site-owned and refreshed from Notion), and the owner's decisions of 2026-09-26 recorded in [research.md](research.md).

## Summary

The catalogue is a set of static pages under `/adp/designers/`: an overview with per-facet pages, one page per designer, and an ideas list. They are generated at build time from data files that a refresh script writes into this repository from four kinds of source:

- the standalone repository's `docs/diagrams.md`;
- each host's `docs/screenshots/`;
- the Notion "Diagrams" database, read through the Notion API, where focus areas, purpose texts and per-host states are authored; its text becomes site-owned data here (FR-010);
- each host's public releases.

Every record carries its source: repository and revision, or Notion page and edit time. After each refresh, Notion's host columns are brought in step with the repositories (FR-017). One site-wide state mapping keeps "implemented" apart from "available to install", because today every IDE repository and release is private. Screenshots are imported as they are, described by what is visible and why it matters, and shrunk at build time to hold each page under 1 MB. Filtering works with scripting off, through per-facet pages. Renamed or withdrawn designers keep their addresses through generated stub pages.

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 24 LTS

**Primary Dependencies**: Astro (current stable, ≥ 5; static output, content collections, `astro:assets` with sharp). The refresh uses `gh` (GitHub CLI), `yaml`, `parse5` (to read the HTML table in `diagrams.md`) and the Notion REST API through Node's built-in `fetch`, so no Notion SDK. Research D5 explains why Astro and not Eleventy, Hugo or a hand-written generator.

**Storage**: files in git: `src/content/catalogue/*.json|yaml` and `src/assets/catalogue/**.png` (data model, "Files")

**Testing**: Vitest for the refresh's parsers and state mapping; post-build Node checks for source records, alt text, FR-007, the image budget and redirects; spec 001's site-wide link and WCAG 2.2 AA checks run over the catalogue's pages

**Target Platform**: GitHub Pages at `https://etalii.net/adp` (static files only); the refresh runs on a developer or agent machine, or in GitHub Actions

**Project Type**: static website plus a content-refresh command-line script

**Performance Goals**: a designer page loads at most 1 MB of images (FR-013). The overview loads at most 26+ thumbnails of about 25 KB each, lazily below the fold. A visitor finds a designer and its IDEs within one minute (SC-003).

**Constraints**:

- It works under the `/adp` base path.
- There is no client script on any page except the optional filter on the overview.
- There are no third-party requests and no cookies.
- It meets WCAG 2.2 AA, works at phone width, and supports light and dark schemes.
- The IDE sources are private repositories until the owner's decision to make them public is carried out (research D9, D10.1).
- Content from a source without a licence is not published (research D10.1).
- Notion is reached only by the refresh and the Notion sync, never by the build.

**Scale/Scope**: 4 hosts, 8 focus areas, 7 site states. On 2026-09-26: 26 designers from the standalone plus draw.io from IntelliJ, and 64 ideas. It is expected to grow to low hundreds of entries.

No NEEDS CLARIFICATION remains. The open items are prerequisites in other repositories and in Notion, not unknowns in this plan (research D10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this plan meets it | Result |
|---|---|---|
| I. One site for product and documentation | The catalogue is in the documentation part and linked from the home page (spec 001 FR-007) and the navigation. It presents designers for every kind of task, grouped by eight focus areas, not architecture only. | Pass |
| II. Sourced, never retyped | Every designer, idea, host state and screenshot carries a SourceRecord that is shown on the page: repository, path, 40-character revision and licence, or Notion page and edit time. Facts and screenshots come in only through the refresh. Descriptive text is site-owned and refreshed from Notion (spec FR-010, research D1). Notion is not a repository, and the site owns some text; both are tracked below, together with the temporary join key `screenshot-designers.yaml`. | Pass, with tracked deviations |
| III. Truthful about what exists (NON-NEGOTIABLE) | "Implemented, not yet released" is kept apart from "Available", and the latter requires a public install. State is shown per host, all four always. Ideas are listed apart from the catalogue. Nothing below Prototype gets a screenshot. Screenshots are imported from their capture procedures, never made here, and "screenshot pending" replaces any placeholder. | Pass |
| IV. Readable by everyone, anywhere | Full content and per-facet filtering work without scripting (research D6). Every image has alt text and a text description. States are shown as text, not colour alone. There are no third-party resources. Phone width and dark mode are checked in the quickstart. | Pass |
| V. Maintainable by agents | This feature supplies the refresh and Notion sync commands, their checks and their reports. Spec 004 wraps them in the written procedure that ends in a pull request. The refresh never publishes, and it stops and asks on an unmapped state or an unconfirmed rename. The Notion sync writes a working area outside the pull request, and lists every value it writes in it (tracked below). | Pass, with one tracked item |
| VI. Simplicity | Astro is justified by three current requirements: schema validation of source records, image derivation for the budget, and zero-JS output (research D5). There is no server, no database and no search index; per-facet pages replace client-side search. | Pass |
| Hosting and content constraints | Static files under `/adp`, English, Apache-2.0 for the site's own code and text. Sourced content shows its source licence, and content without a licence is withheld (D10). | Pass |

**Post-design re-check (after Phase 1)**: still passing. The data model makes FR-009 and FR-012 schema-enforced ([contracts/catalogue-data.schema.json](contracts/catalogue-data.schema.json)). FR-007 and FR-013 are enforced by `check:catalogue`. The amendment of 2026-09-26 (direct Notion source, FR-015 to FR-017) added the Notion SourceRecord, `notionDiffers`, the S3w write-back contract and a required "why it matters"; its deviations are tracked below.

## Project Structure

### Documentation (this feature)

```text
specs/003-designer-catalogue/
├── spec.md
├── plan.md                         # this file
├── research.md                     # findings F1–F6, decisions D1–D12
├── data-model.md                   # entities, state mapping, membership, files
├── quickstart.md                   # validation scenarios
├── contracts/
│   ├── site-addresses.md           # the pages and addresses the catalogue publishes
│   ├── source-formats.md           # what the refresh expects from each source (S1–S4)
│   └── catalogue-data.schema.json  # a designer record
└── tasks.md                        # /speckit-tasks, not created here
```

### Source Code (repository root)

This assumes the site skeleton of spec 001 (layout, navigation, CI, publishing). The catalogue adds only the paths below.

```text
astro.config.mjs                     # site: https://etalii.net, base: /adp (spec 001)
src/
├── content.config.ts                # + catalogue collections, schemas from the data model
├── content/catalogue/               # generated by the refresh; do not edit by hand
│   ├── designers/<vendor>/<type>.json
│   ├── ideas.json
│   ├── focus-areas.json
│   ├── redirects.yaml               # appended by the refresh, reviewed by a person
│   ├── screenshot-designers.yaml    # temporary join key (complexity tracking)
│   └── refresh.json                 # last run: sources, revisions, report
├── assets/catalogue/<vendor>/<type>/<host>--<image>.png
├── lib/catalogue/
│   ├── states.ts                    # the site state set and the source→site mapping
│   ├── hosts.ts                     # the four hosts
│   └── membership.ts                # best state, catalogue / ideas / neither
├── components/catalogue/
│   ├── DesignerCard.astro           # overview entry: name, purpose, thumbnail, host states
│   ├── AvailabilityTable.astro
│   ├── ScreenshotFigure.astro
│   ├── SourceList.astro
│   ├── IdeasList.astro
│   └── CatalogueFilter.astro        # the only client script; progressive enhancement
└── pages/designers/
    ├── index.astro                  # overview + ideas
    ├── [vendor]/[type].astro        # designer pages and redirect or withdrawal stubs
    ├── focus/[area].astro
    ├── hosts/[host].astro
    └── states/[state].astro
scripts/catalogue/
├── refresh.ts                       # entry point: npm run catalogue:refresh
├── sources/
│   ├── standalone-diagrams.ts       # S1 parser
│   ├── screenshots.ts               # S2 reader and validation
│   ├── notion.ts                    # S3 reader (Notion API)
│   └── releases.ts                  # S4
├── assemble.ts                      # cross-checks, mapping, membership, redirects
├── write.ts                         # writes content/ and assets/, idempotently; keeps site-owned fields
├── sync-notion.ts                   # S3w: npm run catalogue:sync-notion [--dry-run] (FR-017)
└── check.ts                         # npm run check:catalogue (post-build)
tests/catalogue/
├── fixtures/                        # pinned copies of S1–S3
├── standalone-diagrams.test.ts
├── screenshots.test.ts
├── notion.test.ts                   # against a recorded API response
├── sync-notion.test.ts
├── states.test.ts
└── assemble.test.ts
```

**Structure decision**: there is one project, a static site with its refresh script beside it. Generated data lives under `src/content/catalogue/`, where Astro's content collections validate it at build time. The refresh is a plain Node script, so an agent (spec 004) and a GitHub Actions job run the same command.

## Dependencies on other work

| On | Needed for | Status on 2026-09-26 |
|---|---|---|
| Spec 001 plan: site skeleton, navigation, CI checks, publishing | building and publishing the pages | not planned yet; this plan proposes Astro for it (research D5) |
| Spec 002: DEDL reference address | FR-008 links | not planned yet; linked by address once it exists |
| Spec 004: the written refresh procedure, the PR flow and triggers | FR-010, US4 | not planned yet; calls `catalogue:refresh` and `check:catalogue` |
| Spec 004: run `catalogue:sync-notion` after the refresh, and add its report to the pull request | FR-017 | to be added to spec 004 |
| A Notion integration shared with "Diagrams", its token as the `NOTION_TOKEN` secret | S3, S3w | missing |
| The four IDE repositories public, and every repository with an Apache-2.0 `LICENSE` and a `NOTICE` stating © 2026 Peter Vrenken | publishing screenshots and text | decided by the owner; not carried out yet. The standalone history needs a secrets review first (research D10.1) |
| A `Designer` column in the screenshot readmes | exact image mapping | missing (D10.2) |
| A Notion row and origin tag for draw.io | SC-001 | missing (D10.3) |
| Notion columns `Focus areas` and `Why specialized` | FR-002 facets, FR-004, FR-016 | missing (D10.4); per-host columns added and filled 2026-09-26 |
| A decision on editors (the Markdown editor has a screenshot but no catalogue row) | scope | open (D10.5) |
| Spec 001 `/speckit-clarify`: three or eight focus areas on the home page | consistency between 001 and 003 | open (D11) |

## Complexity Tracking

| Violation | Why needed | Simpler alternative rejected because |
|---|---|---|
| `src/content/catalogue/screenshot-designers.yaml` is written by a person on the site side (principle II: content is not edited by hand here) | The standalone screenshot readme does not say which designer each image shows (research F2). Without a join key, no screenshot can be placed. The file holds only image-name → origin-tag pairs, no content, and every entry is listed in the refresh pull request as a gap in its source. It is deleted once the sources carry a `Designer` column (D10.2). | Guessing from file names (wrong for `workspace.png` and `markdown-editor.png`). Waiting for the source change (would publish the catalogue without any screenshots, failing FR-006 for every usable designer). |
| Descriptive text (purpose, why specialized, file formats, focus areas and their problem statements, a screenshot's "why it matters") is owned by this repository rather than by a source repository (principle II) | The owner decided on 2026-09-26 that this text is site-owned data, fetched and updated from the Notion databases where it is written (spec FR-010). No IDE repository holds such text | A committed Notion export in `etalii-adp/etalii.adp` (the earlier choice) adds a second repository and pull request to every text change. Text in each IDE repository splits one designer across up to four repositories |
| Notion is a source although it is not a repository (principle II: "a named source repository") | It is where focus areas, purposes and host columns are maintained. Its page id and `last_edited_time` name the source and revision of every item, shown on the page (FR-009) | Exporting to a repository first adds a manual step and a second copy without adding traceability |
| `catalogue:sync-notion` writes Notion's host columns outside a pull request (principle V: procedures end in a pull request) | FR-017 requires Notion's host columns to follow the repositories. Notion is a working area, not the published site, and every value written is listed in the refresh's pull request | Reporting differences only, for a person to fix by hand, leaves Notion drifting, which the owner's review comment asked to avoid |
