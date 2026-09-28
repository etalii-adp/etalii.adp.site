# Contract: Catalogue Addresses

Every page the catalogue publishes, with its address under `https://etalii.net/adp`. Addresses end in `/`. Once published, an address never stops resolving: it is redirected or turned into a withdrawal notice (FR-011).

| Address | Page | Part | Requirement |
|---|---|---|---|
| `/adp/designers/` | Overview: every designer grouped by focus area, then the ideas list | documentation | FR-001, FR-002, FR-014 |
| `/adp/designers/focus/<focus-slug>/` | Designers in one focus area | documentation | FR-002 |
| `/adp/designers/hosts/<host-id>/` | Designers per state in one host (`standalone`, `intellij`, `vscode`, `eclipse`) | documentation | FR-002, US3 |
| `/adp/designers/states/<state-id>/` | Designers whose best state is this state (`planned`, `in-progress`, `prototype`, `implemented`, `available`) | documentation | FR-002 |
| `/adp/designers/<vendor>/<diagram-type>/` | Designer page | documentation | FR-003 to FR-009, FR-012 |
| `/adp/designers/<old-vendor>/<old-type>/` | Redirect stub or withdrawal notice | documentation | FR-011 |

The facet pages for `idea` and `not-planned` are not generated: ideas are listed on the overview only, and "not planned" is never a catalogue membership.

## The overview

- Its markup contains the full catalogue in reading order, with scripting disabled (FR-002).
- Each entry shows the name, the one-line purpose, a thumbnail (or none, never a placeholder that looks like the product), the origin tag, and the four host states as text, not colour alone (WCAG 1.4.1).
- Designers with no focus area are listed under "Other designers" after the focus-area groups. A focus area with no designers shows "No designers yet".
- A filter above the list has one group per facet (focus area, host, state), in the markup, not added by script. Each option is a checkbox followed by the option's name, and the name is an ordinary link to that option's facet page. There is no separate block of facet links on the overview (FR-002, amended 2026-09-28).
- With scripting, ticking checkboxes narrows the list in place (OR within a facet, AND across facets); groups left without a matching designer are hidden while any option is ticked, and the number of results is reported in an `aria-live="polite"` region. Without scripting, the checkboxes are not shown, the names stay links to the facet pages, and nothing is lost but the combination of filters.
- The facet pages keep their own block of facet links, so a visitor can move from one facet page to another.
- The ideas list follows the catalogue under its own heading. It shows each idea's name, origin tag and theory links, and has no thumbnails and no links to designer pages.

## A designer page, in order

1. The name, the origin tag and the one-line purpose.
2. Availability: a table with one row per host (all four, always). Each row gives the state label, the host's own name for the designer if it differs, and the install link or "not yet released", or "planned" or "not planned" (US3).
3. What it is for: the task, why a specialized visualization helps, and the file formats it reads and writes (FR-004).
4. Screenshots: each is a `<figure>` holding the image (with `alt`), a caption naming the host and short revision, "What is visible" and "Why it matters" (FR-015). The full-size PNG is a link, not loaded with the page. "Screenshot pending" is shown when the designer is usable but has no publishable image.
5. Background: links to the notation's theory or standard, the DEDL definition and the DEDL reference (FR-008).
6. Sources: every SourceRecord as `repository@short-revision`, linked to the file at that revision, with its licence (FR-009).

## Redirect stub

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Moved: <old name></title>
  <link rel="canonical" href="https://etalii.net/adp/designers/<vendor>/<type>/">
  <meta http-equiv="refresh" content="0; url=/adp/designers/<vendor>/<type>/">
  <meta name="robots" content="noindex">
</head>
<body>… the site's layout, with "This designer is now at <link>". …</body>
</html>
```

A withdrawal notice is a normal page in the site's layout. It has no refresh, and it states the reason and the date.
