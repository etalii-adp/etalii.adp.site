# Contract: Site Addresses

Every address on `etalii.net` and what it answers. Pages under `/adp/` end in `/`. Once published, an address never stops resolving: a moved page gets a redirect ([data-model.md](../data-model.md), Redirect).

| Request | Answer | Handled by | Requirement |
| --- | --- | --- | --- |
| `http://etalii.net/…`, `http://www.etalii.net/…` | 301 to the same path on `https://etalii.net` | Pages, HTTPS enforced | FR-002 |
| `https://www.etalii.net/…` | 301 to the same path on `https://etalii.net` | Pages, both names on the certificate | FR-018 |
| `https://etalii.net/` | root page that redirects immediately to `/adp/` (meta refresh, canonical, visible link) | `dist/index.html` | FR-018 |
| `https://etalii.net/adp` | 301 to `/adp/` | Pages, directory | edge case |
| `https://etalii.net/adp/` | home page, product part | `src/content/docs/index.mdx` | FR-001, FR-004 to FR-008 |
| `https://etalii.net/adp/docs/` | documentation start page | `src/content/docs/docs/index.mdx` | FR-003, FR-007 |
| `https://etalii.net/adp/dedl/` | "Coming" page, then the DEDL reference (spec 002) | `src/content/docs/dedl/index.mdx` | US2 AS2 |
| `https://etalii.net/adp/designers/` | "Coming" page, then the designer catalogue (spec 003) | `src/content/docs/designers/index.mdx` | FR-007, US2 AS2 |
| `https://etalii.net/adp/<moved>/` | redirect page to the new address | Astro `redirects` from `src/data/redirects.ts` | edge case |
| any other address, inside or outside `/adp/` | 404 status with the page-not-found page in the site's layout, linking to the home page | `dist/404.html` | FR-010, edge case |
| `https://etalii.net/adp/_astro/…`, `/adp/favicon.svg` | static assets | Astro build, `public/` | FR-001 |

## Root redirect page

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ADP – A Different Perspective</title>
  <link rel="canonical" href="https://etalii.net/adp/">
  <meta http-equiv="refresh" content="0; url=/adp/">
  <style>/* site background and text colours, both schemes */</style>
</head>
<body><p><a href="/adp/">Continue to ADP – A Different Perspective</a></p></body>
</html>
```

It loads nothing else and sets no cookies.

## Page-not-found page

Starlight's 404 route in the site's layout: header with both parts, a heading "Page not found", a sentence saying the address does not exist, links to the home page and the documentation start page, and the footer site map. Served for every missing address on the domain because it is copied to the artifact's root.
