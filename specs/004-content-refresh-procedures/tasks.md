---

description: "Task list for Content Refresh Procedures"
---

# Tasks: Content Refresh Procedures

**Input**: Design documents from `specs/004-content-refresh-procedures/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

**Tests**: Included. The plan names `node:test` with fixture sources as the testing approach, and quickstart scenario 0 requires `npm test` to pass. Tests never touch GitHub. They build temporary git repositories from fixture folders and pass them with `--source`.

**Organization**: Tasks are grouped by user story so each story can be built and tested on its own. Refreshes that start by themselves (FR-012) are cross-cutting and get their own phase after the stories.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: The user story the task belongs to (US1–US5)
- Every path is relative to the repository root of the worktree `.claude/worktrees/004-content-refresh-procedures/`

## Path Conventions

- Procedures (prose): `procedures/`, mappings in `procedures/config/`
- Mechanics (Node.js 22, ES modules, `.mjs`): `scripts/refresh/`, shared code in `scripts/refresh/lib/`, one module per procedure in `scripts/refresh/procedures/`
- Tests: `scripts/refresh/**/*.test.mjs`, fixtures in `scripts/refresh/fixtures/`
- Sourced content (written only by the scripts): `sources/<short>/`
- Paths written into locks and summaries always use `/` separators, on Windows too

## Common rules for every script task

These rules apply to every task below. They are stated once here so that they do not have to be repeated in each task.

- Use only Node built-ins, the `gh` CLI (through `scripts/refresh/lib/github.mjs`) and `parse5`. Add no other dependency (plan, research R3).
- Never edit a file under `sources/` other than through the Apply stage (constitution principle II).
- Never run `capture.mjs` or any other source tooling (FR-013).
- Outcomes and exit codes are exactly those of [contracts/cli.md](contracts/cli.md): `current` 0, `delivered` 0, `delivered-draft` 1, `failed` 2, `needs-decision` 3.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: package scripts, dependency and folders.

- [X] T001 Update `package.json`: add the scripts `"refresh": "node scripts/refresh/run.mjs"`, `"refresh:decide": "node scripts/refresh/decide.mjs"`, `"refresh:verify": "node scripts/refresh/verify.mjs"`, `"refresh:lint": "node scripts/refresh/lint.mjs"` and `"test": "node --test \"scripts/refresh/**/*.test.mjs\""`, and add `"engines": { "node": ">=22" }`. Keep the existing fields, which spec 001 replaces.
- [X] T002 Add `parse5` as the only runtime dependency (`npm install parse5`), and commit the resulting `package-lock.json`.
- [X] T003 [P] Add `.refresh/` to `.gitignore`, under a `# Refresh procedures' run output` comment.
- [X] T004 [P] Create the folders `procedures/config/`, `scripts/refresh/lib/`, `scripts/refresh/procedures/`, `scripts/refresh/fixtures/` and `sources/`. Put a `.gitkeep` in `sources/` so that the folder exists before the first refresh.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: the five-stage runner, source access, locks, summaries, verification, delivery, decisions, the shared catalogue parser, the mapping file and the procedure template. Every procedure module plugs into these.

**⚠️ CRITICAL**: no user story work can begin until this phase is complete.

### Tests for the foundation

- [X] T005 [P] Write the fixture-repository helper in `scripts/refresh/fixtures/repo.mjs`. `makeRepo(files, { commits, tags })` creates a git repository in `os.tmpdir()` from an object of path → content. It commits on branch `develop`, can add further commits and `v*` tags, and returns `{ dir, head, cleanup }`. Every test uses it for `--source`.
- [X] T006 [P] Write `scripts/refresh/lib/lock.test.mjs`. Cover: SHA-256 of a file, reading and writing a lock that validates against `specs/004-content-refresh-procedures/contracts/source-lock.schema.json`, comparing a resolved file set with the lock's `gitBlob` values (equal, a changed blob, an added file, a removed file), comparing `releases`, recording a withdrawal (`path`, `sourcePath`, `withdrawnAt`, `lastCommit`, `replacedBy` set when an added file has the same `gitBlob` as the withdrawn one), and rejecting a lock with `"local": true`.
- [X] T007 [P] Write `scripts/refresh/lib/png.test.mjs`. Cover: reading the width and height from the IHDR chunk of a small PNG built in the test, and rejecting a non-PNG buffer, a truncated header and a file whose first chunk is not IHDR.
- [X] T008 [P] Write `scripts/refresh/lib/summary.test.mjs`. Render the pull request body from a sample change summary and assert every section of [contracts/pull-request.md](contracts/pull-request.md), in order: Source revisions (short SHAs with compare links), What changed, Source caveats (only when present), Withdrawn ("None" when empty), Verification (✅, ❌ or ⚪ per step, with a `<details>` block holding a failure's output), Review notes (only when present), and the footer line. Also assert the title patterns `Refresh <what>: <before7>..<after7>` and `Refresh DEDL reference: publish <new> beside <old>`.
- [X] T009 [P] Write `scripts/refresh/run.test.mjs` against a stub procedure module in `scripts/refresh/fixtures/stub-procedure.mjs`, using a fixture source and `--dry-run`. Cover: an unchanged source gives `outcome: current` and exit 0; a changed file gives `delivered` with `.refresh/summary.json` and `.refresh/pr-body.md` written; an unreachable `--source` path gives `failed`, exit 2, names the source and leaves `sources/` unchanged; a stub that raises a decision gives exit 3 and a `.refresh/decision.json` with the keys `procedure`, `question`, `subject`, `options`, `writeTo` and `key`; the `refresh-` prefix is accepted; an unknown id fails with the list of valid ids.
- [X] T010 [P] Write `scripts/refresh/verify.test.mjs`. Build `sources/` trees in a temporary folder (with `verify.mjs` taking `--root <dir>` for tests) and assert one failure line per violation from [contracts/site-integration.md](contracts/site-integration.md) § Source-record check: an unlisted file, a missing file, a SHA-256 mismatch, `"local": true`, a `commit` that is not 40 hex characters, a `repository` not among the procedure's declared sources, and, with a fake build output folder, an `adp:source` meta pointing to no lock entry and an `adp:sourced` page with no `adp:source` meta. An empty `sources/` passes.
- [X] T011 [P] Write `scripts/refresh/decide.test.mjs`. Assert that an answer from the decision's `options` is written at `key` in the `writeTo` JSON file (keeping the file's formatting: two-space indentation and a final newline), that an answer not in `options` fails without writing, and that a missing `.refresh/decision.json` fails with a clear message.
- [X] T012 [P] Write `scripts/refresh/lib/catalogue-table.test.mjs` with the fixture `scripts/refresh/fixtures/standalone/docs/diagrams.md`. Copy the structure of the standalone catalogue: an HTML `<table>` inside Markdown with the columns State, Origin, Diagram, Theory and Example, rows under `<h3>`/`<h4>` group headings, and cells with `<code>`, `<a>` and `&nbsp;`. Assert the parsed rows (`origin`, `name`, `group`, `developState`, `theory[] {label, href}`, `example`), the state label with its emoji stripped for lookup (`⚗️ Prototype` → `Prototype`), and that a duplicate `origin` fails, naming both rows.

### Implementation of the foundation

- [X] T013 [P] Implement `scripts/refresh/lib/png.mjs`: `readPngSize(buffer)` checks the 8-byte PNG signature and a first chunk `IHDR`, and returns `{ width, height }`. It throws a descriptive error otherwise.
- [X] T014 [P] Implement `scripts/refresh/lib/github.mjs`, the only module that calls `gh` (using `execFile` with `gh api` and JSON output). It provides:
  - `developHead(repo, ref)`;
  - `lastCommitForPath(repo, ref, path)`, which uses the commits API with `path=`;
  - `listTree(repo, commit, globs)`, which returns `[{ path, gitBlob }]` from the git trees API with `recursive=1`;
  - `downloadFile(repo, commit, path, dest)`, which uses the raw media type and supports files up to about 1 MB (the DEDL specification is about 450 KB);
  - `readFileAt(repo, ref, path)`;
  - `latestRelease(repo)`, which returns `{ tag, commit }` or `null`;
  - `licence(repo)`, which returns an SPDX id, or `"unstated"` on 404 or `NOASSERTION`;
  - `findOpenPr(branch)`, `createPr({ base, head, title, body, draft, labels })`, `updatePr(number, { title, body, draft })` (converts between draft and ready with `gh pr ready` and `gh pr ready --undo`), `closePr(number, comment)` and `ensureLabels(names)` (`gh label create --force`);
  - `upsertIssue(title, body, labels)` and `closeIssue(title, comment)`;
  - `previousScheduledRun(workflowFile)`, which returns the date of the latest `schedule` run of `refresh.yml`, or `null` when there was none in 7 days.

  Every call that fails throws an error naming the repository and the call.
- [X] T015 [P] Implement `scripts/refresh/lib/local.mjs`, the same read interface as the source-read half of `github.mjs`, for a local checkout passed with `--source <owner/name>=<path>`:
  - `developHead` is the checkout's `HEAD`;
  - `lastCommitForPath` uses `git log -1 --format=%H -- <path>`;
  - `listTree` uses `git ls-tree -r <commit>`;
  - `downloadFile` and `readFileAt` use `git show <commit>:<path>`;
  - `latestRelease` is the highest `v*` tag reachable from `HEAD` in semantic-version order (`git tag --merged HEAD`), with its commit;
  - `licence` returns `"unstated"`.

  Also implement `sourceReader(repo, options)` in the same file, which returns the local reader when `--source` names that repository and the `github.mjs` reader otherwise.
- [X] T016 Implement `scripts/refresh/lib/lock.mjs` (depends on T013). It provides:
  - `sha256(file)`;
  - `readLock(dir)` and `writeLock(dir, lock)`, which sort `files` and `withdrawn` by `path`, write two-space JSON with a final newline, and validate the shape of `contracts/source-lock.schema.json` by hand, with no schema library;
  - `compareResolved(lock, resolved, releases)`, which returns `{ current, added, changed, removed }` by comparing `gitBlob` values and the `releases` object;
  - `applyWithdrawals(lock, removed, now)`, which adds entries with `withdrawnAt` in ISO 8601 and `lastCommit`, and sets `replacedBy` when an added file has the same `gitBlob`.

  Set `"local": true` whenever any source was read through `local.mjs`.
- [X] T017 [P] Implement `scripts/refresh/lib/summary.mjs`. It provides:
  - `buildSummary({ before, after, files, details, withdrawals, caveats, reviewNotes, verification })`, which follows data-model.md § Change summary;
  - `renderPrBody(summary, { procedure, runLink, previousScheduledRun })`, which follows [contracts/pull-request.md](contracts/pull-request.md). Its footer reads `Opened by procedure \`refresh-<id>\` (procedures/refresh-<id>.md), run <local | workflow run link>. Previous scheduled run: <date, or "none in 7 days: check that the Refresh workflow is enabled">.`;
  - `renderTitle(procedure, summary)`, which takes the "what" from the procedure module;
  - `renderDecisionIssue(decision)`, whose body states the question, the subject, a `- [ ]` checklist of the options, and how to answer: run `npm run refresh:decide -- <id> <answer>` interactively, or edit `writeTo` in a pull request.

  Each procedure module supplies its own `What changed` Markdown through a `renderDetails(details)` hook.
- [X] T018 Implement `scripts/refresh/verify.mjs` (`npm run refresh:verify`), which follows [contracts/site-integration.md](contracts/site-integration.md) § Source-record check (depends on T016). It walks every `sources/<short>/` folder except `.gitkeep`, reads its lock, and checks:
  - that every file is listed and every listed file exists with a matching SHA-256;
  - that there is no `local`;
  - that every `commit` matches `^[0-9a-f]{40}$`;
  - that every `repository` is in the declared sources of the procedure named by the lock's `procedure`, imported from `scripts/refresh/procedures/<short>.mjs`.

  When `package.json` has `adp.out` and that folder exists, it also parses each built `.html` file's `<head>` and checks two things: every `adp:source` meta resolves to a lock entry (`<repository>@<commit>:<sourcePath>`), and every page with `<meta name="adp:sourced" content="true">` has at least one `adp:source` meta.

  It prints one line per violation, exits 1 on any violation and 0 otherwise, and accepts `--root <dir>` for tests.
- [X] T019 Implement the stage runner `scripts/refresh/run.mjs` (depends on T014–T018). It covers the stages Resolve → Fetch → Apply → Verify → Deliver, with the options of [contracts/cli.md](contracts/cli.md): `<id>`, `--dry-run`, `--no-deliver`, `--base <branch>` (default `develop`) and `--source <owner/name>=<path>`, which can be repeated. The procedure module interface is:

  ```text
  { id, short, what, sources[{repository, ref:'develop', paths[], host}],
    usesReleases, resolve(ctx), fetch(ctx, tmp), apply(ctx, tmp, targetDir), renderDetails(details) }
  ```

  The stages work as follows:
  - **Resolve** calls `compareResolved`. An unchanged result is `current`. When an open pull request exists on `refresh/<short>`, Resolve checks whether `develop` already matches and closes it with the comment `develop already matches <repository>@<sha>; closing.`
  - **Fetch** downloads into a folder under `os.tmpdir()`. Any error is `failed` and names the source, and nothing is written.
  - **Apply** works in a temporary git worktree of `origin/<base>` under `os.tmpdir()` (after `git fetch origin <base>`), or in the current working tree on branch `refresh/<short>` (`git switch -C refresh/<short> origin/<base>`) for `--no-deliver`. It copies any `procedures/config/*.json` that differs from `<base>` in the invoking checkout into the worktree, so an answered decision is part of the same pull request (research R9). It then replaces `sources/<short>/`, writes the lock, and treats "no diff after regeneration" as `current`.
  - **Verify** runs `npm run build` and `npm run check` in the worktree only when `package.json` there defines them, and reports "not available" otherwise (research R8). It always runs `npm run refresh:verify`. It captures each step's output, and reuses the invoking checkout's `node_modules` in a temporary worktree by linking it (a junction on Windows).
  - **Deliver** first makes sure the labels `refresh` and `refresh:<short>` exist. It then commits with the message `Refresh <what>` and the trailer `Refreshed-by: refresh-<short>`, pushes the branch with `--force`, and runs `findOpenPr`, followed by `updatePr` or `createPr`. The pull request is a draft when any Verify step failed. `--dry-run` skips Deliver.

  After every run, it writes `.refresh/summary.json` and `.refresh/pr-body.md` in the invoking checkout, prints one line per stage and then `outcome: <outcome> [<pr-url>]`, removes the temporary worktree, and exits with the contract's code.
- [X] T020 Implement `scripts/refresh/decide.mjs` (`npm run refresh:decide -- <id> <answer>`), which follows [contracts/cli.md](contracts/cli.md) (depends on T019 for the decision file format). It reads `.refresh/decision.json`, checks that `<id>` matches its `procedure` and that `<answer>` is one of `options`, and sets the dotted `key` in `writeTo` to the answer. It writes two-space JSON with a final newline and prints the changed line.
- [X] T021 [P] Create `procedures/config/states.json` from data-model.md § Site state and research R10:
  - `"siteStates": ["identified", "specified", "in progress", "prototype", "available", "planned", "not planned"]`;
  - `"hostStates": ["planned", "in progress", "available"]`;
  - `"mappings"` for each of `standalone`, `intellij`, `vscode` and `eclipse`, each `{ "Identified": "identified", "Specified": "specified", "To-do": "specified", "Work-in-progress": "in progress", "Prototype": "prototype", "Implemented": "available" }` (keys are the source labels without their emoji). The IDE repositories are to use the standalone's format (research, source survey).
- [X] T022 Implement `scripts/refresh/lib/catalogue-table.mjs` (depends on T021). It is shared by the screenshot, catalogue and hosts procedures, so that each stays independent of the others' output.
  - `parseCatalogue(markdown)` uses `parse5` to parse the HTML table in `docs/diagrams.md`. It returns rows `{ origin, name, group, developState, theory: [{label, href}], example }`, where `group` is the nearest preceding `<h3>`/`<h4>` or Markdown `###`/`####` heading. A duplicate `origin` fails, naming both rows.
  - `mapState(host, label, states)` returns a site state, or `{ unmapped: label }`.
  - `capAtRelease(developSite, releaseSite)` implements research R10: `prototype` or `available` above the release state becomes `in progress`; if there is no release row (`null`), the maximum is `in progress`. The order is `identified < specified < in progress < prototype < available`.
  - `designersFor(host, reader)` reads `docs/diagrams.md` at the `develop` head and at the latest release tag. It returns entries with `developState`, `releaseState` (or `null`) and the capped `state`, plus `{ missingCatalogue: true }` when the file does not exist.
- [X] T023 [P] Create `procedures/_template.md`: the section list of [contracts/procedure-document.md](contracts/procedure-document.md) as a fill-in file, with each placeholder in angle brackets. Include the rules of that contract as a short comment block at the top: the only questions are decisions, no hand edits under `sources/`, and `npm run refresh -- <id>` is the one entry point.
- [X] T024 [P] Create `procedures/README.md`, the index of procedures (FR-011). It has a one-paragraph introduction and a table with the columns `Id`, `Title`, `Refreshes`, `Sources (repository: paths)`. The table starts without rows, and each story adds its row. It also has the sections "Outcomes and exit codes" (from contracts/cli.md) and "Answering a decision" (research R9, interactive and automatic).
- [X] T025 Add a "Refreshing sourced content" section to `CLAUDE.md`, after "Conventions". Its content:
  - naming a procedure is enough, and the procedure documents are indexed in [procedures/README.md](procedures/README.md);
  - follow the procedure document step by step, and never edit `sources/` by hand;
  - on `needs-decision`, read `.refresh/decision.json` and ask the person with a selection whose options are the decision's `options`, then run `npm run refresh:decide` and re-run the procedure.

  Each story adds its procedure's title to this section. Under "Branches and delivery", add `refresh/<procedure>` as a third branch category next to `features/*` and `claude/*`: it is written only by a refresh procedure, recreated from `develop` and force-pushed on every run, and merged by the owner through a pull request (plan § Complexity Tracking).

**Checkpoint**: `npm test` passes for the foundation, `npm run refresh:verify` passes on the empty `sources/`, and the stub procedure goes through every outcome.

---

## Phase 3: User Story 1 - Refresh the DEDL reference (Priority: P1) 🎯 MVP

**Goal**: `npm run refresh -- dedl` brings `sources/dedl/<version>/` up to `etalii-adp/etalii.adp` `specifications/dedl/` on `develop`, publishes a new version beside the old one, and opens or updates one pull request that states the revisions, the changed sections and the verification results.

**Independent Test**: quickstart scenarios 1–3. Change one sentence in a local clone and dry-run with `--source etalii-adp/etalii.adp=../etalii.adp`. The diff under `sources/dedl/<version>/` holds only that sentence, and `.refresh/pr-body.md` lists one changed section.

### Tests for User Story 1

- [X] T026 [P] [US1] Create the fixture `scripts/refresh/fixtures/etalii.adp/specifications/dedl/`. It contains a short `DEDL-specification.md` with a header `Version` line of `0.1` and at least three `##` sections, a `dedl.schema.json` whose `$id` ends in `/dedl/schema/0.1/dedl.schema.json`, and two small example files (`erd.dedl`, `timeline.document.json`).
- [X] T027 [P] [US1] Write `scripts/refresh/procedures/dedl.test.mjs`, using `fixtures/repo.mjs` and `run.mjs --dry-run`. Cover:
  - (a) the first run imports into `sources/dedl/0.1/` with a lock entry per file;
  - (b) an unchanged second run is `current` (US1-2);
  - (c) one changed sentence gives exactly one changed file and one changed section, with its line count;
  - (d) a version of `0.2` in both the header and `$id` adds `sources/dedl/0.2/`, leaves `0.1/` byte-for-byte unchanged, and gives the title `Refresh DEDL reference: publish 0.2 beside 0.1` (US1-3);
  - (e) a version of `0.2` in only one of the two is `failed` and names both values;
  - (f) a removed example is listed under `withdrawn` and under "Withdrawn" in the body;
  - (g) the schema and each example are reported as changed or unchanged.

### Implementation for User Story 1

- [X] T028 [US1] Implement `scripts/refresh/procedures/dedl.mjs`, which follows research R12 (depends on T019). It has `id: 'refresh-dedl'`, `short: 'dedl'`, `what: 'DEDL reference'`, and `sources: [{ repository: 'etalii-adp/etalii.adp', ref: 'develop', paths: ['specifications/dedl/*'], host: null }]`, with `usesReleases: false`. The procedure:
  - reads the version from the specification's header `Version` line and from the version segment of the schema's `$id`, and fails when they disagree, naming both;
  - writes into `sources/dedl/<version>/` and never rewrites an older version's folder. Only the highest version is replaced; when the version is new, a folder is added beside the old ones;
  - compares the sections of the specification, split on `##` headings, and marks each as added, removed or changed with its changed-line count;
  - reports the schema and each example as changed or unchanged;
  - provides `renderDetails` for the "What changed" table and the line "New version <v> published beside <old>".
- [X] T029 [P] [US1] Write `procedures/refresh-dedl.md` from `procedures/_template.md`, with the title "Refresh the DEDL reference":
  - **Sources**: `etalii-adp/etalii.adp`, `develop`, `specifications/dedl/`, public.
  - **Updates**: `sources/dedl/<version>/` and `sources/dedl/source.lock.json`, used by the spec 002 pages.
  - **Steps**: run `npm run refresh -- dedl`, then handle each of the five outcomes.
  - **Decisions**: None.
  - **Verification**: the three steps of research R8.
  - **Pull request**: `refresh/dedl`, both title patterns, and the body per contracts/pull-request.md.
  - **When the source moves**: update `sources` in `scripts/refresh/procedures/dedl.mjs` and the Sources table in this document together.
- [X] T030 [US1] Add the `refresh-dedl` row to `procedures/README.md`, and the title "Refresh the DEDL reference" to the "Refreshing sourced content" section of `CLAUDE.md`.

**Checkpoint**: US1 works on its own. Quickstart scenarios 1–3 pass as dry runs, and scenarios 2 and 4 pass against the real source once the branch can be pushed.

---

## Phase 4: User Story 2 - Refresh screenshots (Priority: P1)

**Goal**: `npm run refresh -- screenshots` brings in every changed committed PNG from each host's `docs/screenshots/`. It checks each image against the host readme's expectations table and budgets, keeps the previous copy of any rejected image, reports gaps and source caveats, and never retakes an image.

**Independent Test**: quickstart scenario 5. With a fixture standalone repository, a replaced valid `mindmap.png` appears with its expectation, a 400 KB `timeline.png` is rejected while its previous copy is kept, and a prototype designer with no image is listed as a gap.

### Tests for User Story 2

- [X] T031 [P] [US2] Extend the standalone fixture with `scripts/refresh/fixtures/standalone/docs/screenshots/`. Add a `readme.md` copying the source's format: the images table with the columns image, document opened and what must be visible; the stated 1600×900 viewport; the budgets "each image ≤ 300 KB, `workspace.png` ≤ 1 MB"; and a "Known artefact" section. Tests generate the PNG files at run time (valid 1600×900 PNGs, one over budget, one with wrong dimensions), so no binary fixtures are committed.
- [X] T032 [P] [US2] Write `scripts/refresh/procedures/screenshots.test.mjs`. Cover:
  - (a) a changed valid image is accepted with its `expectation`, `document`, `bytes`, `width` and `height` in `screenshots.json` (US2-1);
  - (b) a 400 KB image is rejected with "over 300 KB budget", and the previous copy and its lock entry are kept (US2-2);
  - (c) a wrong size or an image missing from the expectations table is rejected with the failing check named;
  - (d) a designer in `prototype` or `available` state with no image is listed under Gaps, and no file is created (US2-3);
  - (e) an image with no entry in `procedures/config/screenshots.json` gives `needs-decision` with the host's designer origins as options;
  - (f) the readme's "Known artefact" section appears under "Source caveats" with a link at the recorded revision, and it disappears when the fixture removes that heading;
  - (g) a host with no `docs/screenshots/` contributes nothing and does not fail;
  - (h) `capture.mjs` in the fixture is neither copied nor executed.

### Implementation for User Story 2

- [X] T033 [P] [US2] Create `procedures/config/screenshots.json` with the shape `{ "<host>": { "<file>.png": "<vendor>/<type>" } }`. Fill in the `standalone` entries for the 7 committed PNGs: read `docs/screenshots/readme.md` and `docs/diagrams.md` of `etalii-adp/etalii.adp.ide.standalone` on `develop` with `gh api`, and link each image to the origin its "Document opened" column shows. Use empty objects for `intellij`, `vscode` and `eclipse`.
- [X] T034 [US2] Implement `scripts/refresh/procedures/screenshots.mjs`, which follows research R11 and data-model.md § Screenshot (depends on T019 and T022). It has `id: 'refresh-screenshots'`, `short: 'screenshots'` and `what: 'screenshots'`, with one source per IDE repository (`etalii-adp/etalii.adp.ide.standalone`, `.intellij`, `.vscode`, `.eclipse`) and `paths: ['docs/screenshots/*.png', 'docs/screenshots/readme.md', 'docs/diagrams.md']`. `usesReleases` is true, because gaps use the capped state. The procedure:
  - parses the readme's expectations table, viewport and budgets;
  - checks each changed PNG, in this order: listed in the table, a PNG (`readPngSize`), within its budget (`budgetBytes` 300 KB, or 1 MB for `workspace.png`), and matching the viewport;
  - writes accepted images to `sources/screenshots/<host>/<file>`. A rejected image keeps its previous file and its previous lock entry, and gets `status: 'rejected'` with its reason;
  - writes `sources/screenshots/<host>/screenshots.json` with `{ file, origin, expectation, document, bytes, width, height, budgetBytes, status }`;
  - raises a decision for an unmapped image, with `writeTo: 'procedures/config/screenshots.json'`, `key: '<host>.<file>'` and the host's designer origins as options;
  - computes gaps from `designersFor(host)`;
  - adds the readme's "Known artefact" section, detected by its heading, as a source caveat;
  - adds the review note "check each image shows what its expectation says", listing each accepted image with its expectation;
  - does not copy `readme.md` or `diagrams.md` into `sources/`: they are read inputs only, and their blob SHAs still take part in Resolve.
- [X] T035 [P] [US2] Write `procedures/refresh-screenshots.md` from the template, with the title "Refresh the screenshots":
  - **Sources**: the four IDE repositories and their paths, with standalone marked private and the others marked private (not present yet).
  - **Updates**: `sources/screenshots/<host>/`, and `procedures/config/screenshots.json` when a decision is answered.
  - **Decisions**: "Which designer does this image show?", with the host's origins as options.
  - **Verification**: the three steps of research R8, plus reading the review notes.
  - A plain statement that the procedure never retakes screenshots, and that fixes to an image belong in its source repository (FR-013).
- [X] T036 [US2] Add the `refresh-screenshots` row to `procedures/README.md`, and the title "Refresh the screenshots" to `CLAUDE.md`.

**Checkpoint**: US1 and US2 work independently. Quickstart scenario 5 passes as a dry run.

---

## Phase 5: User Story 3 - Refresh the catalogue and host states (Priority: P2)

**Goal**: `npm run refresh -- catalogue` turns each host's `docs/diagrams.md` into `sources/catalogue/<host>/catalogue.json`, with states mapped and capped at the latest release. It asks when a source state has no mapping. `npm run refresh -- hosts` derives each IDE host's state into `sources/hosts/hosts.json`.

**Independent Test**: quickstart scenarios 6 and 7. A changed state for one designer changes only that designer, capped until a `v*` tag is added. An `🧪 Experimental` state gives exit 3 with the site states as options. A VS Code fixture with one Prototype row and no release makes `vscode` `in progress`.

### Tests for User Story 3

- [X] T037 [P] [US3] Write `scripts/refresh/procedures/catalogue.test.mjs`, using the standalone fixture's `docs/diagrams.md`. Cover:
  - (a) changing `freeplane/mindmap` from Prototype to Implemented without a tag changes nothing published (the state stays `prototype`, with `developState` `Implemented` and `releaseState` `Prototype`), while `sources/catalogue/standalone/diagrams.md` and its lock entry do change;
  - (b) after tagging `v9.9.9`, the state becomes `prototype → available`, and the summary lists only that designer (US3-1);
  - (c) a row absent at the release is `in progress`;
  - (d) a host with no release has no designer above `in progress`;
  - (e) `🧪 Experimental` gives `needs-decision`, exit 3, with `options` equal to `siteStates`, `writeTo: 'procedures/config/states.json'` and `key: 'mappings.standalone.Experimental'` (US3-2). After `refresh:decide`, the re-run is delivered and the mapping change is in the worktree's diff;
  - (f) added and withdrawn designers are listed;
  - (g) a host without `docs/diagrams.md` is reported as "no catalogue at `docs/diagrams.md`" in the details, and is not a failure;
  - (h) a duplicate origin fails, naming both rows.
- [X] T038 [P] [US3] Write `scripts/refresh/procedures/hosts.test.mjs`. Cover:
  - (a) a VS Code fixture with no `docs/diagrams.md` is `planned`;
  - (b) one ⚗️ Prototype row and no release is `in progress`, with the facts `catalogueCommit`, `usableDesigners: 0`, `designersInProgress: 1`, `latestRelease: null` and `developHead` (US3-3);
  - (c) adding a release whose catalogue has the row as Prototype makes it `available`, with `link` pointing to the release;
  - (d) the body lists each host's change as old → new, with its facts.

### Implementation for User Story 3

- [X] T039 [US3] Implement `scripts/refresh/procedures/catalogue.mjs`, which follows research R10 and data-model.md § Designer entry (depends on T019 and T022). It has `id: 'refresh-catalogue'`, `short: 'catalogue'` and `what: 'designer catalogue'`, with one source per IDE repository on `paths: ['docs/diagrams.md']` and `usesReleases: true`. `releases` in the lock records `{ tag, commit }`, or `null` per repository. The procedure:
  - copies `docs/diagrams.md` verbatim to `sources/catalogue/<host>/diagrams.md`;
  - regenerates `sources/catalogue/<host>/catalogue.json` with `{ origin, name, group, developState, releaseState, state, theory, example }`, sorted by group, then origin;
  - raises a decision for the first unmapped state label per run: the question is `How should the source state "<label>" in <host> map to a site state?`, the options are `siteStates`, and the answer is written to `procedures/config/states.json` under `mappings.<host>.<label>`;
  - reports hosts with no catalogue;
  - provides a `renderDetails` table with the columns origin, host, old → new, `developState` and `releaseState`, followed by the added and withdrawn designers.
- [X] T040 [US3] Implement `scripts/refresh/procedures/hosts.mjs`, which follows research R10 and data-model.md § Host state (depends on T022). It has `id: 'refresh-hosts'`, `short: 'hosts'` and `what: 'IDE host states'`, with the same four sources on `paths: ['docs/diagrams.md']` and `usesReleases: true`. It writes only the derived `sources/hosts/hosts.json`, one entry per host, with `{ host, repository, state, facts: { catalogueCommit, usableDesigners, designersInProgress, latestRelease, developHead }, link }`. Its lock lists `hosts.json` with the four repositories' heads in `sourceHeads`, and `verify.mjs` accepts derived files through a per-procedure `derivedFiles` list declared in the module. The derivation rules:
  - `available` when at least one designer is `prototype` or `available` after the release cap;
  - otherwise `in progress` when at least one row's `develop` state maps to `in progress` or later;
  - otherwise `planned`.

  Resolve compares the catalogue blob SHAs and releases. Apply treats an unchanged `hosts.json` as `current`.
- [X] T041 [P] [US3] Write `procedures/refresh-catalogue.md` from the template, with the title "Refresh the designer catalogue". Its **Decisions** section covers the unmapped source state: the options are the site states, and the answer goes to `procedures/config/states.json`. It explains the release cap in two sentences with one example, and names the external gap for IntelliJ, which needs a `docs/diagrams.md` (plan § Dependencies).
- [X] T042 [P] [US3] Write `procedures/refresh-hosts.md` from the template, with the title "Refresh the IDE host states". It states the three derivation rules, and **Decisions** is "None".
- [X] T043 [US3] Add the `refresh-catalogue` and `refresh-hosts` rows to `procedures/README.md`, and both titles to `CLAUDE.md`.

**Checkpoint**: all four single procedures work independently. Quickstart scenarios 6 and 7 pass as dry runs.

---

## Phase 6: User Story 4 - Run everything at once (Priority: P3)

**Goal**: `npm run refresh -- all` runs the four procedures in turn, each in its own clean worktree of `develop`, isolates failures, and prints a summary table. It opens one pull request per procedure that found changes and none of its own.

**Independent Test**: quickstart scenario 8, run as `--dry-run` with one unreachable `--source`. `dedl` fails and names `etalii-adp/etalii.adp`, the other three complete, the table lists four outcomes, and the exit code is 2.

- [ ] T044 [P] [US4] Write `scripts/refresh/run-all.test.mjs`. Cover: one unreachable source fails only that procedure, and the others still run (US4-2); the exit code is the highest of the four; the table has the columns procedure, outcome and pull request or failure; with `GITHUB_STEP_SUMMARY` set to a temporary file, the table is appended to that file; `.refresh/<short>/summary.json` exists per procedure, with the top-level `.refresh/summary.json` holding the combined table.
- [ ] T045 [US4] Implement the `all` id in `scripts/refresh/run.mjs` (depends on T028, T034, T039 and T040), which follows research R13. It runs `dedl`, `screenshots`, `catalogue` and `hosts` in that order, each through the same stage runner in its own temporary worktree, passing every `--source`, `--dry-run` and `--base` through. It catches each procedure's error as `failed`, writes each procedure's files under `.refresh/<short>/`, and prints the summary table (and appends it to `$GITHUB_STEP_SUMMARY` when set). It exits with the highest code.
- [ ] T046 [P] [US4] Write `procedures/refresh-all.md` from the template, with the title "Refresh the whole site". **Sources** is "The sources of each procedure below", with links. **Pull request** is "None of its own: one per procedure that found changes". Its steps tell the reader how to act on each row of the summary table, using that procedure's own document.
- [ ] T047 [US4] Add the `refresh-all` row to `procedures/README.md`, and the title "Refresh the whole site" to `CLAUDE.md`.

**Checkpoint**: US4 works. Quickstart scenario 8 passes.

---

## Phase 7: User Story 5 - Write a new procedure (Priority: P3)

**Goal**: a maintainer copies `procedures/_template.md`, writes a new procedure and its module, and `npm run refresh:lint` states exactly what is missing until the procedure is complete and indexed.

**Independent Test**: quickstart scenario 10. A copy of the template without **Verification** and without an index row fails lint, naming both. Completing both makes lint pass.

- [ ] T048 [P] [US5] Write `scripts/refresh/lint.test.mjs` against a temporary copy of `procedures/`, using `lint.mjs --dir <dir>`. Cover:
  - a missing section, and sections out of order;
  - a procedure file not in the index, and an index row with no file;
  - a Sources table that disagrees with the module's `sources` (repository or paths);
  - a mapping value in `states.json` that is not in `siteStates`;
  - a `screenshots.json` origin that is not in the `vendor/type` form;
  - a step that mentions editing `sources/`, and the phrase "ask the owner" outside **Decisions**;
  - the real `procedures/` folder passing.
- [ ] T049 [US5] Implement `scripts/refresh/lint.mjs` (`npm run refresh:lint`), which follows [contracts/cli.md](contracts/cli.md) and [contracts/procedure-document.md](contracts/procedure-document.md) § Rules. It checks every `procedures/refresh-*.md` for:
  - the `#` title and the `##` sections `Sources`, `Updates`, `Before you start`, `Steps`, `Decisions`, `Verification`, `Pull request` and `When the source moves`, exactly in this order;
  - exactly one row in the `procedures/README.md` table;
  - a Sources table whose repositories and paths equal the module `scripts/refresh/procedures/<short>.mjs` (`refresh-all` is exempt);
  - no "ask the owner" outside **Decisions**, and no instruction to edit files under `sources/`.

  It also checks `procedures/config/states.json` (every mapping value is in `siteStates`) and `procedures/config/screenshots.json`. It prints one line per problem with its file and exits 1 on any problem.
- [ ] T050 [US5] Add an "Adding a procedure" section to `procedures/README.md`, in five numbered steps:
  1. copy `_template.md` to `refresh-<id>.md`;
  2. add `scripts/refresh/procedures/<short>.mjs` implementing the module interface of `run.mjs`, with a test;
  3. add the index row;
  4. add the title to `CLAUDE.md`, and the id to the `workflow_dispatch` choices in `.github/workflows/refresh.yml` and to `all`;
  5. run `npm test` and `npm run refresh:lint`.

**Checkpoint**: US5 works. Quickstart scenario 10 passes.

---

## Phase 8: Automatic runs and CI (FR-012, SC-002)

**Purpose**: runs that start by themselves hourly, on request and on `source-changed`, using a GitHub App token. Blocked decisions become issues, and every pull request runs `npm test`, `refresh:lint` and `refresh:verify`.

- [ ] T051 Add blocked-issue handling to `scripts/refresh/run.mjs` (depends on T014, T017 and T045). When the `GITHUB_ACTIONS` environment variable is `true` and a procedure's outcome is `needs-decision`, it calls `upsertIssue('Refresh blocked: refresh-<short>', renderDecisionIssue(decision), ['refresh-blocked'])`. When that procedure's outcome is anything other than `needs-decision` and `failed`, it closes an open issue with that title with the comment `Resolved: run <link> no longer needs a decision.` Interactive runs never open issues. Add a case for both behaviours to `scripts/refresh/run.test.mjs` with `github.mjs` stubbed.
- [ ] T052 Add the previous scheduled run to the pull request footer and the job summary. In `scripts/refresh/run.mjs`, call `previousScheduledRun('refresh.yml')` once per run and pass it to `renderPrBody` and to the `all` table. On failure or outside CI, use `null`, rendered as "none in 7 days: check that the Refresh workflow is enabled" when in CI and "not checked (local run)" when not (research R5).
- [ ] T053 Create `.github/workflows/refresh.yml`, which follows [contracts/cli.md](contracts/cli.md) § GitHub workflow and research R5 and R7:
  - **Name**: `Refresh`.
  - **Triggers**: `schedule` `cron: '17 * * * *'`; `workflow_dispatch` with the input `procedure` (a `choice` of `all`, `dedl`, `screenshots`, `catalogue` and `hosts`, default `all`); `repository_dispatch` with `types: [source-changed]`.
  - **Permissions**: `contents: read`.
  - **Job `plan`**: maps the trigger to a JSON list of procedures. For `repository_dispatch`, it uses `client_payload.repository`: `etalii-adp/etalii.adp` → `["dedl"]`, and any `etalii-adp/etalii.adp.ide.*` → `["screenshots", "catalogue", "hosts"]`.
  - **Job `refresh`**: a matrix over that list with `concurrency: { group: refresh-${{ matrix.procedure }}, cancel-in-progress: false }` on `ubuntu-latest`. Its steps:
    1. `actions/create-github-app-token@v1` with `app-id: ${{ secrets.REFRESH_APP_ID }}`, `private-key: ${{ secrets.REFRESH_APP_PRIVATE_KEY }}`, `owner: etalii-adp`, and the repositories `etalii.adp.site`, `etalii.adp`, `etalii.adp.ide.standalone`, `etalii.adp.ide.intellij`, `etalii.adp.ide.vscode` and `etalii.adp.ide.eclipse`. It is skipped when `REFRESH_APP_ID` is empty.
    2. A step that fails at once, with the message "Set REFRESH_APP_ID and REFRESH_APP_PRIVATE_KEY (or the stopgap REFRESH_TOKEN) as repository secrets; see procedures/README.md", when neither the App secrets nor `secrets.REFRESH_TOKEN` are set.
    3. `actions/checkout@v4` with `fetch-depth: 0` and that token.
    4. `actions/setup-node@v4` with `node-version: 22` and `cache: npm`.
    5. `npm ci`.
    6. `git config user.name "adp-site-refresh[bot]"`, and `user.email` set to the App's noreply address.
    7. `npm run refresh -- ${{ matrix.procedure }}`, with `GH_TOKEN` set to the token.

    Exit code 3 is not treated as a job failure, because the issue is the signal. Exit code 1 is also accepted, because the draft pull request is the signal. Exit code 2 fails the job.
- [ ] T054 [P] Create `.github/workflows/refresh-checks.yml`, which runs on `pull_request` and `push` to `develop`. It uses Node 22, runs `npm ci`, and then runs `npm test`, `npm run refresh:lint` and `npm run refresh:verify`, so that a hand edit under `sources/` fails CI (constitution principle II). Add a header comment saying that spec 001's CI may absorb these three steps.
- [ ] T055 [P] Add an "Automatic runs" section to `procedures/README.md`. It covers:
  - the three triggers, and that a scheduled run with nothing changed ends at Resolve;
  - the owner's one-time setup: create the GitHub App "ADP site refresh" with `contents: read` on the five sources and `contents: write`, `pull-requests: write` and `issues: write` on this repository; install it; set the secrets `REFRESH_APP_ID` and `REFRESH_APP_PRIVATE_KEY`, or the stopgap fine-grained token `REFRESH_TOKEN`; and enable "Automatically delete head branches";
  - the 60-day schedule risk, and how to re-enable the workflow with `gh workflow enable refresh.yml`;
  - how a source repository may send `repository_dispatch` of type `source-changed`, with the payload `{"repository": "<owner/name>"}`.

**Checkpoint**: the workflow passes `actionlint`, if available, and the blocked-issue path is covered by tests. The live behaviour is quickstart scenario 9, which needs the owner's App setup.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T056 [P] Check cross-platform behaviour. Run `npm test` on Windows (this worktree) and confirm that locks, summaries and `adp:source` values use `/` separators, that the `node_modules` link in temporary worktrees works as a junction, and that temporary worktrees are removed after both success and failure (`git worktree list` shows none left).
- [ ] T057 Run quickstart scenarios 0, 1, 3, 5, 6, 7, 8 and 10 from [quickstart.md](quickstart.md) as dry runs against fixtures and local clones, and record each outcome in a short "Validation" section at the end of `specs/004-content-refresh-procedures/quickstart.md`, with the date and the commit.
- [ ] T058 Run `npm run refresh -- all --dry-run` against the real sources with the developer's `gh` login. Confirm that a run with nothing changed finishes in under one minute per procedure (plan § Performance Goals), that the private sources are readable, and that the source caveat for the standalone screenshots appears. Record the timings in the same Validation section.
- [ ] T059 [P] Review `procedures/*.md`, `procedures/README.md` and the new `CLAUDE.md` sections for constitution principle V: every step is executable without asking for steps, the only questions are the listed decisions, and no Markdown line is wrapped at a fixed width (the repository's convention).
- [ ] T060 Run `npm test`, `npm run refresh:lint` and `npm run refresh:verify` together as the final gate, and make sure all three exit 0 before the feature's pull request is opened.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none.
- **Foundational (Phase 2)**: depends on Setup and blocks every story.
- **US1 (Phase 3)** and **US2 (Phase 4)**: both P1. Each depends only on Foundational, and they can run in parallel.
- **US3 (Phase 5)**: depends only on Foundational, because `catalogue-table.mjs` and `states.json` are foundational. It can run in parallel with US1 and US2.
- **US4 (Phase 6)**: depends on US1, US2 and US3, because it runs all four modules.
- **US5 (Phase 7)**: depends on Foundational for the template and index. Its lint test's "the real `procedures/` folder passes" case is best finished after US1–US4.
- **Automatic runs (Phase 8)**: T051 depends on T045. T053, T054 and T055 depend only on Foundational.
- **Polish (Phase 9)**: depends on everything above.

### Within the foundation

- T013 comes before T016. T014 and T015 come before T019. T016 comes before T018 and T019. T017 comes before T019. T019 comes before T020. T021 comes before T022.
- Tests T005–T012 are written first and fail until their implementation lands.

### Story completion order

```text
Setup → Foundational ─┬─ US1 (DEDL) ──────────┐
                      ├─ US2 (screenshots) ───┼─ US4 (all) ─┐
                      ├─ US3 (catalogue+hosts)┘             ├─ Phase 8 → Polish
                      └─ US5 (lint) ────────────────────────┘
```

## Parallel Examples

### Foundational

```text
Together: T005 repo helper, T006 lock tests, T007 png tests, T008 summary tests, T009 run tests, T010 verify tests, T011 decide tests, T012 catalogue-table tests
Then together: T013 png.mjs, T014 github.mjs, T015 local.mjs, T017 summary.mjs, T021 states.json, T023 _template.md, T024 README.md
```

### User Story 1

```text
Together: T026 DEDL fixture, T027 dedl tests, T029 refresh-dedl.md
Then: T028 dedl.mjs → T030 index and CLAUDE.md
```

### User Story 2

```text
Together: T031 screenshot fixture, T032 screenshot tests, T033 screenshots.json, T035 refresh-screenshots.md
Then: T034 screenshots.mjs → T036 index and CLAUDE.md
```

### User Story 3

```text
Together: T037 catalogue tests, T038 hosts tests, T041 refresh-catalogue.md, T042 refresh-hosts.md
Then: T039 catalogue.mjs and T040 hosts.mjs (different files, both after T022) → T043 index and CLAUDE.md
```

### Across stories

Once Phase 2 is done, US1, US2 and US3 can go to three agents in parallel. They touch different files, except for the one-row additions to `procedures/README.md` and `CLAUDE.md` (T030, T036, T043), which should land one after another.

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1 Setup, then Phase 2 Foundational.
2. Phase 3 (US1): the DEDL procedure.
3. **Stop and validate**: quickstart scenarios 0–3 as dry runs. This is already a working, agent-runnable procedure for the site's most-read content.

### Incremental delivery

1. Foundation + US1 → the DEDL refresh works on request.
2. + US2 → screenshots, with rejection, gaps and caveats.
3. + US3 → catalogue and host states with the release cap and decisions.
4. + US4 → `all`.
5. + US5 → lint enforces the template for future procedures.
6. + Phase 8 → hourly automatic runs (needs the owner's GitHub App).

### Out of this feature's scope (recorded in plan § Dependencies)

- Seeding `sources/` with real content: after this feature is merged, the first run of each procedure opens its own `refresh/*` pull request.
- The site-side obligations of [contracts/site-integration.md](contracts/site-integration.md) (`npm run build`, `npm run check`, `adp.out`, and the `adp:source` and `adp:sourced` metas) belong to specs 001–003. Until then, Verify reports build and check as "not available".
- The GitHub App, its secrets and the repository setting are the owner's. The `docs/diagrams.md` for IntelliJ, the licence of `etalii.adp` and the retake of the standalone screenshots belong to the source repositories.
