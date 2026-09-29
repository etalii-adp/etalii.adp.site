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

`npm run build` and `npm run check` are the whole verification a change needs before its pull request; CI runs the same two commands.

## Publishing

Nothing is published by hand. Every pull request into `develop` runs the `ci` workflow, which builds and checks the site and publishes nothing. Every push to `develop`, that is every merged pull request, runs the `deploy` workflow, which builds, checks and then deploys `dist/` to GitHub Pages; if any step fails, the published site stays as it was.

## How work is done here

Every change starts as a specification, using GitHub Spec Kit with the SpecKit Companion extension. See `CLAUDE.md` and the features under `specs/`.
