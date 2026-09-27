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
