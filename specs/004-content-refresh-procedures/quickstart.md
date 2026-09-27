# Quickstart: validating the refresh procedures

**Feature**: `features/004-content-refresh-procedures` | **Plan**: [plan.md](plan.md)

These scenarios prove the feature end to end. Each names the spec requirement it covers. Commands and outputs are defined in [contracts/cli.md](contracts/cli.md), and the pull-request shape in [contracts/pull-request.md](contracts/pull-request.md).

## Prerequisites

- Node.js 22 LTS and `npm ci` done in this repository.
- `gh auth status` shows a login with read access to the five `etalii-adp` source repositories and write access to this one.
- Local clones of the sources next to this repository, for the offline scenarios: `../etalii.adp`, `../etalii.adp.ide.standalone`.
- For the automatic-run scenarios only: the GitHub App from research R7 is installed, and `REFRESH_APP_ID` and `REFRESH_APP_PRIVATE_KEY` are set as repository secrets.

## 0. Offline checks (no GitHub)

```sh
npm run test:refresh   # parsers, diffing, lock writing, PR body rendering, against fixtures
npm run refresh:lint   # every procedure has the template's sections and is indexed (FR-011)
npm run refresh:verify # current sources/ matches its locks (FR-005)
```

Expected: all three exit 0.

## 1. DEDL: a changed sentence reaches a pull request (US1, SC-004)

```sh
# in ../etalii.adp, on a scratch branch: change one sentence in specifications/dedl/DEDL-specification.md and commit
npm run refresh -- dedl --dry-run --source etalii-adp/etalii.adp=../etalii.adp
```

Expected: `outcome: delivered` (dry run), and `.refresh/summary.json` lists exactly one changed file and one changed section. The diff under `sources/dedl/<version>/` in the temporary worktree contains that sentence and nothing else. `.refresh/pr-body.md` shows the before and after revisions, the section table and three verification rows (US1-4).

## 2. DEDL: nothing changed (US1-2, FR-007)

```sh
npm run refresh -- dedl
```

Run it against the real source, immediately after a merged refresh. Expected: `outcome: current`, exit 0, no branch pushed, and no pull request opened.

## 3. DEDL: a new version is published beside the old (US1-3)

In the local clone, change the version in the specification header and in the schema's `$id` to `0.2`, commit, and dry-run as in scenario 1. Expected: a new folder `sources/dedl/0.2/`, `sources/dedl/0.1/` untouched, and a title reading `publish 0.2 beside 0.1`. Changing only one of the two versions gives `outcome: failed`, naming both values.

## 4. A live pull request, then an update of the same one (FR-004, FR-008)

```sh
npm run refresh -- dedl     # against a real change on etalii.adp develop
npm run refresh -- dedl     # again, after a second change upstream
```

Expected: the first run opens a pull request from `refresh/dedl` into `develop`. The second updates that same pull request (same number, new body), and `gh pr list --head refresh/dedl` shows one open pull request. The site's CI checks run on it, which proves the App token (R7).

## 5. Screenshots: accepted, rejected, gap (US2)

Against a fixture copy of the standalone `docs/screenshots/`:
- replace `mindmap.png` with a new valid 1600×900 PNG → it appears under "What changed" with its expectation text (US2-1);
- replace `timeline.png` with a 400 KB PNG → it is listed under **Rejected** ("over 300 KB budget"), and the previous copy is kept (US2-2);
- mark a designer with no image as ⚗️ Prototype in the fixture catalogue → it is listed under **Gaps** (US2-3).

```sh
npm run refresh -- screenshots --dry-run --source etalii-adp/etalii.adp.ide.standalone=<fixture>
```

Also confirm that no step ran `capture.mjs` (FR-013): the run log shows only copies.

## 6. Catalogue: one state changes, and an unknown state asks (US3)

- In the fixture `docs/diagrams.md`, change `freeplane/mindmap` from Prototype to Implemented and commit, without a new tag. Expected: the summary lists only that designer, and its state stays `prototype` because the latest release still says Prototype (research R10). Tag the commit as a release (`v9.9.9`) and run again. Expected: `prototype → available` (US3-1).
- Change another row's state to `🧪 Experimental`. Expected: `outcome: needs-decision`, exit 3, and `.refresh/decision.json` offering the site states as options (US3-2). Then:

```sh
npm run refresh:decide -- catalogue "prototype"
npm run refresh -- catalogue --dry-run --source ...
```

Expected: `outcome: delivered`, and the change summary includes the new mapping line in `procedures/config/states.json`.

## 7. Hosts: first designer changes a host's state (US3-3)

Give a fixture VS Code source a `docs/diagrams.md` with one ⚗️ Prototype row and no release. Expected: `vscode` goes from `planned` to `in progress` in `sources/hosts/hosts.json`, with the facts listed in the pull request. Adding a release in the fixture makes it `available`.

## 8. Everything at once, with one failure (US4, FR-010)

```sh
npm run refresh -- all --dry-run --source etalii-adp/etalii.adp=../does-not-exist
```

Expected: `dedl` reports `failed`, naming `etalii-adp/etalii.adp`, while the other three still run. A summary table lists all four outcomes, and the exit code is 2.

## 9. Automatic run (FR-012)

In the GitHub UI, run the **Refresh** workflow with `procedure: all`. Then, after a real change reaches `develop` in a source, wait for the next hourly run. Expected: the job summary shows the table, a pull request appears for the changed kind only, and runs with nothing changed end in under a minute with `current`.

## 10. A new procedure from the template (US5)

Copy `procedures/_template.md` to `procedures/refresh-example.md`, leave out its **Verification** section, and run `npm run refresh:lint`. Expected: it fails, naming the missing section and the missing index row. Complete both, and it passes.

## 11. An agent given only the name (SC-001)

In a fresh agent session in this repository, say only "Refresh the screenshots." Expected: the agent finds `procedures/refresh-screenshots.md` through `CLAUDE.md`, runs it, and asks nothing except a decision, offered as a selection. It ends with a pull request link or a "current" report. Repeat for each of the four procedures.

## Validation

Run on 2026-09-27 on Windows 11 (Node.js 26.3, `gh` 2.101), at commit `da7866e` of `features/004-content-refresh-procedures`, as dry runs: nothing was pushed and no pull request or issue was opened.

| Scenario | How it was run | Outcome |
|---|---|---|
| 0. Offline checks | `npm run test:refresh`, `npm run refresh:lint`, `npm run refresh:verify` | All three exit 0; 112 tests pass in about 30 s. |
| 1. DEDL: a changed sentence | `scripts/refresh/procedures/dedl.test.mjs` (c), against the DEDL fixture | `delivered`; exactly one changed file and one changed section (`2. Foundations`, 2 lines); the diff under `sources/dedl/0.1/` is that sentence. |
| 3. DEDL: a new version | `dedl.test.mjs` (d, e), and against a throwaway clone of `etalii-adp/etalii.adp` | Header alone at 0.2: `failed`, "the specification header says 0.2, the schema $id says 0.1". Both at 0.2: `delivered`, `sources/dedl/0.2/` with 6 files, the site's build and checks passing; with the fixture, `0.1/` byte for byte unchanged and the title `publish 0.2 beside 0.1`. |
| 5. Screenshots | `screenshots.test.mjs`, against the standalone fixture with generated PNGs | A changed valid image with its expectation; a 400 KB image rejected ("over 300 KB budget") with the previous copy kept; a wrong viewport and an unlisted image rejected by name; `c4/context` listed under Gaps; `capture.mjs` neither copied nor run. |
| 6. Catalogue | `catalogue.test.mjs` | Prototype → Implemented without a tag stays `prototype`; after tagging `v9.9.9`, `prototype → available` for that designer only; `🧪 Experimental` gives `needs-decision` (exit 3) with the site states, and after `refresh:decide` the re-run delivers with the mapping line in its diff. |
| 7. Hosts | `hosts.test.mjs` | VS Code `planned → in progress` with one Prototype row and no release, then `available` with a link to the release once tagged. |
| 8. All, with one failure | `run-all.test.mjs`, with `etalii-adp/etalii.adp` pointed at a missing folder | `dedl` `failed` naming the source; the other three `delivered`; table of four; exit 2; table appended to `$GITHUB_STEP_SUMMARY`. |
| 10. A new procedure | `lint.test.mjs` | A template copy without Verification and without an index row fails, naming both (and the missing module, which the "Adding a procedure" steps also require). |

**Against the real sources** (T058), with the developer's `gh` login: `npm run refresh -- all --dry-run` took 2 min 31 s for all four, each `delivered` with the site's build, check and source-record steps passing, because `develop` holds no `sources/` yet. The private IDE repositories were readable. The standalone screenshot pull request body carries the readme's "Known artefact of that" note under Source caveats; its 7 images pass every check, and 15 usable designers without a screenshot are listed as gaps. Host states: standalone `available` (21 usable designers at release `v0.1.709-alpha`), IntelliJ, VS Code and Eclipse `planned`, and the catalogue reports "no catalogue" for those three. The Resolve stage, which is all a run with nothing changed does, took 7.8 s (dedl), 18.5 s (screenshots), 8.8 s (catalogue) and 8.8 s (hosts), within the one-minute goal.

Not run here: scenarios 2, 4, 9 and 11 need a push to this repository, the owner's GitHub App, or a fresh agent session.
