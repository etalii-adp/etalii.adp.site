# Contract: Integration with the site's build (specs 001–003)

This feature produces `sources/`. Specs 001–003 turn it into pages. This contract is what each side may rely on. The plans of specs 001, 002 and 003 MUST honour it.

## What this feature provides

| Folder | Contents | Consumed by |
|---|---|---|
| `sources/dedl/<version>/` | `DEDL-specification.md`, `dedl.schema.json` and every example file, verbatim | spec 002 |
| `sources/dedl/source.lock.json` | Source records for all versions, plus withdrawals | spec 002 (provenance shown on every page) |
| `sources/catalogue/<host>/` | `diagrams.md` verbatim, and `catalogue.json` (designer entries with mapped states) | spec 003 |
| `sources/screenshots/<host>/` | Accepted PNGs verbatim, and `screenshots.json` (origin, expectation, size) | spec 003 |
| `sources/hosts/hosts.json` | Host states with their facts | spec 001 (home page), spec 003 (per-host availability) |
| `procedures/config/states.json` | Site states and mappings | spec 003 (state labels and order) |

Each `sources/<short>/source.lock.json` follows [source-lock.schema.json](source-lock.schema.json).

The build MUST read sourced content only from these paths and MUST NOT fetch from the network (research R2).

## What this feature requires from the site's build

1. **`npm run build`** builds the whole site into the output folder spec 001 chooses. It exits non-zero on failure.
2. **`npm run check`** runs, against the built output, the internal link check and the automated WCAG 2.2 AA check that spec 001 FR-012 requires. It exits non-zero on any broken link or violation, and prints each one.
3. **Source record in every sourced page.** Every page generated from files under `sources/` carries, in its `<head>`:

   ```html
   <meta name="adp:source" content="<owner/name>@<40-hex sha>:<sourcePath>">
   ```

   There is one `meta` for each source file the page was built from. The visible provenance line required by constitution principle II and spec 002 FR-011 is rendered from the same data. It is not part of this contract.
4. **Build output path.** `package.json` names the build output folder in `"adp": { "out": "<folder>" }`, so that `refresh:verify` can find the built pages without guessing.

Until spec 001 provides items 1, 2 and 4, the Verify stage reports those steps as "not available" and runs only the file-level half of the source-record check (research R8).

## Source-record check (`npm run refresh:verify`)

This check fails if any of the following holds:

- A file under `sources/<short>/` (other than the lock itself) has no entry in that folder's lock, either as a source record (`files`) or as a derived file (`derived`) that the procedure's module declares in `derivedFiles`.
- A derived file is missing, or its SHA-256 differs from the lock.
- A lock entry's file is missing, or its SHA-256 differs from the file.
- A lock has `"local": true` (a test or quickstart run leaked into a commit).
- A lock entry's `commit` is not 40 hexadecimal characters, or its `repository` is not in the procedure's declared sources.
- When the build output exists: a built page contains an `adp:source` meta that points to no lock entry (a stale revision), or a page built from `sources/` has no `adp:source` meta at all. The build marks such pages with `<meta name="adp:sourced" content="true">`, so the check knows which pages to inspect.

It also runs in CI on every pull request, not only in refresh runs, so a hand edit under `sources/` is caught (constitution principle II).
