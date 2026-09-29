# Refresh the whole site

Runs every refresh procedure in turn: the DISL and DID reference, the screenshots, the tool catalogue and the IDE host states. Each runs on its own, from a clean copy of `develop`, and opens its own pull request when it finds changes, so each can be reviewed and merged on its own. One procedure failing does not stop the others. This is also what the hourly Refresh workflow runs.

## Sources

| Repository | Ref | Paths | Visibility |
|---|---|---|---|

The sources of each procedure below: [refresh-disl](refresh-disl.md), [refresh-screenshots](refresh-screenshots.md), [refresh-catalogue](refresh-catalogue.md) and [refresh-hosts](refresh-hosts.md).

## Updates

What each of the four procedures updates, each in its own pull request: `sources/disl/`, `sources/screenshots/`, `sources/catalogue/` and `sources/hosts/`, and a mapping in `procedures/config/` when one of their decisions is answered.

## Before you start

- `gh auth status` shows a login with read access to `etalii-adp/etalii.adp` and the four IDE repositories, and write access to this repository.
- A clean checkout of this repository, with Node.js 24 and `npm ci` done.

## Steps

1. Run `npm run refresh -- all`. It runs `disl`, `screenshots`, `catalogue` and `hosts` in that order, prints each one's stages and outcome, and ends with a table of the four: procedure, outcome, and the pull request link or the failure. The table is also in `.refresh/summary.json`, and each procedure's own files are in `.refresh/<id>/`. The exit code is the highest of the four.
2. For each row of the table, act as that procedure's own document says for its outcome:
   - `current`: nothing to do.
   - `delivered` or `delivered-draft`: report the pull request link.
   - `needs-decision`: follow the Decisions section of that procedure's document. Its decision is in `.refresh/<id>/decision.json`, and `npm run refresh:decide -- <id> <answer>` reads it from there. Then run that procedure alone, `npm run refresh -- <id>`.
   - `failed`: report the failure named in the table.
3. Report the table.

## Decisions

None of its own: each procedure's decisions are asked as its own document says.

## Verification

Each procedure verifies its own result before delivering, with the three steps of contracts/site-integration.md: the site builds, links and accessibility, and source records.

## Pull request

None of its own: one per procedure that found changes, on that procedure's branch `refresh/<id>`.

## When the source moves

Nothing to change here. A procedure's sources are changed in that procedure's document and module. A new procedure is added to `all` in `scripts/refresh/run.mjs` (`PROCEDURES`), as "Adding a procedure" in [README.md](README.md) describes.
