# Contract: Command-line interface

All commands run from the repository root, after `npm ci`. They are `npm` scripts wrapping `node scripts/refresh/<entry>.mjs`.

## `npm run refresh -- <id> [options]`

Runs one procedure end to end. `<id>` is `dedl`, `screenshots`, `catalogue`, `hosts` or `all`. The `refresh-` prefix is accepted and ignored.

| Option | Default | Effect |
|---|---|---|
| `--dry-run` | off | Resolve, Fetch, Apply and Verify in a temporary worktree; print the change summary and PR body; push nothing. |
| `--no-deliver` | off | Like a normal run, but stop after Verify and leave the changes in the working tree, on branch `refresh/<id>`. |
| `--base <branch>` | `develop` | The branch to start from and to open the pull request into. |
| `--source <owner/name>=<path>` | none | Read that source from a local checkout instead of GitHub. Used by tests and the quickstart. The lock then records the local `HEAD` SHA and marks `"local": true`. For a local source, the latest release is the highest `v*` tag reachable from `HEAD` (semantic-version order), standing in for the GitHub release. `refresh:verify` rejects a lock with `local: true`, so such a run can never be delivered. |

**Standard output**: human-readable progress, one line per stage, then an outcome line:
`outcome: <current|delivered|delivered-draft|needs-decision|failed> [<pr-url>]`.

**Files written**:
- `.refresh/summary.json`: the change summary ([../data-model.md](../data-model.md) § Change summary).
- `.refresh/pr-body.md`: the rendered pull request body ([pull-request.md](pull-request.md)).
- `.refresh/decision.json`: only for `needs-decision`: `{ "procedure", "question", "subject", "options": [..], "writeTo": "procedures/config/<file>.json", "key": [..] }`. `key` is the path of property names inside `writeTo`, as an array because screenshot file names contain dots (for example `["standalone", "mindmap.png"]`). A run of `all` writes each procedure's files under `.refresh/<id>/` instead, and `refresh:decide` reads the decision from there.

`.refresh/` is git-ignored.

**Exit codes**:

| Code | Meaning |
|---|---|
| 0 | `current` or `delivered` |
| 1 | `delivered-draft`: verification failed and the pull request is a draft |
| 2 | `failed`: nothing changed |
| 3 | `needs-decision`: nothing delivered |

For `all`: runs each procedure and exits with the highest code among them, after printing the summary table. In GitHub Actions, it also appends the table to `$GITHUB_STEP_SUMMARY`.

## `npm run refresh:decide -- <id> <answer>`

Writes the answer to the decision in `.refresh/decision.json` into the named mapping file. `<answer>` must be one of the listed options, or the command fails. Interactive agents call this after asking the person. Then they re-run `npm run refresh -- <id>`.

## `npm run refresh:verify`

The source-record check ([site-integration.md](site-integration.md) § Source-record check). Exit 0 on pass, 1 on failure, with one line per violation.

## `npm run refresh:lint`

Checks the procedures themselves: every procedure document has the template's sections, is in the index, and names the same sources as its script configuration; every mapping value is a site state. Runs in CI on every pull request.

## `npm test`

Runs `node --test` over `scripts/refresh/**/*.test.mjs`. The tests use fixture sources (local folders passed with `--source`) and never touch GitHub.

## GitHub workflow: `.github/workflows/refresh.yml`

| Trigger | Input | Runs |
|---|---|---|
| `schedule` (hourly) | none | `refresh -- all` |
| `workflow_dispatch` | `procedure` (choice: all, dedl, screenshots, catalogue, hosts) | `refresh -- <procedure>` |
| `repository_dispatch` type `source-changed` | `client_payload.repository` | the procedures that read that repository |

**Concurrency**: one group per procedure (`refresh-<id>`), with `cancel-in-progress: false`, so two runs of the same procedure never race on its branch.

**Token**: a GitHub App installation token (research R7). The job fails at once, with a clear message, if the secrets are missing.

**On exit code 3**: the job opens or updates the issue `Refresh blocked: <id>` from `.refresh/decision.json`, and applies the label `refresh-blocked`.
