# Contract: Refresh pull request

Every pull request a procedure opens or updates has this form (FR-004, FR-009). The body is rendered from `.refresh/summary.json`, never written by hand.

- **Head branch**: `refresh/<id>`, for example `refresh/dedl`. It is recreated from `develop` on every run and force-pushed.
- **Base branch**: `develop`.
- **Title**: `Refresh <what>: <source short SHA before>..<after>`, for example `Refresh DEDL reference: 1a2b3c4..5d6e7f8`. For a new DEDL version: `Refresh DEDL reference: publish 0.2 beside 0.1`.
- **Labels**: `refresh`, `refresh:<id>`.
- **Draft**: yes if any verification step failed, no otherwise.
- **Merging**: by the owner only, with a merge commit. No procedure merges.

## Body

```markdown
## Source revisions
| Repository | Before | After |
|---|---|---|
| etalii-adp/etalii.adp | `1a2b3c4` (link) | `5d6e7f8` (link to compare view) |

## What changed
<Per-procedure details, per the data model's Change summary:>
- DEDL: a table of sections (added / changed / removed, with lines changed); schema and examples changed or unchanged; "New version 0.2 published beside 0.1" when that applies.
- Screenshots: a table of images (host, file, change, size, expectation text), then **Rejected** (file, failing check, previous copy kept) and **Gaps** (designer, host: usable but no screenshot).
- Catalogue: a table of designers whose state changed (origin, host, old → new, with the `develop` and release source states when the release cap applies); designers added; designers withdrawn.

## Source caveats
<Only when a source documents a known defect in what it supplies, for example the standalone screenshot readme's "Known artefact" note (research R11). Quoted with a link to the source at the recorded revision.>
- Hosts: a table of hosts (old → new state, and the facts it was derived from).

## Withdrawn
<Items removed because the source removed them, with the last revision. "None" if empty.>

## Verification
| Step | Result |
|---|---|
| Site builds (`npm run build`) | ✅ passed / ❌ failed / ⚪ not available |
| Links and accessibility (`npm run check`) | … |
| Source records (`npm run refresh:verify`) | … |
<For each failure: a <details> block with the command's output.>

## Review notes
<Only when there is something to judge by eye: for screenshots, "check each image shows what its expectation says".>

---
Opened by procedure `refresh-<id>` (procedures/refresh-<id>.md), run <local | workflow run link>. Previous scheduled run: <date, or "none in 7 days: check that the Refresh workflow is enabled">.
```

## Updating instead of duplicating (FR-008)

Before creating a pull request, the procedure runs `gh pr list --head refresh/<id> --state open`. If one exists, the procedure edits its title, body and draft state instead of creating another. If a run's outcome is `current` and a pull request is still open, the procedure closes it with the comment `develop already matches <repository>@<sha>; closing.`
