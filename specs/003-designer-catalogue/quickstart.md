# Quickstart: Validating the Designer Catalogue

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to show that the catalogue works end to end. Commands assume the repository root, with spec 001's site skeleton and spec 004's refresh procedures in place. The details of what is checked are in [data-model.md](data-model.md) and [contracts/](contracts/); this guide only says how to run them and what to expect.

Every catalogue command also runs against fixtures, without spec 004's output or Notion. Set these three variables to build and test the site from the fixtures of `tests/unit/catalogue/fixtures/`:

```sh
export ADP_SOURCES_DIR=tests/unit/catalogue/fixtures/sources
export ADP_STATES_CONFIG=tests/unit/catalogue/fixtures/config/states.json
export ADP_NOTION_SNAPSHOT=tests/unit/catalogue/fixtures/notion/notion.json
```

## Prerequisites

- Node.js 24 LTS and `npm ci` done.
- For spec 004's refresh: `gh` authenticated with read access to `etalii-adp/etalii.adp.ide.*` while they are private (locally with your own login; in CI with the token spec 004 names).
- `NOTION_TOKEN` set to the token of a Notion integration shared with the "Diagrams" database (research D9).
- For scenario 5 only: a local checkout of `etalii.adp.ide.standalone` to change.

## 1. Refresh from the sources

Spec 004's procedures bring the sources in; the catalogue's commands then fetch Notion and report.

```sh
npm run refresh -- catalogue --dry-run     # spec 004: the host catalogues into sources/catalogue/
npm run refresh -- screenshots --dry-run   # spec 004: the accepted screenshots into sources/screenshots/
npm run refresh -- hosts --dry-run         # spec 004: host states and releases into sources/hosts/
npm run catalogue:notion -- --dry-run      # lists the Notion rows that would change; without --dry-run writes notion.json
npm run catalogue:report                   # writes .refresh/catalogue-report.md and published.json
```

**Expect**:

- Every designer page names each source with its revision, taken from the locks under `sources/`.
- `.refresh/catalogue-report.md` lists at least these known gaps as of 2026-09-26:
  - Licence missing for the standalone repository, so its screenshots are not publishable.
  - The draw.io designer from IntelliJ has no origin tag.
  - No screenshot has its site-owned "why it matters" text yet.
  - Notion has no `Focus areas` or `Why specialized` column yet.
  - Notion and `diagrams.md` disagree.
- There are 26 or more designers and 64 or fewer ideas, the counts from the standalone catalogue at that date.
- Every Notion-sourced record names the page and its edit time.
- Running `catalogue:notion` and `catalogue:report` twice in a row gives an empty `git diff` the second time.

```sh
npm run catalogue:sync-notion -- --dry-run   # lists Notion host columns that differ from the repositories (FR-017)
```

**Expect**: every difference as `origin · host · Notion value → repository value`; nothing is written. Without `--dry-run`, the same list is written to Notion and to `.refresh/catalogue-notion-sync.md`, and a second dry run lists no differences (SC-005).

## 2. Unit checks

```sh
npm run test:catalogue
```

**Expect**: all pass. The fixtures are shaped like spec 004's `sources/` output, with a recorded Notion API query response. They cover every source state, an unmapped state (the build must stop), membership, the release rule, a renamed and a withdrawn origin, and every rule of `check:catalogue`.

## 3. Build and run the checks

```sh
npm run build
npm run check        # links, check:catalogue (source records, alt text, FR-007, image budget, redirects, internal links), then every page's WCAG 2.2 AA, phone-width, no-script and privacy checks
```

**Expect**: zero failures. `check:catalogue` prints the heaviest designer page with its total image bytes, which must be under 1 MB.

## 4. Visitor scenarios (spec US1–US3)

```sh
npm run preview                      # serves dist/ at http://localhost:4321/adp/
```

1. Open `/adp/designers/` with JavaScript disabled. Every designer and the ideas list are present; the filter is not shown (FR-002). With JavaScript on, tick one focus area: the list narrows, the introduction describes the focus area, and the breadcrumbs end in its name.
2. Find the mind map (`/adp/designers/freeplane/mindmap/`). Its availability table shows four hosts: Standalone "Prototype", IntelliJ "Implemented, not yet released", VS Code and Eclipse "Not planned". None is marked Available, because no release is public (research D3).
3. On that page, each screenshot has a caption naming the host and the short revision, and the Sources section links `etalii.adp.ide.standalone@<sha>`. While the standalone has no licence, "Screenshot pending" is shown instead.
4. Open a specified-only designer (either of the two `📝 Specified` entries). It has no screenshot and is labelled Planned (FR-007).
5. Open `/adp/designers/?hosts=intellij` and see the mind map and, once it has an origin tag, draw.io. The old address `/adp/designers/hosts/intellij/` leads there too.
6. Switch the system to dark mode and narrow the window to 360 px. There is no horizontal scroll, and state labels stay readable as text.

## 5. Stay-current scenario (spec US4)

1. In a local checkout of `etalii.adp.ide.standalone`, change one designer's state in `docs/diagrams.md`, for example `wardley/map` from Prototype to Implemented, and commit it.
2. Run `npm run refresh -- catalogue --no-deliver --source etalii-adp/etalii.adp.ide.standalone=<checkout>` (spec 004), then `npm run catalogue:report`.
3. **Expect**: the diff touches only `sources/catalogue/`. The report lists `wardley/map · standalone · prototype → implemented`. The rebuilt overview and designer page both show "Implemented, not yet released". The recorded revision is the local commit.
4. Rename that origin in the checkout, refresh and report again. **Expect**: `catalogue:report` exits 3 and asks whether the old origin was renamed or withdrawn. After `npm run catalogue:report -- --rename <old>=<new>`, `redirects.json` gains an entry and the old address serves the redirect stub.
5. Discard the local changes. A lock marked `"local": true` can never be delivered (spec 004).

## 6. Failure scenarios

| Do | Expect |
|---|---|
| Point spec 004's refresh at a source path that does not exist | it stops, changes nothing, and names the source and path |
| Replace a screenshot in the checkout with a 2 MB PNG | spec 004 rejects it and keeps the previous image; `catalogue:report` lists it under "Screenshots" |
| Add a state `🧪 Experimental` in the checkout's `diagrams.md` | spec 004's refresh stops and asks how to map it, offering the seven site states; a `catalogue.json` holding an unmapped state fails the build, naming the file, the origin and the state |
