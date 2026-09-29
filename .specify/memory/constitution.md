<!--
Sync Impact Report
- Version: 1.0.0 → 1.1.0 (amended 2026-09-29, etalii.adp spec 002, naming convention alignment)
- Modified principles (titles unchanged): I. One Site for Product and Documentation (ADP described as
  "specialized tools: diagrams, designers and editors"; the reference serves tool engineers, with the
  specification and definition languages, DISL and DID first, and the tools); III. Truthful About What
  Exists ("tool" for "designer"); V. Maintainable by Agents (the DISL and DID reference for DEDL).
- Added: a pointer to etalii.adp's glossary, docs/terminology.md, as the source of these terms.
- Removed sections: none.
- Templates: plan-template.md, spec-template.md and tasks-template.md read the principles and name no
  retired term; none needs a change.
- Deferred: none.

Earlier:
- Version: template → 1.0.0 (initial ratification, 2026-09-26)
- Principles added: I. One Site for Product and Documentation; II. Sourced, Never Retyped;
  III. Truthful About What Exists; IV. Readable by Everyone, Anywhere; V. Maintainable by Agents;
  VI. Simplicity
- Sections added: Hosting and Content Constraints, Development Workflow, Governance
- Templates: plan-template.md (Constitution Check, Complexity Tracking), spec-template.md and
  tasks-template.md checked; they are generic and read the principles below, so none needs a change.
- Deferred: none.
- Resolved 2026-09-26: content licence Apache-2.0; this repository alone holds etalii.net on GitHub Pages, with the site under /adp and a redirect at the root (Peter, 2026-09-26).
-->

# etalii.adp.site Constitution

The words for what ADP offers (tool; its kinds diagram, designer and editor; tool engineer; specification and definition languages) are defined in [`docs/terminology.md` in etalii-adp/etalii.adp](https://github.com/etalii-adp/etalii.adp/blob/develop/docs/terminology.md); this constitution uses them as defined there.

## Core Principles

### I. One Site for Product and Documentation

The site is ADP's front door and its reference, in one place.

- It MUST explain what ADP is to someone who has never heard of it: specialized tools: diagrams, designers and editors, for any task where a specialized visualization beats a generic diagram or plain text. It MUST NOT present ADP as an architecture-diagram tool only.
- It MUST carry the reference material a tool engineer or user needs: the specification and definition languages specified in `etalii-adp/etalii.adp` (DISL and DID first), the tools, and the IDE hosts (standalone, IntelliJ, VS Code, Eclipse).
- The product part and the documentation part MUST be distinguishable at a glance, and every page MUST be reachable from both the home page and the site's navigation.

Rationale: a visitor who is convinced should find the reference one click away, and an author reading the reference should never have to search a second site.

### II. Sourced, Never Retyped

The site does not own facts about ADP; the repositories that build ADP do.

- Every specification, schema, example, screenshot and capability shown on the site MUST come from a named source repository, and the site MUST record which source and which revision each item was taken from.
- Content from a source MUST be brought over by a repeatable procedure, never retyped or edited by hand on the site side. A correction to sourced content is made in its source repository first.
- A reader MUST be able to see, for every sourced page, where it came from and how current it is.

Rationale: hand-copied documentation drifts from the thing it describes within weeks, and nobody notices until a reader is misled.

### III. Truthful About What Exists (NON-NEGOTIABLE)

- The site MUST NOT claim a tool, format or IDE capability that does not exist in a released or published form. Planned and in-progress work MAY be shown only when labelled as such.
- Each tool's availability MUST be stated per IDE host, because the hosts do not move in step.
- Screenshots MUST show the real product, captured from it, not mock-ups presented as the product.

Rationale: a reader who installs ADP on the strength of a claim that turns out false does not come back.

### IV. Readable by Everyone, Anywhere

- Pages MUST meet WCAG 2.2 level AA.
- Reading content MUST NOT depend on client-side scripting; scripting MAY enhance pages (search, theme switching) but never gate them.
- Pages MUST work at phone width without horizontal scrolling, and in light and dark colour schemes.
- The site MUST NOT track visitors, set cookies or load third-party resources unless a specification requires it and states why.

Rationale: a documentation site that some readers cannot use, or that follows them around, costs more trust than it earns.

### V. Maintainable by Agents

- Every recurring content task (refreshing screenshots, the DISL and DID reference and other sourced material, publishing a release of the site) MUST have a written procedure in this repository that an agent can follow from start to finish without asking a person for steps.
- A procedure MUST end in a pull request into `develop`, never in a direct change to the published site.
- A procedure MUST verify its own result (links resolve, sourced items carry their source and revision, pages build) before it opens the pull request.

Rationale: the people behind ADP work with agents; content that only a person knows how to refresh goes stale.

### VI. Simplicity

Start with the smallest site that does the job and grow it by specification. Tools, dependencies and features MUST be justified by a current requirement. Prefer static pages generated at build time over anything that runs on a server.

## Hosting and Content Constraints

- The site is published with GitHub Pages and served at `https://etalii.net/adp`. Every link and asset MUST work under the `/adp` path prefix.
- This repository is the only one involved: its GitHub Pages site carries the custom domain `etalii.net`, publishes the site in its `adp/` folder, and redirects the root of the domain to `/adp`. No other repository is created for it.
- This repository is public, which GitHub Pages on the free plan requires.
- The site is in English only.
- The site's own text, images and code are licensed under the Apache License, Version 2.0 (`LICENSE`).
- Sourced content keeps the licence of its source repository, stated beside it.

## Development Workflow

- Work follows GitHub Spec Kit: constitution, specify, (clarify), plan, tasks, implement. Specifications state *what* and *why* and stay free of implementation choices; plans state *how*.
- Each feature is developed on its own branch, `features/<number>-<name>`, in its own worktree. The one exception is `claude/<name>`, which Claude's cloud sessions are handed by their harness.
- A feature reaches `develop`, the integration branch, only through a pull request merged with a merge commit. A feature branch is never merged locally into `develop`, and nothing is pushed to `develop` directly. When the pull request is merged or closed, the branch is deleted locally and on `origin`, and the worktree removed.
- Every plan MUST include a Constitution Check against these principles; any deviation MUST be recorded with its justification in the plan's complexity-tracking section.
- A change is mergeable only when the site builds and its automated checks (links, accessibility, source records) pass in CI.

## Governance

This constitution supersedes other practices in this repository. Amendments are made through `/speckit-constitution`, recorded in version control, and versioned semantically: MAJOR for removing or redefining a principle, MINOR for adding a principle or materially expanding guidance, PATCH for clarifications. Reviews of plans and changes MUST verify compliance with the principles above; runtime guidance for agents lives in `CLAUDE.md`.

**Version**: 1.1.0 | **Ratified**: 2026-09-26 | **Last Amended**: 2026-09-29
