# Refresh the DEDL reference

Brings the site's DEDL reference (spec 002) up to the DEDL specification, schema and examples on `develop` in `etalii-adp/etalii.adp`. DEDL is a working draft, so its text changes often; each new version is published beside the old ones, which stay frozen.

## Sources

| Repository | Ref | Paths | Visibility |
|---|---|---|---|
| etalii-adp/etalii.adp | develop | `specifications/dedl/*` | public |

## Updates

- `sources/dedl/<version>/`: `DEDL-specification.md`, `dedl.schema.json` and every example, verbatim. Only the newest version's folder is ever replaced; a new version gets a folder of its own beside the old ones.
- `sources/dedl/source.lock.json`: the source record of every file of every version, and the withdrawn files.
- The spec 002 reference pages are built from these files. This procedure changes no mapping in `procedures/config/`.

## Before you start

- `gh auth status` shows a login with read access to `etalii-adp/etalii.adp` and write access to this repository.
- A clean checkout of this repository, with Node.js 24 and `npm ci` done.

## Steps

1. Run `npm run refresh -- dedl`. It prints one line per stage: `resolve` (the source's `develop` head and whether any watched file changed), `fetch`, `apply` (files added, changed and removed under `sources/dedl/`), `verify` and `deliver`, and ends with `outcome: <outcome>`.
2. Act on the outcome:
   - `current` (exit 0): the reference already matches the source. Report "The DEDL reference is current at <sha>" with the SHA it printed. There is nothing else to do.
   - `delivered` (exit 0): report the pull request link it printed, and the changed sections listed under "What changed" in `.refresh/pr-body.md`.
   - `delivered-draft` (exit 1): the pull request is a draft because a verification step failed. Report the link and the failing step; the failing output is in the pull request body.
   - `needs-decision` (exit 3): this procedure never raises one; if it does, treat it as `failed`.
   - `failed` (exit 2): nothing was changed. Report the line starting with `failed:`. When it says that the DEDL version disagrees, the specification header and the schema's `$id` name different versions; that is corrected in `etalii-adp/etalii.adp`, not here.

## Decisions

None.

## Verification

The run verifies its own result before delivering (contracts/site-integration.md):

1. Site builds (`npm run build`).
2. Links and accessibility (`npm run check`): internal links resolve and every page passes the automated WCAG 2.2 AA checks.
3. Source records (`npm run refresh:verify`): every file under `sources/` is listed in its lock with a matching SHA-256, and every sourced page names its source revision.

A step the site does not define yet is reported as "not available". A failed step makes the pull request a draft, with the step's output in a collapsed block under "Verification".

## Pull request

- Branch `refresh/dedl`, into `develop`, labelled `refresh` and `refresh:dedl`. A later run updates the same pull request.
- Title `Refresh DEDL reference: <before>..<after>` (short SHAs), or `Refresh DEDL reference: publish <new> beside <old>` when a new version is published.
- Body: Source revisions, What changed (the specification's sections added, changed or removed, with lines changed; the schema and each example changed or unchanged), Withdrawn, Verification, and the footer, per contracts/pull-request.md.

## When the source moves

If `etalii-adp/etalii.adp` moves the DEDL files, change `sources` in `scripts/refresh/procedures/dedl.mjs` and the Sources table above together, in one pull request; `npm run refresh:lint` checks that the two agree.
