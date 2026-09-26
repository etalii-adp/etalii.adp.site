# Implementation Plan: Content Refresh Procedures

**Branch**: `features/004-content-refresh-procedures` | **Date**: 2026-09-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-content-refresh-procedures/spec.md`

## Summary

The site's sourced content (the DEDL reference, designer catalogue, screenshots and IDE host states) needs a written, agent-runnable refresh procedure per kind, each ending in a pull request into `develop`. The approach:

- **Procedures.** Each procedure is a Markdown document in `procedures/`, built from one shared template and listed in one index. Its mechanical steps are a single command, `npm run refresh -- <id>`, backed by small Node.js scripts.
- **What a run does.** It resolves each source's latest revision on `develop` for the watched paths. It copies the files verbatim into `sources/<short>/`, with a lock file recording repository, commit and hash per file. It verifies the result with the site's build and checks plus a source-record check. It then creates or updates the pull request of its fixed branch `refresh/<short>`.
- **Automatic runs.** An hourly GitHub workflow runs the same command using a GitHub App token, which is needed because four sources are private and because pull requests must trigger CI.
- **Questions.** The only thing a run can ask is how to map something new: an unknown source state, or a screenshot not yet linked to a designer. It asks interactively, or through a "refresh blocked" issue when it runs automatically.

## Technical Context

**Language/Version**: Node.js 22 LTS, ES modules ([research R3](research.md#r3-language-and-dependencies))

**Primary Dependencies**: `gh` CLI (GitHub API, pull requests, issues); `parse5` (the standalone catalogue's HTML table). Nothing else at runtime.

**Storage**: files in this repository: `sources/<short>/` with its `source.lock.json`, and `procedures/config/*.json` for the site-owned mappings ([research R2](research.md#r2-where-sourced-content-lives-in-this-repository))

**Testing**: `node:test` with fixture sources passed through `--source`; `npm run refresh:lint` and `npm run refresh:verify` in CI

**Target Platform**: GitHub Actions `ubuntu-latest` for automatic runs; Windows, macOS and Linux for interactive runs by an agent or a person

**Project Type**: repository tooling and documentation (procedures and scripts) that feed a static site

**Performance Goals**: a run with nothing changed finishes in under one minute; a full `refresh -- all` with changes finishes within one workflow job (under 15 minutes, including the site build)

**Constraints**: never edit sourced files by hand; never change the published site directly; pull requests created by automation must trigger CI; four of the five sources are private; no network access during the site build

**Scale/Scope**: 5 source repositories, 4 procedures plus 1 combined, about 10 files per run (6 DEDL files, 7 screenshots, 1 catalogue per host, 4 host states)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| I. One site for product and documentation | The procedures only feed pages defined by specs 001–003 and add no pages of their own. | ✅ Pass |
| II. Sourced, never retyped | Content is copied verbatim by script. Every file has a source record (repository, commit, SHA-256, licence) in its lock. `refresh:verify` in CI catches hand edits under `sources/`. The IntelliJ README is *not* retyped into the catalogue (research, source survey). | ✅ Pass |
| III. Truthful about what exists | Designer states that claim usability (`prototype`, `available`) are capped at the host's latest release, and host "available" follows from that (R10). Only committed screenshots of the real product are brought in, and rejected images keep their previous copy. Gaps are reported, never filled with placeholders. | ✅ Pass |
| IV. Readable by everyone, anywhere | The Verify stage runs spec 001's WCAG 2.2 AA and link checks before any pull request is marked ready. The feature adds no scripting, tracking or third-party resources to pages. | ✅ Pass |
| V. Maintainable by agents | A written procedure exists per recurring task. Each ends in a pull request into `develop`, verifies itself before delivery, and asks only decisions. | ✅ Pass (this feature is the principle's implementation) |
| VI. Simplicity | One runtime dependency. No server. Polling from one workflow instead of workflows in five repositories. Plain JSON files instead of any store. | ✅ Pass |
| Hosting: this repository is the only one involved | No workflow or secret is required in any source repository; `repository_dispatch` is optional. | ✅ Pass |
| Workflow: pull requests only, merge commits | Procedures open pull requests; the owner merges. A new `refresh/*` branch category is added to `CLAUDE.md` (see Complexity Tracking). | ✅ Pass, with one recorded convention change |

**Post-design re-check (after Phase 1)**: still passes. The design adds two cross-feature obligations, recorded under "Dependencies" below: the `build` and `check` scripts and the `adp:source` meta that specs 001–003 must provide ([contracts/site-integration.md](contracts/site-integration.md)). They make principle II checkable on the built pages. They do not conflict with any principle.

## Project Structure

### Documentation (this feature)

```text
specs/004-content-refresh-procedures/
├── plan.md              # This file
├── research.md          # Phase 0: decisions R1–R14 and the source survey
├── data-model.md        # Phase 1: procedure, source, source record, run, mappings, captured entities
├── quickstart.md        # Phase 1: validation scenarios
├── contracts/
│   ├── procedure-document.md   # the template every procedure follows
│   ├── cli.md                  # npm commands, options, outputs, exit codes, workflow triggers
│   ├── pull-request.md         # branch, title, body and update rules
│   ├── site-integration.md     # what sources/ provides and what the site's build must provide
│   └── source-lock.schema.json # JSON Schema of sources/<short>/source.lock.json
└── tasks.md             # Phase 2 (/speckit-tasks, not created here)
```

### Source Code (repository root)

```text
procedures/
├── README.md                 # index: id, title, what it refreshes, sources (FR-011)
├── _template.md              # the procedure-document contract as a fill-in file
├── refresh-dedl.md
├── refresh-screenshots.md
├── refresh-catalogue.md
├── refresh-hosts.md
├── refresh-all.md
└── config/
    ├── states.json           # site states and per-host source-state mappings (R10)
    └── screenshots.json      # image → origin tag, per host (R11)

scripts/refresh/
├── run.mjs                   # entry for `npm run refresh`: stages Resolve → Fetch → Apply → Verify → Deliver
├── decide.mjs                # `npm run refresh:decide`
├── verify.mjs                # `npm run refresh:verify` (source-record check)
├── lint.mjs                  # `npm run refresh:lint`
├── lib/
│   ├── github.mjs            # gh wrappers: heads, path commits, file download, PR and issue upsert
│   ├── lock.mjs              # read, write and compare source locks; withdrawals
│   ├── summary.mjs           # change summary and PR body rendering
│   └── png.mjs               # PNG signature and IHDR dimensions
├── procedures/
│   ├── dedl.mjs              # sources, version detection, section diff (R12)
│   ├── screenshots.mjs       # expectations table, budgets, gaps (R11)
│   ├── catalogue.mjs         # diagrams.md table → catalogue.json, state mapping (R10)
│   └── hosts.mjs             # host state derivation (R10)
└── **/*.test.mjs             # node:test, with fixtures in scripts/refresh/fixtures/

sources/                      # written only by the scripts
├── dedl/<version>/…  + source.lock.json
├── catalogue/<host>/…  + source.lock.json
├── screenshots/<host>/…  + source.lock.json
└── hosts/hosts.json  + source.lock.json

.github/workflows/
├── refresh.yml               # schedule, workflow_dispatch, repository_dispatch (R5, R7)
└── (spec 001's CI workflow runs refresh:lint and refresh:verify as well)
```

This feature also changes:
- `package.json`: scripts `refresh`, `refresh:decide`, `refresh:verify`, `refresh:lint`, `test`; the `parse5` dependency; `"engines": { "node": ">=22" }`. The rest of the demo `package.json` is replaced by spec 001.
- `.gitignore`: `.refresh/`.
- `CLAUDE.md`: a "Refreshing sourced content" section pointing at `procedures/README.md`, and `refresh/<procedure>` added under "Branches and delivery".

**Structure Decision**: a single tooling project at the repository root, next to the site that spec 001 adds. Procedures (prose) and scripts (mechanics) are separate folders, so a person reads `procedures/` without code in the way. `sources/` is data only, and is the one seam with the site's build.

## Dependencies

- **Spec 001 (site and home page)**: provides `npm run build`, `npm run check` and `"adp": { "out": … }` in `package.json` ([contracts/site-integration.md](contracts/site-integration.md)). Until then, Verify reports those steps as "not available" (R8), so this feature can be built and tested first.
- **Specs 002 and 003**: read only from `sources/`, emit `adp:source` meta on sourced pages, turn lock withdrawals into redirect or withdrawal pages, and use the states in `procedures/config/states.json`. Spec 003's assumption that "the mapping is defined in planning" is met by research R10.
- **Owner, outside the repository**: create and install the GitHub App and set its two secrets (R7). Enable "automatically delete head branches" in the repository settings.
- **`etalii-adp/etalii.adp.ide.intellij`**: add a `docs/diagrams.md` in the standalone's format, so its FreeMind and draw.io designers can enter the catalogue. Until then, the catalogue procedure reports the gap (research, source survey).
- **`etalii-adp/etalii.adp`**: state a licence (spec 002 assumption). Until then, source records carry `"licence": "unstated"`.
- **`etalii-adp/etalii.adp.ide.standalone`**: retake `docs/screenshots/` with `LocalAuthenticator__DeveloperSessionDisabled=true`, so the images no longer show the developer-session marker (principle III, research R11). Until then, the screenshot procedure reports the caveat in every pull request.
- **Owner, ongoing**: re-enable the refresh workflow if GitHub disables its schedule after 60 days without repository activity (research R5). Every refresh pull request and job summary shows the date of the previous scheduled run, so a stopped schedule is visible.

## Complexity Tracking

> Filled only for deviations from established conventions. There are no violations of constitution principles.

| Deviation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| A third branch category, `refresh/<procedure>`, next to `features/*` and `claude/*` | FR-008 needs a stable, findable branch per procedure, so a later run updates the open pull request instead of opening another. Refreshes are not features and have no spec number. | Using `features/NNN-*` would need a spec per run. `claude/*` is reserved for Claude's cloud sessions and would hide automatic runs among agent sessions. |
| A GitHub App (an organization-level setting outside this repository) | Four sources are private. Pull requests opened with `GITHUB_TOKEN` do not trigger CI, so SC-002 would be unmeasurable. | `GITHUB_TOKEN` cannot read the private sources and does not trigger CI. A personal token is tied to one person and expires on a calendar; it is kept only as a stopgap. |
