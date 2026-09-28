# Contract: Catalogue Addresses

Every page the catalogue publishes, with its address under `https://etalii.net/adp`. Addresses end in `/`. Once published, an address never stops resolving: it is redirected or turned into a withdrawal notice (FR-011).

| Address | Page | Part | Requirement |
|---|---|---|---|
| `/adp/designers/` | Overview: every designer grouped by focus area, then the ideas list; the only place designers are filtered | documentation | FR-001, FR-002, FR-014 |
| `/adp/designers/?focus=<focus-slug>&hosts=<host-id>&state=<state-id>` | The overview with those options ticked; each parameter may repeat or be left out | documentation | FR-002 |
| `/adp/designers/focus/<focus-slug>/`, `/adp/designers/hosts/<host-id>/`, `/adp/designers/states/<state-id>/` | Retired 2026-09-28: a redirect to the overview with that one option ticked | documentation | FR-002 |
| `/adp/designers/<vendor>/<diagram-type>/` | Designer page | documentation | FR-003 to FR-009, FR-012 |
| `/adp/designers/<old-vendor>/<old-type>/` | Redirect stub or withdrawal notice | documentation | FR-011 |

There are no filter options for `idea` and `not-planned`: ideas are listed on the overview only, and "not planned" is never a catalogue membership.

## The overview

- Its markup contains the full catalogue in reading order, with scripting disabled (FR-002).
- Each entry shows the name, the one-line purpose, a thumbnail (or none, never a placeholder that looks like the product), the origin tag, and the four host states as text, not colour alone (WCAG 1.4.1).
- Designers with no focus area are listed under "Other designers" after the focus-area groups. A focus area with no designers shows "No designers yet".
- A filter above the list has one group per facet (focus area, host, state) and one checkbox per option, with the option's name as its label and no links (FR-002, amended 2026-09-28).
- With scripting, ticking checkboxes narrows the list in place (OR within a facet, AND across facets); groups left without a matching designer are hidden while any option is ticked, the number of results is reported in an `aria-live="polite"` region, and the ticked options are kept in the address as `?focus=…&hosts=…&state=…`. Opening such an address ticks them.
- With exactly one option ticked, the introduction, which sits between the filter and the list, is replaced by that option's description (a focus area's problem statement, or a sentence naming the host or state), the breadcrumbs become Documentation › Designers › the option (with Designers a link to the overview), and the document title names the option. With none or several ticked, the page is as built.
- Without scripting, the filter is not shown and the full list is; nothing is lost but narrowing it.
- Each card's name links to the designer page.
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
