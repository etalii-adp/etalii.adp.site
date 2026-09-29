# Refresh the tool catalogue

Brings the site's tool catalogue (spec 003) up to each IDE host's own catalogue, `docs/tools.md` (or `docs/diagrams.md`, its name before etalii.adp spec 002), and maps each tool's state there to the site's shared states. States change less often than text, but mislead most when stale (constitution principle III).

## Sources

| Repository | Ref | Paths | Visibility |
|---|---|---|---|
| etalii-adp/etalii.adp.ide.standalone | develop | `docs/tools.md`, `docs/diagrams.md` | private |
| etalii-adp/etalii.adp.ide.intellij | develop | `docs/tools.md`, `docs/diagrams.md` | private (not present yet) |
| etalii-adp/etalii.adp.ide.vscode | develop | `docs/tools.md`, `docs/diagrams.md` | private (not present yet) |
| etalii-adp/etalii.adp.ide.eclipse | develop | `docs/tools.md`, `docs/diagrams.md` | private (not present yet) |

A host's catalogue is read from `docs/tools.md` when it has one, else from `docs/diagrams.md`: etalii.adp spec 002 (naming convention alignment) renamed the file to `docs/tools.md` ("Tool types", with a Kind column), but a host's latest release can still carry `docs/diagrams.md`, and its release states are read from there. The name column may be headed Diagram, Tool, Name or Tool type. A Kind column (Diagram, Designer or Editor), when present, gives each entry its `kind` in `catalogue.json`, and the site shows that kind; a catalogue without one falls back to Notion's Kind. Any other Kind value fails the run, naming the row.

The run also reads the catalogue at each host's latest published release, `docs/tools.md` or else `docs/diagrams.md` there, to record each tool's release state.

## Updates

- `sources/catalogue/<host>/tools.md` (or `diagrams.md`, after the file it was read from): the host's catalogue, verbatim.
- `sources/catalogue/<host>/catalogue.json`: one entry per tool with its origin, name, kind (only from a Kind column), group, theory, example, its state as written on `develop` (`developState`) and at the latest release (`releaseState`), and its site `state`.
- `sources/catalogue/source.lock.json`: the source record of each catalogue, and each host's latest release.
- `procedures/config/states.json`, only when a decision is answered.
- `src/content/catalogue/notion.json`: the Notion "Tools" snapshot (`npm run catalogue:notion`). The columns are read under the names etalii.adp spec 002 gave them: `Kind`, and a host column each, `Standalone`, `IntelliJ`, `VS Code` and `Eclipse`, which the write-back writes to.
- Notion's host columns, only after the pull request is merged: `.github/workflows/catalogue-sync.yml` runs `npm run catalogue:sync-notion` on every push to `develop` that changes `sources/catalogue/`, so Notion is never ahead of the site.
- `src/content/catalogue/focus-areas.json`: a focus area Notion uses that the file does not have yet, added by `npm run catalogue:notion`.
- `src/content/catalogue/published.json`: the tools that have a page (`npm run catalogue:report`).
- `src/content/catalogue/redirects.json`: a renamed or withdrawn tool, only when that decision is answered.
- The spec 003 tool pages and catalogue overview are built from these files.

Only this procedure changes the four files under `src/content/catalogue/`; the screenshots procedure runs the catalogue report for its pull request but leaves them as they are.

A tool's site state is its `develop` state mapped through `procedures/config/states.json`, and is never lowered (spec 003 research D3, owner's decision of 2026-09-27). The release state is recorded next to it, so the pull request and the page can say what a user can install. For example, a tool marked Implemented on `develop` the day after a release that had it as Prototype is shown as `implemented`, with `releaseState` Prototype.

IntelliJ has no `docs/diagrams.md` yet, so its FreeMind and draw.io tools are not listed; every pull request says so until `etalii-adp/etalii.adp.ide.intellij` adds one in the standalone's format. Its README is not retyped into the catalogue (constitution principle II).

## Before you start

- `gh auth status` shows a login with read access to the four IDE repositories and write access to this repository.
- A clean checkout of this repository, with Node.js 24 and `npm ci` done.
- `NOTION_TOKEN` set to the token of the Notion integration shared with the "Tools" database. Without it the run still delivers, skips both Notion steps, and says so in the pull request.
- Or, without a token, an agent with a Notion connector (for example Claude with the Notion connection) exports the "Tools" data source (`collection://3e7be2fd-05b6-8079-932d-000bfa0609af`) to a file and the run reads it: see "Without a Notion token" below.

### Without a Notion token

The owner may prefer not to hand the run a token. Then the agent running the procedure reads Notion through its own Notion connector:

1. Query every row of the data source in the connector's rows mode (all pages, 100 rows at a time), keeping each row's `url` and the columns named in `notionColumns` in `src/lib/catalogue/notion-api.ts`.
2. Write them, unchanged, to a file outside the repository: `{ "exportedAt": "<now, ISO 8601>", "dataSource": "3e7be2fd-05b6-8079-932d-000bfa0609af", "rows": [ … ] }`. A multi-select such as `Focus areas` may be an array of option names.
3. Run the procedure with `NOTION_EXPORT=<file>` set. The run takes the snapshot with `npm run catalogue:notion -- --export <file>` instead of calling Notion, records the export time as each row's revision, and says in the pull request that the snapshot came from an export. Notion's host columns are not written back.

## Steps

1. Run `npm run refresh -- catalogue`. It prints one line per stage: `resolve` (each host's `develop` head, whether its catalogue exists, and its latest release), `fetch`, `apply`, `verify` and `deliver`, and ends with `outcome: <outcome>`. The run takes spec 003's catalogue steps itself, in the run's worktree:
   - after Apply and before Verify, `npm run catalogue:notion` (skipped when `NOTION_TOKEN` is not set), then `npm run catalogue:report`, whose exit 3 ends the run with `needs-decision`;
   - after Verify, `npm run catalogue:sync-notion -- --dry-run`, which lists in the pull request the Notion host values that will change once it is merged. The run itself never writes to Notion.
2. Act on the outcome:
   - `current` (exit 0): no catalogue and no release changed. Report that the catalogue is current; there is nothing else to do.
   - `delivered` (exit 0): report the pull request link it printed, with the tools whose state changed, the tools added and withdrawn, and the gaps listed under "Tool catalogue".
   - `delivered-draft` (exit 1): the pull request is a draft because a verification step failed. Report the link and the failing step; the failing output is in the pull request body.
   - `needs-decision` (exit 3): see Decisions.
   - `failed` (exit 2): nothing was changed. Report the line starting with `failed:`. A duplicate origin in a catalogue names both rows; that is corrected in the host's repository, not here.

## Decisions

**How should the source state "<label>" in <host> map to a site state?** Raised when a host's catalogue uses a state label that `procedures/config/states.json` has no mapping for (for example a new `🧪 Experimental`). The options are the site states: `not-planned`, `idea`, `planned`, `in-progress`, `prototype`, `implemented`, `available`. The answer is written to `procedures/config/states.json` under `mappings.<host>.<label>`. Ask it as a selection with exactly those options, then run `npm run refresh:decide -- catalogue <answer>` and run the procedure again; the mapping change becomes part of the same pull request.

**`<origin>` is no longer in any source. Renamed to (origin) or withdrawn (reason)?** Raised by `npm run catalogue:report` when a tool that has a page is in no catalogue and no Notion row any more. It never guesses a rename; when a Notion row records the tool as its previous origin, the question says so. The options are `rename`, with the new origin, and `withdraw`, with a reason shown on the withdrawal notice. It is not answered with `refresh:decide`:

1. Run `npm run refresh -- catalogue --no-deliver`, which leaves the refreshed catalogue in the working tree.
2. Ask the owner, then answer with the command the question printed: `npm run catalogue:report -- --rename <origin>=<new origin>` or `npm run catalogue:report -- --withdraw <origin> --reason "<why>"`. It adds the entry to `src/content/catalogue/redirects.json`.
3. Run `npm run refresh -- catalogue` again. The changed `redirects.json` travels into the run, like an answered mapping, and becomes part of the same pull request.

## Verification

The run verifies its own result before delivering (contracts/site-integration.md):

1. Site builds (`npm run build`).
2. Links and accessibility (`npm run check`).
3. Source records (`npm run refresh:verify`): the catalogues match their lock, and `catalogue.json` matches the hash recorded for it, so a hand edit is caught.

A failed step makes the pull request a draft, with the step's output under "Verification".

## Pull request

- Branch `refresh/catalogue`, into `develop`, labelled `refresh` and `refresh:catalogue`. A later run updates the same pull request.
- Title `Refresh tool catalogue: <before>..<after>` (short SHAs of the host whose revision moved).
- Body: Source revisions, What changed (a table of tools whose state changed, with the `develop` and release source states; tools added; tools withdrawn; hosts without a catalogue), Tool catalogue (`.refresh/catalogue-report.md`: state changes, membership, screenshots pending, Notion differences, disagreements and gaps), Notion host columns (`.refresh/catalogue-notion-sync.md`, or a note that Notion was skipped), Withdrawn, Verification and the footer, per contracts/pull-request.md.

## When the source moves

If a host moves its catalogue, change `sources` in `scripts/refresh/procedures/catalogue.mjs` and the Sources table above together, in one pull request; `npm run refresh:lint` checks that the two agree. The hosts procedure reads the same file, so change `scripts/refresh/procedures/hosts.mjs` and [refresh-hosts.md](refresh-hosts.md) with it.
