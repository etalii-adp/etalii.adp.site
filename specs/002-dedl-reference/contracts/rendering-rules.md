# Contract: How the Source Becomes Pages

This contract states every transformation between the prose source and the published pages. Anything not listed here is rendered as written. A rule is changed by changing this contract first, because each rule is a place where the site might diverge from its source (principle II).

## Structure

| # | Rule | Research |
|---|---|---|
| S1 | Everything before the first `## <number>.` heading forms the cover page. | D4 |
| S2 | The H2 whose text is `Table of contents` and its body are not rendered. The generated table of contents replaces it. | D4 |
| S3 | Each H2 `## <n>. <title>` and `## Appendix <X> — <title>` starts a new page, which runs up to the next such H2. | D4 |
| S4 | Thematic breaks (`---`) directly before a page split are dropped. Everywhere else they are kept. | D4 |
| S5 | Every heading keeps the GitHub slug of its source text as its `id`. | D4 |

## Inline transformations

| # | Rule | Applies to | Research |
|---|---|---|---|
| T1 | `[text](#anchor)` → link to the page that holds `anchor`, same fragment | explicit links | D5 |
| T2 | A section number is linked to its heading. Forms: `(12.3)`, `(12.3 step 9)`, `(see 5.8)`, `section 10`, `sections 5 and 6`, `Appendix B`, `Appendix B.7`. Only the number or appendix letter is linked, and only when a heading with that number exists. | prose text; not code, headings or existing links | D5 |
| T3 | `` `$defs/Name` ``, and a code span equal to a `$defs` name, → link to `schema/#def-Name` | inline code in prose; not code blocks | D5 |
| T4 | The first occurrence per page of a glossary term (whole word, case-insensitive) → link to its entry in Appendix C | prose text; not in headings, links, code or Appendix C itself | D5 |
| T5 | A `<strong>` whose whole text is one of MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, OPTIONAL → `<strong class="kw">` | bold text | D6 |
| T6 | `*(informative)*` at the end of a heading → an "Informative" label on the heading; the text is kept | headings | D4 |
| T7 | Bare URLs → links, as GFM autolinks them | prose | D7 |

Text is never changed. T1 to T4 only wrap existing text in links, T5 only adds a class, and T6 only adds a label.

## Blocks

| # | Rule | Research |
|---|---|---|
| B1 | Code blocks keep their text exactly. `json` blocks get build-time highlighting. | D7 |
| B2 | Tables render as HTML tables inside a focusable, labelled region that scrolls horizontally on its own. | D7 |
| B3 | `mermaid` code blocks render as a light/dark `<picture>` of SVG. The Mermaid text follows in a `<details>` element. | D10 |
| B4 | Raw HTML, or a node type outside the allowlist, is shown as its source lines in `<pre class="verbatim">`, with the note "Shown as written in the source." | D7 |

## Allowlist of node types

`root`, `paragraph`, `heading`, `thematicBreak`, `blockquote`, `list`, `listItem`, `table`, `tableRow`, `tableCell`, `code`, `inlineCode`, `emphasis`, `strong`, `delete`, `link`, `image`, `break`, `text`, `footnoteDefinition`, `footnoteReference`.

## Added around the source text (never inside it)

- Page chrome: site navigation (spec 001), table of contents, previous and next links.
- The provenance block: version, status, date, repository, revision linked to the source, generation date, licence, "Report a problem" linked to the source repository's issues.
- The newer-version banner on superseded versions.
- Reverse-link lists: "Referenced from" at the end of each section page, "Described in" on each schema definition, and "Illustrated by" on layer sections.
- On example pages: the generated visuals and screenshots. These are always visibly separate from source text and captioned with their origin.
