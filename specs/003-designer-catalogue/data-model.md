# Data Model: Designer Catalogue

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

The catalogue is assembled at build time (`src/lib/catalogue/assemble.ts`) from spec 004's `sources/` output, the state mapping in `procedures/config/states.json`, the Notion snapshot and the site-owned files in `src/content/catalogue/` (see Files). Facts (host states) and screenshots are never edited by hand; they arrive through spec 004's refresh pull requests. Descriptive text is site-owned (spec FR-010, research D1): `catalogue:notion` copies it from Notion, and fields Notion has no column for (a focus area's problem statement, a screenshot's "why it matters") are written here and reviewed in the refresh pull request. `redirects.json` is written by `catalogue:report` when a question is answered, and may be amended in review. The machine-checkable form of these entities is [contracts/catalogue-data.schema.json](contracts/catalogue-data.schema.json).

## Entities

### SourceRecord

Where a fact or image came from. It is embedded in every entity below that carries sourced content.

| Field | Type | Rule |
|---|---|---|
| `kind` | `git` \| `notion` | required |
| `repository` | string | `git`: `owner/name`, e.g. `etalii-adp/etalii.adp.ide.standalone`; required |
| `path` | string | `git`: a path inside the repository; required |
| `page` | string | `notion`: the Notion page id of the row; required |
| `revision` | string | `git`: the full 40-character commit SHA the file was read at; `notion`: the page's `last_edited_time`; required |
| `retrievedAt` | date-time | when the refresh read it; required |
| `licence` | string \| null | the SPDX id of the source's licence; `null` blocks publication (research D10). Notion text is site-owned and carries the site's `Apache-2.0` |

A reader sees `repository@revision` (short SHA, linked to the file at that revision), or "Notion, edited <date>" for Notion records, on every designer page and in the overview's footer (FR-009).

### FocusArea

| Field | Type | Rule |
|---|---|---|
| `slug` | string | kebab-case, unique; forms `designers/focus/<slug>/` |
| `name` | string | required |
| `problem` | string | one or two sentences: the problem a specialized designer solves there |
| `order` | integer | display order |
| `source` | SourceRecord \| null | the Notion data source whose `Focus areas` option introduced it; the `problem` text is site-owned |

There are eight at the start (research D11). The list is data, so adding a focus area needs no code change.

### Host

A fixed set of four, defined in site code because spec 001 and the constitution name them.

| `id` | Name | Repository |
|---|---|---|
| `standalone` | Standalone | `etalii-adp/etalii.adp.ide.standalone` |
| `intellij` | IntelliJ Platform | `etalii-adp/etalii.adp.ide.intellij` |
| `vscode` | Visual Studio Code | `etalii-adp/etalii.adp.ide.vscode` |
| `eclipse` | Eclipse | `etalii-adp/etalii.adp.ide.eclipse` |

### State

The site-wide state set (FR-005, research D3). Each source state is mapped to exactly one site state. A source state not in this table stops the refresh, which asks how to map it (spec 004 US3 AS2).

| Site state (`id`) | Label | Rank | Source states mapped to it | Usable |
|---|---|---|---|---|
| `not-planned` | Not planned | 0 | ⛔ Not planned; host has no entry | no |
| `idea` | Idea | 1 | 💡 Identified | no |
| `planned` | Planned | 2 | 📝 Specified, ⏸️ To-do | no |
| `in-progress` | In progress | 3 | 🛠️ Work-in-progress | no |
| `prototype` | Prototype | 4 | ⚗️ Prototype | yes |
| `implemented` | Implemented, not yet released | 5 | ✅ Implemented, and no public install | yes |
| `available` | Available | 6 | ✅ Implemented, and `install.url` present | yes |

A designer's **best state** is the highest rank over its four hosts. It decides membership (below) and the overview's state facet.

### Designer

One per origin tag that has reached Planned in at least one host.

| Field | Type | Rule |
|---|---|---|
| `origin` | string | `<vendor>/<diagram-type>`, lowercase, `[a-z0-9.-]+/[a-z0-9.-]+`; unique; the identity (FR-003) |
| `name` | string | required |
| `kind` | `diagram` \| `designer` \| `editor` | from Notion `Type`; `editor` is added when the first editor enters the catalogue |
| `purpose` | string | one line, ≤ 140 characters (FR-001) |
| `task` | string \| null | the task it serves (FR-004); `null` until Notion's `Description` gives it, when the page says "Not described yet" and the report lists the gap |
| `whySpecialized` | string \| null | why a specialized visualization helps there (FR-004); `null` until Notion has a `Why specialized` column and value (research D10.4), shown and reported as for `task` |
| `fileFormats` | list of `{ extension, name, reads, writes }` | from Notion's `File extension (if single file)`; empty until it is filled, shown and reported as for `task` (FR-004) |
| `family` | string | the section heading from `diagrams.md`, e.g. "Ontologies & semantic web" |
| `focusAreas` | list of FocusArea slugs | may be empty (spec assumption) |
| `theory` | list of `{ title, url }` | may be empty only if the notation has no theory or standard (FR-008) |
| `definition` | `{ url, dedlVersion }` \| null | the DEDL definition, when the designer has one (FR-008); the page then also links the DEDL reference of spec 002 |
| `hosts` | map of Host id → HostAvailability | exactly four entries, none omitted (US3 AS2) |
| `screenshots` | list of Screenshot | may be empty (see rules) |
| `sources` | list of SourceRecord | every file this record was assembled from |

**Rules**

- If the best state is `prototype` or higher, the designer MUST have at least one Screenshot with `publishable: true`, or show "screenshot pending" (FR-006, edge case). The refresh reports every designer in the pending case.
- If the best state is below `prototype`, `screenshots` MUST be empty (FR-007).
- Every Screenshot's `host` MUST have a state of `prototype` or higher. A screenshot never illustrates a host where the designer is not usable.

### HostAvailability

| Field | Type | Rule |
|---|---|---|
| `state` | State id | required |
| `sourceState` | string \| null | the source's own wording, kept for the cross-check, e.g. `⚗️ Prototype` |
| `localName` | string \| null | the host's own name for the designer when it differs (edge case: same designer, different names) |
| `install` | `{ url, label }` \| null | present only for `available` |
| `build` | `{ url, label }` \| null | how to build it from source, when the repository is public |
| `source` | SourceRecord | where this host's state was read: the host's catalogue at a commit, or the Notion row when the host has none (research D2) |
| `notionDiffers` | string \| null | the Notion host column's value when it differed from a repository-sourced state at the last refresh; cleared when `catalogue:sync-notion` writes it (FR-017, research D13) |

### Screenshot

| Field | Type | Rule |
|---|---|---|
| `id` | string | `<host>--<image-basename>`, unique within the designer |
| `host` | Host id | required |
| `file` | string | the path under `src/assets/catalogue/<vendor>/<diagram-type>/` |
| `caption` | string | names the host and the short revision, e.g. "Standalone, at a1b2c3d" (US2 AS2) |
| `alt` | string | non-empty, describes what is shown (FR-012); from the source's "What must be visible" |
| `visible` | string | the longer description of what is on screen |
| `whyItMatters` | string | why that is important for the designer's task; site-owned (research D8); required when `publishable` is true (FR-015) |
| `width`, `height` | integer | of the source PNG |
| `bytes` | integer | of the source PNG; must be within the source's own budget |
| `publishable` | boolean | false when the source has no licence or the image failed validation; the previous image is kept if there was one |
| `source` | SourceRecord | the image file; `revision` is the last commit that touched it |

### Idea

One per origin tag that is at Idea in at least one host and below Planned in all of them (FR-014). An idea has no page.

| Field | Type | Rule |
|---|---|---|
| `origin` | string | as Designer |
| `name` | string | required |
| `family` | string | as Designer |
| `theory` | list of `{ title, url }` | may be empty |
| `source` | SourceRecord | required |

### Redirect

One per retired address (FR-011). Kept in `src/content/catalogue/redirects.json`; entries are never removed.

| Field | Type | Rule |
|---|---|---|
| `from` | string | the old origin tag |
| `to` | string \| null | the new origin tag; `null` means withdrawn |
| `reason` | string | shown on a withdrawal notice |
| `since` | date | when the refresh recorded it |
| `source` | SourceRecord | the source revision in which the origin disappeared or was renamed |

A rename is only recognized when a source says so, for example a note in `diagrams.md` or a Notion `Previous origin` value. The refresh never guesses a rename from similar names. It asks, as it does for an unmapped state.

## Relationships

```text
FocusArea 1..* ◄──── 0..* Designer ────► 4 HostAvailability ────► 1 State
                          │  └──► 0..* Screenshot ──► 1 Host
                          └──► 1..* SourceRecord
Idea (no page)   Redirect ──► 0..1 Designer
```

## Membership and lifecycle

Membership is recomputed on every refresh from the best state:

```text
best state ≥ planned                    → Designer (page + overview)
best state = idea                       → Idea (ideas list)
best state = not-planned (all hosts)    → neither
origin present before, absent now       → Redirect (to: new origin | null)
```

A designer moves between these sets only through a refresh pull request. The pull request lists every membership change, so a reviewer sees, for example, "`neo4j/cypher` moved from ideas to catalogue (standalone: Identified → Specified)".

## Files

Designers and Ideas are not stored: they are assembled at build time from these files, so each fact has one copy.

| Path (in this repository) | Content | Written by |
|---|---|---|
| `sources/catalogue/<host>/catalogue.json`, `sources/screenshots/<host>/`, `sources/hosts/hosts.json`, each folder's `source.lock.json` | host catalogues, accepted screenshots, host states, and the source record of every file | spec 004's refresh procedures, never by hand |
| `procedures/config/states.json` | the seven site states and, per host, source state → site state | spec 004; a new mapping when a refresh asks |
| `src/content/catalogue/notion.json` | the Notion "Diagrams" rows: text, focus areas, host columns | `npm run catalogue:notion`; a host value after `catalogue:sync-notion` writes it |
| `src/content/catalogue/focus-areas.json` | all FocusAreas | site-owned; `catalogue:notion` appends a new Notion option; `problem` in review |
| `src/content/catalogue/screenshot-notes.json` | per screenshot id, "why it matters" | site-owned, in review |
| `src/content/catalogue/file-formats.json` | per file extension, the format's name | site-owned, in review |
| `src/content/catalogue/redirects.json` | all Redirects | `npm run catalogue:report -- --rename` or `--withdraw`, reviewed by a person |
| `src/content/catalogue/published.json` | the origins that had a page at the last report | `npm run catalogue:report` |
| `.refresh/catalogue-report.md`, `.refresh/catalogue-notion-sync.md` (not committed) | the report of the last run: changes, pending screenshots, disagreements, gaps; the Notion values written | `catalogue:report`, `catalogue:sync-notion`; included in spec 004's pull request body |
