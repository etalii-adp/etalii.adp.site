# Research: DEDL Reference

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-26

Each decision records what was chosen, why, and what else was considered. The findings about the source were taken on 2026-09-26 from `etalii-adp/etalii.adp` at `develop`, revision `aaef3334992b1b70bc6728b793d2f63bb71a40cb`.

## What the source holds today

- **Repository**: `etalii-adp/etalii.adp`, public, default branch `develop`, **no licence file** (spec assumption; blocks the first publish, D14).
- **Folder** `specifications/dedl/`, flat, six files:

  | File | Size | What it is |
  |---|---|---|
  | `DEDL-specification.md` | 451 KB, 5,098 lines | the prose specification |
  | `dedl.schema.json` | 210 KB | JSON Schema draft 2020-12, 141 `$defs`, `$id` `https://etalii.net/adp/dedl/schema/0.1/dedl.schema.json` |
  | `statemachine.dedl`, `timeline.dedl`, `erd.dedl` | 10–23 KB | example definitions (JSON), `$schema` pointing at `…/0.1/dedl.schema.json#/$defs/Definition` |
  | `timeline.document.json` | 2 KB | example document, `$schema` `…#/$defs/Document` |

- **Shape of the prose**:
  - It opens with an H1 title and a bold line `**Specification, version 0.1 (Working Draft)**`. A two-column metadata table follows (Date `2026-09-25`, schemas, expression language, media types). Then come `## Status of this document` and a hand-written `## Table of contents`.
  - There are 17 numbered H2 sections (`## 1. Introduction` … `## 17. Complete examples`), then `## Appendix A` to `## Appendix D`. H3 headings are numbered `4.3`, `A.2` and so on.
  - Some headings end in `*(informative)*`, which marks non-normative text.
- **Constructs used**:
  - GFM tables: about 1,290 table rows, several wider than a phone screen.
  - 128 fenced code blocks: 59 marked `json`, 69 without a language.
  - 21 in-document links, all `(#anchor)` and all in the table of contents.
  - No images, no Mermaid, and no raw HTML outside code. Every `<svg>`, `<script>` or `<name>` sits inside a code span.
- **Cross-references are mostly plain text**:
  - About 80 are parenthesised section numbers such as `(12.3)`, `(6.16)` or `(14.1 step 9)`.
  - About 25 use phrasing: `section 10`, `Appendix B`, `Appendix B.7`.
  - A few are `$defs/Name` code spans.
- **Normative key words**: RFC 2119/8174, "when, and only when, they appear in bold capitals". There are 14 such occurrences today.
- **Glossary**: Appendix C is a two-column table, with each term in bold in the first column.
- **Schema ↔ layer map**: Appendix A.2 is a table from layer (Common, Top level, 1 · Metamodel … 8 · Persistence, Documents) to the `$defs` names that belong to it.
- **Examples ↔ sections**:
  - Sections 17.1 to 17.4 each embed one example in full, introduced by a line ``File `examples/<name>`:``.
  - The files actually live beside the prose, not in an `examples/` folder, so the site matches by file name only.
  - Each 17.x section opens with a bullet list, one bullet per layer (`**Metamodel:** …`), which says what the example demonstrates.
- **Stale text in the source**: section 2.1 names the publisher as "the ADP website, `etalii-adp/adp`". The site does not correct it (principle II). The mismatch is reported upstream (plan, "Dependencies").

## D1. Site generator and Markdown pipeline

- **Decision**: Astro, the generator proposed for the whole site in spec 003's plan (research D5 there): TypeScript 5, Node.js 24 LTS, static output under `base: '/adp'`. The specification is parsed with the unified toolchain Astro already bundles: `remark-parse`, `remark-gfm`, `mdast` → `hast`, and `rehype-stringify`. This feature adds its own remark and rehype plugins, listed below.
- **Rationale**:
  - The reference cannot be a plain Markdown collection. One source file has to become about 22 pages, with anchors, cross-references and links rewritten across pages. That needs control over the syntax tree, and unified gives it.
  - Using the same toolchain as the rest of the site avoids a second Markdown renderer.
- **Alternatives considered**:
  - A dedicated documentation generator such as Docusaurus, VitePress or MkDocs. That would be a second site generator next to spec 001's, and its client-side routers work against principle IV.
  - Rendering the whole file as one page. That fails FR-002 and is 451 KB of HTML.

## D2. Where the reference's content lives

- **Decision**: a verbatim snapshot per published version is committed to this repository, at `src/content/reference/dedl/<version>/`. It holds the six source files byte for byte, plus `source.json`, the source record (data model). The refresh script writes snapshots. Nothing else writes them, and the build reads only them.
- **Rationale**:
  - FR-006 keeps old versions published after the source has moved on, and the source holds only its current version.
  - A committed snapshot makes the build reproducible and offline, which is the same reasoning as spec 003 R2.
  - A refresh then shows up as a readable diff in its pull request (spec 004 US1 AS4).
- **Alternatives considered**:
  - Fetching the source at build time, from pinned revisions per version. This needs network access in every build, and a source outage breaks publishing, against FR-013's spirit.
  - A git submodule. It pins only one revision, so it cannot hold several versions side by side.

## D3. Versions and addresses

- **Decision** (full list in [contracts/site-addresses.md](contracts/site-addresses.md)):
  - `/adp/dedl/` is the DEDL landing page. It shows the latest version's cover and table of contents, and links to all versions, the schema and the examples.
  - `/adp/dedl/<version>/…` holds each version's pages. These addresses are permanent (FR-006).
  - `/adp/dedl/latest/…` is a full copy of the latest version's pages, and each copy carries `rel="canonical"` pointing at its versioned twin (FR-007).
  - The version string is the one the source declares, e.g. `0.1`. The refresh checks that it agrees with the version in the schema's `$id` and in every example's `$schema`, and stops if it does not.
- **Rationale**:
  - GitHub Pages has no server redirects. A `<meta http-equiv="refresh">` drops the `#fragment`, and the fragment is the whole point of US2. So "latest" must be a real copy for `…/latest/<page>/#<heading>` to land on the heading.
  - `rel="canonical"` keeps search engines from treating the copies as duplicates.
- **Alternatives considered**:
  - Only versioned addresses, with `latest` as a redirect. This loses fragments, which fails US2 AS1 through the latest address.
  - A script-based redirect in the 404 page. Principle IV rules it out.

## D4. Splitting into pages and heading addresses

- **Decision**:
  - **Cover page**: everything before `## 1.` is the version's cover page, `/adp/dedl/<version>/`. It carries the title, the version line, the metadata table, "Status of this document" and a table of contents the site generates. The source's hand-written table of contents is dropped and replaced by the generated one. Dropping it is a structural transform, not an edit, and it is listed in [contracts/rendering-rules.md](contracts/rendering-rules.md).
  - **Section pages**: each `## N. …` and `## Appendix X — …` becomes one page. The page slug is the heading's GitHub slug without its leading number, with runs of `-` collapsed. For example, `## 4. Layer 1 — Metamodel` becomes `layer-1-metamodel`, and `## Appendix C — Glossary` becomes `appendix-c-glossary`.
  - **Heading ids**: every heading keeps exactly the id GitHub gives it (`github-slugger`), for example `#51-concepts`. A link written against the source on GitHub therefore maps one-to-one onto the site.
  - **Previous and next** links follow document order (US1 AS4).
- **Rationale**:
  - Using the source's own ids makes FR-004 mechanical, because every `(#x)` in the source resolves through one anchor→page map. It also makes FR-005 predictable.
  - Dropping the number from page slugs means a section that is renumbered in a later version keeps its page address in `latest`.
- **Alternatives considered**:
  - Number-based slugs such as `/0.1/4/`. These are fragile when sections are renumbered, and meaningless to read.
  - Site-invented heading ids. These would break every link people already made against GitHub.

## D5. Cross-references and linking between aspects (FR-004, FR-019)

- **Decision**: a remark plugin, `link-references`, runs over prose. It skips code, headings and existing links, and it:
  1. rewrites `(#anchor)` links to `<page>/#anchor`;
  2. links bare section numbers when a heading with that number exists. It recognises the forms `(12.3)`, `(14.1 step 9)`, `section 10`, `sections 5 and 6`, `Appendix B` and `Appendix B.7`, and only the number is linked;
  3. links `` `$defs/Name` `` code spans, and code spans that exactly equal one of the 141 `$defs` names, to the schema browser (D8);
  4. links the first occurrence per page of each glossary term (Appendix C, bold first column) to its glossary entry. It matches whole words and ignores case, and never links inside a heading or link.

  Every link it makes is written to a link report (`reference-links.json`, build output). The refresh pull request shows the diff of that report, so a human can see a wrongly linked number.

  Reverse links are generated from the same link graph:
  - every section page ends with "Referenced from" (the sections that link to it);
  - every schema definition shows "Described in" (the sections that link to it, and its layer's section, from Appendix A.2);
  - every section of a layer shows "Illustrated by", the examples that populate that layer (D9).
- **Rationale**:
  - The owner asked for "sufficient linkage between the different aspects of the specification".
  - The source links almost nothing explicitly, but it cites section numbers about 100 times in a regular form.
  - Linking only numbers that resolve to a heading avoids inventing links.
  - The report keeps the heuristic reviewable.
- **Alternatives considered**:
  - Asking the source to write explicit Markdown links everywhere. That is better long term, and it is proposed upstream, but the site cannot wait for it. The plugin keeps working after the source adopts explicit links, because explicit links are left alone.
  - Linking every glossary occurrence. That is noisy and hurts screen-reader users (WCAG 2.4.4 context).

## D6. Normative key words (FR-003)

- **Decision**: a rehype plugin turns `<strong>` elements whose whole text is one of the ten RFC 2119 phrases into `<strong class="kw">`. They are styled in small caps with a distinct colour, and they stay bold, so they are not distinguished by colour alone (WCAG 1.4.1).
- **Rationale**:
  - The source's own rule says only bold capitals are normative. Matching `<strong>` exactly follows that rule, and never marks a plain "must" in prose.
- **Alternatives considered**: matching capitals anywhere in the text. That would also mark words the source does not treat as normative, such as code or quotes.

## D7. Faithful rendering and its fallback (FR-003, FR-012)

- **Decision**:
  - The renderer allows a fixed set of mdast node types: paragraph, heading, list, listItem, table, blockquote, code, inlineCode, emphasis, strong, delete, link, thematicBreak, break, text, image, and footnotes.
  - Raw HTML, or any other node type, is shown as its original source lines in a `<pre class="verbatim">` block, with a note that it is shown as written. Code blocks keep their text exactly. JSON blocks get build-time syntax highlighting (Shiki, bundled with Astro, no client script).
  - Tables are wrapped in a focusable, labelled region that scrolls on its own axis, so the page never scrolls sideways at phone width (principle IV).
- **Rationale**: the spec prefers verbatim text to a wrong rendering. An allowlist fails safe when a new construct appears in a later version.
- **Alternatives considered**: sanitising raw HTML and rendering it. That can silently change meaning, and today there is no raw HTML to support.

## D8. Schema: publishing and browsing (FR-009, US3)

- **Decision**:
  - A static endpoint, `src/pages/dedl/schema/[version]/dedl.schema.json.ts`, emits the snapshot's schema bytes unchanged at `/adp/dedl/schema/<version>/dedl.schema.json`, the address in its `$id`. GitHub Pages serves `.json` as `application/json` and sends `Access-Control-Allow-Origin: *`, so browser-based validators can fetch it too.
  - A schema browser at `/adp/dedl/<version>/schema/` lists all `$defs`, grouped by the layers of Appendix A.2. Each definition has the anchor `#def-<Name>`, its JSON shown pretty-printed, and `$ref` values turned into links. It also shows its "Described in" links (D5).
  - The raw file is linked for download.
- **Rationale**:
  - The address must equal the `$id` for validators and editors that resolve `$schema` URLs (US3 AS2).
  - The browser gives the schema the linkage the owner asked for.
- **Alternatives considered**:
  - Copying through `public/`. A plain copy cannot be versioned from the snapshot folder without a pre-build step.
  - A third-party schema viewer. That would bring third-party resources, which principle IV forbids.

## D9. Examples: documentation and generated visuals (FR-010, FR-016)

- **Decision**:
  - `/adp/dedl/<version>/examples/` is an index page. Each example has its own page at `/adp/dedl/<version>/examples/<stem>/`, where the stem is the file name without extension, with `.` replaced by `-` (for example `timeline-document`). The raw file sits at `/adp/dedl/<version>/examples/files/<file>`, which is a download.
  - An example page holds:
    - its name and purpose, from `language.label` and `language.doc` for a definition, or from the embedding section's title for a document;
    - "What it demonstrates": the layer bullet list of the 17.x section that embeds the file, where each layer name links to its layer section;
    - a link to that 17.x section;
    - the generated visuals below;
    - the file itself, highlighted;
    - the screenshots of D11.
  - Generated visuals are Mermaid text written by the build from the example file:
    - **Metamodel view** (definitions): a `classDiagram` of node types, relation types, attributes with their types, inheritance, and containment, with multiplicities where declared.
    - **Layer map** (definitions): a `flowchart` of the eight layers, marking which ones the example fills and how many items each holds. Each node links to the layer's section.
    - **Document structure** (documents): a `flowchart` of the document's elements and relations by id and type.

    Each visual is captioned "Generated from `<file>` at `<revision>`". The document view also says that it shows the data, not the notation the designer draws.
  - The build compares each embedded example in section 17 with its file, after normalising JSON. A difference is reported to the source as a warning and never blocks the build.
- **Rationale**:
  - The owner asked for examples to be "sufficiently documented and visualized, so use mermaid diagrams and images wherever possible".
  - Views generated from the example file are sourced, never retyped (principle II). They stay correct when the example changes, and they need no hand-drawn diagram on the site side.
- **Alternatives considered**:
  - Hand-drawn diagrams on the site. They are retyped content and drift from the source.
  - Rendering the example with its own notation, as a DEDL runtime would. That implements a DEDL runtime inside the site, and it risks showing a picture no IDE actually produces (principle III). Real renderings come from IDE screenshots (D11).

## D10. Mermaid rendering (FR-018)

- **Decision**:
  - Mermaid is rendered at build time with `rehype-mermaid` (strategy `img-svg`, `dark: true`), which drives `mermaid-isomorphic` through a headless Chromium from Playwright.
  - Each diagram becomes a `<picture>` with a light SVG and a dark SVG chosen by `prefers-color-scheme`.
  - Its `alt` text is the diagram's `accTitle` and `accDescr`. The generator always writes both, and for source diagrams the author does, with a fallback to the preceding caption.
  - A `<details>` element under each diagram holds the Mermaid text as a full text alternative.
  - This covers Mermaid fences in the source specification, which is ready for when the source adds them, and the generated views of D9.
- **Rationale**:
  - Principle IV forbids scripting as a condition of reading, and forbids third-party resources. Client-side `mermaid.js` is about 1 MB of script and needs scripting to show anything. Build-time SVG needs none.
- **Alternatives considered**:
  - `@mermaid-js/mermaid-cli` inside the refresh script, with the SVGs committed. That keeps Chromium out of the site build, but generated views would go stale when the site's generator changes, and it doubles the files in each refresh diff.
  - Kroki or mermaid.ink. Both are third-party services.
  - Client-side Mermaid. This violates principle IV.
- **Cost**: Chromium (about 150 MB) in CI, cached between runs. Recorded under Complexity Tracking in the plan.

## D11. IDE screenshots of examples (FR-017)

- **Decision**:
  - Screenshots of examples come only from the IDE repositories' `docs/screenshots/`, and only when already committed there (spec 004 FR-013). The site's screenshot reader is shared with spec 003 (its source S2).
  - This feature asks the screenshot readmes for two more columns: `Example`, which names `dedl/<version>/<file>`, and `Shows`, which is `definition` for the definition open in the host or `diagram` for a diagram made with it. The contract is [contracts/source-inputs.md](contracts/source-inputs.md) S3.
  - When no host has such a row, the example page says: "No IDE host runs this example yet." That notice is deliberate, not a placeholder image.
  - Images from a repository without a licence are not published (the same rule as spec 003 D10).
- **Rationale**: principle III says screenshots show the real product and are captured from it. The owner asked for screenshots "in case that we achieve real definitions that can be used in one or more of the IDE's". Today none can load a DEDL definition, so the notice is what is true.
- **Alternatives considered**: capturing screenshots from this site's build. Spec 004 forbids it, and this site has no IDE.

## D12. Search (FR-014, FR-020)

- **Decision**:
  - Pagefind builds a static index after the Astro build. Its script and WebAssembly are self-hosted under `/adp/pagefind/`, with no third-party requests. Only reference pages are indexed (`data-pagefind-body`), and only the versioned pages, never the `latest` copies.
  - Each page carries the Pagefind filters `language` (for example `dedl`) and `version`, and the meta fields `section` and `version`, which search results display (FR-020).
  - The search page, `/adp/dedl/search/`, preselects the latest version and offers the others. There is also a small search box on every reference page, which the script enhances.
  - Without scripting, the search page says that search needs scripting and links to the table of contents, the glossary and the schema browser.
- **Rationale**:
  - FR-014 allows search to require scripting, but no third party (principle IV). Pagefind is built for exactly this: static, chunked and small on the wire.
  - Pagefind would also serve spec 003's catalogue or spec 001's site search later, without a second tool.
- **Alternatives considered**:
  - Algolia DocSearch. It is a third party and sets requests off-site.
  - Lunr or FlexSearch with a self-built JSON index. This means writing the indexing and result UI by hand, and the index would be one large download.
  - No search. That fails FR-014 and the owner's review comment.

## D13. Superseded versions and removed sections (FR-008, edge cases)

- **Decision**:
  - Every page of a version that is not the latest shows a banner: "A newer version of DEDL exists: `<latest>`". The banner links to the same page in the latest version if that page slug exists there, otherwise to the latest cover.
  - For each page slug that existed in an older version but not in the latest, the build generates a stub at `/adp/dedl/latest/<slug>/`. The stub says either "moved to …" or "removed in `<version>`", and links to the last version that had it.
  - "Moved to" is chosen automatically when a heading with the same title, ignoring its number, exists in the latest version. Otherwise the stub says "removed". There is no hand-written redirect file.
- **Rationale**:
  - This covers the spec's edge case for latest addresses.
  - Versioned addresses never break (FR-006), because old versions stay published.
- **Alternatives considered**: a hand-kept redirect table, as spec 003 R10 has. Here the old versions are always present, so the mapping can be derived.

## D14. Provenance and licence (FR-011, FR-015)

- **Decision**:
  - Every reference page shows a provenance block: the DEDL version, status and date; the repository `etalii-adp/etalii.adp`; the revision, as 7 characters linked to the file at that full revision on GitHub; the generation date; the licence; and "Report a problem", which links to the source repository's issues (US4 AS2).
  - The licence comes from the source repository's `LICENSE`, read by the refresh through the GitHub licence API and stored in `source.json`.
  - `check:reference` fails when a snapshot has no licence, so a reference without a licence cannot be merged.
- **Rationale**:
  - Principle II requires the provenance.
  - The constitution says sourced content keeps its source's licence, stated beside it.
  - The spec says the licence must be resolved before the first publish.
- **Alternatives considered**: publishing with "licence to be determined". The constitution requires a licence to be stated.

## D15. Refresh command (FR-001, FR-013; handed to spec 004)

- **Decision**:
  - `npm run reference:refresh -- dedl [--revision <sha>]` does the following:
    - resolves `develop`, or the given revision, to a full SHA;
    - downloads the six files through the GitHub contents API, which needs no token because the repository is public;
    - reads the licence;
    - derives the version and checks that it agrees with the schema and the examples;
    - writes the snapshot to a temporary folder and moves it into `src/content/reference/dedl/<version>/` only when every step has succeeded.
  - If the declared version already has a snapshot, the refresh replaces it. If it does not, the refresh adds a new one and leaves every older snapshot untouched.
  - It exits `0` when content changed, `3` when nothing changed, and `1` on failure, with a report on stdout that spec 004's procedure puts into its pull request.
- **Rationale**:
  - FR-013 is met by the write-last rule: on any failure the working tree is unchanged.
  - The exit codes give spec 004 its "nothing changed" branch (spec 004 FR-007).
- **Alternatives considered**: `git clone` of the source. This fetches the whole repository, including tooling, for six files.

## D16. Checks (SC-001 to SC-004)

- **Decision**: `npm run check:reference` runs after the build, over `dist/`. It checks the following:
  - **Headings (SC-001)**: every heading in every snapshot has an element with its id on the expected page.
  - **Links (SC-002)**: every internal link and fragment under `/adp/dedl/` resolves. This runs alongside spec 001's site-wide link check.
  - **Examples (SC-003)**: every example validates against its version's schema, using `ajv` in draft 2020-12 mode with `ajv-formats`.
  - **Schema bytes**: the published schema is byte-identical to the snapshot, and each example file is too.
  - **Provenance**: every reference page has the provenance block with a 40-character revision and a licence.
  - **Links out**: no page of a superseded version lacks the newer-version banner.
  - **Search**: the Pagefind index holds every section of the latest version.

  Unit tests (Vitest) cover the splitter, the slug and anchor map, the cross-reference linker, the key-word marker, the example diagram generator and the refresh's version checks, against a pinned fixture copy of the source.
- **Rationale**: principle V requires procedures to verify their own result, and these are the checks spec 004's procedure runs before opening its pull request.

## D17. The sibling language for designers that are not diagrams

- **Decision**:
  - The plan proposes **SEDL, Structured Editor Definition Language**, for the second specification: designers that are not diagrams, such as forms, tables and grids, trees and outlines, and structured text. The owner decides; this name is a proposal.
  - Whatever the name, this feature keeps the language as a parameter throughout:
    - a registry `src/content/reference/languages.json` (id, name, source path, schema file name, address prefix);
    - routes `src/pages/[language]/…`;
    - snapshots `src/content/reference/<language>/<version>/`;
    - Pagefind filter `language`.

    Adding the second language is then a registry entry plus its refresh, which matches the spec's assumption, and needs no new mechanism.
- **Rationale for the name**:
  - "Structured editor" is the established term for editors that work on a document's structure rather than on free text or free geometry. It covers forms, tables, trees and projectional text, which are the designers the owner means.
  - SEDL is four letters, sounds like DEDL, and reads as its sibling.
- **Alternatives considered**:
  - **TEDL**, Text Editor Definition Language: too narrow, since forms and tables are not text.
  - **FEDL**, Form Editor Definition Language: too narrow.
  - **VEDL**, View Editor Definition Language: vague, because diagrams are views too.
  - **DDL**, Designer Definition Language: clashes with SQL's Data Definition Language.
  - **PEDL**, Projectional Editor Definition Language: accurate, but "projectional" is jargon to most readers.
