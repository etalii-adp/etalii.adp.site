# Feature Specification: Content Refresh Procedures

**Feature Branch**: `features/004-content-refresh-procedures`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description (clarified 2026-09-26: screenshots are imported, never retaken; procedures run on every source change as well as on request): "Agent formulated procedures for updating the screenshots and DEDL and other material."

## Context

Most of the site's documentation is taken from other repositories (constitution principle II): the DEDL specification, schema and examples from `etalii-adp/etalii.adp` (spec 002), the designer catalogue and screenshots from the IDE repositories (spec 003), and the IDE host states on the home page (spec 001). That material changes in its sources, and the site is only as current as its last refresh.

ADP is built largely by agents working through pull requests. This feature writes down, in this repository, a procedure for each kind of refresh that an agent can follow end to end: read the sources, update the site's copy, verify it, and open a pull request for a person to merge (constitution principle V). The procedures are written for agents first, and are equally followable by a person.

Roles: an **agent** runs a procedure; the **owner** (Peter) reviews and merges the pull request it opens; a **maintainer** writes or changes procedures.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Refresh the DEDL reference (Priority: P1)

An agent is asked to refresh the DEDL reference. It follows the written procedure, brings the site's reference up to the latest DEDL source, verifies it and opens a pull request that says what changed.

**Why this priority**: the DEDL reference is the site's most-read documentation and changes often while DEDL is a working draft.

**Independent Test**: change a sentence in the DEDL source, hand an agent only the procedure's name, and get a pull request whose diff contains that sentence and nothing unrelated.

**Acceptance Scenarios**:

1. **Given** the DEDL source has changed since the last refresh, **When** an agent follows the procedure, **Then** it opens one pull request that updates the reference to the new source revision.
2. **Given** the DEDL source has not changed, **When** an agent follows the procedure, **Then** it opens no pull request and reports that the reference is current.
3. **Given** a new DEDL version (not only new text), **When** the procedure runs, **Then** the new version is published beside the old one as spec 002 requires, and the pull request says so.
4. **Given** the procedure's pull request, **When** the owner reads it, **Then** it states the source revisions before and after, a summary of changed sections, and the result of every verification step.

---

### User Story 2 - Refresh screenshots (Priority: P1)

An agent is asked to refresh the screenshots. It follows the procedure, brings in every screenshot that changed in its source repository, checks each against its expectations and opens a pull request.

**Why this priority**: screenshots are the first thing a visitor looks at and the first thing to go out of date after a UI change.

**Independent Test**: replace one screenshot in a source repository, run the procedure, and get a pull request containing that image with its new source revision.

**Acceptance Scenarios**:

1. **Given** a screenshot changed in its source, **When** the procedure runs, **Then** the pull request contains the new image, its caption and its new source revision.
2. **Given** a screenshot that fails its size budget or its source's stated expectations, **When** the procedure runs, **Then** it keeps the previous image and lists the problem in the pull request.
3. **Given** a designer that became usable in a host but has no screenshot in that host's repository, **When** the procedure runs, **Then** it reports the gap rather than inventing an image.

---

### User Story 3 - Refresh the catalogue and host states (Priority: P2)

An agent is asked to refresh the designer catalogue and the IDE host states. It reads each source repository's catalogue and status, applies the site's state mapping, and opens a pull request.

**Why this priority**: states change less often than text but mislead most when stale (constitution principle III).

**Independent Test**: change one designer's state in the standalone catalogue, run the procedure, and see the change on its catalogue page and the overview in the pull request.

**Acceptance Scenarios**:

1. **Given** a designer's state changed in a source, **When** the procedure runs, **Then** the pull request updates that designer's page and the overview, and no other designer.
2. **Given** a source state that the site's mapping does not cover, **When** the procedure runs, **Then** it stops before opening a pull request and asks how to map it, offering the existing site states as options.
3. **Given** an IDE host whose repository gained its first designer, **When** the procedure runs, **Then** the host's state on the home page changes accordingly.

---

### User Story 4 - Run everything at once (Priority: P3)

An agent is asked to refresh the whole site. It runs every refresh procedure in turn and opens one pull request per procedure that found changes, so each can be reviewed on its own.

**Why this priority**: convenient, but each procedure is useful on its own.

**Independent Test**: change one item in each kind of source and get one pull request per kind.

**Acceptance Scenarios**:

1. **Given** changes in several kinds of source, **When** the agent runs the combined procedure, **Then** it opens one pull request per kind and a summary listing them.
2. **Given** one procedure fails, **When** the combined procedure runs, **Then** the others still complete and the summary names the failure.

---

### User Story 5 - Write a new procedure (Priority: P3)

A maintainer adds a new kind of sourced content to the site and writes its refresh procedure following the same shape as the existing ones.

**Why this priority**: new definition languages and hosts will come; the pattern must be repeatable.

**Independent Test**: a maintainer writes a procedure for a new source from the shared template, and an agent runs it successfully on the first try.

**Acceptance Scenarios**:

1. **Given** the procedures folder, **When** a maintainer adds a procedure, **Then** a template tells them which sections every procedure has.
2. **Given** a new procedure, **When** it is added, **Then** it is listed in the index of procedures with what it refreshes and from where.

### Edge Cases

- A source repository cannot be reached: the procedure stops, changes nothing, and reports which source failed.
- Two procedures would change the same page: each pull request contains only its own changes, and the second one is based on whatever `develop` holds when it runs.
- A pull request from an earlier run of the same procedure is still open: the procedure updates that pull request instead of opening a second one.
- The procedure's verification fails after the update (a broken link, an accessibility violation): it does not open a pull request as ready; it reports the failure with the output.
- A source removes content the site shows: the procedure removes it from the site and says so in the pull request, with the redirect or withdrawal notice specs 002 and 003 require.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: This repository MUST contain a written procedure for each kind of sourced content: the DEDL reference, the screenshots, the designer catalogue and the IDE host states.
- **FR-002**: Each procedure MUST be followable by an agent from start to finish without asking a person for steps; the only questions it asks are decisions a source cannot answer (such as an unmapped state), each offered as a selection with its options.
- **FR-003**: Each procedure MUST state its sources (repository and path), what it updates on the site, its verification steps and what its pull request contains.
- **FR-004**: Each procedure MUST end in a pull request into `develop` from a branch of its own, and MUST NOT change the published site directly.
- **FR-005**: Each procedure MUST record, for everything it brings in, the source repository and revision.
- **FR-006**: Each procedure MUST verify its result before opening the pull request: the site builds, internal links resolve, pages pass automated accessibility checks, and every sourced item carries its source and revision.
- **FR-007**: A procedure that finds nothing changed MUST open no pull request and report that the content is current.
- **FR-008**: A procedure MUST update its own open pull request from an earlier run instead of opening a second one.
- **FR-009**: A procedure's pull request MUST state the source revisions before and after, a summary of what changed, and each verification step's result.
- **FR-010**: A combined procedure MUST run all refresh procedures and open one pull request per procedure that found changes.
- **FR-011**: The procedures MUST share one template and be listed in one index stating what each refreshes and from where.
- **FR-012**: Procedures MUST be runnable on request by naming them to an agent, and MUST run by themselves whenever a source they read changes on its repository's `develop` branch.
- **FR-013**: The screenshot procedure MUST only publish screenshots already committed in the source repositories; it MUST NOT retake them.

### Key Entities

- **Procedure**: a written, step-by-step instruction for one kind of refresh, with its sources, targets, verification steps and pull-request contents.
- **Source**: a repository and path that owns a kind of content, read at a specific revision.
- **Source record**: the repository and revision a sourced item on the site was taken from.
- **Refresh run**: one execution of a procedure, ending in a pull request, a "nothing changed" report or a reported failure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An agent given only a procedure's name completes it without asking for steps, on each of the four procedures.
- **SC-002**: Every pull request a procedure opens passes the site's checks on its first run.
- **SC-003**: After a refresh is merged, every sourced item on the site matches its source at the recorded revision.
- **SC-004**: A change made in a source reaches an open pull request on this site in one procedure run, with no manual edits to the site's files.

## Assumptions

- The agent running a procedure has read access to every source repository and can push a branch and open a pull request in this one.
- Source repositories keep their content where the procedures say; when a source moves its content, the procedure is amended in the same way as any other change.
- Screenshots are produced in their source repositories by their own capture procedures (for example `docs/screenshots/capture.mjs` in the standalone repository); this site only publishes them.
- A change reaching a source's `develop` branch can start a run in this repository; how is a planning decision.
- The owner reviews and merges every pull request; no procedure merges its own.
