# Quickstart: Validating the Designer Catalogue

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to show that the catalogue works end to end. Commands assume the repository root, and the site skeleton from spec 001 (Astro, `npm` scripts) in place. The details of what is checked are in [data-model.md](data-model.md) and [contracts/](contracts/); this guide only says how to run them and what to expect.

## Prerequisites

- Node.js 24 LTS and `npm ci` done.
- `gh` authenticated with read access to `etalii-adp/etalii.adp.ide.*` while they are private (locally with your own login; in CI with `ADP_SOURCES_TOKEN`, research D9).
- `NOTION_TOKEN` set to the token of a Notion integration shared with the "Diagrams" database (research D9).
- For scenario 5 only: write access to a scratch branch in `etalii.adp.ide.standalone`.

## 1. Refresh from the sources

```sh
npm run catalogue:refresh            # reads S1–S4 at develop, writes src/content/catalogue/ and src/assets/catalogue/
npm run catalogue:refresh -- --dry-run   # reports what would change, writes nothing
```

**Expect**:

- `src/content/catalogue/refresh.json` names every source with its revision.
- Its report lists at least these known gaps as of 2026-09-26:
  - Licence missing for the standalone repository, so its screenshots are `publishable: false`.
  - The draw.io designer from IntelliJ has no origin tag.
  - The standalone screenshot readme has no `Designer` column, and no screenshot has its site-owned "why it matters" text yet.
  - Notion has no `Focus areas` or `Why specialized` column yet.
  - Notion (93 rows) and `diagrams.md` (90 entries) disagree.
- There are 26 or more designer files and 64 or fewer ideas, the counts from the standalone catalogue at that date.
- Every Notion-sourced record names the page and its edit time.
- Running the command twice in a row gives an empty `git diff` the second time: the refresh is idempotent.

```sh
npm run catalogue:sync-notion -- --dry-run   # lists Notion host columns that differ from the repositories (FR-017)
```

**Expect**: every difference as `origin · host · Notion value → repository value`; nothing is written. Without `--dry-run`, the same list is written to Notion, and a second dry run lists no differences (SC-005).

## 2. Unit checks of the parsers and mapping

```sh
npm test -- catalogue
```

**Expect**: all pass. The fixtures are copies of `diagrams.md` and the screenshot readme at a pinned revision, and a recorded Notion API query response. They cover every source state, an unmapped state (the refresh must stop), a renamed origin and an image over budget.

## 3. Build and run the catalogue checks

```sh
npm run build
npm run check:catalogue              # source records, alt text, FR-007, image budget, redirects
npm run check:site                   # links and WCAG 2.2 AA (spec 001), covers the catalogue pages
```

**Expect**: zero failures. `check:catalogue` prints the heaviest designer page with its total image bytes, which must be under 1 MB.

## 4. Visitor scenarios (spec US1–US3)

```sh
npm run preview                      # serves dist/ at http://localhost:4321/adp/
```

1. Open `/adp/designers/` with JavaScript disabled. Every designer and the ideas list are present. The facet links for focus areas, hosts and states work (FR-002).
2. Find the mind map (`/adp/designers/freeplane/mindmap/`). Its availability table shows four hosts: Standalone "Prototype", IntelliJ "Implemented, not yet released", VS Code and Eclipse "Not planned". None is marked Available, because no release is public (research D3).
3. On that page, each screenshot has a caption naming the host and the short revision, and the Sources section links `etalii.adp.ide.standalone@<sha>`. While the standalone has no licence, "Screenshot pending" is shown instead.
4. Open a specified-only designer (either of the two `📝 Specified` entries). It has no screenshot and is labelled Planned (FR-007).
5. Open `/adp/designers/hosts/intellij/` and see the mind map and, once it has an origin tag, draw.io.
6. Switch the system to dark mode and narrow the window to 360 px. There is no horizontal scroll, and state labels stay readable as text.

## 5. Stay-current scenario (spec US4)

1. On a scratch branch of `etalii.adp.ide.standalone`, change one designer's state in `docs/diagrams.md`, for example `wardley/map` from Prototype to Implemented.
2. Run `npm run catalogue:refresh -- --ref <scratch-branch>`.
3. **Expect**: the diff touches only `designers/wardley/map.json` and `refresh.json`. The rebuilt overview and designer page both show "Implemented, not yet released". The recorded revision is the scratch commit.
4. Rename that origin on the scratch branch (with a note the refresh recognizes) and refresh again. **Expect**: the refresh asks to confirm the rename. After confirmation, `redirects.yaml` gains an entry and the old address serves the redirect stub.
5. Discard the scratch branch and the local changes.

## 6. Failure scenarios

| Do | Expect |
|---|---|
| Point the refresh at a source path that does not exist | it stops, changes nothing, and names the source and path |
| Replace a screenshot in the scratch branch with a 2 MB PNG | the previous image stays, and the report lists it as over budget |
| Add a state `🧪 Experimental` in the scratch `diagrams.md` | the refresh stops and asks how to map it, offering the seven site states |
