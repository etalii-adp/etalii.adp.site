# Feature Specification: Terminology Page

**Feature Branch**: `features/005-terminology-page`
**Created**: 2026-09-28
**Status**: Draft
**Input**: "write the definitions down on a notion page and also express it on a web page in the document part of the portal" (Peter, 2026-09-28, for etalii.adp spec 002 "Naming convention alignment"); "Document this in notion, markdown and on the website" (Peter, 2026-09-28, on the specification and definition languages).

## Context

etalii.adp spec 002 fixes one vocabulary for ADP: every tool is a diagram, a designer or an editor; "tool" is the word for all three; DISL, DESL and EDSL are the specification languages and DIFL, DEFL and EDFL the definitions made with them. Its single source is `docs/terminology.md` in `etalii-adp/etalii.adp`, repeated on a Notion page and, by this feature, on the site. This feature only publishes the vocabulary; applying it to the rest of the site (the designers section, its URLs, the DEDL reference) is a later part of spec 002.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A visitor looks up what the words mean (Priority: P1)

A visitor opens the documentation part of the site and finds a Terminology page, linked from the documentation index. It says what a tool, a diagram, a designer and an editor are, with the test that tells them apart, and names the three specification languages and three definition formats with their file extensions.

**Why this priority**: it is the whole ask for the site.

**Independent Test**: open `/adp/docs/terminology/` from the documentation index and compare it with `docs/terminology.md` in etalii.adp.

**Acceptance Scenarios**:

1. **Given** the documentation index, **When** a visitor opens it, **Then** it links to the Terminology page.
2. **Given** the Terminology page, **When** it is compared with `docs/terminology.md` in etalii.adp, **Then** it states the same definitions and links to that file as the source.

## Requirements *(mandatory)*

- **FR-001**: The site **MUST** have a page at `/adp/docs/terminology/` in the documentation part, stating the kinds of tool with their tests, the specification languages and definitions with their extensions, the related terms, the retired uses and the exceptions, as in `docs/terminology.md` of etalii.adp.
- **FR-002**: The page **MUST** link to `docs/terminology.md` in etalii.adp as its source, and the documentation index **MUST** link to the page.
- **FR-003**: The site's existing checks **MUST** keep passing.

## Success Criteria *(mandatory)*

- **SC-001**: The page is reachable from the documentation index in one click, and the link checker reports no broken link.
- **SC-002**: Every definition on the page matches `docs/terminology.md` in etalii.adp in meaning.

## Assumptions

- The page lives in the existing `docs` section; no new navigation section is added.
- Renaming the rest of the site to the vocabulary is out of scope here and is planned in etalii.adp spec 002.
