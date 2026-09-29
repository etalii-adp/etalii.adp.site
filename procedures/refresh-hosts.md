# Refresh the IDE host states

Brings the state of each IDE host on the home page (spec 001) up to date: standalone, IntelliJ, VS Code and Eclipse. A host's state is derived from facts in its own repository, its catalogue and its latest release, so it changes when a host gains its first designer or publishes a release.

## Sources

| Repository | Ref | Paths | Visibility |
|---|---|---|---|
| etalii-adp/etalii.adp.ide.standalone | develop | `docs/tools.md`, `docs/diagrams.md` | private |
| etalii-adp/etalii.adp.ide.intellij | develop | `docs/tools.md`, `docs/diagrams.md` | private (not present yet) |
| etalii-adp/etalii.adp.ide.vscode | develop | `docs/tools.md`, `docs/diagrams.md` | private (not present yet) |
| etalii-adp/etalii.adp.ide.eclipse | develop | `docs/tools.md`, `docs/diagrams.md` | private (not present yet) |

## Updates

- `sources/hosts/hosts.json`: one entry per host with its `state`, the facts it was derived from (the catalogue's commit, the number of usable designers, the number of designers in progress, the latest release and the `develop` head) and a `link` to the latest release, or to the repository when there is none.
- `sources/hosts/source.lock.json`: the catalogues and releases it was derived from.
- The spec 001 home page and spec 003's per-host availability are built from this file. This procedure changes no mapping in `procedures/config/`.

A host's state follows three rules, in order:

1. **available**: at least one of its designers is `prototype`, `implemented` or `available` (see [refresh-catalogue.md](refresh-catalogue.md)), and the host has a published release to install;
2. **in progress**: otherwise, its `docs/diagrams.md` has at least one designer whose `develop` state maps to `in-progress` or later (Work-in-progress, Prototype or Implemented);
3. **planned**: otherwise, including a host with no `docs/diagrams.md`.

## Before you start

- `gh auth status` shows a login with read access to the four IDE repositories and write access to this repository.
- A clean checkout of this repository, with Node.js 24 and `npm ci` done.

## Steps

1. Run `npm run refresh -- hosts`. It prints one line per stage: `resolve` (each host's `develop` head, whether its catalogue exists, and its latest release), `fetch`, `apply`, `verify` and `deliver`, and ends with `outcome: <outcome>`.
2. Act on the outcome:
   - `current` (exit 0): no catalogue and no release changed. Report that the host states are current; there is nothing else to do.
   - `delivered` (exit 0): report the pull request link it printed, with each host's state old → new.
   - `delivered-draft` (exit 1): the pull request is a draft because a verification step failed. Report the link and the failing step; the failing output is in the pull request body.
   - `needs-decision` (exit 3): this procedure never raises one; if it does, treat it as `failed`.
   - `failed` (exit 2): nothing was changed. Report the line starting with `failed:`, which names the source or step that failed.

## Decisions

None. A designer whose state label has no mapping yet is not counted; the catalogue procedure asks about it.

## Verification

The run verifies its own result before delivering (contracts/site-integration.md):

1. Site builds (`npm run build`).
2. Links and accessibility (`npm run check`).
3. Source records (`npm run refresh:verify`): `hosts.json` matches the hash recorded for it, so a hand edit is caught.

A failed step makes the pull request a draft, with the step's output under "Verification".

## Pull request

- Branch `refresh/hosts`, into `develop`, labelled `refresh` and `refresh:hosts`. A later run updates the same pull request.
- Title `Refresh IDE host states: <before>..<after>` (short SHAs of the host whose revision moved).
- Body: Source revisions, What changed (a table of hosts with their state old → new and the facts it was derived from), Withdrawn, Verification and the footer, per contracts/pull-request.md.

## When the source moves

If a host moves its catalogue, change `sources` in `scripts/refresh/procedures/hosts.mjs` and the Sources table above together, in one pull request; `npm run refresh:lint` checks that the two agree. Change [refresh-catalogue.md](refresh-catalogue.md) and its module with it, because they read the same file.
