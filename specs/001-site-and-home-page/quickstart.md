# Quickstart: Validating the Site and Home Page

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

How to prove the feature works, locally and after deploy. Addresses are in [contracts/site-addresses.md](contracts/site-addresses.md); page chrome in [contracts/site-navigation.md](contracts/site-navigation.md).

## Prerequisites

- Node.js 24 LTS and npm.
- Playwright's Chromium: `npx playwright install chromium` (once).
- For the post-deploy checks: `curl` and a browser.

## Local

```powershell
npm ci
npm run build     # astro build into dist/adp/, then the root redirect and 404 into dist/
npm run check     # internal links, then the Playwright suite over every page in dist/
npm run dev       # optional: http://localhost:4321/adp/ while editing
```

Expected:

1. `npm run build` ends without errors, and `dist/` holds `index.html`, `404.html` and `adp/` with `index.html`, `docs/`, `dedl/`, `designers/` and `_astro/`. A host record without a source record, or with `state: available` and no link, makes it fail (try it once to see the message).
2. `npm run check` reports zero broken internal links and zero failed tests. The suite covers, for every page: axe WCAG 2.2 AA in light and dark, no horizontal scroll at 360 px, navigation present with scripting disabled, no request to another origin, no cookies, the Apache-2.0 footer.

## Scenarios

| # | Scenario | How | Expected | Covers |
| --- | --- | --- | --- | --- |
| 1 | A newcomer understands ADP | Open the home page; read only the first screen | One or two sentences say what ADP is, as specialized visualizations for specific tasks, not an architecture tool | US1 AS1, FR-004 |
| 2 | Focus areas | Scroll the home page | Three focus areas, each with a problem statement and an illustration that is plainly artwork, not a screenshot | US1 AS2, FR-005 |
| 3 | Hosts | Find "Where ADP runs" | Four hosts with a text state; a host without a public install says so instead of linking; the source and date of the states are shown | US1 AS3, FR-006 |
| 4 | Next steps | Look for links onwards | Links to Documentation and to Designers; Designers shows "Coming" | US1 AS4, FR-007 |
| 5 | Part marker | Open the home page, then `/adp/docs/` | The header marks Product, then Documentation | US2 AS1, FR-003 |
| 6 | Coming sections | Open `/adp/dedl/` | A page saying what the section will hold and which specification delivers it; "Coming" in header, sidebar and footer | US2 AS2 |
| 7 | Levels above | Open `/adp/dedl/` | Breadcrumbs Documentation › DEDL reference, each level above a link | US2 AS3 |
| 8 | Two selections | From each page, reach the home page and every section | At most two selections, through header or footer | FR-009, SC-005 |
| 9 | Phone, no script | DevTools at 360 px, scripting disabled, every page | No horizontal scroll; header part links, breadcrumbs and footer site map usable | US4 AS1–AS2, FR-014 |
| 10 | Dark mode | Switch the system scheme | Site follows it, green on dark gray, text readable | US4 AS3, FR-014 |
| 11 | Missing page | `http://localhost:<port>/adp/nope/` against the `sirv` server used by the tests, or on the live site | Page-not-found page with the site's navigation | FR-010 |

## Pull request

Open a pull request into `develop`. Expected: the `ci` workflow runs build and check and reports each; nothing is deployed; `https://etalii.net/adp/` is unchanged. (US3 AS2, FR-011, FR-012)

## After merge

Merge into `develop`. Expected: the `deploy` workflow runs build, check and deploy; then:

```powershell
curl -sI http://etalii.net/adp/           # 301 to https://etalii.net/adp/
curl -sI https://www.etalii.net/          # 301 to https://etalii.net/
curl -sI https://etalii.net/adp           # 301 to https://etalii.net/adp/
curl -s  https://etalii.net/ | Select-String 'url=/adp/'    # root redirect page
curl -sI https://etalii.net/adp/nope/     # 404
curl -sI https://etalii.net/elsewhere     # 404
```

and the change is visible at `https://etalii.net/adp/` without any further step. (US3 AS1, FR-002, FR-011, FR-018, SC-002)

## A broken build does not publish

On a throwaway branch, break the build (for example set a host's `state` to `available` without a link), and run the `deploy` workflow on it by manual dispatch. Expected: the build step fails, the deploy job does not run, `https://etalii.net/adp/` is unchanged. Delete the branch afterwards. (US3 AS3, FR-013)
