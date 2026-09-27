<!--
Template for a refresh procedure (specs/004-content-refresh-procedures/contracts/procedure-document.md).
Copy it to procedures/refresh-<id>.md and replace every <placeholder>. Keep the sections, in this order.

Rules every procedure follows:
- The only questions are decisions. No step tells the reader to ask the owner anything, except through the Decisions section.
- No hand edits. No step tells the reader to edit a file under sources/; every change there comes from the script.
- One entry point. The steps run `npm run refresh -- <id>` and read its output; they do not repeat the script's logic in prose.
- The procedure has one row in procedures/README.md, and its title is named in the "Refreshing sourced content" section of CLAUDE.md.
-->

# <Title: the phrase an agent is given, for example "Refresh the DEDL reference">

<One paragraph: what this refreshes on the site, and why it goes stale.>

## Sources

| Repository | Ref | Paths | Visibility |
|---|---|---|---|
| <owner/name> | develop | <path glob, as in the module's sources> | <public or private> |

## Updates

<The folder under sources/ this procedure owns, the pages built from it, and any mapping in procedures/config/ it may change.>

## Before you start

- `gh auth status` shows a login with read access to every source above and write access to this repository.
- A clean checkout of this repository, with Node.js 24 and `npm ci` done.

## Steps

1. Run `npm run refresh -- <id>`. It prints one line per stage (resolve, fetch, apply, verify, deliver) and ends with `outcome: <outcome>`.
2. Act on the outcome:
   - `current` (exit 0): <what "current" means for this content>. Report that it is current; there is nothing else to do.
   - `delivered` (exit 0): report the pull request link it printed.
   - `delivered-draft` (exit 1): the pull request is a draft because a verification step failed. Report the link and the failing step; its output is in the pull request body and in `.refresh/pr-body.md`.
   - `needs-decision` (exit 3): see Decisions.
   - `failed` (exit 2): nothing was changed. Report the line starting with `failed:`, which names the source or step that failed.

## Decisions

<Each question this procedure may raise, what triggers it, the options offered, and where the answer is written. Write "None." when it asks nothing.>

## Verification

<The verification steps (build, links and accessibility, source records) per contracts/site-integration.md, and how to read a failure.>

## Pull request

<Branch `refresh/<id>`, the title pattern, and the body sections per contracts/pull-request.md.>

## When the source moves

<What to change, in this document and in scripts/refresh/procedures/<id>.mjs, if the source relocates its content.>
