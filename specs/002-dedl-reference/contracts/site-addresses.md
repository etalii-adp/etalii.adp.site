# Contract: Site Addresses of the DEDL Reference

These addresses are the reference's public interface. Readers link to them, validators fetch them, and specs 001, 003 and 004 link to them. Every address sits under the site base `https://etalii.net/adp`. `<v>` is a published version such as `0.1`.

## Pages

| Address | Page | Notes |
|---|---|---|
| `/adp/dedl/` | DEDL landing | latest version's cover and table of contents, list of all versions, links to schema, examples, search |
| `/adp/dedl/<v>/` | cover of version `<v>` | title, version, status, date, metadata table, "Status of this document", generated table of contents |
| `/adp/dedl/<v>/<section-slug>/` | one top-level section or appendix | slug per research D4, e.g. `layer-1-metamodel`, `appendix-c-glossary` |
| `/adp/dedl/<v>/<section-slug>/#<heading-id>` | a heading | `<heading-id>` is the GitHub slug of the source heading, e.g. `#510-snap-rules` |
| `/adp/dedl/<v>/schema/` | schema browser | |
| `/adp/dedl/<v>/schema/#def-<Name>` | one schema definition | `<Name>` is the `$defs` key, case kept |
| `/adp/dedl/<v>/examples/` | examples index | |
| `/adp/dedl/<v>/examples/<stem>/` | one example | e.g. `statemachine`, `timeline-document` |
| `/adp/dedl/latest/…` | copy of the latest version at the same relative path | `rel="canonical"` → the versioned twin |
| `/adp/dedl/latest/<old-slug>/` | stub for a page that was moved or removed | "moved to" or "removed in", link to last version that had it |
| `/adp/dedl/search/` | search | `?v=<v>` preselects a version; `?q=` a query |

The slugs `latest`, `schema`, `search` and `examples` are reserved. A section slug that equals one of them fails the build.

## Files

| Address | Content | Served as |
|---|---|---|
| `/adp/dedl/schema/<v>/dedl.schema.json` | the schema, byte-identical to the source at the recorded revision; equals its `$id` | `application/json` |
| `/adp/dedl/<v>/examples/files/<file>` | an example file, byte-identical | `.json` → `application/json`; `.dedl` → GitHub Pages' default for an unknown extension (a download) |
| `/adp/dedl/<v>/DEDL-specification.md` | the prose source, byte-identical, for readers who want the single file | `text/markdown` |
| `/adp/dedl/<v>/reference-links.json` | the link graph of research D5, for review | `application/json` |

## Guarantees

1. **Permanence** (FR-006, SC-004): once a version is published, every page, heading and file address under `/adp/dedl/<v>/` stays valid for as long as the version is published. A refresh of the same version may change content, but it keeps every heading id the source still has.
2. **Latest** (FR-007): `/adp/dedl/latest/<path>` always shows the most recent version. A path the latest version no longer has resolves to a stub, never to a 404.
3. **Schema identity** (FR-009): the schema address equals the path of the schema's `$id`. The refresh refuses a snapshot where they differ.
4. **No scripting required** for any page. Search needs it, and says so without it (FR-014).

## Links from other features

- Spec 001's documentation navigation links to `/adp/dedl/`.
- Spec 003's designer pages link to `/adp/dedl/` (spec 003 FR-008) and may link to `/adp/dedl/latest/<section-slug>/`.
- Spec 004's refresh procedure runs `reference:refresh` and `check:reference` ([refresh-cli.md](refresh-cli.md)).
