# Contract: Refresh and Check Commands

Spec 004's DEDL procedure runs these commands. Their interface is what that procedure relies on.

## `npm run reference:refresh -- <language> [--revision <sha-or-ref>] [--dry-run]`

Brings the snapshot of `<language>` up to its source.

| Step | Behaviour |
|---|---|
| 1 | Resolve `--revision`, default the language's `branch`, to a full 40-character SHA. |
| 2 | Download every file in the language's `path` at that SHA, and the repository's licence. |
| 3 | Check [source-inputs.md](source-inputs.md) S1. On any failure, write nothing and exit `1`. |
| 4 | Derive the version. If a snapshot for it exists and its revision and file hashes are equal, exit `3` ("current"). |
| 5 | Write the new snapshot to a temporary folder, then replace `src/content/reference/<language>/<version>/` with it in one move. Older versions are never touched. |
| 6 | Print the report and exit `0`. |

`--dry-run` stops after step 4 and prints the report it would have produced.

**Exit codes**:

| Code | Meaning |
|---|---|
| `0` | changed |
| `1` | failed (nothing written) |
| `3` | current (nothing to do) |

**Report** (stdout, Markdown, pasted into the pull request as spec 004 FR-009 requires):

- the language, and the version before and after, with `new version` when a snapshot was added;
- the source revision before and after, each with a compare link;
- the changed files, with their sizes before and after;
- the sections added, removed and changed, by heading, from comparing the old and new heading lists;
- warnings, such as unclassified files, embedded-example mismatches, and diagrams without alt text.

## `npm run check:reference`

This runs after `npm run build`, over `dist/`. The checks are listed in research D16.

| Code | Meaning |
|---|---|
| `0` | all checks passed |
| `1` | at least one check failed; each failure is printed as `CHECK <name>: <what> (<where>)` |

Warnings are printed and do not fail the command.
