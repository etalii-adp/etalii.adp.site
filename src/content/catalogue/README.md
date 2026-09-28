# Catalogue data

The designer catalogue (spec 003) is assembled at build time by `src/lib/catalogue/assemble.ts` from three kinds of input. Nothing in this folder is a sourced fact: host states, names, theory links and screenshots come only from `sources/`, which spec 004's refresh procedures write.

| File | What it holds | Written by |
|---|---|---|
| `notion.json` | The Notion "Diagrams" data source: names, purposes, descriptions, focus areas and the host columns of hosts without their own catalogue | `npm run catalogue:notion`; `npm run catalogue:sync-notion` updates a host value after writing it to Notion |
| `focus-areas.json` | The focus areas, in display order, with the problem each one addresses | site-owned; `catalogue:notion` appends a new Notion option with an empty `problem` |
| `screenshot-notes.json` | Per screenshot id (`<host>--<image>`), why what it shows matters | site-owned, edited in review |
| `file-formats.json` | Per file extension (`.mm`), the format's name | site-owned, edited in review |
| `redirects.json` | Retired designer addresses: renamed (`to` set) or withdrawn (`to: null`), never removed | `npm run catalogue:report -- --rename` or `--withdraw`, reviewed in the pull request |
| `published.json` | The designer origins that had a page at the last `catalogue:report` | `npm run catalogue:report` |

"Site-owned" means the text belongs to this repository (spec 003 FR-010). It is written or corrected in the review of a refresh pull request, never by hand outside one, and it is never a fact about what exists.

An empty `problem` in `focus-areas.json` is listed as a gap by `catalogue:report` until the owner writes it.

## Example files

`screenshot-notes.json` says, per screenshot id, why what the screenshot shows matters for the designer's task. A screenshot is shown on its designer page only once it has this note and its source has a licence (spec 003 FR-015); until then the page says "Screenshot pending". The id is `<host>--<image name without .png>`, as `catalogue:report` lists it under "Screenshots".

```json
{
  "standalone--wardley-map": {
    "whyItMatters": "The evolution axis puts each component where it is in its life cycle, which is the point of a Wardley map and what a generic diagram leaves out."
  }
}
```

`file-formats.json` names each file extension that Notion's `File extension (if single file)` column gives. Without an entry, the page shows the extension itself.

```json
{
  ".mm": { "name": "FreeMind mind map" },
  ".owm": { "name": "OnlineWardleyMaps text" }
}
```

Both files are written in the review of a refresh pull request, never by a script.

## Adding or refining a designer

This section is for people and agents alike. The designer catalogue (spec 003) is built entirely from its sources; there is no page to write per designer. A designer appears on `/adp/designers/`, gets its own page at `/adp/designers/<vendor>/<type>/` and can be filtered once its sources say so and a refresh has brought that in. Read [spec 003](../../../specs/003-designer-catalogue/spec.md) and the [refresh procedures](../../../procedures/README.md) before changing anything here.

### Where each part of a designer comes from

| What the site shows | Where it is written | How it reaches the site |
|---|---|---|
| The designer itself, its origin tag (`vendor/type`), name, group and theory links | A row in `docs/diagrams.md` of the IDE host's repository (`etalii-adp/etalii.adp.ide.*`) | "Refresh the designer catalogue" |
| Its state per host (Planned, Prototype, …) | The state column of that row, mapped through `procedures/config/states.json` | "Refresh the designer catalogue" |
| One-line purpose (at most 140 characters), the task (`Description`), `Why specialized`, file extension, focus areas, family | The designer's row in the Notion "Diagrams" database, matched on its `Origin` column | "Refresh the designer catalogue", which runs `npm run catalogue:notion` when `NOTION_TOKEN` is set |
| Screenshots and what they must show | `docs/screenshots/*.png` and `docs/screenshots/readme.md` in the host's repository | "Refresh the screenshots" |
| Why a screenshot matters | `screenshot-notes.json` in this folder | Edited in the review of the screenshots refresh pull request |
| The name of a file format | `file-formats.json` in this folder | Edited in review |
| A focus area's name, order and problem statement (shown when that one focus area is ticked on the overview) | `focus-areas.json` in this folder; a new area is added by `catalogue:notion` from Notion's `Focus areas` options | "Refresh the designer catalogue"; the problem statement is written in review |
| A host's state on the home page | Derived from the host's catalogue and releases | "Refresh the IDE host states" |

### To add a designer

1. Add its row to `docs/diagrams.md` in the IDE host's repository, with a new, unique origin tag (lowercase `vendor/type`, for example `wardley/map`). The tag becomes the page address and never changes afterwards.
2. Add or complete its row in the Notion "Diagrams" database with the same `Origin`: `One line purpose`, `Description`, `Why specialized`, `File extension (if single file)` and one or more `Focus areas`. Without Notion text the page says "Not described yet" and the card shows the name instead of a purpose; without focus areas it is listed under "Other designers" and no focus-area filter finds it.
3. If it is usable (Prototype or better), commit a screenshot and its readme entry in the host's `docs/screenshots/`.
4. Run "Refresh the designer catalogue", then "Refresh the screenshots" (see `CLAUDE.md`), and review their pull requests: `.refresh/catalogue-report.md` lists every gap. Write a `screenshot-notes.json` entry for each new screenshot in the screenshots pull request.

### To refine a designer

- Better wording (purpose, task, why specialized, focus areas): edit the Notion row, then run "Refresh the designer catalogue". Never write that text into this repository.
- A state change or a new theory link: change the host's `docs/diagrams.md`, then refresh the catalogue.
- A new or better screenshot: commit it in the host's repository, then refresh the screenshots.
- A renamed origin tag: fill Notion's `Previous origin` with the old tag and change the host's catalogue. The catalogue refresh stops with a decision; answer it as "Decisions" in `procedures/refresh-catalogue.md` says, so the old address keeps working (FR-011).
- The look of the overview, the filter or the designer page: change `src/pages/designers/` and `src/components/catalogue/` on a `features/` branch, after amending spec 003 (see `CLAUDE.md`). The filter options come from `focus-areas.json`, `src/lib/catalogue/hosts.ts` and `facetStates` in `src/lib/catalogue/states.ts`; nothing about a single designer is written in page code.

### What never to do

- Edit anything under `sources/`, `notion.json`, `published.json` or `redirects.json` by hand: they come from the refresh procedures.
- Add a page per focus area, host or state. The overview is the only place designers are filtered; `?focus=<slug>`, `?hosts=<id>` and `?state=<id>` link to a filtered view (spec 003 FR-002).
- Show a screenshot, state or description that its source does not have (constitution principle II and III).
