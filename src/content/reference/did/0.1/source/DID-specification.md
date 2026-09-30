# DID — Diagram Definition Language

**Specification, version 0.1 (Working Draft)**

|                           |                                                                                      |
|---------------------------|--------------------------------------------------------------------------------------|
| Date                      | 2026-09-29                                                                           |
| Definition schema         | `did.schema.json` (JSON Schema, draft 2020-12), `$defs/Definition`                   |
| Specification language    | DISL, the Diagram Specification Language, in [`../disl/`](../disl/DISL-specification.md) |
| Media types (provisional) | `application/vnd.did.definition+json`, `application/vnd.did.fragment+json`           |
| File extension            | `.did`                                                                               |

---

## Status of this document

This is a working draft. DID, the Diagram Definition Language, specifies how a diagram a user created is stored. It is complete enough to implement a conforming reader, writer and validator of stored diagrams together with [DISL](../disl/DISL-specification.md), but individual constructs may still change before version 1.0. Sections and paragraphs marked *(informative)* explain intent and give guidance; everything else is *normative*.

DID 0.1 continues the document format of the earlier combined format (DEDL became DISL and DID); section 11 lists the old identifiers that readers still accept. The abbreviation DID here always means ADP's Diagram Definition Language, not the W3C's Decentralized Identifiers.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY** and **OPTIONAL** are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they appear in bold capitals.

---

## Table of contents

1. [Introduction](#1-introduction)
2. [Serialization](#2-serialization)
3. [Logical structure](#3-logical-structure)
4. [Identifiers](#4-identifiers)
5. [View data and style overrides](#5-view-data-and-style-overrides)
6. [Ordering, precision and canonical form](#6-ordering-precision-and-canonical-form)
7. [Fragments](#7-fragments)
8. [Processing model](#8-processing-model)
9. [Conformance](#9-conformance)
10. [Example](#10-example)
11. [Deprecated aliases](#11-deprecated-aliases)
- [Appendix A — JSON Schema](#appendix-a--json-schema)
- [Appendix B — Glossary](#appendix-b--glossary)

---

## 1. Introduction

### 1.1 What DID is

Each kind of ADP tool has a specification language and a definition language. For diagrams they are DISL and DID. In DISL a **tool engineer** writes a **specification** (a `.dis` file): one diagram type, with its metamodel, coordinates, notation, toolbox, constraints, behavior, layout and persistence settings. The diagrams users then create of that type are stored as **definitions** in DID (`.did` files): the elements and relations a user added, their attribute values, and the view data of each diagram.

A DID definition is always read together with the specification it names in its `language` object. The specification says which types and attributes exist, how view data relates to the model, and which persistence settings apply (DISL section 11); this document says what the stored result looks like and how it is read and written.

"Document" stays the word for the content a user works on in a host; for a diagram, its stored form is a DID definition.

### 1.2 Relation to DISL *(informative)*

- A DID definition names its DISL specification in `language` (section 3).
- The specification's persistence layer (DISL section 11) configures how the definition is written: format, file split, identifiers, view data, ordering and precision.
- A runtime loads the specification, then reads and writes definitions with it (section 8).

The schema of DID references DISL's shared primitives (`QualifiedId`, `SemVer`, `Point`) by their absolute `$id` instead of copying them, so each is defined once.

---

## 2. Serialization

A DID definition is a JSON text (RFC 8259) encoded in UTF-8 without a byte-order mark, unless the specification's persistence settings choose another format (DISL 11.2), which encodes the same logical structure. Its top-level value MUST be an object. The file extension **SHOULD** be `.did`, unless the specification declares its own in `language.fileExtension`.

A definition **SHOULD** declare the schema it conforms to, and **MUST** declare the DID version it targets in the version key `did`, as `"major.minor"`:

```json
{
  "$schema": "https://etalii.net/adp/did/schema/0.1/did.schema.json#/$defs/Definition",
  "did": "0.1",
  "language": { "id": "org.example.statemachine", "version": "1.2.0" }
}
```

> The schema is published by the ADP website at `https://etalii.net/adp/did/schema/<version>/did.schema.json`.

A reader **MUST** refuse a definition with a higher major DID version than it supports and **SHOULD** warn for a higher minor version. The media type of a definition is `application/vnd.did.definition+json`, unless the specification declares another in `persistence.mediaType`.

Any object in a definition **MAY** contain properties whose names begin with `x-`. Readers **MUST** ignore extension properties they do not understand and **MUST** preserve them unchanged when rewriting a file (DISL 2.8).

---

## 3. Logical structure

Independently of format and file split, a definition has this logical structure (JSON Schema: `did.schema.json`, `$defs/Definition`):

```json
{
  "$schema": "https://etalii.net/adp/did/schema/0.1/did.schema.json#/$defs/Definition",
  "did": "0.1",
  "language": { "id": "org.example.statemachine", "version": "1.2.0" },
  "meta": {
    "createdAt": "2026-09-25T20:14:03Z",
    "modifiedAt": "2026-09-26T08:00:00Z",
    "generator": "Acme Diagrams 4.2"
  },
  "diagram": { "attributes": { "title": "Door controller" } },
  "elements": [
    { "id": "st_01J8Z3…", "type": "InitialState" },
    { "id": "st_01J8Z4…", "type": "State", "attributes": { "name": "Closed" } },
    { "id": "st_01J8Z5…", "type": "State", "attributes": { "name": "Open", "entryAction": "light.on()" } }
  ],
  "relations": [
    { "id": "tr_01J8Z6…", "type": "Transition", "source": "st_01J8Z4…", "target": "st_01J8Z5…",
      "attributes": { "trigger": "open" } }
  ],
  "views": [
    {
      "id": "v_main", "viewpoint": "main",
      "viewport": { "x": 0, "y": 0, "zoom": 1 },
      "nodes": {
        "st_01J8Z3…": { "x": 40,  "y": 60,  "w": 20,  "h": 20 },
        "st_01J8Z4…": { "x": 120, "y": 40,  "w": 120, "h": 60 },
        "st_01J8Z5…": { "x": 340, "y": 40,  "w": 120, "h": 60, "style": { "fill": "#EAF3DE" } }
      },
      "edges": {
        "tr_01J8Z6…": { "waypoints": [], "labels": { "trigger": { "dx": 0, "dy": -6 } } }
      }
    }
  ],
  "suppressions": [],
  "extensions": {}
}
```

**Element record** (`elements[]`):

| Property     | Type                       | Description                                                                                                                                       |
|--------------|----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`         | string                     | **Required**, unique within the definition.                                                                                                       |
| `type`       | string                     | **Required**, a concrete node type (qualified by import alias if imported).                                                                       |
| `attributes` | object                     | Stored attribute values (omitting unset and, if `omitDefaults`, default values). Attribute values follow DISL 4.2 representations; references are ids. |
| `parent`     | id                         | Containing element (omitted for top-level).                                                                                                       |
| `slot`       | string                     | Slot within the parent (DISL 4.8).                                                                                                                   |
| `order`      | int or string              | Position among siblings when `children.ordered` (fractional-index strings are RECOMMENDED for collaboration: `"a0"`, `"a0V"`).                    |
| `ports`      | `{id, type, attributes}`[] | Port instances. `type` is the port name (`"in"`).                                                                                                 |
| `x-*`        |                            | Extensions.                                                                                                                                       |

Nesting is expressed by `parent`, not by physical nesting, so moving an element between containers changes one line. Runtimes MAY offer a nested pretty-print as an alternative `layout: "nested"`, but the flat form is canonical.

**Relation record** (`relations[]`): `id`, `type`, `source`, `target` (element or port ids), `attributes`, `x-*`. A port id is written `"<elementId>#<portId>"` when port ids are only unique per element.

**View record** (`views[]`): one per diagram (a definition can hold several diagrams of the same model, one per viewpoint or several of one viewpoint).

| Property    | Type                       | Description                                                                                                                                               |
|-------------|----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`        | string                     | View id.                                                                                                                                                  |
| `viewpoint` | string                     | Viewpoint name.                                                                                                                                           |
| `name`      | string                     | Diagram name shown in tabs.                                                                                                                               |
| `viewport`  | `{x, y, zoom}`             | Last viewport, if `viewport` is in `view.store`.                                                                                                          |
| `nodes`     | map id → NodeView          | Placement of nodes in this view. Elements not listed are hidden in this view (unless the viewpoint auto-includes them, in which case layout places them). |
| `edges`     | map id → EdgeView          | Routing and label data.                                                                                                                                   |
| `viewOnly`  | `{id, type, attributes}`[] | View-only elements (notes, frames, images, free text) that belong to this view only.                                                                      |
| `guides`    | `{axis, value}`[]          | User guides.                                                                                                                                              |
| `settings`  | object                     | Per-view settings (grid visible, snapping on/off, theme mode).                                                                                            |

**NodeView**:

| Property          | Description                                                                                                                                                                                                    |
|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `x`, `y`          | Position in domain values of the placement's system (numbers, timestamps, band references). Omitted for bound or computed coordinates — **bound values live only in the model**, never duplicated in the view. |
| `w`, `h`          | Size in domain units (durations as ISO 8601 on time axes). Omitted when bound, computed or equal to the default (with `omitDefaults`).                                                                         |
| `x2`, `y2`        | When the placement uses `x2`/`y2` and they are free.                                                                                                                                                           |
| `angle`, `radius` | Polar placements.                                                                                                                                                                                              |
| `rotation`        | Degrees.                                                                                                                                                                                                       |
| `z`               | Integer z-order among siblings.                                                                                                                                                                                |
| `collapsed`       | bool.                                                                                                                                                                                                          |
| `pinned`          | bool (layout `respect: "pinned"`).                                                                                                                                                                             |
| `params`          | Shape parameter values adjusted by handles (DISL 6.8).                                                                                                                                                            |
| `labels`          | map label id → `{dx, dy}` offsets.                                                                                                                                                                             |
| `ports`           | map port id → `{side, position}`.                                                                                                                                                                              |
| `compartments`    | map id → `{collapsed}`.                                                                                                                                                                                        |
| `style`           | Style overrides, restricted to DISL's `view.styleOverrides`.                                                                                                                                                        |
| `hidden`          | bool — element placed but hidden.                                                                                                                                                                              |

**EdgeView**: `waypoints` (list of Points in domain values), `sourceAnchor`, `targetAnchor` (`[fx, fy]` fixed anchors), `controlPoints` (for bezier), `labels` (map id → `{at, dx, dy}`), `routing` (per-edge override if allowed), `style`, `z`, `hidden`.

`language` names the specification: `id` and `version` are **REQUIRED** and equal the specification's `language.id` and the `language.version` the definition was written with; `definition` (the URI of the `.dis` file) and `integrity` (its hash) are written when the specification's `persistence.definition.embed` is `"reference"` (DISL 11.8). The property keeps the name `definition` it had in the earlier format.

`meta` holds the metadata the specification lists in `persistence.metadata` (DISL 11.8). `diagram.attributes` holds the attributes of the diagram root element (DISL 4.1).

**Suppressions** of constraint problems are stored as `suppressions: [{constraint, element, reason, by, at}]`.

---

## 4. Identifiers

Every element, relation, port and view carries an `id` that is unique within the definition and matches the specification's `persistence.ids.pattern` (default `^[A-Za-z0-9_.:#-]{1,128}$`). New ids are generated as the specification's `persistence.ids` declares (DISL 11.5). Unless the specification sets `stable: false`, an id **MUST NOT** change once assigned. References between records (`parent`, relation `source` and `target`, reference-typed attributes, the keys of `nodes` and `edges` in a view) are ids.

---

## 5. View data and style overrides

A view stores only the kinds of view data the specification lists in `persistence.view.store` (DISL 11.6); anything else is recomputed on load, by layout or defaults. **Bound values live only in the model**: a coordinate bound to an attribute (DISL 5.8) is never duplicated in `NodeView`.

Style overrides are stored in `NodeView.style` and `EdgeView.style`, restricted to the style properties the specification's `persistence.view.styleOverrides` allows, and have the highest precedence when the notation is resolved (DISL 6.1). Resolved theme token values are never stored unless a user explicitly overrides a style.

---

## 6. Ordering, precision and canonical form

A writer orders records and keys, rounds numbers and writes timestamps as the specification's `persistence.ordering`, `omitDefaults`, `precision`, `timestamps` and `canonical` settings declare (DISL 11.7).

**Determinism requirement.** Given the same logical definition and specification, a conforming writer **MUST** produce byte-identical output. In particular: no volatile metadata unless listed in `metadata`; `modifiedAt` only changes when content changes; maps are written in the declared key order; floating-point values are rounded to `precision` then serialized per RFC 8785.

The persisted definition is the canonical form of a diagram; collaboration state (DISL 11.10) is a transport concern, and after a merge the definition is written canonically again.

---

## 7. Fragments

A **fragment** is part of a definition taken out of it: the elements, relations and view data a user copies to the clipboard (`behavior.clipboard.formats`, DISL 9.5) or exports with the export format `did-fragment` (DISL 11.11). Its media type is `application/vnd.did.fragment+json`. A fragment uses the records of section 3 and the rules of sections 4–6, and names its specification in `language` as a definition does. The layout of a fragment beyond that is not specified in DID 0.1.

---

## 8. Processing model

### 8.1 Loading a definition

1. Parse; read `language.id` and `language.version`. If the id differs from the specification's, refuse.
2. If the definition's language version is older, run the specification's **migrations** (DISL 11.9) on the raw structure.
3. Validate against `$defs/Definition` and the specification's metamodel (types exist, attributes typed, references resolvable).
4. Resolve view data; run layout for elements lacking view data if the specification's layout `trigger` is `onLoadIfMissing` or `always` (DISL 10).
5. Evaluate constraints with `live` timing; show problems.
6. Render.

A definition with a **newer** minor or patch language version than the loaded specification is opened with a warning; a newer major version is opened read-only or refused (DISL 11.9).

### 8.2 Unknown content

Elements of unknown types, unknown attributes and unknown view properties in a definition (for example written by a newer language version or a vendor extension) **MUST** be preserved on save. Unknown elements are shown as neutral placeholders ("Unknown element of type X") and reported by `std.typeExists` (DISL 8.7). Readers **MUST NOT** silently drop data.

### 8.3 Saving

1. Evaluate constraints with `save` timing, as DISL 14.5 describes.
2. Serialize the logical definition canonically (section 6).
3. Write files according to the specification's `files.mode` atomically (write to temporary file, then rename).

---

## 9. Conformance

| Class          | Requirements                                                                                                                                                                                                                    |
|----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Definition** | A definition is conforming to a specification if it validates against `$defs/Definition`, its elements conform to the specification's metamodel after migrations, and it is serialised as sections 3–6 and the specification's persistence settings prescribe. Constraint problems do not make a definition non-conforming. |
| **Reader**     | Implements 8.1 and 8.2, including the deprecated aliases of section 11.                                                                                                                                                        |
| **Writer**     | Implements 8.3 and the determinism requirement of section 6, and writes only the identifiers of this version, never a deprecated alias.                                                                                         |

---

## 10. Example

This definition was written with the timeline specification of DISL 17.2 (`timeline.dis`). Several things to notice:

- Elements are a flat list; relations are separate.
- All placement of tasks and milestones lives in the model (`start`, `end`, `assignee`). The view stores only a moved label and the viewport.
- References (`assignee`, relation ends) are plain ids.
- Unset attributes and defaults are omitted (`status` of *Build pages*, `lag` of most dependencies).

File `timeline.did`:

```json
{
  "$schema": "https://etalii.net/adp/did/schema/0.1/did.schema.json#/$defs/Definition",
  "did": "0.1",
  "language": { "id": "org.example.timeline", "version": "0.4.0" },
  "meta": { "createdAt": "2026-09-21T08:12:00Z", "modifiedAt": "2026-09-25T16:40:00Z", "generator": "Reference runtime 0.1" },
  "diagram": {
    "attributes": {
      "title": "Website relaunch",
      "projectStart": "2026-10-01",
      "projectEnd": "2026-12-18",
      "holidays": ["2026-10-03", "2026-12-24", "2026-12-25"]
    }
  },
  "elements": [
    { "id": "ms_01K5YZT2", "type": "Milestone",
      "attributes": { "title": "Go live", "start": "2026-12-01", "assignee": "res_01K5YX10" } },
    { "id": "res_01K5YX10", "type": "Resource", "attributes": { "name": "Design team" } },
    { "id": "res_01K5YX11", "type": "Resource", "attributes": { "name": "Frontend", "position": 1, "capacity": 2 } },
    { "id": "task_01K5YY01", "type": "Task",
      "attributes": { "title": "Wireframes", "start": "2026-10-01", "end": "2026-10-09",
                      "assignee": "res_01K5YX10", "status": "done", "progress": 1 } },
    { "id": "task_01K5YY02", "type": "Task",
      "attributes": { "title": "Visual design", "start": "2026-10-12", "end": "2026-10-30",
                      "assignee": "res_01K5YX10", "status": "active", "progress": 0.4 } },
    { "id": "task_01K5YY03", "type": "Task",
      "attributes": { "title": "Build pages", "start": "2026-11-03", "end": "2026-11-27",
                      "assignee": "res_01K5YX11" } }
  ],
  "relations": [
    { "id": "dep_01K5Z1A8", "type": "Dependency", "source": "task_01K5YY01", "target": "task_01K5YY02" },
    { "id": "dep_01K5Z1A9", "type": "Dependency", "source": "task_01K5YY02", "target": "task_01K5YY03",
      "attributes": { "lag": 1 } },
    { "id": "dep_01K5Z1B0", "type": "Dependency", "source": "task_01K5YY03", "target": "ms_01K5YZT2" }
  ],
  "views": [
    {
      "id": "v_schedule",
      "viewpoint": "main",
      "name": "Schedule",
      "viewport": { "x": 0, "y": 0, "zoom": 1 },
      "nodes": {
        "task_01K5YY02": { "labels": { "dates": { "dx": 4, "dy": 0 } } }
      },
      "edges": {}
    }
  ]
}
```

---

## 11. Deprecated aliases

DID 0.1 continues the document format of the earlier combined format: DEDL became DISL and DID, and what that format called a document is a DID definition. Readers of DID 0.x **MUST** accept the following identifiers of the earlier format, version 0.1, as deprecated aliases, read them as their DID form, and never write them:

| Deprecated alias                                                                     | DID 0.1                                                                  |
|--------------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| `$schema` `https://etalii.net/adp/dedl/schema/0.1/dedl.schema.json#/$defs/Document`  | `https://etalii.net/adp/did/schema/0.1/did.schema.json#/$defs/Definition` |
| media type `application/vnd.dedl.document+json`                                      | `application/vnd.did.definition+json`                                    |
| media type `application/vnd.dedl.fragment+json`                                      | `application/vnd.did.fragment+json`                                      |
| version key `"dedlDocument": "0.1"`                                                  | `"did": "0.1"`                                                           |
| export format `dedl-fragment`                                                        | `did-fragment`                                                           |

A definition carries exactly one of the two version keys; the schema accepts either and marks the old one `deprecated`. The aliases of a specification are listed in DISL section 18. The old schema address stays published unchanged, so files that name it keep validating. A legacy fixture in the earlier form, in `specifications/did/legacy/`, is validated through these aliases on every change to this repository. The aliases are removed no earlier than DID 1.0.

---

## Appendix A — JSON Schema

The normative JSON Schema is published as `did.schema.json` (JSON Schema draft 2020-12), `$id` `https://etalii.net/adp/did/schema/0.1/did.schema.json`. Its root, `#/$defs/Definition`, validates **definitions**, and every definition example validates against it.

| `$defs`          | Validates                                                                                   |
|------------------|---------------------------------------------------------------------------------------------|
| `Definition`     | A stored diagram (section 3).                                                               |
| `ElementRecord`  | An element record.                                                                          |
| `RelationRecord` | A relation record.                                                                          |
| `ViewRecord`     | A view record.                                                                              |
| `NodeView`       | The view data of a node.                                                                    |
| `EdgeView`       | The view data of an edge.                                                                   |

`QualifiedId`, `SemVer` and `Point` are referenced from `https://etalii.net/adp/disl/schema/0.1/disl.schema.json`. As in DISL, all objects forbid unknown properties except extension properties matching `^x-`. Rules that JSON Schema cannot express — conformance to the specification's metamodel, id uniqueness and resolvable references — are the job of a DID validator that has the specification loaded.

---

## Appendix B — Glossary

| Term               | Meaning                                                                                                        |
|--------------------|----------------------------------------------------------------------------------------------------------------|
| **Definition**     | A diagram a user created of a diagram type, stored as a `.did` file.                                           |
| **Document**       | The content a user works on in a host; for a diagram, its stored form is a definition.                         |
| **Fragment**       | Part of a definition, copied or exported (section 7).                                                          |
| **Runtime**        | Software in a host that loads a specification and lets users create and change definitions with it.            |
| **Specification**  | A DISL file (`.dis`) in which a tool engineer specifies one diagram type.                                      |
| **Tool engineer**  | The person who specifies a diagram type in DISL.                                                               |
| **View data**      | Per-diagram placement and presentation data stored separately from the model (section 5).                      |

Every other term is defined in DISL, Appendix C.
