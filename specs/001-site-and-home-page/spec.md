# Feature Specification: Site and Home Page

**Feature Branch**: `features/001-site-and-home-page`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description (clarified 2026-09-26: Apache-2.0, this repository alone holds `etalii.net`, `etalii.net` redirects to `/adp`): "A website for ADP that is both a product site and a documentation site from the start (1C). The first page introduces ADP: the idea, the focus areas, the IDE hosts and where to get them (2A). Published with GitHub Pages and visible at etalii.net/adp (3A, 4B). English only (5A)."

## Context

ADP ("A Different Perspective") is a family of specialized diagram, designer and text editors, each tuned for one task where a specialized visualization beats a generic diagram or plain text. Three focus areas are named: (constructive) technology assessment, collaboration between humans and agents, and bringing clarity to textual data. Designers are described by definitions (DEDL, specified in `etalii-adp/etalii.adp`) and run in four IDE hosts: a standalone application, IntelliJ Platform IDEs, Visual Studio Code and Eclipse.

Today none of this is published anywhere a newcomer would find it. This feature creates the site itself: its address, its two-part structure (product and documentation), its home page and its navigation. Specs 002 (DEDL reference), 003 (designer catalogue) and 004 (refresh procedures) fill the documentation part.

Two roles appear below. A **visitor** is anyone arriving at the site, usually without knowing ADP. A **maintainer** is the person or agent who changes the site through a pull request.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Understand ADP in one visit (Priority: P1)

A visitor opens `https://etalii.net/adp` and, from the home page alone, learns what ADP is, what problems it is for, which IDEs it runs in, and where to go next.

**Why this priority**: this is the site's reason to exist; without it nothing else is found.

**Independent Test**: publish only the home page and ask someone who has never heard of ADP to explain it back after reading it.

**Acceptance Scenarios**:

1. **Given** a visitor who has never heard of ADP, **When** they open `https://etalii.net/adp`, **Then** the first screen states in one or two sentences what ADP is, without calling it an architecture tool.
2. **Given** the home page, **When** the visitor reads on, **Then** they see the three focus areas, each with a short explanation of the problem a specialized designer solves there.
3. **Given** the home page, **When** the visitor looks for where ADP runs, **Then** they see the four IDE hosts, each with its current state (available, in progress or planned) and a link to its repository or install page.
4. **Given** the home page, **When** the visitor wants more, **Then** a visible link leads to the documentation part and another to the designer catalogue.

---

### User Story 2 - Move between product and documentation (Priority: P1)

A visitor or author moves freely between the product pages (what ADP is and offers) and the documentation pages (definition languages, designers, how-tos) through one consistent navigation.

**Why this priority**: the site is both a product site and a documentation site from the start (constitution principle I).

**Independent Test**: from every page, reach the home page, the documentation start page and every top-level section in at most two selections.

**Acceptance Scenarios**:

1. **Given** any page, **When** the visitor looks at the navigation, **Then** it shows which part (product or documentation) they are in and the top-level sections of both.
2. **Given** a documentation section that has no content yet, **When** it appears in the navigation, **Then** it is either hidden or clearly marked as coming, never an empty page presented as complete.
3. **Given** a page deep in the documentation, **When** the visitor wants to go back up, **Then** they can see where they are in the structure and reach each level above.

---

### User Story 3 - Published from develop without a manual step (Priority: P2)

A maintainer merges a pull request into `develop` and the site at `https://etalii.net/adp` shows the change without anyone publishing it by hand.

**Why this priority**: the site is maintained largely by agents through pull requests (constitution principle V); a manual publish step would be a place for it to go stale.

**Independent Test**: merge a one-word change into `develop` and see it live at the address, with no further action.

**Acceptance Scenarios**:

1. **Given** a pull request that is merged into `develop`, **When** publishing completes, **Then** the change is visible at `https://etalii.net/adp`.
2. **Given** a pull request that is not yet merged, **When** its checks run, **Then** they show whether the site builds and whether its links and accessibility checks pass, and nothing is published.
3. **Given** a change that breaks the build, **When** it is merged, **Then** the previously published site stays online unchanged.

---

### User Story 4 - Read the site on any device (Priority: P2)

A visitor reads the site on a phone, with a screen reader, in dark mode or with scripting disabled, and still gets the full content.

**Why this priority**: constitution principle IV.

**Independent Test**: run an automated WCAG 2.2 AA check on every page and open each page at phone width with scripting off.

**Acceptance Scenarios**:

1. **Given** a phone-width screen, **When** a visitor opens any page, **Then** nothing scrolls horizontally and all navigation is reachable.
2. **Given** a browser with scripting disabled, **When** a visitor opens any page, **Then** all its text, images and links are present.
3. **Given** a system set to dark mode, **When** a visitor opens the site, **Then** it follows the dark colour scheme with sufficient contrast.

### Edge Cases

- A visitor opens `https://etalii.net/adp` without a trailing slash, or `http://` instead of `https://`: they arrive at the home page over HTTPS.
- A visitor opens a page that does not exist under `/adp`: they see a page-not-found page with the site's navigation, not a bare host error.
- An old link from before a page was moved: the visitor is sent to the new location.
- An IDE host has no public install yet: the home page says so rather than linking to nothing.
- A visitor opens `https://etalii.net` or `https://www.etalii.net`: they are sent to `https://etalii.net/adp`.
- A visitor opens an address on `etalii.net` outside `/adp` that does not exist: they are sent to `https://etalii.net/adp`, or shown a page-not-found page that links to it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST be published at `https://etalii.net/adp`, and every page, link and asset MUST work under the `/adp` path prefix.
- **FR-002**: The site MUST be served over HTTPS, and plain HTTP requests MUST be redirected to HTTPS.
- **FR-003**: The site MUST have two parts, product and documentation, and the navigation MUST show which part the current page belongs to.
- **FR-004**: The home page MUST state what ADP is in one or two sentences, in terms of specialized visualizations for specific tasks, not architecture alone.
- **FR-005**: The home page MUST present the three focus areas: (constructive) technology assessment, collaboration between humans and agents, and bringing clarity to textual data.
- **FR-006**: The home page MUST list the four IDE hosts (standalone, IntelliJ Platform, Visual Studio Code, Eclipse), each with its current state and a link to where it can be obtained or followed.
- **FR-007**: The home page MUST link to the documentation start page and the designer catalogue (spec 003).
- **FR-008**: The site MUST link to the source repositories in the `etalii-adp` organization.
- **FR-009**: Every page MUST be reachable from the home page within two selections.
- **FR-010**: A request for a missing page MUST return a page-not-found page that carries the site's navigation.
- **FR-011**: Merging a pull request into `develop` MUST publish the site without a manual step; an unmerged pull request MUST NOT change the published site.
- **FR-012**: Checks on every pull request MUST report whether the site builds, whether all internal links resolve and whether every page passes WCAG 2.2 AA automated checks.
- **FR-013**: A failed build MUST leave the previously published site in place.
- **FR-014**: Pages MUST be readable with scripting disabled, at phone width without horizontal scrolling, and in light and dark colour schemes.
- **FR-015**: The site MUST NOT set cookies, track visitors or load resources from third parties.
- **FR-016**: All content MUST be in English.
- **FR-017**: Every page MUST show the site's licence, Apache-2.0, in its footer.
- **FR-018**: A request for the root of `etalii.net` (with or without `www.`) MUST be sent to `https://etalii.net/adp`.

### Key Entities

- **Page**: a unit of content with a title, a part (product or documentation), a place in the navigation and an address under `/adp`.
- **IDE host**: one of the four environments ADP runs in, with a name, a state (available, in progress, planned) and a link.
- **Focus area**: one of the three task families ADP targets, with a name and a short problem statement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Three people unfamiliar with ADP can each explain what it is and name one focus area after reading only the home page.
- **SC-002**: A change merged into `develop` is visible at `https://etalii.net/adp` without a manual step, every time, over ten consecutive merges.
- **SC-003**: Every page passes automated WCAG 2.2 AA checks with zero violations.
- **SC-004**: Every internal link on the site resolves; the link check reports zero broken links on `develop`.
- **SC-005**: From any page, the home page and every top-level section are reachable in at most two selections.

## Assumptions

- `etalii.net` is Peter's domain and is used for ADP only. This repository's GitHub Pages site carries it as its custom domain, so everything under `etalii.net` is published from here: the site under `/adp` and the redirect of FR-018 at the root. No other repository is involved.
- This repository keeps its name and is made public before the first publish, as GitHub Pages on the free plan requires.
- IDE host states are taken from the IDE repositories (constitution principle II); spec 004 defines how they are refreshed.
- The GitHub demo files (`index.html`, `package.json`) are replaced by this feature.
