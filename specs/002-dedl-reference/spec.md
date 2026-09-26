# Feature Specification: DEDL Reference

**Feature Branch**: `features/002-dedl-reference`

**Created**: 2026-09-26

**Status**: Draft

**Input**: User description (clarified 2026-09-26: the schema is served at its `$id`, `etalii.net/adp/dedl/schema/...`): "The DEDL specification rendered as browsable pages, generated from etalii.adp (2B)."

## Context

DEDL, the Diagram Editor Definition Language, is how an ADP designer is defined rather than coded. Its specification lives in `etalii-adp/etalii.adp` under `specifications/dedl/`: one long prose document (version 0.1, Working Draft, about five thousand lines in 17 sections and 4 appendices), a JSON Schema (`dedl.schema.json`) and example definitions and documents (`erd.dedl`, `statemachine.dedl`, `timeline.dedl`, `timeline.document.json`).

A designer author today has to read that material as raw files in a repository. This feature publishes it in the documentation part of the site (spec 001) as a reference they can browse, search, link into and cite by version, without the site ever becoming a second copy that drifts (constitution principle II).

Roles: a **designer author** writes DEDL definitions; an **implementer** builds a DEDL runtime in an IDE host; a **maintainer** refreshes the reference (spec 004).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read the specification section by section (Priority: P1)

A designer author opens the DEDL reference and reads the specification as a set of linked pages, one per section, with a table of contents always at hand.

**Why this priority**: a five-thousand-line document is hard to read as one file; this is the core of the feature.

**Independent Test**: publish the reference for the current DEDL version and navigate from the table of contents to every section and back.

**Acceptance Scenarios**:

1. **Given** the documentation part of the site, **When** an author opens the DEDL reference, **Then** they see its title, version, status (for example "0.1, Working Draft") and date, and a table of contents of every section and appendix.
2. **Given** any section page, **When** the author reads it, **Then** the text, tables, code samples and normative key words (**MUST**, **SHOULD** and the rest) appear exactly as in the source, with the key words still visibly distinguished.
3. **Given** any section page, **When** the author follows a cross-reference to another section, **Then** they land on that section at the referenced place.
4. **Given** any section page, **When** the author wants the next or previous section, **Then** they can move there directly.

---

### User Story 2 - Link to and cite an exact place (Priority: P1)

An implementer copies a link to a specific heading or paragraph and shares it; whoever opens it lands at that place in the same version of the specification.

**Why this priority**: implementers and reviewers discuss the spec by pointing at clauses; without stable links the reference cannot be cited.

**Independent Test**: copy the link of a subsection heading, open it in a new browser, and land on that subsection.

**Acceptance Scenarios**:

1. **Given** any heading, **When** the reader asks for its link, **Then** they get an address that opens the page scrolled to that heading.
2. **Given** a link to a heading in a published version, **When** a newer version is published later, **Then** the old link still opens the old version at that heading.
3. **Given** the reference, **When** a reader wants the latest version, **Then** a version-independent address always shows the most recently published version.

---

### User Story 3 - Get the schema and examples (Priority: P2)

A designer author or implementer downloads the JSON Schema and the example definitions, or points a validator or editor at the schema's address.

**Why this priority**: the schema and examples are what tooling consumes; the prose alone is not enough to build against.

**Independent Test**: fetch the schema from its published address with a JSON Schema validator and validate each published example definition against it.

**Acceptance Scenarios**:

1. **Given** the DEDL reference, **When** an author looks for the schema, **Then** they can view it and download it as the unchanged source file.
2. **Given** a published version, **When** a tool requests the schema at its published versioned address, **Then** it receives the exact source file, served as JSON.
3. **Given** the example definitions and documents, **When** the author opens one, **Then** they see it with its name and purpose, and can download it unchanged.

---

### User Story 4 - Know where it came from (Priority: P2)

Any reader sees, on every page of the reference, which version of DEDL it shows, which source revision it was generated from, and a link to that exact source.

**Why this priority**: constitution principle II; a reader must be able to trust that the page is the specification.

**Independent Test**: open any reference page, follow its source link, and find the same text at that revision in `etalii-adp/etalii.adp`.

**Acceptance Scenarios**:

1. **Given** any reference page, **When** the reader looks for its origin, **Then** they see the DEDL version, the source repository, the source revision and the date it was generated.
2. **Given** a reader who finds an error, **When** they want to report it, **Then** the page points them at the source repository, not at this site.

### Edge Cases

- The source adds, removes or renumbers a section: the next refresh reflects it, and links to a removed section in the latest version lead to a page saying where the content went or that it was removed.
- The source contains a construct the site cannot render faithfully (for example a complex table): the page shows the source text verbatim rather than a wrong rendering.
- Two versions of DEDL are published and one is superseded: the older one stays reachable and says clearly that a newer version exists.
- The source repository cannot be reached during a refresh: nothing is published and the previous reference stays as it was.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The DEDL reference MUST be generated from `specifications/dedl/` in `etalii-adp/etalii.adp`, never edited by hand on the site side.
- **FR-002**: The reference MUST present the specification as one page per top-level section and appendix, with a table of contents on every page.
- **FR-003**: Text, tables, code samples and normative key words MUST appear as in the source, with normative key words visibly distinguished.
- **FR-004**: Cross-references within the specification MUST become working links between pages.
- **FR-005**: Every heading MUST have a stable address that opens the page at that heading.
- **FR-006**: Each published DEDL version MUST have its own addresses, which stay valid after newer versions are published.
- **FR-007**: A version-independent address MUST always show the most recently published version.
- **FR-008**: Pages of a superseded version MUST say that a newer version exists and link to it.
- **FR-009**: The JSON Schema MUST be published unchanged, and served as JSON, at the address its own `$id` names: `https://etalii.net/adp/dedl/schema/<version>/dedl.schema.json` (moved there in `etalii-adp/etalii.adp` on 2026-09-26).
- **FR-010**: Every example definition and document in the source MUST be published unchanged, viewable and downloadable, with its name.
- **FR-011**: Every reference page MUST show the DEDL version, the source repository, the source revision, the generation date, and a link to the source at that revision.
- **FR-012**: A construct that cannot be rendered faithfully MUST be shown as verbatim source text.
- **FR-013**: A refresh that cannot read the source MUST publish nothing and leave the current reference unchanged.
- **FR-014**: The reference MUST be searchable by word across all its pages. Search MAY require scripting; the pages themselves MUST NOT (constitution principle IV).
- **FR-015**: The reference MUST state the licence of the specification material, as given by its source repository.

### Key Entities

- **DEDL version**: a published edition of the specification, with a version number, a status (for example Working Draft), a date and a source revision.
- **Section**: a top-level part of the specification or an appendix, with a number, a title and headings inside it.
- **Schema**: the JSON Schema file for one DEDL version.
- **Example**: a definition or document file shipped with the specification, with a name and the DEDL version it belongs to.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Every section and appendix of the current DEDL source appears in the reference; a comparison of source and published headings finds none missing.
- **SC-002**: Every cross-reference in the published reference resolves; the link check reports zero broken links.
- **SC-003**: Every published example definition validates against the published schema of its version.
- **SC-004**: A link to a heading, taken before a newer version is published, still opens that heading afterwards.
- **SC-005**: A designer author can go from the site's home page to any named DEDL section in under thirty seconds.

## Assumptions

- The DEDL source keeps its current shape: one prose document in Markdown, one JSON Schema and example files in one folder per specification. A change to that shape is handled by amending this spec.
- Other definition languages specified later in `etalii-adp/etalii.adp` follow the same pattern and can be added to the reference without a new mechanism; adding them is a separate specification.
- `etalii-adp/etalii.adp` is public, so the site's build can read it without credentials.
- Refreshing the reference when the source changes is defined by spec 004.
- The licence of the specification material is whatever `etalii-adp/etalii.adp` states; it has no licence file yet, which the source repository must resolve before the first publish.
