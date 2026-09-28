# Contract: Source Formats

What the catalogue refresh expects from each source. When a source does not match, the refresh stops before changing anything and reports which source, which file and which rule failed (spec 004 edge case "source cannot be reached", extended to "source cannot be read"). When a source changes its format, this contract and the refresh are amended together.

## S1. Standalone diagram catalogue

- **Repository and path**: `etalii-adp/etalii.adp.ide.standalone`, `docs/diagrams.md`, branch `develop`
- **Shape**: one HTML `<table>` whose `<tbody>` has two kinds of rows:
  - a **section row**: a single `<td colspan="5">` holding an `<h3>` of the form `<n>. <Family name>` and a `<p>` description;
  - an **entry row**: five `<td>`s, in the order State, Origin, Diagram, Theory, Example.
- **State cell**: its text, after collapsing whitespace and `&nbsp;`, starts with one of the icons in the legend (💡 📝 ⏸️ 🛠️ ⚗️ ✅) followed by the state name. The icon decides the state; a different name next to a known icon is reported as a disagreement.
- **Origin cell**: exactly one `<code>` holding the origin tag.
- **Diagram cell**: the text before the first ` (` or `;` is the name. The rest is description and is not published, because it is written for the repository's developers.
- **Theory and Example cells**: every `<a href>` becomes a `{ title, url }` link. A relative `href` is resolved against the file's location at the recorded revision, and a link into the private repository is dropped.
- **Revision**: the SHA of the last commit to `docs/diagrams.md` on `develop`.

## S2. Host screenshots

- **Repository and path**: `<host repository>`, `docs/screenshots/`, branch `develop`. The standalone has it today; the others once they gain screenshots.
- **Images**: PNG files named in the readme table. Each must be within the budget the readme states (standalone: 300 KB, the workspace overview 1 MB).
- **Readme**: `docs/screenshots/readme.md` holds a Markdown table whose header contains at least `Image` and `What must be visible`. Expected addition (research D10.2): a `Designer` column with the origin tag the image shows. Until it is present, the refresh uses the mapping `src/content/catalogue/screenshot-designers.yaml` in this repository. That mapping is written by a person in review and listed in the pull request as a gap in the source. "Why it matters" is not read from the source; it is site-owned (research D8).
- **Licence**: the repository's licence, as reported by GitHub. If there is none, the images are imported with `publishable: false`.
- **Revision**: per image, the SHA of the last commit that touched it.

## S3. Notion "Diagrams" data source

- **Source**: the Notion data source `collection://3e7be2fd-05b6-8079-932d-000bfa0609af` ("Diagrams"), read directly through the Notion REST API with `NOTION_TOKEN` (research D1, D9). Its content is copied into the site's catalogue data, where it is site-owned (spec FR-010).
- **Rows used**: every row with a non-empty `Origin`. A row without one is reported and skipped.
- **Properties read**:

| Notion property | Type | Becomes |
|---|---|---|
| `Name` | title | `name` |
| `Origin` | text | the join key with S1 (research D2) |
| `Type` | select: Diagram, Designer | `kind` |
| `One line purpose` | text | `purpose` |
| `Description` | text | `task` |
| `Why specialized` | text (to be added, D10.4) | `whySpecialized` |
| `File extension (if single file)` | text | `fileFormats[].extension`, until a `File formats` column replaces it |
| `Focus areas` | multi-select (to be added, D10.4) | `focusAreas`, by option name → `focus-areas.json` slug; an unknown option is added with an empty `problem` and reported |
| `Family`, `Subfamily` | select | cross-checked against S1's section; S1 wins |
| `Theory` | text | merged with S1's theory links |
| `Standalone Plugin Implementation`, `IntelliJ Plugin Implementation`, `VS Code Plugin Implementation`, `Eclipse` (renamed in Notion; read by these names since 2026-09-28) | select: the six source states and `⛔ Not planned` | host state for hosts without their own catalogue; cross-checked, and written back, for hosts with one (below) |
| `State`, `Rarity`, `Abbreviation`, `Example` | | not used |

- **Revision**: per row, the page id and its `last_edited_time`, recorded as a `notion` SourceRecord.
- **Empty values**: an empty text property leaves the site-side value as it is; an empty host select counts as not planned.

## S3w. Writing Notion's host columns back (FR-017)

- **When**: only after a refresh that completed without stopping; `catalogue:sync-notion --dry-run` reports without writing.
- **What**: for each row and each host that has its own catalogue (standalone today), the host select is set to the option whose state maps to the catalogue's state for that host. Nothing else in Notion is written.
- **Report**: every value changed, as `origin · host · before → after`, goes into the refresh report and the pull request (spec 004 FR-009).

## S4. Host releases

- **Repository**: each host repository's GitHub releases.
- **Rule**: a host is "available" for a designer only when the latest non-draft release is publicly downloadable, meaning the repository is public or the asset is published elsewhere and linked from the release. Private releases count as "not yet released".

## Cross-checks the refresh performs

| Check | Result on failure |
|---|---|
| S1 state ≠ S3 `Standalone Plugin Implementation` for the same origin | reported in the pull request; S1 wins, and S3w writes it to Notion (research D2, D13) |
| An origin in S3 with no match in S1, and `Standalone Plugin Implementation` set | reported |
| A host README describes a designer whose S3 state is empty or ⛔ | reported |
| A source state not in the mapping | stop and ask (spec 004 FR-002) |
| An image over budget, missing or unreadable | keep the previous image, report |
| A designer at prototype or above with no publishable image | "screenshot pending", report |
