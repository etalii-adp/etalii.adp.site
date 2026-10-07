# etalii.adp.site

[![Build](https://github.com/etalii-adp/etalii.adp.site/actions/workflows/build.yml/badge.svg?branch=develop)](https://github.com/etalii-adp/etalii.adp.site/actions/workflows/build.yml?query=branch%3Adevelop)

The website for ADP, A Different Perspective: a range of specialized tools: diagrams, designers and editors, highly tuned for specific tasks, including (constructive technology) assessment, collaboration between humans and agents, and bringing clarity to textual data.

The site is published at <https://etalii.net/adp/>. It is a static site built with [Astro](https://astro.build) and its documentation theme [Starlight](https://starlight.astro.build).

## Running the site locally

You need Node.js 24 or later.

```sh
npm ci                                  # install the exact dependencies from package-lock.json
npx playwright install chromium         # once, for the page checks
npm run dev                             # http://localhost:4321/adp/ while editing
npm run build                           # the site into dist/adp/, with the root redirect and 404 page in dist/
npm run check                           # internal links, then accessibility, phone-width, no-script and privacy checks over every page
npm run preview                         # serve dist/ at http://localhost:4321/adp/
```

`npm run build` and `npm run check` are the whole verification a change needs before its pull request; CI runs the same two commands, with the page checks of `npm run check` split over three runners.

## Publishing

Nothing is published by hand. Every pull request into `develop` and every push to it runs the `Build` workflow (`.github/workflows/build.yml`), which builds the site once, checks it and publishes nothing; its `complete` job is the one result that says every check passed. `develop` has a ruleset that requires `complete` and `refresh-checks`, so a pull request with auto-merge enabled merges by itself, with a merge commit, as soon as both pass.

When `Build` passes on a push to `develop`, that is on every merged pull request, it starts the `deploy` workflow (`.github/workflows/deploy.yml`). `deploy` takes the site `Build` built and checked, adds the Notion add-ons of `etalii.adp.ide.notion` at `/adp-notion`, and deploys `dist/` to GitHub Pages, in about a minute. It publishes only the head of `develop`, so an older commit's `Build` leaves the publishing to the newer one; if `Build` fails, nothing is published and the site stays as it was. A merge in `etalii.adp.ide.notion` starts `deploy` by hand (`workflow_dispatch`), which republishes the checked site of `develop`'s head with the new add-ons.

The workflows run in the Playwright container image of the version `package-lock.json` pins (`mcr.microsoft.com/playwright:v<version>-noble`), so a Playwright upgrade bumps that image tag in `build.yml` in the same change.

## How work is done here

Every change starts as a specification, using GitHub Spec Kit with the SpecKit Companion extension in [etalii.adp](https://github.com/etalii-adp/etalii.adp), where this repository's features are kept under [`specs/etalii.adp.site/`](https://github.com/etalii-adp/etalii.adp/tree/develop/specs/etalii.adp.site). See `CLAUDE.md`.
