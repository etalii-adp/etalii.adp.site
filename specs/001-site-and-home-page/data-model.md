# Data Model: Site and Home Page

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-26

The site has no database. Its entities are page frontmatter and a few data files, validated by Astro content collections at build time: a record that breaks a rule below fails the build.

## Page

A unit of content at one address under `/adp/`. Written by hand as MDX under `src/content/docs/`, or generated under `src/pages/` and wrapped in `<StarlightPage>` (spec 003).

| Field | Type | Rule |
| --- | --- | --- |
| `title` | string | required, non-empty; the page's `<h1>` and `<title>` |
| `description` | string | required on every page, used for `<meta name="description">` |
| `part` | `product` \| `documentation` | required; drives the part marker in the header (FR-003) |
| `section` | section id | required except on the home page; the top-level section it belongs to, drives breadcrumbs |
| `template` | `splash` \| `doc` | Starlight's; product pages use `splash`, documentation pages `doc` |
| `sidebar` | Starlight's sidebar options | optional; order and label in the documentation sidebar |

Address: derived from the file path, always ending in `/` (`trailingSlash: 'always'`). Every page is reachable from the home page within two selections (FR-009): the home page or the footer site map links every section, and each section's start page links its pages.

## Part

`product` or `documentation`. Not a stored record; a fixed pair in `src/data/sections.ts` with a label and a start address: Product → `/adp/`, Documentation → `/adp/docs/`.

## Section

A top-level section of one part, listed in `src/data/sections.ts` in navigation order.

| Field | Type | Rule |
| --- | --- | --- |
| `id` | slug | unique |
| `label` | string | shown in header, sidebar, footer and breadcrumbs |
| `part` | part | required |
| `href` | address under `/adp/` | must resolve to a page in the build (checked by the link check) |
| `status` | `available` \| `coming` | `coming` shows a "Coming" badge wherever the section is listed (US2 AS2) |
| `deliveredBy` | spec id | required when `status` is `coming`; named on the section's "Coming" page |

Initial sections:

| id | label | part | href | status | deliveredBy |
| --- | --- | --- | --- | --- | --- |
| `home` | Home | product | `/adp/` | available | 001 |
| `docs` | Documentation | documentation | `/adp/docs/` | available | 001 |
| `dedl` | DEDL reference | documentation | `/adp/dedl/` | coming | 002 |
| `designers` | Designers | documentation | `/adp/designers/` | coming | 003 |

State transition: `coming` → `available` when the delivering spec's pull request replaces the "Coming" page. There is no transition back; a withdrawn section is handled by a redirect.

## IDE host

One of the four environments ADP runs in. File: `src/data/hosts.yaml`; schema: [contracts/hosts.schema.json](contracts/hosts.schema.json).

| Field | Type | Rule |
| --- | --- | --- |
| `id` | `standalone` \| `intellij` \| `vscode` \| `eclipse` | unique; all four present, in this order |
| `name` | string | display name: "Standalone", "IntelliJ Platform", "Visual Studio Code", "Eclipse" |
| `summary` | string | one line: what running ADP in this host means |
| `state` | `available` \| `in-progress` \| `planned` | shown as a text label (FR-006) |
| `link` | URL | optional; present only when its target is public; required when `state` is `available` |
| `linkLabel` | string | required with `link`, e.g. "Install from the Marketplace" |
| `unavailableNote` | string | required without `link`, e.g. "Not public yet" |
| `source` | source record | required (principle II) |

Rules: `state: available` without a public `link` fails the build (principle III). The four host IDs are shared with spec 003's catalogue.

## Focus area

One of the three task families ADP targets. File: `src/data/focus-areas.yaml`.

| Field | Type | Rule |
| --- | --- | --- |
| `id` | slug | unique |
| `name` | string | "Technology assessment", "Humans and agents together", "Clarity in textual data" (final wording in implementation, keeping the spec's three areas) |
| `problem` | string | one or two sentences: the problem a specialized designer solves there (US1 AS2) |
| `illustration` | path under `src/assets/illustrations/` | required; decorative |

Exactly three records (FR-005). The focus areas are the site's own words, not sourced content, so they carry no source record.

## Source record

Where a sourced item came from and how current it is (principle II). Embedded in each sourced record.

| Field | Type | Rule |
| --- | --- | --- |
| `repository` | `owner/name` | required, e.g. `etalii-adp/etalii.adp.ide.standalone` |
| `path` | string | file or area read, e.g. `README.md` |
| `revision` | full commit SHA | required, 40 hex characters |
| `taken` | date (YYYY-MM-DD) | required |
| `method` | `manual` \| `procedure` | `manual` for this feature's first take; spec 004's refresh writes `procedure` |
| `licence` | SPDX id or `none` | required; `none` is allowed only for items whose publication the owner confirmed |

The home page shows, under the host list, "Host states from the IDE repositories, taken on <latest `taken`>", and the footer names the icon's source.

## Redirect

A moved address. File: `src/data/redirects.ts`, a map from old address to new, passed to Astro's `redirects`. Both sides are under `/adp/`; the new side must resolve in the build. Empty in this feature.

## Files

```text
src/data/sections.ts        # parts and sections
src/data/hosts.yaml         # IDE hosts
src/data/focus-areas.yaml   # focus areas
src/data/redirects.ts       # moved addresses
src/assets/brand/SOURCE.md  # source record of the icon
src/content.config.ts       # collections and schemas for all of the above and the docs frontmatter
```
