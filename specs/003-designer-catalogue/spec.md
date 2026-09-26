# Feature Specification: Designer Catalogue

**Feature Branch**: `features/003-designer-catalogue`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description (clarified 2026-09-26: identified-only types go in a separate ideas list): "A designer catalogue, one page per designer with screenshots (2C)."

## Context

ADP's value is in its individual designers: each one is tuned for one task. Today the only overview is `docs/diagrams.md` in `etalii-adp/etalii.adp.ide.standalone`, a catalogue of diagram types with a state per type (identified, specified, to-do, work in progress, prototype, implemented) and an origin tag such as `freeplane/mindmap`, plus a set of reproducible screenshots in `docs/screenshots/`. The IntelliJ repository has its own designer (FreeMind mind maps), and VS Code and Eclipse have none yet. None of this is visible to someone outside the repositories, and no single place says which designer runs in which IDE.

This feature adds a catalogue to the site (spec 001): an overview of every designer and one page per designer, showing what it is for, what it looks like, and where it runs. Content is taken from the repositories that build the designers (constitution principle II) by the procedures of spec 004.

Roles: a **visitor** wants to know whether ADP has a designer for their task; a **user** wants to know how to get and use one; a **maintainer** keeps the catalogue current.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find a designer for my task (Priority: P1)

A visitor opens the catalogue and finds whether ADP has a designer for the kind of work they do, grouped so they can scan it quickly.

**Why this priority**: the catalogue's first job is answering "is there one for me?".

**Independent Test**: publish the overview with the existing designers and ask a visitor to find the mind-map designer and say which IDEs it runs in.

**Acceptance Scenarios**:

1. **Given** the catalogue overview, **When** a visitor opens it, **Then** they see every designer with its name, a one-line purpose, a thumbnail and its state per IDE host.
2. **Given** the overview, **When** a visitor wants to narrow it down, **Then** they can filter or group by focus area, by IDE host and by state.
3. **Given** a designer that is only identified or specified, **When** it is shown, **Then** it is visibly marked as not yet usable, and it has no screenshot presented as the product (constitution principle III).

---

### User Story 2 - See what a designer does (Priority: P1)

A visitor opens a designer's page and understands what task it is for, what it looks like and what it can do.

**Why this priority**: the pages are where a visitor decides to try a designer.

**Independent Test**: publish one designer page (the mind-map designer) and check that a visitor can describe what it does and what file it edits.

**Acceptance Scenarios**:

1. **Given** a designer page, **When** a visitor reads it, **Then** it states the task the designer is for, why a specialized visualization helps there, and the file format it reads and writes.
2. **Given** an implemented or prototype designer, **When** a visitor looks at the page, **Then** it shows at least one screenshot of the real designer, with a caption saying which IDE host and which version it was taken from.
3. **Given** a designer page, **When** a visitor looks for its notation's background, **Then** they find links to the notation's own theory or standard, where one exists.
4. **Given** a designer defined in DEDL, **When** a visitor looks for its definition, **Then** the page links to the definition and to the DEDL reference (spec 002).

---

### User Story 3 - Know where I can use it (Priority: P2)

A user sees, on a designer's page, in which IDE hosts it is available, in which state, and how to get it there.

**Why this priority**: the hosts do not move in step; a user needs this per host (constitution principle III).

**Independent Test**: for the mind-map designer, check the page's per-host states against the IDE repositories.

**Acceptance Scenarios**:

1. **Given** a designer page, **When** a user looks at availability, **Then** they see one entry per IDE host with its state and, where available, a link to install or build it.
2. **Given** a host where the designer does not exist, **When** it is listed, **Then** it says "not planned" or "planned", never omits the host silently.

---

### User Story 4 - Stay current (Priority: P2)

A maintainer changes a designer's state or retakes its screenshots in its source repository, runs the refresh procedure (spec 004), and the catalogue follows through a pull request.

**Why this priority**: a catalogue that lags behind the product misleads readers.

**Independent Test**: change one designer's state in its source, run the refresh, and see the change in the resulting pull request.

**Acceptance Scenarios**:

1. **Given** a designer's state changed in its source, **When** the refresh runs, **Then** the catalogue's overview and page both show the new state.
2. **Given** a screenshot retaken in its source, **When** the refresh runs, **Then** the page shows the new screenshot with its new source revision.
3. **Given** a catalogue entry, **When** a reader looks for its origin, **Then** the page shows which repository and revision each fact and screenshot came from.

### Edge Cases

- A designer exists in one host's repository under one name and in another host's under a different name: the catalogue shows one designer with both hosts, joined by its origin tag.
- A designer is removed or renamed in its source: its old page address leads to its new page, or to a page saying it was withdrawn.
- A screenshot in a source repository is missing or fails its size budget: the refresh reports it and keeps the previous image rather than publishing a broken one.
- A designer has no screenshot yet although it is implemented: the page says a screenshot is pending instead of showing a placeholder that looks like the product.
- Some diagram types in the standalone catalogue are candidates only (state "identified"): they appear in a separate "ideas" list below the catalogue, not in it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The catalogue MUST have an overview page listing every designer with its name, one-line purpose, thumbnail (where a screenshot exists), origin tag and state per IDE host.
- **FR-002**: The overview MUST let visitors filter or group by focus area, IDE host and state, and MUST show the full list with scripting disabled.
- **FR-003**: Every designer MUST have its own page with a stable address based on its origin tag.
- **FR-004**: A designer page MUST state the task it serves, why a specialized visualization helps there, and the file formats it reads and writes.
- **FR-005**: A designer page MUST show its state per IDE host (standalone, IntelliJ Platform, Visual Studio Code, Eclipse), using one shared set of states across the site.
- **FR-006**: A designer that is implemented or a prototype in any host MUST show at least one screenshot of the real product, captioned with the host and the source revision.
- **FR-007**: A designer that is not usable in any host MUST NOT show a screenshot presented as the product.
- **FR-008**: A designer page MUST link to its notation's theory or standard where one exists, and to its DEDL definition and the DEDL reference where it has one.
- **FR-009**: Every fact and image in the catalogue MUST record the source repository and revision it was taken from, and the page MUST show them.
- **FR-010**: The catalogue MUST be generated from its sources by the procedures of spec 004, not edited by hand on the site side.
- **FR-011**: A renamed or withdrawn designer's old address MUST lead to its new page or to a withdrawal notice.
- **FR-012**: Every screenshot MUST have alternative text that describes what it shows.
- **FR-013**: Images MUST be small enough that a designer page loads its images in under 1 MB in total.
- **FR-014**: Diagram types that are only identified in every host MUST appear in a separate "ideas" list below the catalogue, with name, origin tag and links to theory, and MUST NOT get a designer page.

### Key Entities

- **Designer**: one specialized diagram, designer or text editor, identified by its origin tag (for example `freeplane/mindmap`), with a name, purpose, focus areas, file formats and links to theory and definition.
- **Host availability**: the state of one designer in one IDE host, with the source repository and revision it was read from and an install link where available.
- **State**: one of a shared set (for example identified, specified, in progress, prototype, available), used for every designer and host.
- **Screenshot**: an image of a designer in one host, with a caption, alternative text, source repository and revision.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every designer that is implemented or a prototype in any host's repository appears in the catalogue; a comparison against the source catalogues finds none missing.
- **SC-002**: Every state shown in the catalogue matches its source at the recorded revision.
- **SC-003**: A visitor can find whether a designer exists for a named task and which IDEs it runs in within one minute of opening the site.
- **SC-004**: Every screenshot has alternative text and passes the size budget.

## Assumptions

- The standalone repository's `docs/diagrams.md` and `docs/screenshots/` are the first sources; the IntelliJ, VS Code and Eclipse repositories are added as they gain designers or a comparable catalogue.
- The origin tag (`<vendor>/<diagram-type>`) is the shared identity of a designer across hosts.
- The site's states are a mapping of each source's states; the mapping is defined in planning and applied by the procedures of spec 004.
- Screenshots are taken in their source repositories by their own capture procedures; this site only publishes them.
- Focus areas are the three of spec 001; a designer may belong to more than one, or to none yet.
