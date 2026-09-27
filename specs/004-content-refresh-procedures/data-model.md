# Data Model: Content Refresh Procedures

**Feature**: `features/004-content-refresh-procedures` | **Plan**: [plan.md](plan.md) | **Research**: [research.md](research.md)

Every entity below is a file in this repository or a value derived from a source during a run. There is no database. The formats are defined in [contracts/](contracts/).

## Procedure

A written, step-by-step instruction for one kind of refresh (spec: Key Entities).

| Field | Type | Notes |
|---|---|---|
| `id` | kebab-case string | `refresh-dedl`, `refresh-screenshots`, `refresh-catalogue`, `refresh-hosts`, `refresh-all`. Also the file name (`procedures/<id>.md`) and the npm argument. |
| `title` | string | The phrase an agent is given, for example "Refresh the DEDL reference". |
| `sources` | list of Source | What it reads. Empty for `refresh-all`, which runs the others. |
| `targets` | list of paths | What it may change: `sources/<short>/**`, plus its mapping in `procedures/config/` when a decision is answered. |
| `branch` | string | `refresh/<short>`, where `<short>` is the id without `refresh-` (for example `refresh/dedl`). |
| `verification` | ordered list | Build, check, source-record check ([contracts/site-integration.md](contracts/site-integration.md)). |
| `decisions` | list | The questions it may ask (R9). Empty for DEDL and hosts. |

**Validation**:
- Every procedure document has all sections of the template ([contracts/procedure-document.md](contracts/procedure-document.md)) and is listed once in `procedures/README.md` (FR-011).
- The `targets` of two procedures never overlap (R2).

## Source

A repository and path that owns a kind of content, read at a specific revision.

| Field | Type | Notes |
|---|---|---|
| `repository` | `owner/name` | For example `etalii-adp/etalii.adp`. |
| `ref` | string | Always `develop` (FR-012). |
| `paths` | list of path globs | Watched paths inside the repository, for example `specifications/dedl/*`. |
| `host` | enum or null | `standalone`, `intellij`, `vscode`, `eclipse` for IDE repositories; null for `etalii.adp`. |

Sources are declared in the procedure's script configuration (`scripts/refresh/procedures/<short>.mjs`) and repeated in the procedure document's Sources section. `npm run refresh:lint` checks that the two agree.

## Source record

The repository and revision a sourced item on the site was taken from (FR-005). One entry per file in a procedure's lock ([contracts/source-lock.schema.json](contracts/source-lock.schema.json)).

| Field | Type | Notes |
|---|---|---|
| `path` | string | Path under `sources/<short>/`. |
| `repository` | `owner/name` | |
| `sourcePath` | string | Path inside the source repository. |
| `commit` | 40-hex SHA | The latest commit that touched `sourcePath` on `develop` at fetch time. |
| `gitBlob` | 40-hex SHA | The file's git blob SHA in the source at `commit`. Resolve compares it with the source's current blob to decide "current" without downloading (research R4). |
| `sha256` | 64-hex | Of the file as committed here. The source-record check recomputes it. |
| `licence` | SPDX id or `"unstated"` | Taken from the source repository's licence (constitution: sourced content keeps its licence). |

A lock also carries `procedure`, `refreshedAt` (ISO 8601), `sourceHeads` (repository → head SHA of `develop` at fetch time), `releases` (repository → latest release tag and its commit, for the catalogue and hosts procedures; research R10) and `withdrawn` (see Withdrawal). Three optional records were added during implementation: `inputs` (source files a procedure reads but does not copy, such as a screenshot readme, with their commit and blob, so Resolve compares them too), `derived` (the path and SHA-256 of each generated file, such as `catalogue.json`, so a hand edit is caught) and `config` (the SHA-256 of each mapping file the run applied, so a merged mapping change alone starts a refresh).

## Refresh run

One execution of a procedure. A run is not stored. Its outcome is reported to the caller and, when it produces one, in a pull request body or a blocked-issue body.

```text
            ┌──────────┐ unchanged ┌─────────┐
  start ──▶ │ Resolve  │ ────────▶ │ current │  (no PR; open PR closed if develop already matches)
            └────┬─────┘           └─────────┘
                 │ changed
            ┌────▼─────┐ error     ┌─────────┐
            │  Fetch   │ ────────▶ │ failed  │  (nothing changed; source named)
            └────┬─────┘           └─────────┘
            ┌────▼─────┐ unmapped  ┌──────────────────┐
            │  Apply   │ ────────▶ │ needs-decision   │  (exit 3; question asked, or issue opened; no PR)
            └────┬─────┘           └──────────────────┘
            ┌────▼─────┐
            │  Verify  │ ── any step fails ──▶ delivered-draft (PR is a draft, failure output in body)
            └────┬─────┘
                 │ all pass
            ┌────▼─────┐
            │ Deliver  │ ─────────▶ delivered (PR ready for review)
            └──────────┘
```

| Outcome | Exit code | Pull request | Reported |
|---|---|---|---|
| `current` | 0 | none opened; an open one is closed with a comment | "content is current at <sha>" |
| `delivered` | 0 | opened or updated, ready | PR link |
| `delivered-draft` | 1 | opened or updated as draft | PR link and failing step |
| `needs-decision` | 3 | none | the question and its options |
| `failed` | 2 | none; an existing one is left untouched | the failing source or step, with its output |

Exit codes are defined in [contracts/cli.md](contracts/cli.md).

## Change summary

Produced by the Apply stage and written into the pull request body ([contracts/pull-request.md](contracts/pull-request.md)).

| Field | Type | Notes |
|---|---|---|
| `before` / `after` | map repository → SHA | Source revisions before and after (FR-009). |
| `files` | list of `{path, change}` | `change` ∈ `added`, `changed`, `removed`. |
| `details` | per-procedure | DEDL: sections added, removed or changed with line counts, and whether a new version was published beside the old one. Screenshots: images changed, rejected (with the failing check) and gaps. Catalogue: designers whose state changed per host (old → new), designers added or withdrawn. Hosts: host state old → new with the facts it was derived from. |
| `withdrawals` | list | Items removed because the source removed them. |

## DEDL version

Specialises the source records of `refresh-dedl`.

| Field | Type | Notes |
|---|---|---|
| `version` | string, for example `0.1` | From the specification header. MUST equal the version segment of the schema's `$id`; if the two disagree, the run fails. |
| `folder` | path | `sources/dedl/<version>/`. |
| `frozen` | boolean | True for every version except the latest. A frozen folder is never rewritten. |

## Site state and state mapping

`procedures/config/states.json` holds the site's configuration, not sourced content.

| Field | Type | Notes |
|---|---|---|
| `siteStates` | ordered list | `identified`, `specified`, `in progress`, `prototype`, `available`, `planned`, `not planned`. This is the shared set of spec 003 FR-005. |
| `hostStates` | ordered list | `planned`, `in progress`, `available` (spec 001 FR-006). |
| `mappings` | map host → (source state label → site state) | The standalone mapping is in research R10. A source state missing from its host's map triggers a decision. |

**Rule**: a mapping's values MUST be members of `siteStates`. `refresh:lint` checks this.

## Designer entry (as captured)

The catalogue procedure turns each host's `docs/diagrams.md` into `sources/catalogue/<host>/catalogue.json`, and keeps the source file beside it for the record.

| Field | Type | Notes |
|---|---|---|
| `origin` | `<vendor>/<type>` | The shared identity across hosts (spec 003). |
| `name` | string | The Diagram column. |
| `group` | string | The enclosing `<h3>`/`<h4>` heading. |
| `developState` | string | For example `Prototype`, as written in the source on `develop`. |
| `releaseState` | string or null | As written in the catalogue at the host's latest release tag; null when there is no release or the row is absent there. |
| `state` | site state | `developState` mapped through `states.json`, then capped at the mapped `releaseState`: `prototype` or `available` above the release state becomes `in progress` (research R10). |
| `theory` | list of `{label, href}` | The Theory column. |
| `example` | string or link | The Example column. |

**Validation**: `origin` is unique within a host. A duplicate fails the run and names both rows.

## Screenshot (as captured)

`sources/screenshots/<host>/` holds the PNGs as committed in the source, plus `screenshots.json`.

| Field | Type | Notes |
|---|---|---|
| `file` | string | For example `mindmap.png`. |
| `origin` | origin tag | From `procedures/config/screenshots.json`. If there is no entry, a decision is raised. |
| `expectation` | string | The "What must be visible" cell. Used as the review note and the default alt text. |
| `document` | string | The "Document opened" cell. |
| `bytes`, `width`, `height` | integers | Measured. |
| `budgetBytes` | integer | From the source readme: 300 KB, or 1 MB for `workspace.png`. |
| `status` | `accepted` or `rejected` | A rejected image keeps its previous copy. The reason is listed in the pull request. |

## Host state (as derived)

`sources/hosts/hosts.json` holds one entry per host.

| Field | Type | Notes |
|---|---|---|
| `host` | enum | `standalone`, `intellij`, `vscode`, `eclipse`. |
| `repository` | `owner/name` | |
| `state` | host state | Derived per research R10. |
| `facts` | object | `catalogueCommit` (or null), `usableDesigners` (count of `prototype` or `available` after the release cap), `designersInProgress` (count of rows whose `develop` state maps to `in progress` or later), `latestRelease` (`{tag, commit}`, or null), `developHead` (SHA). |
| `link` | URL | The latest release when there is one, otherwise the repository. Spec 001 edge case: no public install → the page says so. |

## Withdrawal

An entry in a lock's `withdrawn` list, kept after the file is gone so the build can produce the notices that specs 002 and 003 require.

| Field | Type | Notes |
|---|---|---|
| `path` | string | The former path under `sources/<short>/`. |
| `sourcePath` | string | |
| `withdrawnAt` | ISO 8601 | |
| `lastCommit` | SHA | The last revision in which the file existed. |
| `replacedBy` | path or null | Set when the same content reappears under another path, for a rename or a moved section. |

## Relationships

```text
Procedure 1 ──reads──▶ n Source
Procedure 1 ──owns───▶ 1 sources/<short>/ folder ──has──▶ 1 source.lock.json ──lists──▶ n Source record
                                                                          └──lists──▶ n Withdrawal
Refresh run n ──of───▶ 1 Procedure ──produces──▶ 0..1 Pull request (branch refresh/<short>)
State mapping 1 ──maps──▶ Designer entry.developState ─(capped by releaseState)─▶ Designer entry.state
Screenshot map 1 ──links─▶ Screenshot.file ─▶ Designer entry.origin
```
