# Implementation Plan: DEDL Reference

**Branch**: `features/002-dedl-reference` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-dedl-reference/spec.md`, including the owner's three review comments (recorded in `.spec-context.json`):

1. a sibling specification for designers that are not diagrams, whose name is to be proposed;
2. search, and sufficient linkage between the aspects of the specification;
3. examples documented and visualised with Mermaid and images, and IDE screenshots once definitions run in an IDE.

Comments 2 and 3 were marked applied, but only search was in the spec text. FR-016 to FR-020, US3 AS4–5 and the Visual entity were added to the spec during this planning run so that the plan traces to requirements.

## Summary

The DEDL reference is a set of static pages under `/adp/dedl/`, built by Astro from a verbatim snapshot of `etalii-adp/etalii.adp/specifications/dedl/`. One snapshot is committed per published version.

A unified (remark and rehype) pipeline does the following:

- splits the 5,098-line prose into a cover page and one page per section and appendix (22 pages for 0.1);
- keeps GitHub's heading ids, so every source anchor maps onto the site;
- turns the source's plain-text section numbers, `$defs` names and glossary terms into links;
- marks the bold RFC 2119 key words;
- falls back to verbatim text for anything outside an allowlist.

A schema browser, example pages and reverse-link lists connect sections, schema definitions, examples and glossary in both directions.

Examples are visualised by Mermaid diagrams generated from the example files, rendered to light and dark SVG at build time, so they need no client script. IDE screenshots appear only once an IDE repository commits one, and until then the page says so.

The schema is served byte-identical at its `$id`. Search is Pagefind: a static index, self-hosted, filtered by version.

`/adp/dedl/latest/` is a full copy of the newest version with canonical links, because GitHub Pages cannot redirect with fragments. Older versions stay published, with a banner.

A refresh command writes snapshots all-or-nothing, and a check command verifies SC-001 to SC-004. Spec 004 wraps both in its procedure.

## Technical Context

**Language/Version**: TypeScript 5 on Node.js 24 LTS. This is the same stack as spec 003's plan, and spec 001's plan still has to adopt it.

**Primary Dependencies**:

- Astro, current stable ≥ 5, with static output.
- The unified toolchain Astro bundles (`remark-parse`, `remark-gfm`, `remark-rehype`, `rehype-stringify`), plus `github-slugger`, `mdast-util-to-string` and `unist-util-visit`.
- Shiki for JSON highlighting, bundled with Astro.
- `rehype-mermaid` with Playwright Chromium, for build-time Mermaid (research D10).
- Pagefind for search (D12).
- `ajv` and `ajv-formats` for checks (D16).
- `gh` for the refresh (D15).

**Storage**: files in git. There are snapshots under `src/content/reference/<language>/<version>/`, and a language registry. See [data-model.md](data-model.md).

**Testing**:

- Vitest unit tests over a pinned fixture copy of the source at `aaef333`.
- `check:reference` after the build (D16).
- Spec 001's site-wide link and WCAG 2.2 AA checks.

**Target Platform**: GitHub Pages at `https://etalii.net/adp`, static files only. The refresh runs on an agent or developer machine, or in GitHub Actions.

**Project Type**: a static website, plus a content-refresh command-line script.

**Performance Goals**:

- A section page is at most about 150 KB of HTML. The largest, section 6 and section 17, are about 60–110 KB of source, each rendered once per version.
- There is no client script except search, and Pagefind loads index chunks on demand.
- A full build including Mermaid should take under 3 minutes in CI.

**Constraints**:

- The `/adp` base path.
- No scripting needed to read.
- No third-party requests and no cookies.
- WCAG 2.2 AA, phone width, light and dark schemes.
- Byte-identical schema at its `$id`.
- The source has no licence yet (D14).

**Scale/Scope**:

- 1 language and 1 version today.
- About 22 pages per version.
- 141 schema definitions and 4 examples.
- About 100 plain-text cross-references and 40 glossary terms.
- A second language (SEDL, proposed, D17) and further versions are expected.

No NEEDS CLARIFICATION remains. The open items are prerequisites in other repositories (see "Dependencies"), not unknowns in this plan.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | How this plan meets it | Result |
|---|---|---|
| I. One site for product and documentation | The reference is in the documentation part, reachable from spec 001's documentation navigation and home page (SC-005, three selections). DEDL comes first among the definition languages, and the language registry leaves room for the next one. | Pass |
| II. Sourced, never retyped | Content comes in only through `reference:refresh`, as byte-identical snapshots with repository, path, 40-character revision and hashes. Every page shows its provenance and links to the source at that revision. Every transformation is listed in [contracts/rendering-rules.md](contracts/rendering-rules.md), and none changes text. Generated visuals are derived from source files, not drawn. Errors are reported upstream (source-inputs "Requests"), never fixed on the site. | Pass |
| III. Truthful about what exists (NON-NEGOTIABLE) | The version and status ("Working Draft") appear on every page. Superseded versions say so. IDE screenshots come only from IDE repositories, and "No IDE host runs this example yet" is shown instead of any mock-up. The document-structure view says that it is not the designer's notation. | Pass |
| IV. Readable by everyone, anywhere | All reading content is static HTML. Mermaid is rendered to SVG at build time, as a light/dark `<picture>` with alt text and the Mermaid text as its alternative. Search is the only script, it is self-hosted, and without scripting the page offers alternatives. Wide tables scroll inside a keyboard-reachable region. Key words are marked by weight and small caps, not colour alone. There are no third-party requests. | Pass |
| V. Maintainable by agents | `reference:refresh` has exit codes for changed, current and failed, and prints a pull-request-ready report. `check:reference` verifies headings, links, schema bytes, example validity and provenance. Spec 004 wraps both in the written procedure that ends in a pull request. | Pass |
| VI. Simplicity | Each dependency answers a current requirement: unified for the page split and linking (FR-002, FR-004, FR-019), Pagefind for FR-014 without a third party, and `rehype-mermaid` for FR-018 without client script. The last one brings a headless browser into the build, which is tracked below. There is no server and no database. | Pass, with one tracked item |
| Hosting and content constraints | Static files under `/adp`, in English. The site's code is Apache-2.0. The specification keeps its source's licence, stated beside it, and is refused while it has none. | Pass (the first publish is blocked by the source's missing licence, as the spec expects) |

**Post-design re-check (after Phase 1)**: still passing.

- The contracts make principle II checkable. The rendering rules are an explicit list, and `check:reference` fails on byte differences or missing provenance.
- Design added no dependency beyond those listed.
- Generated example visuals were considered against principle II: they are views computed from sourced files, captioned with file and revision, not retyped content.

## Project Structure

### Documentation (this feature)

```text
specs/002-dedl-reference/
├── spec.md
├── plan.md                              # this file
├── research.md                          # source findings, decisions D1–D17
├── data-model.md                        # stored snapshot, derived page/link/example model
├── quickstart.md                        # validation scenarios
├── contracts/
│   ├── site-addresses.md                # public addresses and their guarantees
│   ├── rendering-rules.md               # every source → page transformation
│   ├── source-inputs.md                 # what the source must provide; requests upstream
│   ├── refresh-cli.md                   # reference:refresh and check:reference
│   └── reference-data.schema.json       # languages.json and source.json
└── tasks.md                             # /speckit-tasks, not created here
```

### Source Code (repository root)

This assumes spec 001's site skeleton: the Astro project, layout, navigation, CI and publishing. The reference adds only the paths below. Names under `components/` and `lib/` follow spec 003's plan where the two share a concept, such as source records and screenshots.

```text
astro.config.mjs                         # + rehype-mermaid; Pagefind runs as a post-build step
src/
├── content/reference/
│   ├── languages.json                   # registry (D17); site-owned
│   └── dedl/0.1/                        # written by reference:refresh only
│       ├── source.json
│       └── source/                      # DEDL-specification.md, dedl.schema.json, *.dedl, *.json
├── lib/reference/
│   ├── load.ts                          # read snapshots, verify hashes, pick latest
│   ├── split.ts                         # prose → cover + section pages (S1–S5)
│   ├── anchors.ts                       # GitHub slugs, anchor map, number map, page slugs
│   ├── remark-link-references.ts        # T1–T4 and the link graph
│   ├── rehype-keywords.ts               # T5
│   ├── rehype-verbatim-fallback.ts      # allowlist, B4
│   ├── schema.ts                        # $defs, layers from Appendix A.2, $ref graph
│   ├── examples.ts                      # example ↔ 17.x section, "demonstrates", embedded-copy check
│   ├── visuals.ts                       # Mermaid generators: metamodel, layer map, document structure
│   └── stubs.ts                         # moved/removed pages for latest (D13)
├── components/reference/
│   ├── ReferenceLayout.astro            # TOC, prev/next, provenance, version banner, search box
│   ├── Toc.astro
│   ├── Provenance.astro
│   ├── VersionBanner.astro
│   ├── ReverseLinks.astro               # Referenced from / Described in / Illustrated by
│   ├── SchemaDefinition.astro
│   ├── Visual.astro                     # <picture>, caption, <details> with Mermaid text
│   └── ExampleScreenshots.astro         # shared screenshot figure from spec 003, or the "no host" notice
└── pages/[language]/
    ├── index.astro                      # landing
    ├── search.astro
    ├── schema/[version]/[file].ts       # byte-identical schema at its $id
    └── [version]/                       # [version] ∈ published versions ∪ {latest}
        ├── index.astro                  # cover
        ├── [section].astro              # section pages and latest stubs
        ├── schema.astro
        ├── examples/index.astro
        ├── examples/[stem].astro
        ├── examples/files/[file].ts     # byte-identical example files
        ├── [prose].ts                   # byte-identical prose file
        └── reference-links.json.ts      # link graph (D5)
scripts/reference/
├── refresh.ts                           # npm run reference:refresh
└── check.ts                             # npm run check:reference
tests/reference/
├── fixtures/dedl-aaef333/               # pinned copy of the source
├── split.test.ts
├── anchors.test.ts
├── link-references.test.ts
├── keywords.test.ts
├── verbatim-fallback.test.ts
├── visuals.test.ts
└── refresh.test.ts
```

**Structure decision**: there is one project, a static site with its scripts beside it, as in spec 003. The reference's code is written for any language in `languages.json`, so the second language (D17) needs data, not code. Snapshots live under `src/content/`, where the build reads them without network access.

## Dependencies on other work

| On | Needed for | Status on 2026-09-26 |
|---|---|---|
| Spec 001 plan and implementation: Astro skeleton, layout, navigation, CI (link check, WCAG), publishing | building and publishing any page | spec written; plan still a template in its worktree |
| Spec 003: the shared screenshot reader and figure (its source S2), source-record rendering | FR-017 | planned (proposes Astro); the `Example` and `Shows` columns are added to its S2 by this plan ([contracts/source-inputs.md](contracts/source-inputs.md) S3) |
| Spec 004: the DEDL refresh procedure and its trigger on source changes | FR-001 over time, US1 of spec 004 | spec written; calls `reference:refresh` and `check:reference` |
| `etalii-adp/etalii.adp`: a `LICENSE` | FR-015, the first publish | missing |
| `etalii-adp/etalii.adp`: the publisher named in 2.1, the `examples/` paths in section 17 | accuracy of the source (not blocking) | reported upstream |
| An IDE host able to load a DEDL definition, with screenshots committed | FR-017 screenshots | none yet; the pages say so |
| The owner's decision on the sibling language's name (SEDL proposed) | naming in the language registry and navigation | open (D17) |

## Complexity Tracking

| Item | Why needed | Simpler alternative rejected because |
|---|---|---|
| A headless Chromium (Playwright) in the site build, for `rehype-mermaid` (principle VI) | FR-018 and the owner's request for Mermaid-visualised examples, readable without scripting (principle IV) and in both colour schemes | Client-side `mermaid.js`: about 1 MB of script, and nothing shows without scripting. Pre-rendering SVGs in the refresh and committing them: generated views go stale whenever the site's generators change, and it doubles each refresh diff. Third-party renderers (Kroki, mermaid.ink): third-party requests. |
| `/adp/dedl/latest/` is a full copy of the latest version instead of a redirect | FR-007 together with US2: a heading link through the version-independent address must land on the heading | GitHub Pages has no server redirects, and `<meta refresh>` drops the fragment. A 404-page script needs scripting. The copies carry `rel="canonical"` and are excluded from search. |
