# Refresh procedures

The site's sourced content (the DISL and DID references, the tool catalogue, the screenshots and the IDE host states) is taken from other repositories and copied into `sources/` by the procedures below, never retyped (constitution principle II). Each procedure is written for an agent to follow from start to finish, and equally for a person. Its mechanical steps are one command, `npm run refresh -- <id>`, and every run ends in a pull request into `develop` from the procedure's own branch `refresh/<id>`, a report that the content is current, a question, or a reported failure. Naming a procedure's title to an agent in this repository is enough to run it.

| Id | Title | Refreshes | Sources (repository: paths) |
|---|---|---|---|
| [`refresh-disl`](refresh-disl.md) | Refresh the DISL and DID reference | `sources/disl/`: the DISL and DID specifications, schemas and examples, a folder per version (spec 002) | etalii-adp/etalii.adp: `specifications/disl/*` and `specifications/did/*` |
| [`refresh-screenshots`](refresh-screenshots.md) | Refresh the screenshots | `sources/screenshots/<host>/`: committed screenshots checked against their readme, with their expectations, rejections and gaps (spec 003) | etalii-adp/etalii.adp.ide.standalone, .intellij, .vscode, .eclipse: `docs/screenshots/*.png`, `docs/screenshots/readme.md`, `docs/tools.md` (or `docs/diagrams.md`) |
| [`refresh-catalogue`](refresh-catalogue.md) | Refresh the tool catalogue | `sources/catalogue/<host>/`: each host's catalogue, verbatim and as tool entries with their mapped site states (spec 003) | etalii-adp/etalii.adp.ide.standalone, .intellij, .vscode, .eclipse: `docs/tools.md` (or `docs/diagrams.md`) |
| [`refresh-hosts`](refresh-hosts.md) | Refresh the IDE host states | `sources/hosts/hosts.json`: each IDE host's state and the facts it was derived from (spec 001) | etalii-adp/etalii.adp.ide.standalone, .intellij, .vscode, .eclipse: `docs/tools.md` (or `docs/diagrams.md`) |
| [`refresh-all`](refresh-all.md) | Refresh the whole site | Everything above, one pull request per procedure that found changes | The sources of each procedure above |

## Outcomes and exit codes

Every run prints `outcome: <outcome>` as its last line, and writes `.refresh/summary.json` (and, when it produced one, the pull request body in `.refresh/pr-body.md`).

| Outcome | Exit code | Meaning |
|---|---|---|
| `current` | 0 | Nothing changed in the sources since the last refresh. No pull request is opened, and an open one from an earlier run is closed with a comment. |
| `delivered` | 0 | The pull request was opened or updated, and every verification step passed. |
| `delivered-draft` | 1 | The pull request was opened or updated as a draft, because a verification step failed. Its body holds the failing output. |
| `failed` | 2 | Nothing was changed. The line starting with `failed:` names the source or step that failed. |
| `needs-decision` | 3 | A source introduced something the site's mappings do not cover. Nothing was delivered. See the next section. |

Options for every procedure: `--dry-run` does everything in a temporary worktree and pushes nothing (the diff is written to `.refresh/diff.patch`); `--no-deliver` leaves the changes in the working tree on branch `refresh/<id>`; `--base <branch>` starts from another branch than `develop`; `--source <owner/name>=<path>` reads a source from a local checkout (only with `--dry-run` or `--no-deliver`).

## Automatic runs

The Refresh workflow (`.github/workflows/refresh.yml`) runs the same command by itself, so a change on a source's `develop` branch reaches a pull request without anyone asking (FR-012):

- **Every hour** (`schedule`, at 17 minutes past), it runs `refresh -- all`. A run whose sources have not changed ends at the Resolve stage after a few API calls, with `current`.
- **On request**, from the Actions tab: run the Refresh workflow and choose a procedure, or `all`.
- **When a source says so**: a source repository may send a `repository_dispatch` event of type `source-changed`, with the payload `{"repository": "<owner/name>"}`, to skip the wait. `etalii-adp/etalii.adp` starts `disl`; when the payload also lists the changed paths (`"paths": [...]`), only for a change under `specifications/disl/` or `specifications/did/` (the mapping is `scripts/refresh/plan.mjs`); any `etalii-adp/etalii.adp.ide.*` repository starts `screenshots`, `catalogue` and `hosts`. For example: `gh api repos/etalii-adp/etalii.adp.site/dispatches -f event_type=source-changed -F 'client_payload[repository]=etalii-adp/etalii.adp'`, with a token allowed to write to this repository's contents.

The job summary and every refresh pull request name the date of the previous scheduled run. A job fails only when a procedure `failed`; a draft pull request or a "Refresh blocked" issue is its own signal.

**One-time setup (the owner):**

1. Create a GitHub App in the `etalii-adp` organization, named "ADP site refresh", with repository permissions `contents: read` on the five source repositories (`etalii.adp` and the four `etalii.adp.ide.*`) and `contents: write`, `pull-requests: write` and `issues: write` on this repository, and no webhook. Install it on those six repositories.
2. Store its App ID as the secret `REFRESH_APP_ID` and a private key as `REFRESH_APP_PRIVATE_KEY` in this repository (Settings → Secrets and variables → Actions). Until the App exists, a fine-grained personal access token with the same permissions, stored as `REFRESH_TOKEN`, is an acceptable stopgap; it is tied to one person and expires, so replace it with the App.
3. Enable "Automatically delete head branches" in this repository's settings, so a merged `refresh/*` branch goes away by itself.

**The 60-day risk.** GitHub switches off a scheduled workflow in a public repository after 60 days without activity in it, and says so only in the Actions tab. If the previous scheduled run shown in a pull request or job summary is "none in 7 days", re-enable the workflow with `gh workflow enable refresh.yml` (or the button in the Actions tab). `repository_dispatch` keeps working while the schedule is off.

`.github/workflows/refresh-checks.yml` runs `npm run test:refresh`, `npm run refresh:lint` and `npm run refresh:verify` on every pull request into `develop`, so a hand edit under `sources/` fails its checks.

## Adding a procedure

When the site takes a new kind of content from a source repository:

1. Copy [`_template.md`](_template.md) to `refresh-<id>.md` and fill in every section.
2. Add `scripts/refresh/procedures/<id>.mjs`, a module implementing the interface described at the top of `scripts/refresh/run.mjs` (its `sources`, and an `apply` that returns the files to copy and derive), with a `<id>.test.mjs` beside it that runs it against a fixture source through `--source`. The procedure owns `sources/<id>/`, and no other procedure writes there. A procedure that also updates site files outside `sources/` (only `refresh-catalogue`, for spec 003's catalogue files) lists them as its `siteFiles`, which no other procedure lists, and produces them in `afterApply` or `afterVerify`.
3. Add its row to the table at the top of this file.
4. Add its title to the "Refreshing sourced content" section of `CLAUDE.md`; add its id to the `procedure` choices of `workflow_dispatch` in `.github/workflows/refresh.yml`, to the `repository_dispatch` mapping in `scripts/refresh/plan.mjs` when it reads a new repository, and to `PROCEDURES` in `scripts/refresh/run.mjs` so that `all` runs it.
5. Run `npm run test:refresh` and `npm run refresh:lint`; both exit 0 when the procedure is complete and indexed.

## Answering a decision

A decision is the only question a procedure asks: how to map a source state the site does not know yet, or which tool a new screenshot shows. The run stops with `needs-decision` and writes the question to `.refresh/decision.json`, with its `question`, `subject`, `options`, the mapping file it will change (`writeTo`) and the place in it (`key`).

- **Interactive run** (an agent or a person): ask the person the question, offering exactly the `options` as a selection. Write the answer with `npm run refresh:decide -- <id> <answer>`, then run `npm run refresh -- <id>` again. The mapping change travels in the same refresh pull request.
- **Automatic run** (the Refresh workflow): the run opens, or updates, an issue titled `Refresh blocked: refresh-<id>` with the label `refresh-blocked`, listing the question and the options. The owner answers by running the procedure interactively as above, or by setting the value in the mapping file through a pull request. The next scheduled run then proceeds and closes the issue.
