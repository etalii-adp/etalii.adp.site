# Quickstart: Validating the DEDL Reference

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

These scenarios prove the feature works end to end. Addresses are in [contracts/site-addresses.md](contracts/site-addresses.md), commands in [contracts/refresh-cli.md](contracts/refresh-cli.md).

## Prerequisites

- Node.js 24 LTS and npm, with `gh` authenticated. The source is public, but `gh` avoids anonymous rate limits.
- The site skeleton of spec 001 is in place: the Astro project, `base: '/adp'` and the layout.
- Playwright's Chromium, for Mermaid rendering: `npx playwright install chromium`.
- The source repository `etalii-adp/etalii.adp` has a licence. Until it does, scenario 1 ends in the expected refusal (1b).

```powershell
npm ci
npm run test            # unit tests: splitter, slugs, linker, key words, visuals, refresh checks
```

## 1. Refresh brings the source in

```powershell
npm run reference:refresh -- dedl
```

- **1a. Expected**: exit `0`. `src/content/reference/dedl/0.1/` holds the six source files and `source.json` with a 40-character revision and a licence. The report lists the files and the sections.
- **1b. Source without a licence**: exit `1`, "source has no licence", and nothing under `src/content/reference/` changes (`git status` is clean).
- **1c. Run again**: exit `3`, "current", and nothing changes.
- **1d. Unreachable source** (disconnect the network, or pass `--revision 0000000000000000000000000000000000000000`): exit `1`, and nothing changes (FR-013).

## 2. Build and checks

```powershell
npm run build
npm run check:reference
```

**Expected**: both exit `0`. `check:reference` reports:

- every source heading found (SC-001);
- zero broken links (SC-002);
- the three definitions and one document valid against the schema (SC-003);
- the schema and examples byte-identical;
- provenance on every page.

## 3. Read section by section (US1)

```powershell
npm run preview
```

Open `http://localhost:4321/adp/dedl/`.

- The landing shows "DEDL — Diagram Editor Definition Language", "0.1, Working Draft", 2026-09-25, and a table of contents with 17 sections and appendices A–D.
- Open "5. Layer 2 — Coordinate systems…". The URL is `/adp/dedl/0.1/layer-2-coordinate-systems-placement-and-snapping/`. The table of contents is at hand, with previous and next links.
- In section 9, the bold **MUST** is visibly marked, and the plain word "must" in prose is not.
- In any section, a parenthesised number such as `(12.3)` is a link. Following it lands on "12.3 Contexts" on the CEL page.
- A term from the glossary, such as "Bound placement", is linked on its first use in a section and lands on its entry in Appendix C.
- At the end of section 12, "Referenced from" lists the sections that cite it.

## 4. Link and cite (US2)

- Copy the link of heading 5.10. It is `/adp/dedl/0.1/…/#510-snap-rules`. Open it in a private window: the page opens scrolled to that heading.
- Open `/adp/dedl/latest/layer-2-coordinate-systems-placement-and-snapping/#510-snap-rules`. It lands on the same heading, and the page source has `rel="canonical"` pointing at the `0.1` address.
- **Versioning simulation** (SC-004, FR-008): copy the `0.1` snapshot to a fixture version `0.2-test`, delete one section from its prose, set `languages.json` to treat it as latest in a test build (`npm run build -- --mode reference-versioning-test`), and check:
  - `/adp/dedl/0.1/…/#510-snap-rules` still opens;
  - `0.1` pages show "A newer version of DEDL exists";
  - `/adp/dedl/latest/<deleted-slug>/` is a stub saying "removed in 0.2-test", with a link to `0.1`.

## 5. Schema and examples (US3)

```powershell
npx ajv-cli validate --spec=draft2020 -c ajv-formats -s http://localhost:4321/adp/dedl/schema/0.1/dedl.schema.json -d "src/content/reference/dedl/0.1/source/*.dedl"
curl -sI http://localhost:4321/adp/dedl/schema/0.1/dedl.schema.json
```

- The validation passes for all three definitions. The response header shows a JSON content type.
- After publishing, repeat the `curl` against `https://etalii.net/adp/dedl/schema/0.1/dedl.schema.json`. It returns `200`, `application/json` and `access-control-allow-origin: *`, and its SHA-256 equals `source.json`'s value for the file.
- Open `/adp/dedl/0.1/schema/#def-SnapRule`. It shows the definition, links for its `$ref`s, its layer (2 · Coordinates) and "Described in" links to section 5.
- Open `/adp/dedl/0.1/examples/statemachine/`. It shows:
  - the name "State machine" with its purpose;
  - "What it demonstrates", with each layer linked;
  - a link to 17.1;
  - a metamodel class diagram and a layer map, each captioned "Generated from `statemachine.dedl` at `<rev>`";
  - the file, and a download link;
  - "No IDE host runs this example yet."
- Switch the operating system to dark mode and reload. The diagrams switch to their dark variant. Disable JavaScript and reload. The diagrams are still there, and each `<details>` shows the Mermaid text.

## 6. Provenance (US4)

On any reference page, the provenance block names:

- DEDL 0.1, Working Draft, 2026-09-25;
- `etalii-adp/etalii.adp`;
- the short revision, whose link opens `specifications/dedl/DEDL-specification.md` at that full revision on GitHub;
- the generation date;
- the licence;
- "Report a problem", which links to the source repository's issues.

## 7. Search (FR-014, FR-020)

- Open `/adp/dedl/search/` and type `snapping`. The results are from 0.1 (the latest), and each names its section, for example "5.9 Snapping: model".
- With JavaScript disabled, the page says that search needs scripting, and links to the table of contents, the glossary and the schema browser.
- The browser's network panel shows requests only to `etalii.net` (or `localhost`) while searching.

## 8. Readable by everyone (principle IV)

- At 360 px width, no reference page scrolls horizontally. Wide tables scroll inside their own region, and the region can be reached and scrolled with the keyboard.
- Spec 001's accessibility check (WCAG 2.2 AA) reports zero violations on the landing, one section page, the schema page, one example page and the search page.
- Every page is complete with JavaScript disabled, except the search page's results.

## 9. Time to a section (SC-005)

From `/adp/`, go to documentation → DEDL → "Layer 5 — Constraints". This takes three selections and well under 30 seconds.
