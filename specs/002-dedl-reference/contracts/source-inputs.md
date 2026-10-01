# Contract: What the Reference Expects from Its Sources

If a source changes one of these expectations, the refresh stops and reports it (FR-013). It never guesses. A change to an expectation is made by amending this contract and the refresh together.

## S1. The specification folder: `etalii-adp/etalii.adp`, `specifications/<language>/`

| Expectation | Checked by | If violated |
|---|---|---|
| The repository is public and readable without a token. | refresh | stop: "source unreachable" |
| The repository has a licence the GitHub licence API can identify. | refresh | stop: "source has no licence" (FR-015) |
| Exactly one prose file, named as in `languages.json` (`DEDL-specification.md`) | refresh | stop |
| The prose opens with an H1, then a line `**Specification, version <v> (<status>)**` | refresh | stop: "version not declared" |
| The prose has a metadata table with a `Date` row (`YYYY-MM-DD`) | refresh | stop |
| Top-level sections start with an H2 `## <n>. <title>`; after it, every H2 starts a page, `## Appendix <X> — <title>` an appendix and any other (`## Changes from 0.1`) a page without a number (DISL 0.2, 2026-10-01) | build | build fails when there is no `## 1. …` |
| Heading texts are unique enough that their GitHub slugs are unique | build | build fails, naming both headings |
| One schema file, named as in `languages.json`, whose `$id` is `https://etalii.net/adp/<language>/schema/<v>/<schema>` with the same `<v>` | refresh | stop: "schema version or address mismatch" |
| Every other example file (`.dis`, `.did`, `.fbl` or `.json`) has a `$schema` of the language's schema address with `#/$defs/Specification`, `#/$defs/Definition` or `#/$defs/Document`; its version may be older than the prose's, which reads it (DISL 0.2 reads every 0.1 specification), never newer | refresh | no such `$schema`: stored as `other`, reported, not published; a newer version: stop, "schema version or address mismatch" |
| A section of the prose embeds each example after a line ``File `…/<file>`:`` | build | warning: the example page has no "what it demonstrates" and no section link |
| Appendix A.2 maps layers to `$defs` names in a two-column table | build | warning: schema definitions shown without layer grouping |
| Appendix C is a two-column table of terms, with each term in bold | build | warning: no glossary links (T4) |

## S2. Diagrams in the prose

A fenced code block with the info string `mermaid` is rendered as a diagram (rendering rule B3). The source SHOULD give each diagram `accTitle` and `accDescr` lines, which become its alt text. Without them, the build takes the alt text from the paragraph just before the diagram and reports the gap.

## S3. IDE screenshots of examples

This extends spec 003's screenshot source (S2 there) and does not replace it. In an IDE repository's `docs/screenshots/readme.md` table, a row that shows a DEDL example carries two more columns:

| Column | Value | Example |
|---|---|---|
| `Example` | `<language>/<version>/<file>` | `dedl/0.1/timeline.dedl` |
| `Shows` | `definition` (the definition open in the host's DEDL tooling) or `diagram` (a diagram made with the definition) | `diagram` |

- A row without these columns is not an example screenshot. It may still be a catalogue screenshot for spec 003.
- The image must be committed in the IDE repository. The site never captures images itself (spec 004 FR-013).
- An image from a repository without a licence is not published, and the gap is reported (spec 003 D10).
- An image whose `Example` names a version or file the reference does not have is reported and not published.

## Requests to the source repository, raised by this plan

1. Add a `LICENSE`. The first publish is blocked without one.
2. Section 2.1 names the publisher as `etalii-adp/adp`. The site is `etalii-adp/etalii.adp.site`, served at `etalii.net/adp`.
3. The ``File `examples/<name>` `` lines point at an `examples/` folder, but the files sit beside the prose. The paths should match one way or the other.
4. Where the prose cites section numbers, explicit Markdown links would be better. They are not required, because rendering rule T2 links the numbers, but explicit links are unambiguous.
5. Diagrams of layers and examples would be welcome in the prose, as Mermaid with `accTitle` and `accDescr` (S2).
