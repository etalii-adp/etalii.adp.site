# Contract: Procedure document

Every file `procedures/refresh-*.md` follows this shape. `procedures/_template.md` is this contract as a fill-in file (FR-011, US5-1). `npm run refresh:lint` fails when a procedure is missing a section or is not listed in the index.

## Required sections, in order

```markdown
# <Title>                                   ← the phrase an agent is given, e.g. "Refresh the DEDL reference"

<One paragraph: what this refreshes on the site and why it goes stale.>

## Sources
| Repository | Ref | Paths | Visibility |
<one row per source; must match the script configuration>

## Updates
<The folder under sources/ this procedure owns, the pages built from it, and any mapping in procedures/config/ it may change.>

## Before you start
<Prerequisites: gh logged in with read access to the sources, a clean checkout, Node 22, `npm ci`.>

## Steps
1. Run `npm run refresh -- <id>`. <What each stage prints.>
2. <What to do for each outcome: current / delivered / delivered-draft / needs-decision / failed.>
…

## Decisions
<Each question this procedure may raise, what triggers it, the options offered, and where the answer is written. "None" when it asks nothing.>

## Verification
<The verification steps, per contracts/site-integration.md, and how to read a failure.>

## Pull request
<Branch name, title pattern, and the body sections per contracts/pull-request.md.>

## When the source moves
<What to change, in this document and in the script configuration, if the source relocates its content.>
```

## Rules

- **The only questions are decisions.** A step never tells the reader to "ask the owner" except through the Decisions section (FR-002).
- **No hand edits.** No step tells the reader to edit a file under `sources/`. Every change there comes from the script (constitution principle II).
- **One entry point.** Steps call `npm run refresh -- <id>` and read its output. They do not reproduce the script's logic in prose.
- **Index entry.** `procedures/README.md` has one row per procedure: id, title, what it refreshes, and its source repository and paths (FR-011, US5-2).
- **Agent pointer.** `CLAUDE.md` contains a "Refreshing sourced content" section that links `procedures/README.md` and names each procedure's title, so naming the procedure is enough (FR-012, SC-001).
