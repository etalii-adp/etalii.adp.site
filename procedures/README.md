# Refresh procedures

The site's sourced content (the DEDL reference, the designer catalogue, the screenshots and the IDE host states) is taken from other repositories and copied into `sources/` by the procedures below, never retyped (constitution principle II). Each procedure is written for an agent to follow from start to finish, and equally for a person. Its mechanical steps are one command, `npm run refresh -- <id>`, and every run ends in a pull request into `develop` from the procedure's own branch `refresh/<id>`, a report that the content is current, a question, or a reported failure. Naming a procedure's title to an agent in this repository is enough to run it.

| Id | Title | Refreshes | Sources (repository: paths) |
|---|---|---|---|
| [`refresh-dedl`](refresh-dedl.md) | Refresh the DEDL reference | `sources/dedl/`: the DEDL specification, schema and examples, a folder per version (spec 002) | etalii-adp/etalii.adp: `specifications/dedl/*` |
| [`refresh-screenshots`](refresh-screenshots.md) | Refresh the screenshots | `sources/screenshots/<host>/`: committed screenshots checked against their readme, with their expectations, rejections and gaps (spec 003) | etalii-adp/etalii.adp.ide.standalone, .intellij, .vscode, .eclipse: `docs/screenshots/*.png`, `docs/screenshots/readme.md`, `docs/diagrams.md` |
| [`refresh-catalogue`](refresh-catalogue.md) | Refresh the designer catalogue | `sources/catalogue/<host>/`: each host's catalogue, verbatim and as designer entries with site states capped at the latest release (spec 003) | etalii-adp/etalii.adp.ide.standalone, .intellij, .vscode, .eclipse: `docs/diagrams.md` |
| [`refresh-hosts`](refresh-hosts.md) | Refresh the IDE host states | `sources/hosts/hosts.json`: each IDE host's state and the facts it was derived from (spec 001) | etalii-adp/etalii.adp.ide.standalone, .intellij, .vscode, .eclipse: `docs/diagrams.md` |
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

## Adding a procedure

When the site takes a new kind of content from a source repository:

1. Copy [`_template.md`](_template.md) to `refresh-<id>.md` and fill in every section.
2. Add `scripts/refresh/procedures/<id>.mjs`, a module implementing the interface described at the top of `scripts/refresh/run.mjs` (its `sources`, and an `apply` that returns the files to copy and derive), with a `<id>.test.mjs` beside it that runs it against a fixture source through `--source`. The procedure owns `sources/<id>/`, and no other procedure writes there.
3. Add its row to the table at the top of this file.
4. Add its title to the "Refreshing sourced content" section of `CLAUDE.md`; add its id to the `procedure` choices of `workflow_dispatch` in `.github/workflows/refresh.yml`, to the `repository_dispatch` mapping there when it reads a new repository, and to `PROCEDURES` in `scripts/refresh/run.mjs` so that `all` runs it.
5. Run `npm test` and `npm run refresh:lint`; both exit 0 when the procedure is complete and indexed.

## Answering a decision

A decision is the only question a procedure asks: how to map a source state the site does not know yet, or which designer a new screenshot shows. The run stops with `needs-decision` and writes the question to `.refresh/decision.json`, with its `question`, `subject`, `options`, the mapping file it will change (`writeTo`) and the place in it (`key`).

- **Interactive run** (an agent or a person): ask the person the question, offering exactly the `options` as a selection. Write the answer with `npm run refresh:decide -- <id> <answer>`, then run `npm run refresh -- <id>` again. The mapping change travels in the same refresh pull request.
- **Automatic run** (the Refresh workflow): the run opens, or updates, an issue titled `Refresh blocked: refresh-<id>` with the label `refresh-blocked`, listing the question and the options. The owner answers by running the procedure interactively as above, or by setting the value in the mapping file through a pull request. The next scheduled run then proceeds and closes the issue.
