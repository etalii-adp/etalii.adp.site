# Research: Designer Catalogue

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-26

This records what was found in the sources on 2026-09-26 and the decisions taken from it. Each decision states what was chosen, why, and what else was considered.

## Findings in the sources

### F1. The standalone catalogue

`etalii-adp/etalii.adp.ide.standalone`, `docs/diagrams.md` on `develop`, is an HTML table of 114 rows grouped in 14 numbered sections (families). Columns: State, Origin, Diagram, Theory, Example. States found: 65 identified, 3 specified, 1 to-do, 2 work-in-progress, 17 prototype, 8 implemented. The legend defines six states (💡 Identified, 📝 Specified, ⏸️ To-do, 🛠️ Work-in-progress, ⚗️ Prototype, ✅ Implemented) and the origin tag `<architecture-or-vendor>/<diagram-type>`.

So the catalogue starts with 31 designers that are specified or further along, and an ideas list of 65 entries.

### F2. The standalone screenshots

`docs/screenshots/` holds seven PNGs (72–143 KB each), `capture.mjs`, and `readme.md`. The readme gives the shared capture setup (1600×900, DPR 1, dark theme, only documents from `src/examples/`), a budget (each image ≤ 300 KB, the workspace overview ≤ 1 MB), and a table with the columns Image | Document opened | What must be visible. It does not name the origin tag of the designer each image shows, nor why what is visible matters.

| Image | Designer (inferred, not stated in the source) |
|---|---|
| `mindmap.png` | `freeplane/mindmap` |
| `wardley-map.png` | `wardley/map` |
| `timeline.png` | `generic/timeline` |
| `azure-pipeline.png` | `azure-devops/pipeline` |
| `dependency-graph.png` | `generic/dependencies` |
| `workspace.png` | `c4/container` (the workspace overview) |
| `markdown-editor.png` | a Markdown editor that has no row in `diagrams.md` |

### F3. The IntelliJ host

`etalii-adp/etalii.adp.ide.intellij` (Apache-2.0) ships two designers: FreeMind mind maps (`.mm`) and draw.io diagrams (`.drawio`, uncompressed). It has no catalogue file, no screenshots and no published release. Its README describes installing from a locally built zip.

### F4. The VS Code and Eclipse hosts

`etalii.adp.ide.vscode` and `etalii.adp.ide.eclipse` contain only tooling scaffolding (`.claude`, `.specify`, `CLAUDE.md`). They have no designers, no catalogue and no releases.

### F5. Visibility and licences

All four IDE repositories are **private**, and so are their releases (the standalone has private `0.1.x-alpha` releases). Only `etalii.adp` (specifications) and this repository are public. Of the IDE repositories, only IntelliJ has a licence (Apache-2.0); standalone, VS Code and Eclipse have none.

### F6. Notion

The Notion database "Diagrams" (`collection://3e7be2fd-05b6-8079-932d-000bfa0609af`) was imported from `diagrams.md` on 2026-09-26. It has columns Name, Origin, State, Type (Diagram/Designer), Rarity, One line purpose, Description, Family, Subfamily, Theory, Example, Abbreviation and File extension. As decided on 2026-09-26, four per-host select columns were added: Standalone, IntelliJ, VS Code, Eclipse. Each takes the six source states plus ⛔ Not planned. Notion has no row for draw.io and no focus-area column yet.

## Decisions

### D1. Notion is where catalogue text is authored; the site owns its copy

- **Decision**: Descriptive text is edited in Notion: focus areas, one-line purpose, why a specialized visualization helps, file formats, and per-host state for hosts without their own catalogue. The refresh reads the Notion "Diagrams" data source directly through the Notion REST API and writes what it reads into this repository's catalogue data, where it is site-owned (spec FR-010). Each record's source is the Notion page id and its `last_edited_time`. A field Notion leaves empty keeps its site-side value, and fields Notion has no column for (a focus area's problem statement, a screenshot's "why it matters") are written in the site's data directly.
- **Rationale**: The owner's decision of 2026-09-26, given after an earlier choice for a committed export in `etalii-adp/etalii.adp` and replacing it: the text is site-owned data, fetched and updated from the Notion databases. The page id and edit time give every item a named source and revision (FR-009). The deviation from principle II's "named source repository" is recorded in the plan's Complexity Tracking.
- **Alternatives considered**: A Notion export committed to `etalii-adp/etalii.adp` (the earlier choice: keeps principle II literal, but adds a second repository and pull request to every text change). Putting the text in each IDE repository (splits one designer's text across up to four repositories, away from where it is written).

### D2. Which source is authoritative for which fact

- **Decision**: Each fact has one owner, and the refresh cross-checks the others and reports any disagreement instead of silently picking one.

| Fact | Owner | Cross-checked against |
|---|---|---|
| Standalone state, origin, name, theory links, example links | standalone `docs/diagrams.md` | Notion (Standalone column), which the refresh then updates (D13) |
| IntelliJ, VS Code, Eclipse state | the host's own catalogue once it has one; until then the Notion host column | the host repository's README (a designer the README describes must not be "not planned") |
| Focus areas, one-line purpose, why specialized, file formats | Notion, copied into site-owned data (D1) | — |
| Screenshots, what they show | the host repository's `docs/screenshots/` and its readme | — |
| Why a screenshot matters | site-owned data, refreshed from Notion once it has a column for it (D8) | — |
| Install link | the host repository's public release, if any | — |

- **Rationale**: The code decides whether a designer exists in a host (principle III). Notion decides how ADP talks about it.
- **Alternatives considered**: Notion as the single owner of everything (it would drift from the code, and `diagrams.md` is maintained by the agents that build the designers). `diagrams.md` as the single owner (it covers only one host and has no focus areas).

### D3. One site state set, mapped from the source states

- **Decision**: The site uses seven states, defined once and used by specs 001, 003 and 004. The mapping is in [data-model.md](data-model.md#state). It is kept in spec 004's `procedures/config/states.json` (`siteStates` and `mappings` per host), which the refresh procedures and the catalogue both read; the catalogue's `src/lib/catalogue/states.ts` holds only the labels, ranks and which states are usable.
- **Release rule** (owner's decision, 2026-09-27): a host's state is its source state, mapped, and is never lowered. It replaces spec 004's cap at the latest release. "Implemented" becomes "Available" only when `sources/hosts/hosts.json` gives that host `available` with a release to link to and the host repository has a licence; the install link is that release.

| Site state | Source states | Shown |
|---|---|---|
| Not planned | ⛔ Not planned, or no entry | on designer pages only, per host |
| Idea | 💡 Identified | in the ideas list only |
| Planned | 📝 Specified, ⏸️ To-do | catalogue |
| In progress | 🛠️ Work-in-progress | catalogue |
| Prototype | ⚗️ Prototype | catalogue, with screenshot |
| Implemented | ✅ Implemented, no public release | catalogue, with screenshot, "not yet released" |
| Available | ✅ Implemented with a public release or install page | catalogue, with screenshot and install link |

- **Rationale**: Principle III forbids presenting something as obtainable when it is not. Every IDE repository and release is private today (F5), so nothing can be "Available" yet, but eight designers are implemented. Separating Implemented from Available keeps both facts true. Spec 001's host states (available, in progress, planned) are a subset of these.
- **Alternatives considered**: Taking the six source states as they are (they cannot express "implemented but not obtainable"). Collapsing Specified and To-do into separate site states (the distinction matters inside the team, not to a visitor). An unmapped source state stops the refresh and asks, as spec 004 US3 AS2 requires.

### D4. Catalogue membership

- **Decision**: A designer is in the catalogue when at least one host has it at Planned or further. It is in the ideas list when every host has it at Idea or Not planned and at least one at Idea. It is left out when every host has it at Not planned.
- **Rationale**: FR-014 and the edge case "identified only → ideas list".

### D5. Static site generator: Astro

- **Decision**: Astro (current stable major at implementation time, 5.x or later) on Node.js 24 LTS, with TypeScript and static output only (`output: 'static'`, `base: '/adp'`, `trailingSlash: 'always'`).
- **Rationale**: Three current requirements justify it (principle VI):
  - Content collections validate every generated record against a schema at build time, so a record without a source revision or alt text fails the build (FR-009, FR-012).
  - The built-in image pipeline (`astro:assets`, sharp) produces WebP thumbnails and responsive sizes from the sourced PNGs, which is how pages stay under the 1 MB budget (FR-013).
  - It emits no client JavaScript unless a component asks for it (principle IV).
- **Alternatives considered**: Eleventy (smaller, but schema validation and image processing would be added by hand). Hugo (fast, but a Go template language and a separate binary for an agent-maintained site). A hand-written generator (reinvents all of the above).
- **Cross-feature note**: Spec 001 owns the site skeleton (layout, navigation, CI, publishing) and has not been planned yet. This plan proposes Astro for the whole site. If 001's plan chooses differently, this plan's structure section is adapted and its contracts (data files, addresses, source formats) stay as they are.

### D6. Filtering without scripting

- **Decision**: Every facet has its own statically generated page: the overview grouped by focus area, `designers/hosts/<host>/`, `designers/states/<state>/` and `designers/focus/<area>/`. These are reached by plain links, and the overview shows the full list. A small script, loaded only on the overview, adds combined filter controls on top. Its results are announced through an `aria-live` region.
- **Rationale**: FR-002 requires the full list and a way to narrow it with scripting disabled. Per-facet pages give both, can be bookmarked, and are checked by the same link and accessibility tooling as every other page.
- **Alternatives considered**: CSS-only filtering with `:has()` and checkboxes (works without script, but a screen-reader user gets no announcement that the list changed). Script-only filtering (breaks FR-002).

### D7. Stable addresses and redirects on GitHub Pages

- **Decision**: A designer's address is `/adp/designers/<vendor>/<diagram-type>/`, taken directly from its origin tag, and an idea has no page of its own. When a source renames or removes an origin that had a page, `npm run catalogue:report` stops and asks, and the answer (`--rename` or `--withdraw`) adds an entry to `src/content/catalogue/redirects.json` in this repository. The build then emits a stub page at the old address: a meta refresh plus a visible link and `rel=canonical` for a rename, or a withdrawal notice for a removal.
- **Rationale**: GitHub Pages cannot do server-side redirects. A stub page is the only mechanism that works under `/adp`, and it keeps the link visible for readers without scripting.
- **Alternatives considered**: A JavaScript redirect in the 404 page (fails without scripting, and returns a 404 status). Deleting old pages (breaks FR-011).

### D8. Screenshots: import, describe, derive, budget

- **Decision**:
  - The refresh copies each screenshot at its source revision into `src/assets/catalogue/<vendor>/<diagram-type>/<host>--<image>.png`, with a sidecar record holding the host, source repository, path, revision (the last commit that touched the file), caption, alternative text, "what is visible" and "why it matters".
  - At build time, Astro derives a WebP thumbnail (at most 480 px wide) for the overview and responsive WebP images (at most 1200 px wide) for the designer page. The original PNG is linked for a full-size view and is not loaded with the page.
  - A post-build check adds up the bytes of every image a designer page loads and fails above 1 MB (FR-013).
  - The refresh keeps the previous image when a new one is missing, over its source budget or unreadable, and reports it (edge case).
- **Rationale**:
  - The owner's review comment asks for each screenshot to say what is visible and why it matters. The source readme already has "What must be visible", written for the retaker, which becomes the alternative text and the base of the description.
  - "Why it matters" is descriptive text, so it is site-owned (spec FR-010): written in the designer's data here and reviewed in the refresh pull request. A designer usable in some host whose screenshot lacks it fails `check:catalogue` (FR-015).
  - Deriving smaller formats from a sourced image does not retype content (principle II), and it is what makes the budget reachable.
- **Alternatives considered**: Publishing the PNGs as they are (a page with two screenshots would be close to the budget at 1600 px). A `Why it matters` column in each host's screenshot readme (keeps the text beside the image, but the owner put descriptive text on the site side, FR-010).

### D9. Access to private sources

- **Decision**: The refresh reads the sources with `gh`, which works both for an agent running locally and in GitHub Actions. In Actions it authenticates with a fine-grained token, stored as the secret `ADP_SOURCES_TOKEN`, that has read-only `contents` access to the four IDE repositories; the token becomes unnecessary for each repository once it is public (D10.1). Notion is read, and its host columns written (D13), with the token of an internal Notion integration shared with the "Diagrams" database, stored as `NOTION_TOKEN`. Both are used only by the refresh workflow, never by the publish workflow, and the build reads only files already committed here.
- **Rationale**: The sources are private today (F5). The site build must stay reproducible from this repository alone, and only the refresh needs to reach outside it.
- **Alternatives considered**: A GitHub App (cleaner rotation, more setup; worth it once spec 004's automatic triggers exist). Git submodules (would put private repositories in a public one's checkout path and fail for visitors cloning it).

### D10. Prerequisites in other repositories

These are not built by this feature, but the catalogue is incomplete or cannot be published without them. The refresh reports each one that is missing.

1. **Public repositories with licences.** The owner decided on 2026-09-26 that every `etalii-adp` repository is public and licensed under Apache-2.0, with a copyright statement for Peter Vrenken, 2026 (a `NOTICE` file). Today the four IDE repositories are private, and the standalone, VS Code, Eclipse and `etalii.adp` repositories have no licence. The constitution requires sourced content to show its source's licence. Until a source has one, the refresh does not publish its screenshots or text, and the page says a screenshot is pending. Before the standalone repository is made public, its history (4,343 commits across 15 branches) needs a secrets review. It includes historical `appsettings.*.json` files and Helm TLS secret templates, which were not reviewed during planning.
2. **A `Designer` column in each host's screenshot readme** (origin tag), so that images map to designers without guessing (F2).
3. **A Notion row for draw.io**, with its origin tag. It is implemented in IntelliJ (F3) but missing from both catalogues, so without the row SC-001 fails. The origin tag is the owner's to choose (for example `jgraph/drawio`).
4. **Notion columns** `Focus areas` (multi-select with the eight focus areas of D11) and `Why specialized` (text). `File extension (if single file)` exists and is read as the file formats until a fuller `File formats` column replaces it.
5. **A row for the Markdown editor**, or a decision that editors are out of scope for this catalogue. A screenshot of it exists (F2), but no catalogue has it.

### D11. Focus areas

- **Decision**: There are eight focus areas. The first three come from spec 001, and the owner added five on 2026-09-26 for use over time.
  1. (Constructive) technology assessment
  2. Collaboration between humans and agents
  3. Bringing clarity to textual data
  4. Systems and strategy: causal loops, Wardley maps, landscape mapping
  5. Knowledge and semantics: RDF, OWL, SKOS, SHACL, SPARQL, mind maps
  6. Software delivery: pipelines, Helm, Ansible, dependency graphs, C4
  7. Planning and roadmapping: timelines, dependency graphs, functional decomposition
  8. Psychological and societal insights
- **Rationale**: The spec (FR-016) takes the three focus areas of spec 001, and the owner's review comment says more will be added over time and worked out in Notion. Focus areas are therefore data: `focus-areas.json` with a slug, a name and a problem statement. The names are the options of Notion's `Focus areas` multi-select; a new option there is added by the refresh with an empty problem statement and reported as a gap. They are not a fixed enumeration in code, so adding a ninth needs no code change. A focus area with no designers yet is listed on the overview as "no designers yet", not hidden.
- **Follow-up**: Spec 001's FR-005 names exactly three focus areas for the home page. Whether the home page shows all eight belongs to spec 001, which should be revisited with `/speckit-clarify`.

### D12. Checks

- **Decision**:
  - `node --test` (`npm run test:catalogue`), with Node's TypeScript type stripping and no test dependency, for the assembly, the state mapping, the Notion API response, the Notion sync, the report and the post-build check. The fixtures are shaped like spec 004's `sources/` output, which parses `diagrams.md` and the screenshot readme, and include a recorded Notion query response.
  - Post-build checks, with the page lists taken from `dist/` so no page is skipped:
    - Every sourced record shows its source and revision (FR-009).
    - Every image has non-empty alt text (FR-012).
    - No designer that is below Prototype in every host has a screenshot (FR-007).
    - Every designer page stays under the image budget (FR-013).
    - Every `redirects.json` entry resolves.
  - Links and WCAG 2.2 AA are checked by the site-wide checks spec 001 defines, which cover the catalogue's pages like any other.
- **Rationale**: Principle V requires each procedure to verify its own result, and the constitution requires CI checks for links, accessibility and source records.

### D13. Keeping Notion's host columns in step (FR-017)

- **Decision**: After a successful refresh, `catalogue:sync-notion` compares every Notion row's four host columns with the catalogue's per-host state. Where the host has its own catalogue (standalone today), the repository's state is written into the Notion column; where it has none, Notion is the source and nothing is written. Every difference, and every value written, is listed in the refresh report that spec 004's pull request carries. `--dry-run` reports without writing. The write-back never runs when the refresh stopped.
- **Rationale**: FR-017 and SC-005: Notion and the catalogue agree, or the report lists each difference, and the catalogue follows the IDE repositories. Notion is a working area, not the published site, so writing it outside a pull request does not bypass principle V's review of site changes; the deviation is recorded in the plan.
- **Alternatives considered**: Reporting differences only (Notion keeps drifting, which the owner's review comment asked to avoid). Letting Notion win (contradicts principle III, since the code decides what exists).
