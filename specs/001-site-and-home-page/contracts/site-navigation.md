# Contract: Site Navigation and Page Chrome

What every page on the site carries, and what a page added by another specification (002, 003, later) must declare to get it. The chrome is built from `src/data/sections.ts` and the page's frontmatter; no page writes its own navigation.

## What a page declares

A hand-written page is an MDX file under `src/content/docs/` with this frontmatter:

```yaml
---
title: DEDL reference
description: The Designer Definition Language, element by element.
part: documentation        # product | documentation
section: dedl              # an id from src/data/sections.ts
---
```

A generated page (for example a catalogue page from spec 003) lives under `src/pages/` and renders through Starlight's `<StarlightPage frontmatter={{ title, description, part, section }}>`, which gives it the same chrome.

A new top-level section is added to `src/data/sections.ts` by the specification that delivers it; that is the only change needed for it to appear in the header, sidebar, breadcrumbs and footer.

## What every page carries

In source order, all plain HTML, all present with scripting disabled:

1. **Skip link** to the main content.
2. **Header**:
   - the logo (ADP icon, wordmark "ADP", caption "A Different Perspective"), a link to `/adp/`;
   - the part links "Product" (`/adp/`) and "Documentation" (`/adp/docs/`), in a `<nav aria-label="Site parts">`, the current part marked with `aria-current="true"` and visibly (underline and weight, not colour alone);
   - a link to the `etalii-adp` organisation on GitHub (FR-008), with a visible or accessible name "Source on GitHub";
   - right of it, the visitor counter image from `https://hitscounter.dev`, in the site's accent green, loaded without credentials and without a referrer, with the alternative text "Visitors" (FR-015, amended 2026-09-28). It is hidden at phone width, where the header has no room for it.
3. **Sidebar** (documentation part only): the documentation sections and their pages, current page marked. At narrow widths it is behind Starlight's menu button, which needs scripting; the header, breadcrumbs and footer keep every page reachable without it.
4. **Breadcrumbs** above the title on every page except the home page, in a `<nav aria-label="Breadcrumb">`: part › section › page, each level above the current one a link (US2 AS3).
5. **Main content**, with a single `<h1>`.
6. **Footer**:
   - a site map: one list per part with every section, "Coming" beside sections whose status is `coming`;
   - "Site text, images and code licensed under Apache-2.0", linking to `LICENSE` in this repository (FR-017);
   - a link to this repository and to the `etalii-adp` organisation (FR-008);
   - the source of the ADP icon, and, on pages that show sourced content, where it came from and how current it is (principle II).

## What a page must not do

- Load anything from another origin: scripts, styles, fonts, images, frames (FR-015). The exceptions are the home page's build status badges from `https://github.com` and the header's visitor counter from `https://hitscounter.dev`; neither may leave a cookie.
- Hide text or links behind scripting (FR-014).
- Present a section with no content as complete; use `status: coming` instead (US2 AS2).
- Use colour alone to convey a state (WCAG 1.4.1).
