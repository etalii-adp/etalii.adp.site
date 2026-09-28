# Refresh the screenshots

Brings the site's screenshots (spec 003) up to the images committed in each IDE repository's `docs/screenshots/`. Screenshots are the first thing a visitor looks at and the first thing to go out of date after a UI change. This procedure never retakes a screenshot: it only publishes images already committed in their source repository, after checking each against that folder's readme. A fix to an image belongs in its source repository (FR-013).

## Sources

| Repository | Ref | Paths | Visibility |
|---|---|---|---|
| etalii-adp/etalii.adp.ide.standalone | develop | `docs/screenshots/*.png`, `docs/screenshots/readme.md`, `docs/diagrams.md` | private |
| etalii-adp/etalii.adp.ide.intellij | develop | `docs/screenshots/*.png`, `docs/screenshots/readme.md`, `docs/diagrams.md` | private (not present yet) |
| etalii-adp/etalii.adp.ide.vscode | develop | `docs/screenshots/*.png`, `docs/screenshots/readme.md`, `docs/diagrams.md` | private (not present yet) |
| etalii-adp/etalii.adp.ide.eclipse | develop | `docs/screenshots/*.png`, `docs/screenshots/readme.md`, `docs/diagrams.md` | private (not present yet) |

The readme and the catalogue are read, not copied: the readme states what each image must show and its budget, and the catalogue says which designers are usable, so that a missing screenshot is reported.

## Updates

- `sources/screenshots/<host>/<file>.png`: every accepted image, verbatim.
- `sources/screenshots/<host>/screenshots.json`: per image, the designer it shows (`origin`), what it must show (`expectation`, also the default alternative text), the document opened, its size, dimensions and budget, and whether it was accepted or rejected.
- `sources/screenshots/source.lock.json`: the source record of every image, and the readmes and catalogues it read.
- `procedures/config/screenshots.json`, only when a decision is answered.
- The spec 003 designer pages and catalogue are built from these files.

The catalogue files under `src/content/catalogue/` (`notion.json`, `published.json`, `redirects.json` and `focus-areas.json`) are not updated here: they belong to [refresh-catalogue.md](refresh-catalogue.md), and targets never overlap. This procedure only reads them for its report.

## Before you start

- `gh auth status` shows a login with read access to the four IDE repositories and write access to this repository.
- A clean checkout of this repository, with Node.js 24 and `npm ci` done.

## Steps

1. Run `npm run refresh -- screenshots`. It prints one line per stage: `resolve` (each host's `develop` head, its watched files and latest release), `fetch`, `apply`, `verify` and `deliver`, and ends with `outcome: <outcome>`. After Apply and before Verify, the run takes spec 003's catalogue report itself, in the run's worktree: `npm run catalogue:report -- --no-write`, which reports which designers now have or still lack a screenshot but changes no catalogue file and asks no question. It needs no `NOTION_TOKEN`; the Notion steps run with the catalogue procedure.
2. Act on the outcome:
   - `current` (exit 0): the screenshots already match their sources. Report that they are current; there is nothing else to do.
   - `delivered` (exit 0): report the pull request link it printed, with the images listed under "What changed", any **Rejected** image with its failing check, any **Gaps**, and the screenshots still pending under "Designer catalogue".
   - `delivered-draft` (exit 1): the pull request is a draft because a verification step failed. Report the link and the failing step; the failing output is in the pull request body.
   - `needs-decision` (exit 3): see Decisions.
   - `failed` (exit 2): nothing was changed. Report the line starting with `failed:`, which names the source or step that failed.

A rejected image is not a failure: the previous copy stays published, and the pull request says why the new one was not taken. A gap is not a failure either; it is reported so the source repository can add the screenshot.

## Decisions

**Which designer does this image show?** Raised when a host has a screenshot that `procedures/config/screenshots.json` does not link to a designer yet. The options are the designer origins in that host's catalogue, plus `none` for an image that shows no designer (such as the text editor). The answer is written to `procedures/config/screenshots.json` under the host and the file name. Ask it as a selection with exactly those options, then run `npm run refresh:decide -- screenshots <answer>` and run the procedure again. To change an answer given earlier (for example `none` for an image whose designer the host has since added to its catalogue), remove the image's entry from `procedures/config/screenshots.json` on a `features/` branch; the next run asks again.

## Verification

The run verifies its own result before delivering (contracts/site-integration.md):

1. Site builds (`npm run build`).
2. Links and accessibility (`npm run check`).
3. Source records (`npm run refresh:verify`).

A failed step makes the pull request a draft, with the step's output under "Verification". A script cannot judge what an image shows, so the pull request also has **Review notes** listing each new or changed image with the text of what it must show; the owner checks them side by side in the diff before merging.

## Pull request

- Branch `refresh/screenshots`, into `develop`, labelled `refresh` and `refresh:screenshots`. A later run updates the same pull request.
- Title `Refresh screenshots: <before>..<after>` (short SHAs of the host whose revision moved).
- Body: Source revisions, What changed (a table of images with their expectation, then **Rejected** and **Gaps**), Designer catalogue (`.refresh/catalogue-report.md`), Source caveats (for example the standalone readme's "Known artefact" note, until the source removes it), Withdrawn, Verification, Review notes and the footer, per contracts/pull-request.md.

## When the source moves

If a host moves its screenshots, its readme or its catalogue, change `sources` in `scripts/refresh/procedures/screenshots.mjs` and the Sources table above together, in one pull request; `npm run refresh:lint` checks that the two agree. If a readme changes the format of its images table or budget line, adjust `parseReadme` in the same module and its test.
