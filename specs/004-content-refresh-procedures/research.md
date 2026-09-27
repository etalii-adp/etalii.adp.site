# Research: Content Refresh Procedures

**Feature**: `features/004-content-refresh-procedures` | **Date**: 2026-09-26 | **Plan**: [plan.md](plan.md)

This document resolves every open question in the plan's Technical Context. The sources were surveyed on 2026-09-26 with `gh api`; what was found is recorded under "Source survey" at the end, because several decisions follow from it.

## R1. What a procedure is made of

**Decision**: each procedure is a Markdown document in `procedures/` (the instructions an agent or a person reads), and its mechanical steps are Node.js scripts in `scripts/refresh/` that the document tells the reader to run. The document owns the order, the decisions and the pull-request wording; the scripts own fetching, copying, comparing, recording and checking. `CLAUDE.md` points at `procedures/README.md`, so naming a procedure to an agent ("refresh the DEDL reference", "run refresh-dedl") is enough for it to find the document.

**Rationale**: FR-002 needs a run that does not ask a person for steps, and SC-002 needs pull requests that pass checks on their first run. Both are much more reliable when copying, hashing and diffing are code rather than prose an agent re-interprets on every run. FR-012 also needs runs that start on their own, with no agent present (R5), and scripts can run in CI where prose cannot. The Markdown stays the single entry point, so the procedure is still "written" (constitution principle V) and a person can follow it.

**Alternatives considered**:
- *Prose only, the agent performs every step with shell commands*: rejected. Every run would differ, and automatic runs would need an LLM in CI.
- *Scripts only, no document*: rejected. FR-003 and FR-011 ask for written procedures with a shared shape, and the judgement steps (unmapped states, screenshot expectations) need a place to be explained.
- *One Claude Code skill per procedure in `.claude/skills/`*: rejected as the primary form, because it ties the procedures to one agent product and duplicates the document. A thin skill can be added later if naming alone proves unreliable.

## R2. Where sourced content lives in this repository

**Decision**: every refresh copies its source files verbatim into `sources/<procedure>/`, together with a lock file `sources/<procedure>/source.lock.json` that records, per file, the source repository, path, commit SHA and SHA-256 (the source record of FR-005). The site's build (specs 001–003) reads sourced content only from `sources/` and never from the network.

**Rationale**:
- The spec's independent test for User Story 1 expects a pull request "whose diff contains that sentence". That is only true when the source text is committed here.
- Builds are reproducible and work offline. Spec 002 FR-013 (an unreachable source publishes nothing) holds by construction, because a failed fetch changes nothing under `sources/`.
- One folder and one lock per procedure means two refresh pull requests never touch the same file (spec edge case "two procedures would change the same page"). Pages are generated from `sources/`, so they cannot conflict either.

**Alternatives considered**:
- *Git submodules*: rejected. Submodules pin whole repositories, including four private ones full of unrelated code, and the diff shows only a SHA change, not the content.
- *Fetch at build time from pinned SHAs*: rejected. The diff would again show a SHA rather than content, and every CI build would need tokens for the private repositories.
- *One shared lock file for all procedures*: rejected. Concurrent refresh pull requests would conflict on it.

## R3. Language and dependencies

**Decision**: Node.js 22 LTS with plain ES modules, the `gh` CLI for every GitHub interaction, and a single runtime dependency, `parse5`, to read the HTML table in the standalone catalogue. Tests use the built-in `node:test` runner. PNG dimensions are read from the file header, with no image library.

**Rationale**: the repository already has a `package.json`, and the sources' own tooling is JavaScript (`docs/screenshots/capture.mjs`). The site generator chosen by spec 001's plan will almost certainly run on Node as well, so the procedures add no second runtime. `gh` handles authentication to private repositories, the REST API, pull requests and issues. It is preinstalled on GitHub-hosted runners and in the agent environments ADP uses. Principle VI keeps the dependency list to what a current requirement needs, which is only the HTML table.

**Alternatives considered**:
- *PowerShell scripts, like Spec Kit's*: rejected. Spec Kit's scripts are tooling for writing specs, not site code, and PowerShell on Linux runners adds an install step.
- *Python*: rejected. It would be a second runtime next to the site's Node toolchain.
- *Octokit instead of `gh`*: rejected. It is a dependency, and it duplicates what `gh` already does.
- *Regular expressions for the catalogue table*: rejected. The rows contain nested markup (`<code>`, `<a>`, `&nbsp;`), and a regex parser would break silently when the table changes.

## R4. How a run compares, updates and reports

**Decision**: a run happens in five fixed stages, the same for every procedure (see [contracts/procedure-document.md](contracts/procedure-document.md)):

1. **Resolve**: read the source's `develop` head and, for each watched path, the latest commit that touched it, and list the watched files with their git blob SHAs (the git trees API at that commit; `git ls-tree` for a local `--source`). If the set of files and their blob SHAs equal the `gitBlob` values in the lock, and the release inputs of R10 are unchanged, the run ends with "current" (FR-007). Nothing is downloaded to decide this.
2. **Fetch**: download the watched files at that exact commit into a temporary folder. Any failure ends the run with "failed", naming the source, and nothing is changed (edge case: unreachable source).
3. **Apply**: replace `sources/<procedure>/` from the temporary folder, write the new lock, and compute the change summary: files added, changed and removed, plus a per-kind summary (changed DEDL sections, changed designer states, changed images).
4. **Verify**: run the site's checks (R8) and the source-record check.
5. **Deliver**: push the branch `refresh/<procedure>` and create or update its pull request (R6).

**Rationale**: watching path-level commits (the GitHub commits API with `path=`) rather than the repository head means that unrelated commits in a source do not produce empty pull requests. Comparing blob SHAs rather than commit SHAs means a commit that touches a watched path without changing its content still counts as current. A blob SHA is a hash of the content that git already computes, so Resolve can compare content without fetching it. The lock keeps the SHA-256 of each file as committed here too, because that is what `refresh:verify` recomputes offline. Derived files (`catalogue.json`, `screenshots.json`, `hosts.json`) have no blob of their own. They are regenerated on every run from the verbatim copies and the mappings, so a mapping change alone also produces a diff, and the Apply stage treats "no diff after regeneration" as current.

**Alternatives considered**:
- *Comparing the head SHA alone*: rejected, because every commit anywhere in the source would count as a change.
- *Fetching first and comparing SHA-256 afterwards*: rejected. It works, but every hourly run of every procedure would download the full sources, including the screenshots, only to find them unchanged.

## R5. What starts a run by itself (FR-012)

**Decision**: a workflow in this repository, `.github/workflows/refresh.yml`, starts runs in three ways:
- `schedule`, every hour, as the primary trigger;
- `workflow_dispatch`, with a procedure choice, for runs on request from the GitHub UI;
- `repository_dispatch` of type `source-changed`, which a source repository MAY send to skip the wait.

Each start runs `npm run refresh -- <procedure>`, which is the same entry the procedure document uses. A scheduled run on a source that has not changed ends at the Resolve stage and costs a few API calls.

**Rationale**: FR-012 asks for runs "whenever a source changes on its `develop` branch". Polling achieves that with a delay of at most an hour and no change in any other repository. The constitution keeps the site to this repository, and a push-based trigger would need a workflow and a secret in each of five source repositories. The `repository_dispatch` entry leaves room to add push triggers later without redesigning anything.

**Risk: the schedule can switch itself off.** GitHub disables scheduled workflows in a public repository after 60 days without activity in it, and says so only in the Actions tab. A quiet period in the sources would then stop FR-012's automatic runs without anyone noticing. The design meets this in three ways:
- the refresh workflow's own runs do not count as activity, but its pull requests and their merges do, so the risk arises only when no source changes for 60 days, which is when a stopped schedule costs least;
- every `refresh -- all` run writes the date of the previous scheduled run (read from the Actions API) to its job summary and to each pull request body, so a gap is visible to whoever reads either;
- `procedures/README.md` tells a maintainer how to re-enable the workflow (`gh workflow enable refresh.yml`), and the `repository_dispatch` trigger keeps working while the schedule is disabled, so sources that send it are unaffected.

A keep-alive commit on a timer was rejected: it adds noise commits to `develop` or needs a push outside a pull request, which the constitution forbids.

**Alternatives considered**:
- *Only `repository_dispatch` from each source*: rejected as the only trigger, because it needs changes and secrets in five other repositories before anything works.
- *A cron in each source repository*: rejected, for the same reason.

## R6. Branches, pull requests and "update, don't duplicate" (FR-004, FR-008, FR-009)

**Decision**: each procedure always uses the same branch, `refresh/<procedure>` (for example `refresh/dedl`). Every run recreates that branch from the current `origin/develop`, applies its change, force-pushes, and then:
- if an open pull request from that branch exists, updates its body (FR-008);
- otherwise, opens one into `develop` with `gh pr create`;
- if the run finds that `develop` is already current but a pull request is still open, closes it with a comment saying that `develop` already matches the source.

A pull request whose verification failed is opened or kept as a **draft**, with the failing output in its body (edge case "verification fails"). Only a fully verified run marks it ready for review. No procedure merges its own pull request. The owner merges with a merge commit, and the branch is deleted on merge (the repository's "automatically delete head branches" setting, or the owner does it by hand, as `CLAUDE.md` already asks).

**Rationale**: a fixed branch name makes "is there already a pull request for this?" a simple lookup (`gh pr list --head refresh/<procedure>`). Rebuilding from `develop` on every run satisfies the edge case that the second of two procedures is based on whatever `develop` holds when it runs. Force-pushing is safe because only the procedure writes to its own `refresh/*` branch.

**Alternatives considered**: a new branch per run (for example `refresh/dedl-<date>`) was rejected, because finding the previous run's pull request would then need searching, and stale branches would pile up.

**Consequence**: `refresh/*` is a third branch category next to `features/*` and `claude/*`. `CLAUDE.md` ("Branches and delivery") is amended to name it. The constitution's workflow section governs feature development and is unaffected, because a refresh is not a feature.

## R7. Tokens and permissions

**Decision**: automatic runs use a GitHub App owned by the `etalii-adp` organization (working name "ADP site refresh"). The workflow gets its installation token with `actions/create-github-app-token`. The App has `contents: read` on the five source repositories, and `contents: write`, `pull-requests: write` and `issues: write` on this one. Interactive runs use the agent's or person's own `gh` login.

**Rationale**: four of the five sources are private (survey below), so the workflow's built-in `GITHUB_TOKEN` cannot read them. Pull requests opened with `GITHUB_TOKEN` also do not start other workflows, so the site's checks would never run on them and SC-002 could not be met. An App token solves both. It is scoped to the organization, needs no personal account, and expires hourly.

**Alternatives considered**: a fine-grained personal access token was rejected because it is tied to one person's account and expires on a calendar. It remains an acceptable stopgap if the App cannot be created at once; the workflow reads whichever secret is set.

**Prerequisite (owner)**: create and install the App, and store `REFRESH_APP_ID` and `REFRESH_APP_PRIVATE_KEY` as secrets of this repository. The quickstart lists this step.

## R8. Verification (FR-006) and what it needs from spec 001

**Decision**: the Verify stage runs, in order:
1. `npm run build`: the site builds.
2. `npm run check`: internal links resolve and every page passes automated WCAG 2.2 AA checks. Spec 001 FR-012 already requires these checks on every pull request.
3. `npm run refresh:verify`: the source-record check owned by this feature. It confirms that every file under `sources/` is listed in its procedure's lock with a matching SHA-256, that no lock lists a missing file, and that every generated page built from `sources/` carries a source record in its HTML (see [contracts/site-integration.md](contracts/site-integration.md)).

Each step's result (pass or fail, with the output of any failure) goes into the pull request body.

**Rationale**: the procedures must not invent their own link or accessibility tooling. That is spec 001's choice, and running the same `npm` scripts CI runs is what makes SC-002 hold. The source-record check is specific to sourced content, so it lives here.

**Dependency**: spec 001's plan MUST provide the `build` and `check` npm scripts with the behaviour described in [contracts/site-integration.md](contracts/site-integration.md). Until then, `refresh:verify` runs alone and the pull request says that the build and check steps were "not available". That is honest, and it lets this feature be implemented and tested before the site exists.

## R9. Questions a procedure may ask (FR-002, US3-2)

**Decision**: a procedure asks only when a site-owned mapping has no entry for something a source introduced. That happens in two cases: a source state with no site state (the catalogue procedure), and a screenshot not yet linked to a designer (the screenshot procedure). The script exits with code 3 ("needs decision") and writes the question and its options as JSON to `.refresh/decision.json`.
- In an **interactive run**, the agent reads that file and asks the person with a selection prompt whose options are the existing site states or designers. It writes the answer into the mapping and re-runs the procedure. The mapping change becomes part of the same pull request.
- In an **automatic run**, the workflow opens an issue titled `Refresh blocked: <procedure>` (or updates the one already open), listing the question and the options as a checklist, and opens no pull request. The owner answers by running the procedure interactively or by editing the mapping in a pull request. The next scheduled run then proceeds.

**Rationale**: this is the only kind of question a source cannot answer (FR-002). Keeping the mappings as files in this repository means each answer is reviewed and versioned like any other change.

## R10. The state mapping and host states

> **Amended 2026-09-27 by spec 003 (owner's decision, spec 003 research D3, task T011).** The site uses spec 003's seven states (`not-planned`, `idea`, `planned`, `in-progress`, `prototype`, `implemented`, `available`), and ✅ Implemented maps to `implemented`. The release cap below no longer applies: a designer's state is its mapped `develop` state, never lowered, and `releaseState` is only recorded. Usable designers are those at `prototype`, `implemented` or `available`, and a host is `available` only when it also has a release to install. The text below is kept as the original decision.

**Decision**: the site's shared states (spec 003 FR-005) and their mapping from each source's states live in `procedures/config/states.json`. The standalone catalogue's states map as follows:

| Source state (standalone `docs/diagrams.md`) | Site state |
|---|---|
| 💡 Identified | identified |
| 📝 Specified | specified |
| ⏸️ To-do | specified |
| 🛠️ Work-in-progress | in progress |
| ⚗️ Prototype | prototype |
| ✅ Implemented | available |

A host with no entry for a designer is shown as "not planned" (spec 003 US3-2). "Planned" is kept for when a source can state it.

**Usable states are capped at the latest release.** The mapping above gives a designer's state on `develop`. The states that claim a user can use the designer, `prototype` and `available`, are then capped at what that host's latest published GitHub release says. The catalogue procedure also reads `docs/diagrams.md` at the commit of the latest release tag and maps it the same way. A designer's published state in that host is the lower of the two, where `prototype` and `available` above the release state become `in progress`. Examples: Implemented on `develop` and Implemented at the release → `available`. Implemented on `develop` but Prototype at the release → `prototype`. Implemented on `develop` and absent at the release → `in progress`. A host with no release has no designer above `in progress`. The catalogue entry keeps both source states (`developState`, `releaseState`) so the pull request and the page can say why. A new release is a change like any other: Resolve compares the latest release tag with the lock's `releases`, so publishing a release in a host repository starts a catalogue refresh.

An **IDE host's state** (spec 001 FR-006) is derived by the host procedure from its repository alone, using facts a script can check:
- **available**: at least one designer in that host is `prototype` or `available` after the release cap, which implies a published release to install;
- **in progress**: otherwise, the host has a `docs/diagrams.md` with at least one row whose `develop` state maps to `in progress` or later (Work-in-progress, Prototype or Implemented);
- **planned**: neither. Today this covers VS Code and Eclipse, whose repositories hold only agent and editor configuration, and IntelliJ until it has a catalogue (source survey).

The derived state is stored in `sources/hosts/hosts.json` with the facts it was derived from (catalogue revision, latest release tag and commit, count of usable designers).

**Rationale**: the mapping is the site's policy, not sourced content, so it belongs in this repository as configuration and is reviewed like code. Principle III forbids claiming a capability that does not exist "in a released or published form". Without the cap, a designer marked Implemented on `develop` the day after a release would be shown as `available` although no user could install it. Reading the catalogue at the release tag keeps the claim checkable and needs no new file in any source repository. For the host state, "commits beyond initial scaffolding" was rejected as a criterion because no script can decide it; the catalogue row is the host repository's own statement. Spec 003's plan may refine how states are displayed, but it must use these values.

**Alternatives considered**:
- *A separate site state such as "implemented, unreleased"*: rejected. It adds an eighth state to spec 003's shared set for a situation `in progress` already describes truthfully from a user's point of view.
- *Trusting `develop`*: rejected, per principle III above.

## R11. Screenshots: what "checked against expectations" means (US2, FR-013)

**Decision**: the screenshot procedure publishes only images already committed in a host repository's `docs/screenshots/`, and it never runs `capture.mjs` (FR-013). It reads the expectations from that folder's `readme.md`: the images table (image, document opened, what must be visible) and the stated format and budget. Each image is then checked mechanically:
- it is listed in the expectations table;
- it is a PNG whose file size is within the stated budget (each image ≤ 300 KB, `workspace.png` ≤ 1 MB);
- its dimensions match the stated viewport (1600×900).

An image that fails any check is not brought in. The previous copy stays, and the problem is listed in the pull request (US2-2). The "what must be visible" text is copied beside each image as its description. It becomes the pull request's review note for the owner (the visual part a script cannot judge) and the default alternative text for the site (spec 003 FR-012).

Which designer an image shows is stored in `procedures/config/screenshots.json` (image → origin tag, or `none` for an image that shows no designer, such as the standalone's Markdown text editor). An image not in that map raises a decision (R9). A designer that is prototype or available in a host but has no image there is reported as a gap in the pull request, and no image is invented (US2-3).

**Rationale**: the source readme already states the expectations precisely, so the site copies them rather than inventing its own. The part that needs eyes stays with the reviewer, who sees the image and its expectation side by side in the pull request diff.

**Known issue in the current source images**: the standalone readme records ("Known artefact") that the committed set was captured from a developer build and shows a `developer session` marker in the header, which a user of a release build never sees. Principle III requires screenshots to show the real product. The site does not edit or crop the images (FR-013 and principle II), so the fix belongs in the source: retake the set with `LocalAuthenticator__DeveloperSessionDisabled=true`, as the readme describes. Until then, the screenshot procedure reports the readme's "Known artefact" note under a **Source caveats** heading in every pull request. It detects the note by its heading text, so the caveat disappears by itself when the source removes the note. The images are still imported: apart from the marker they show the real product, and the owner decides at review whether to merge them. The plan lists the retake as an external dependency.

## R12. DEDL versions and the change summary (US1)

**Decision**: the DEDL procedure watches `specifications/dedl/` in `etalii-adp/etalii.adp`. It reads the version from the specification's front matter (the "Version" line in its header) and checks it against the version segment of the schema's `$id` (`…/dedl/schema/<version>/dedl.schema.json`). If the two disagree, the run fails and names both values. The files land in `sources/dedl/<version>/`:
- same version as the latest already present: that folder is replaced (a working draft's text changed);
- a new version: a new folder is added beside the old ones, which stay frozen (US1-3, spec 002 FR-006). The pull request says "new version <v> published beside <old>".

The change summary lists, per top-level section and appendix (split on the document's `##` headings), whether it was added, removed or changed, with the number of changed lines. The schema and each example are reported as changed or unchanged.

**Rationale**: spec 002 publishes each version at its own addresses, and a frozen folder per version is the simplest way to guarantee that. Section-level reporting is exactly what US1-4 asks the owner to see.

## R13. The combined procedure (US4, FR-010)

**Decision**: `refresh-all` runs `refresh-dedl`, `refresh-screenshots`, `refresh-catalogue` and `refresh-hosts` in turn, each in its own clean checkout of `develop` on its own branch. A failure in one is recorded and does not stop the others (US4-2). At the end it prints a summary table (procedure, outcome, pull request link or failure), which in CI is written to the job summary. It opens no pull request of its own.

**Rationale**: separate pull requests per procedure is what US4 asks for, and running the procedures sequentially keeps the run simple and its logs readable.

## R14. Removed content (edge case)

**Decision**: when a watched file disappears from a source, the Apply stage removes it from `sources/<procedure>/` and records it in the lock's `withdrawn` list with the source revision and date. The site's build (specs 002 and 003) turns `withdrawn` entries into the redirect or withdrawal pages those specs require. The pull request lists every withdrawal.

**Rationale**: the withdrawal must survive after the file is gone so the build can still produce the notice, and the lock is where this feature records history.

## Source survey (2026-09-26)

| Source | Visibility | Watched paths | Notes |
|---|---|---|---|
| `etalii-adp/etalii.adp` | public | `specifications/dedl/` | `DEDL-specification.md` (≈450 KB), `dedl.schema.json`, `erd.dedl`, `statemachine.dedl`, `timeline.dedl`, `timeline.document.json`. |
| `etalii-adp/etalii.adp.ide.standalone` | private | `docs/diagrams.md`, `docs/screenshots/` | The catalogue is an HTML `<table>` inside Markdown: State, Origin, Diagram, Theory, Example. The screenshots folder has 7 PNGs, `capture.mjs` and a `readme.md` with the expectations table and budgets. |
| `etalii-adp/etalii.adp.ide.intellij` | private | `docs/diagrams.md` (not present yet), `docs/screenshots/` (not present yet) | Its README describes two designers, FreeMind `.mm` and draw.io, but there is no machine-readable catalogue. |
| `etalii-adp/etalii.adp.ide.vscode` | private | as above | No README and no designers yet. |
| `etalii-adp/etalii.adp.ide.eclipse` | private | as above | No README and no designers yet. |

**Consequence for IntelliJ**: principle II forbids retyping its README into the catalogue. Until the IntelliJ repository adds a `docs/diagrams.md` in the standalone's format, the catalogue procedure reports "no catalogue at `docs/diagrams.md`" for IntelliJ in every pull request, and the IntelliJ designers do not appear. Adding that file is a change in `etalii-adp/etalii.adp.ide.intellij`, outside this feature. The plan lists it as an external dependency.
