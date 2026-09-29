# DISL — Diagram Specification Language

**Specification, version 0.1 (Working Draft)**

|                           |                                                                              |
|---------------------------|------------------------------------------------------------------------------|
| Date                      | 2026-09-29                                                                   |
| Specification schema      | `disl.schema.json` (JSON Schema, draft 2020-12), `$defs/Specification`       |
| Definition language       | DID, the Diagram Definition Language, in [`../did/`](../did/DID-specification.md) |
| Expression language       | CEL — Common Expression Language (https://cel.dev)                           |
| Media type (provisional)  | `application/vnd.disl.specification+json`                                    |
| File extension            | `.disl`                                                                      |

---

## Status of this document

This is a working draft. It is complete enough to implement a conforming validator, a documentation generator and a reference runtime, but individual constructs may still change before version 1.0. DISL 0.1 continues the earlier combined format (DEDL became DISL and DID); section 18 lists the old identifiers that runtimes still read. Sections and paragraphs marked *(informative)* explain intent and give guidance; everything else is *normative*.

The key words **MUST**, **MUST NOT**, **REQUIRED**, **SHALL**, **SHALL NOT**, **SHOULD**, **SHOULD NOT**, **RECOMMENDED**, **MAY** and **OPTIONAL** are to be interpreted as described in RFC 2119 and RFC 8174 when, and only when, they appear in bold capitals.

---

## Table of contents

1. [Introduction](#1-introduction)
2. [Foundations](#2-foundations)
3. [Specification structure, layers and viewpoints](#3-specification-structure-layers-and-viewpoints)
4. [Layer 1 — Metamodel](#4-layer-1--metamodel)
5. [Layer 2 — Coordinate systems, placement and snapping](#5-layer-2--coordinate-systems-placement-and-snapping)
6. [Layer 3 — Notation (visual definition)](#6-layer-3--notation-visual-definition)
7. [Layer 4 — Toolbox, context tools and forms](#7-layer-4--toolbox-context-tools-and-forms)
8. [Layer 5 — Constraints](#8-layer-5--constraints)
9. [Layer 6 — Behavior](#9-layer-6--behavior)
10. [Layer 7 — Layout](#10-layer-7--layout)
11. [Layer 8 — Persistence](#11-layer-8--persistence)
12. [The CEL environment](#12-the-cel-environment)
13. [Extensions and plugins](#13-extensions-and-plugins)
14. [Processing model](#14-processing-model)
15. [Conformance](#15-conformance)
16. [Security, privacy and robustness](#16-security-privacy-and-robustness)
17. [Complete examples](#17-complete-examples)
18. [Deprecated aliases](#18-deprecated-aliases)
- [Appendix A — JSON Schema](#appendix-a--json-schema)
- [Appendix B — Built-in catalogues](#appendix-b--built-in-catalogues)
- [Appendix C — Glossary](#appendix-c--glossary)
- [Appendix D — Design rationale and open questions](#appendix-d--design-rationale-and-open-questions)

---

## 1. Introduction

### 1.1 What DISL is

DISL (Diagram Specification Language) is a declarative, JSON-based language in which a **tool engineer** specifies a **diagram type** — not individual diagrams, but the *kind* of diagram people can draw, and everything a runtime needs in order to support it:

- **what** can appear in a diagram: element types, their attributes, containment and relationships (*metamodel*);
- **where** things can be placed: coordinate systems whose axes may be numeric, temporal (dates and timestamps) or categorical, how element positions relate to model data, and the snapping rules that make positions discrete on one axis, the other, or both (*coordinates*);
- **how** everything looks: shapes from elementary primitives to finely parameterised paths and composites, labels, compartments, embedded form widgets, and edges with arbitrary line styles, arrowheads and labels at their start, middle and end (*notation*);
- **which tools** users get: toolbox groups, context tools, templates and property forms (*toolbox and forms*);
- **what is allowed**: rules written in CEL, with severities, messages, quick fixes and the choice between preventing a gesture and flagging a problem afterwards (*constraints*);
- **what happens** when users act: hooks and operations (*behavior*);
- **how** diagrams are arranged automatically (*layout*);
- and **how** a diagram is stored: format, identifiers, file split, ordering, precision, migrations and collaboration (*persistence*). The stored diagrams themselves are DID definitions, specified by DID, the Diagram Definition Language ([DID-specification.md](../did/DID-specification.md)).

A single DISL file — a **specification** — is a complete, portable, machine-validated description of a diagram type: a visual language and how it is worked with. Every aspect of it may carry human-readable documentation, so a specification doubles as the reference manual of its language and as the source of help texts inside the runtime.

### 1.2 How DISL is intended to be used *(informative)*

DISL sits between the tool engineers who specify a diagram type and the software that lets others use it.

```
 ┌────────────────────────┐        ┌─────────────────────────┐        ┌────────────────────────┐
 │ Tool engineer          │ writes │ DISL specification      │ loads  │ Runtime                │
 │ (domain expert, tool   │───────▶│ my-lang.disl            │───────▶│ (web, desktop, IDE,    │
 │  builder, standards    │        │ checked by JSON Schema  │        │  headless)             │
 │  body, AI assistant)   │        │ + CEL type checker      │        │ toolbox, canvas, forms │
 └────────────────────────┘        └────────────┬────────────┘        │ snapping, rules, save  │
                                                │                     └───────────┬────────────┘
                                                │ feeds                           │ reads / writes
                                   ┌────────────▼────────────┐        ┌───────────▼────────────┐
                                   │ Docs & code generators, │        │ DID definitions        │
                                   │ CI validators, format   │        │ (the diagrams users    │
                                   │ converters, AI context  │        │  draw), deterministic, │
                                   └─────────────────────────┘        │  versioned, migrated   │
                                                                      └────────────────────────┘
```

A typical workflow:

1. **Write a specification.** A tool engineer writes `my-lang.disl` by hand with IDE support from the JSON Schema (validation, completion, hover help), or generates it from an existing source such as a class model, an ontology or an older tool configuration. Specifications can import shared libraries of shapes, markers, styles and types (section 3.3).
2. **Validate it.** A validator checks the specification against the JSON Schema, resolves names and imports, flattens inheritance, and type-checks every CEL expression in the context in which it will be evaluated (section 12). Problems are reported with the JSON Pointer of the offending node.
3. **Load it into a runtime.** A conforming runtime needs no language-specific code: palette, canvas, rendering, snapping, property forms, validation and saving all come from the specification. Whatever the declarative core cannot express is delegated to named, versioned plugins (section 13) rather than to embedded scripts.
4. **Draw.** End users create diagrams of the type, stored as **DID definitions**, that conform to the specification. The runtime surfaces the specification's documentation as tooltips, field help, problem explanations and a help view, so users learn the language while using it.
5. **Persist and evolve.** DID definitions are written exactly as the persistence layer prescribes, so they are deterministic, diff-friendly and readable by any other conforming runtime. When the language evolves, declared migrations upgrade old DID definitions automatically.

The same specification serves other consumers too:

- **documentation generators** that render a language reference with rendered samples of every shape;
- **code generators** that produce typed APIs, database schemas or JSON Schemas for DID definitions;
- **headless validators** in CI pipelines that check DID definitions without drawing them;
- **converters** to and from other formats (BPMN DI, draw.io, Ecore, SVG, PlantUML);
- **AI assistants** that read the specification to understand what a diagram may contain, which rules apply and how to produce a valid DID definition.

### 1.3 Who should read what *(informative)*

| Reader                         | Most relevant sections           |
|--------------------------------|----------------------------------|
| Tool engineers                 | 1–11, 17, Appendix B             |
| Runtime implementers           | All, especially 5, 6, 12, 14, 15; DID |
| Converter and generator makers | 3, 4, 11, 12, Appendix A, DID    |
| Reviewers and standards bodies | 1, 14–16, Appendix D             |

### 1.4 Design principles

1. **Declarative first, escape hatches second.** The common 90 % of diagram types must be expressible without code. The remaining 10 % is reached through named plugins with declared parameters, never through embedded general-purpose scripts.
2. **Layered separation of concerns.** Each layer answers one question and can be read, reviewed, reused and replaced independently. Meaning (metamodel) is strictly separated from appearance (notation) and from placement (view data).
3. **One expression language.** Every dynamic value — label text, visibility, conditional styles, geometry of custom shapes, marker choice, constraint rules, default values, snapping functions, placement bindings — is a CEL expression. CEL is side-effect free, non-Turing-complete, guaranteed to terminate, statically typable, and has mature implementations in Go, Java, C++, JavaScript/TypeScript, Python, Rust and .NET.
4. **Self-describing.** Every object may carry a `doc`. Documentation is part of the language, not an afterthought, and runtimes are expected to show it to users.
5. **Domain-true coordinates.** Positions are stored in the units of their axis — pixels, millimetres, timestamps, category identifiers — never only in screen pixels, so stored diagrams keep their meaning when zoom level, scale or renderer change.
6. **Deterministic persistence.** Two conforming runtimes saving the same diagram with the same specification MUST produce byte-identical output.
7. **Extensible without forking.** Vendor extensions live under `x-` keys and plugin names; unknown extensions are ignored, never fatal, and are preserved on round trips.
8. **Progressive complexity.** Every construct has a shorthand for the simple case (`"shape": "ellipse"`) and a full object form for fine control (`"shape": {"type": "ellipse", "params": {...}}`). A usable diagram type needs fewer than fifty lines of DISL.

### 1.5 Non-goals

- DISL is not a general-purpose UI framework. It specifies diagram types, including forms embedded in diagram elements and property inspectors, but not arbitrary application screens.
- DISL does not prescribe a rendering technology. SVG, Canvas 2D, WebGL, native toolkits and print pipelines are all valid targets.
- DISL does not define execution or simulation semantics of the modelled language (for example, how a state machine runs). Such information MAY be carried in extensions.
- DID definitions are not a lingua franca for unrelated software; a DID definition is always interpreted relative to its specification.

### 1.6 Relation to prior art *(informative)*

DISL deliberately borrows proven ideas:

| Source                           | Idea adopted                                                                  |
|----------------------------------|-------------------------------------------------------------------------------|
| Eclipse Sirius, GMF              | Split into model, graphical, tooling and mapping definitions; viewpoints      |
| MetaEdit+ (GOPPRR)               | Small, closed meta-metamodel of objects, relationships, ports and properties  |
| OMG Diagram Definition, BPMN DI  | Strict separation of semantic model and diagram interchange data              |
| GLSP, Sprotty                    | Runtime-agnostic, client/server-friendly diagram description                  |
| SVG, CSS                         | Paint, stroke, dash, marker and text vocabulary; cascading styles and states  |
| draw.io / mxGraph                | Parameter handles on shapes; jump-overs; rich marker catalogue                |
| Vega-Lite, D3 scales             | Axes as scales from domain values (numbers, time, categories) to screen space |
| ELK                              | Layout algorithm catalogue and option pass-through                            |
| CEL, Kubernetes validation rules | Safe, typed expressions for validation and computed values                    |
| JSON Schema                      | Machine-checkable structure and IDE tooling                                   |
| Yjs, Automerge                   | CRDT-based collaboration hooks                                                |

---

## 2. Foundations

### 2.1 Serialization

A DISL specification is a JSON text (RFC 8259) encoded in UTF-8 without a byte-order mark. Its top-level value MUST be an object. The file extension **SHOULD** be `.disl`.

A specification **SHOULD** declare the schema it conforms to, and MUST declare the DISL version it targets:

```json
{
  "$schema": "https://etalii.net/adp/disl/schema/0.1/disl.schema.json#/$defs/Specification",
  "disl": "0.1",
  "language": { "id": "org.example.statemachine", "version": "1.0.0" },
  "metamodel": { "types": {} }
}
```

> The schema is published by the ADP website at `https://etalii.net/adp/disl/schema/<version>/disl.schema.json`.

Tools MAY accept YAML or JSON5 input for authoring convenience and convert it to JSON before processing, but the normative form is JSON. Because JSON has no comments, explanations belong in `doc` objects (section 2.4), which has the side effect that they reach end users.

Duplicate keys within one JSON object are a specification error. Property order in specifications carries no meaning except where this specification says so explicitly (arrays are always ordered; the order of toolbox groups, form fields, labels and constraints is significant).

### 2.2 Identifiers

Identifiers name types, attributes, styles, shapes, tools, constraints and all other named objects.

- A **simple identifier** matches `^[A-Za-z_][A-Za-z0-9_]*$`. Type names, attribute names, parameter names, port names and function names MUST be simple identifiers so that they are valid CEL identifiers.
- A **qualified identifier** matches `^[A-Za-z_][A-Za-z0-9_-]*(\.[A-Za-z_][A-Za-z0-9_-]*)*$` and is used for language IDs, theme tokens (`color.surface`), names from imports (`std.cylinder`) and plugin names.
- Identifiers are case-sensitive. Two identifiers in the same namespace MUST NOT differ only in case, to keep specifications and DID definitions portable across case-insensitive systems.
- Where an object is stored in a map, the map key is its identifier. Where it is stored in an array, it carries an `id` property.

**Namespaces.** Each of the following is a separate namespace: types (node types and relation types share one namespace), enums and data types (share one namespace, which must also not clash with types), axes, coordinate systems, snapping profiles, styles, shapes, markers, icons, forms, tools, templates, constraints, operations, functions, layouts and viewpoints. Imported specifications contribute names prefixed with their alias (`alias.Name`).

**Reserved names.** The following MUST NOT be used as attribute names, because they are built-in fields of elements in CEL (section 12.2): `id`, `type`, `kind`, `parent`, `children`, `descendants`, `ancestors`, `incoming`, `outgoing`, `source`, `target`, `sourcePort`, `targetPort`, `ports`, `owner`, `view`, `diagram`, `self`, `value`, `item`, `index`, `env`, `old`, `event`, and any name beginning with `_` or `$`. CEL keywords (`in`, `as`, `break`, `const`, `continue`, `else`, `for`, `function`, `if`, `import`, `let`, `loop`, `package`, `namespace`, `return`, `var`, `void`, `while`, `true`, `false`, `null`) are also excluded.

### 2.3 Localized text

Any human-facing string (labels, messages, descriptions, placeholders) is a **LocalizedText**: either a plain string or an object mapping BCP 47 language tags to strings.

```json
{
  "label": "State",
  "label": { "en": "State", "de": "Zustand", "nl": "Toestand" }
}
```

When a map is given, it **SHOULD** include the locale declared in `language.defaultLocale` (default `"en"`). Runtimes select the best match for the user's locale (RFC 4647 lookup) and fall back to the default locale, then to the first entry in the map.

Where a human-facing string must contain computed values (constraint messages, dynamic tooltips), the object form `{ "cel": "..." }` returning a `string` (or a `map(string, string)` keyed by locale) is used instead. DISL deliberately has no second template syntax.

### 2.4 Documentation objects

Every object in a specification MAY carry a `doc` property — the language itself, types, attributes, enum values, data types, axes, coordinate systems, snapping rules, styles, shapes, shape parameters, handles, markers, node and edge notations, labels, compartments, forms, fields, tool groups, tools, templates, constraints, hooks, operations, layouts, persistence settings and migrations. This is the mechanism that keeps users informed: a runtime can explain any element, field, tool, rule or snapping behavior it presents.

`doc` is either a LocalizedText (shorthand for `summary`) or a **Doc** object:

| Property      | Type                                         | Meaning                                                                                                                                        |
|---------------|----------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| `summary`     | LocalizedText                                | One sentence of plain text. Used for tooltips, palette entries and hover cards.                                                                |
| `description` | LocalizedText                                | Longer explanation in CommonMark. Used in help panels, inspector help and generated reference docs.                                            |
| `rationale`   | LocalizedText                                | Why this rule or design exists. Particularly useful on constraints and snapping rules.                                                         |
| `examples`    | array of `{title, description, value}`       | Illustrations; `value` is arbitrary JSON (for example a sample attribute value).                                                               |
| `seeAlso`     | array of `{title, href}`                     | Links. External links are absolute URIs; internal links are JSON Pointer fragments into the specification (`#/metamodel/relations/Transition`). |
| `tags`        | array of strings                             | Keywords; used by toolbox search and documentation indexes.                                                                                    |
| `audience`    | array of `"user"`, `"author"`, `"developer"` | Intended readers; `"author"` means the tool engineer. Absent means all. Runtimes SHOULD show only `user` documentation to end users when an audience is declared. |
| `since`       | string                                       | Language version (SemVer) in which the object appeared.                                                                                        |
| `deprecated`  | boolean or `{since, message, replacedBy}`    | Marks the object deprecated. Runtimes SHOULD warn when a deprecated type, attribute or tool is used and MAY offer `replacedBy` as a quick fix. |
| `image`       | string (URI)                                 | An illustration, for example a rendered sample.                                                                                                |
| `helpUrl`     | string (URI)                                 | A page with extended help; runtimes SHOULD render a "Learn more" link.                                                                         |

```json
{
  "doc": {
    "summary": "A condition the system can be in.",
    "description": "A **state** is a stable situation in which the system waits for a trigger.\n\nStates may declare an *entry action* that runs each time the state is entered.",
    "tags": ["behavior", "core"],
    "seeAlso": [{ "title": "Transitions", "href": "#/metamodel/relations/Transition" }]
  }
}
```

**Documentation surfaces.** A conforming runtime at level *Standard* or above (section 15) **SHOULD**:

- show a tool's `doc.summary` as its tooltip, and match `label`, `doc.summary` and `doc.tags` in toolbox search;
- show an attribute's or field's `doc.summary` beneath or beside the form field, and `doc.description` on demand;
- show a constraint's `label`, `doc.summary` and `doc.rationale` alongside every problem it reports, and list its quick fixes;
- show the `doc` of axes, coordinate systems and snapping rules in canvas settings, ruler tooltips or a status bar while dragging (for example "Snapping to working days: tasks start at the beginning of a working day");
- show a node or edge type's `doc` in a hover card on the canvas when a help mode is active;
- offer a help view that renders the whole specification's documentation, including rendered samples of shapes and markers.

A **label** is distinct from `doc`: it is the short display name of an object (for example `"Initial state"` for the type `InitialState`). If `label` is absent, runtimes derive one from the identifier by splitting camel case and snake case and capitalising the first word only (`InitialState` → "Initial state", `due_date` → "Due date").

### 2.5 Expressions and dynamic values

All dynamic values are written in CEL. DISL uses four embeddings, and this document states for every property which one applies.

**(a) Expression.** A property of type *Expression* always contains CEL. It is written either as a bare string or as an object that adds documentation and an expected result type:

```json
{
  "rule": "self.name != ''",
  "rule": { "cel": "self.name != ''", "resultType": "bool", "doc": "Every state needs a name." }
}
```

If `resultType` is present, validators MUST check that the static type of the expression is assignable to it.

**(b) Bindable value.** A property of type *Bindable&lt;T&gt;* accepts a literal of type T or one of these objects:

| Form                      | Meaning                                                                                                                                                                                                                                         |
|---------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `{ "cel": "…" }`          | Computed from a CEL expression.                                                                                                                                                                                                                 |
| `{ "attribute": "path" }` | The value of an attribute of the current element (dotted path into structs, for example `"address.city"`). When the property is user-editable (a label, a placement coordinate), the binding is **two-way**: edits write back to the attribute. |
| `{ "token": "name" }`     | A theme token (section 6.2), resolved for the current theme mode.                                                                                                                                                                               |
| `{ "param": "name" }`     | A parameter of the enclosing shape, marker or template.                                                                                                                                                                                         |

Because literals may be strings, **a bare string in a Bindable position is always a literal**; a CEL expression there MUST use the `{"cel": …}` form.

**(c) Geometry expression.** In shape paths, handle positions and part bounds (section 6.8), a coordinate is a *GeomExpr*: a number (canvas units), a percentage string (`"50%"` of the relevant dimension), or any other string, which is CEL returning `double` or `int`. Geometry is so dense with expressions that the shorter form pays for itself.

**(d) Action expression.** In behavior actions, template fragments and migration steps (sections 7.4, 9 and 11.9), **every value position is an Expression**, so strings are always CEL. A string literal is therefore written with CEL quotes: `"'Untitled'"`. The exceptions are keywords and names that the schema restricts to fixed values or identifiers — `as`, `call`, `plugin`, `severity`, `algorithm`, `form`, `label` (label id) — which are never CEL.

**Evaluation guarantees.** Expressions are free of side effects by construction. Runtimes MUST impose a cost limit using CEL's cost estimation, and SHOULD reject at validation time any expression whose worst-case estimated cost exceeds the limit declared in `language.limits.celCost` (default 1 000 000). At run time, an expression that fails (for example division by zero, missing key, cost exceeded) is handled according to its context:

| Context                            | On evaluation error                                                                                                      |
|------------------------------------|--------------------------------------------------------------------------------------------------------------------------|
| Constraint rule                    | Reported as a problem with the constraint's severity and the message "could not be evaluated: …"; never silently passes. |
| Visual property, label, visibility | The property falls back to its default; a diagnostic is logged; rendering continues.                                     |
| Placement binding                  | The element is drawn at its last valid position and marked as invalid.                                                   |
| Snapping function                  | The unsnapped value is used.                                                                                             |
| Behavior action, hook, operation   | The whole transaction is rolled back and the error reported to the user.                                                 |
| Migration                          | Loading the DID definition fails with a descriptive error; the original file is left untouched.                          |

**Static checking.** Every expression is evaluated in a well-defined *context* that determines which variables exist and what types they have (section 12.3). Validators MUST type-check every expression in its context, using attribute types from the metamodel. Expressions whose type cannot be determined statically (for example because they use `dyn`) are permitted but SHOULD produce a validator warning.

### 2.6 Values and units

| Kind          | Representation                                                                                                                                                                                                                                                                              |
|---------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Canvas length | A number in canvas units (the unit of the coordinate system's numeric axis, `px` by default), or a string with an explicit unit: `"12px"`, `"4mm"`, `"0.5in"`, `"1.5em"`, `"50%"`. Percentages refer to the containing box's corresponding dimension. `em` refers to the current font size. |
| Screen length | Quantities that must stay constant on screen regardless of zoom — hit areas, snap tolerances, handle sizes, minimum marker sizes — are always in screen pixels and the property name ends in `ScreenPx`.                                                                                    |
| Color         | A CSS Color Level 4 string: `"#1D9E75"`, `"#1D9E75CC"`, `"rgb(29 158 117 / 80%)"`, `"hsl(160 69% 37%)"`, `"oklch(0.62 0.12 165)"`, named colors, `"transparent"`, `"currentColor"` (the resolved text color of the element).                                                                |
| Angle         | A number of degrees, clockwise, 0 pointing in the positive x direction.                                                                                                                                                                                                                     |
| Fraction      | A number from 0 to 1 inclusive.                                                                                                                                                                                                                                                             |
| Size          | `[width, height]`.                                                                                                                                                                                                                                                                          |
| Insets        | A number (all sides), `[vertical, horizontal]` or `[top, right, bottom, left]`.                                                                                                                                                                                                             |
| Point         | `[x, y]` for numeric axes, or `{"x": …, "y": …}` when axis values are timestamps or categories.                                                                                                                                                                                             |
| Timestamp     | An RFC 3339 string (`"2026-10-01T09:00:00Z"`), a full-date string (`"2026-10-01"`) or an epoch number, as declared by the axis (section 5.4).                                                                                                                                               |
| Duration      | An ISO 8601 duration (`"P3D"`, `"PT15M"`, `"P1W"`) or a CEL duration string (`"15m"`, `"36h"`). Calendar durations (`P1M`, `P1Y`) are only allowed where the property explicitly accepts calendar units, such as time snapping.                                                             |

### 2.7 References

- **Type references** are identifiers from the type namespace, optionally prefixed with an import alias (`bpmn.Task`). Wherever a single type is expected, a list of types MAY be given where the schema allows it; a type reference always includes all subtypes.
- **Library references** — to styles, shapes, markers, icons, forms, tools, snapping profiles — are identifiers of entries in the respective library, or an inline object of the same kind.
- **JSON Pointer references** (`"#/notation/styles/base"`) are used in `doc.seeAlso` and in error reports.
- A reference to an undefined name is a specification error. A reference to a deprecated object is a validator warning.

### 2.8 Extension properties

Any object in a specification or DID definition MAY contain properties whose names begin with `x-` (for example `x-acme-simulation`). Their content is unconstrained. Conforming tools MUST ignore extension properties they do not understand and MUST preserve them unchanged when rewriting a file. Section 13 describes plugins, the structured way to add behavior.

### 2.9 Versioning

- `disl` (required) is the version of DISL the specification targets, as `"major.minor"`. A runtime MUST refuse a specification with a higher major version than it supports and SHOULD warn for a higher minor version. The deprecated alias of section 18 is still read.
- `language.version` (required) is the semantic version (SemVer 2.0.0) of the defined language. DID definitions record the language version they were written with; this drives migrations (section 11.9).
- A change that can make previously valid DID definitions invalid or change their meaning is a **major** change; adding optional constructs is a **minor** change; documentation, visual and toolbox-only changes are **patch** changes. Validators MAY warn when a version increment does not match the observed difference to a previous specification.


---

## 3. Specification structure, layers and viewpoints

### 3.1 Top-level object

| Property      | Type            | Req. | Layer | Description                                                                                                          |
|---------------|-----------------|------|-------|----------------------------------------------------------------------------------------------------------------------|
| `$schema`     | string          | –    | –     | URI of the DISL JSON Schema.                                                                                         |
| `disl`        | string          | ✓   | –     | Targeted DISL version, `"0.1"`.                                                                                      |
| `language`    | Language        | ✓   | –     | Identity, version, locales and limits (3.2).                                                                         |
| `imports`     | Import[]        | –    | –     | Reused specifications and libraries (3.3).                                                                            |
| `functions`   | map → Function  | –    | –     | Reusable CEL functions (3.4).                                                                                        |
| `metamodel`   | Metamodel       | ✓   | 1     | What can exist (section 4).                                                                                          |
| `coordinates` | Coordinates     | –    | 2     | Axes, coordinate systems, snapping (section 5). Default: one free cartesian pixel system without snapping.           |
| `notation`    | Notation        | –    | 3     | How things look (section 6). Default: every node a labelled rectangle, every relation a straight line with an arrow. |
| `toolbox`     | Toolbox         | –    | 4     | Palette and context tools (7.1–7.4). Default: one tool per concrete type.                                            |
| `forms`       | map → Form      | –    | 4     | Property and embedded forms (7.5). Default: generated from attributes.                                               |
| `constraints` | Constraints     | –    | 5     | Rules (section 8).                                                                                                   |
| `behavior`    | Behavior        | –    | 6     | Hooks, operations, deletion and clipboard policy (section 9).                                                        |
| `layout`      | Layout          | –    | 7     | Automatic layout (section 10). Default: none.                                                                        |
| `persistence` | Persistence     | –    | 8     | Storage (section 11). Default: single JSON file, UUIDv7 ids.                                                         |
| `viewpoints`  | map → Viewpoint | –    | –     | Several diagram kinds over one model (3.5).                                                                          |
| `plugins`     | map → Plugin    | –    | –     | Declared extensions (section 13).                                                                                    |
| `doc`         | Doc             | –    | –     | Documentation of the language as a whole.                                                                            |
| `x-*`         | any             | –    | –     | Extensions.                                                                                                          |

Only `disl`, `language` and `metamodel` are required. Every other layer has a documented default, so specifications can start tiny and grow.

```json
{
  "disl": "0.1",
  "language": { "id": "org.example.mindmap", "version": "0.1.0", "label": "Mind map" },
  "metamodel": {
    "types": { "Idea": { "attributes": { "text": { "type": "string", "required": true } } } },
    "relations": { "Branch": { "source": "Idea", "target": "Idea" } }
  }
}
```

This five-line language already yields a usable diagram type: a palette with an *Idea* tool and a *Branch* tool, rectangles labelled with `text` (the first string attribute is the default label), arrows, a generated property form, and JSON persistence.

### 3.2 Language

| Property        | Type                   | Req. | Description                                                                                                                                                            |
|-----------------|------------------------|------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`            | qualified identifier   | ✓   | Globally unique language id; reverse-DNS style is RECOMMENDED. Recorded in every DID definition.                                                                          |
| `version`       | SemVer string          | ✓   | Version of this language.                                                                                                                                              |
| `label`         | LocalizedText          | –    | Display name ("State machine").                                                                                                                                        |
| `doc`           | Doc                    | –    | Language documentation, shown in the runtime's help view.                                                                                                              |
| `defaultLocale` | BCP 47 tag             | –    | Default `"en"`.                                                                                                                                                        |
| `locales`       | string[]               | –    | Locales for which all LocalizedTexts SHOULD provide translations; validators MAY warn about gaps.                                                                      |
| `authors`       | `{name, email, url}`[] | –    | Maintainers (tool engineers).                                                                                                                                                      |
| `license`       | SPDX expression        | –    | License of the specification.                                                                                                                                          |
| `homepage`      | URI                    | –    | Project page.                                                                                                                                                          |
| `icon`          | IconRef                | –    | Icon of the language (file type icon, window title).                                                                                                                   |
| `fileExtension` | string                 | –    | Preferred extension of stored diagrams without dot, for example `"sm.json"`.                                                                                                   |
| `limits`        | object                 | –    | `celCost` (per-expression cost limit), `maxElements` (soft limit, runtimes SHOULD warn beyond it), `maxDocumentBytes`.                                                 |
| `requires`      | object                 | –    | `conformance`: minimum runtime conformance level (`"core"`, `"standard"`, `"full"`); `features`: list of optional feature ids (Appendix B.8) the specification relies on. |

### 3.3 Imports

Specifications may import other specifications or *libraries* — specifications that contain only notation, forms, functions or data types and whose `metamodel` may be empty.

| Property    | Type                 | Req. | Description                                                                                                                 |
|-------------|----------------------|------|-----------------------------------------------------------------------------------------------------------------------------|
| `from`      | URI or relative path | ✓   | Location of the imported specification.                                                                                     |
| `as`        | simple identifier    | ✓   | Alias; imported names are referenced as `alias.Name`.                                                                       |
| `version`   | SemVer range         | –    | Acceptable versions of the imported language (for example `"^2.1.0"`).                                                      |
| `integrity` | string               | –    | Subresource-integrity hash (`"sha256-…"`). Runtimes MUST verify it when present and SHOULD require it for remote URIs.      |
| `include`   | string[]             | –    | Layers to import: any of `"metamodel"`, `"notation"`, `"forms"`, `"functions"`, `"constraints"`, `"toolbox"`. Default: all. |
| `doc`       | Doc                  | –    | Why the import exists.                                                                                                      |

Imported types may be extended (`"extends": "base.Element"`), imported styles, shapes and markers referenced, and imported constraints are active unless the import lists `include` without `"constraints"`. Import cycles are a specification error. Names are never merged implicitly: a local `State` and `lib.State` are different types.

The DISL standard library is always available under the reserved alias `std` without an import (Appendix B): `std.roundedRect`, `std.arrowFilled`, `std.grid10`, and so on. Built-in names MAY also be referenced without the `std.` prefix when no local name shadows them.

### 3.4 Functions

User-defined functions make repeated CEL logic reusable and documented.

```json
{
  "functions": {
    "displayName": {
      "params": [{ "name": "e", "type": "Element" }],
      "returns": "string",
      "cel": "has(e.name) && e.name != '' ? e.name : e.type + ' ' + e.id.substring(0, 4)",
      "doc": "The human-readable name of an element, falling back to type and short id."
    },
    "workingDaysBetween": {
      "params": [{ "name": "a", "type": "timestamp" }, { "name": "b", "type": "timestamp" }],
      "returns": "int",
      "cel": "workingDays(a, b, 'project')"
    }
  }
}
```

| Property  | Type                  | Req. | Description                                                                                                                                                                                           |
|-----------|-----------------------|------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `params`  | `{name, type, doc}`[] | ✓   | Positional parameters; `type` is a CEL type name or a metamodel type name.                                                                                                                            |
| `returns` | string                | ✓   | CEL result type.                                                                                                                                                                                      |
| `cel`     | string                | ✓   | Body; may reference parameters, globally available variables of the calling context are **not** visible (functions are pure over their parameters, plus `diagram` and `env` when declared in `uses`). |
| `uses`    | string[]              | –    | Context variables the function may read: `"diagram"`, `"env"`.                                                                                                                                        |
| `doc`     | Doc                   | –    | Documentation.                                                                                                                                                                                        |

Functions are called as `displayName(self)`. A function MAY call functions declared before it in the specification order; recursion (direct or indirect) is a specification error. This preserves CEL's termination guarantee.

### 3.5 Viewpoints

A language may offer several diagram kinds over the same model — for example a *structure* diagram and a *timeline* of the same project. Each **viewpoint** selects which types appear, which coordinate system and layout apply, and which toolbox groups are offered. If `viewpoints` is absent, a single implicit viewpoint `main` shows everything.

| Property               | Type                 | Description                                                                                        |
|------------------------|----------------------|----------------------------------------------------------------------------------------------------|
| `label`, `doc`, `icon` |                      | Display name, documentation, icon.                                                                 |
| `coordinateSystem`     | name                 | Coordinate system of diagrams of this kind (section 5).                                            |
| `include`              | TypeRef[]            | Types shown. Default: all.                                                                         |
| `exclude`              | TypeRef[]            | Types hidden.                                                                                      |
| `toolbox`              | string[]             | Toolbox group ids offered. Default: all groups.                                                    |
| `layout`               | name or LayoutConfig | Layout used (section 10).                                                                          |
| `notation`             | object               | Per-viewpoint notation overrides: `nodes`, `edges`, `styles` maps merged over the global notation. |
| `canvas`               | Canvas               | Background, bounds and page settings (6.13).                                                       |
| `default`              | boolean              | The viewpoint used for new diagrams. Exactly one viewpoint SHOULD be default.                      |

Elements appear in a view only if their type is included; model elements not shown in any view still exist in the model and are still validated.

### 3.6 Layer overview *(informative)*

```
                     ┌──────────────────────────────────────────────┐
  Layer 1            │ metamodel   types · relations · attributes   │   what exists
                     ├──────────────────────────────────────────────┤
  Layer 2            │ coordinates axes · systems · placement · snap│   where it can be
                     ├──────────────────────────────────────────────┤
  Layer 3            │ notation    theme · styles · shapes · markers│   how it looks
                     │             nodes · edges · labels · ports   │
                     ├──────────────────────────────────────────────┤
  Layer 4            │ toolbox · forms                              │   how it is created/edited
                     ├──────────────────────────────────────────────┤
  Layer 5            │ constraints                                  │   what is allowed
                     ├──────────────────────────────────────────────┤
  Layer 6            │ behavior    hooks · operations · policies    │   what happens
                     ├──────────────────────────────────────────────┤
  Layer 7            │ layout                                       │   how it is arranged
                     ├──────────────────────────────────────────────┤
  Layer 8            │ persistence                                  │   how it is stored
                     └──────────────────────────────────────────────┘
      cross-cutting:  doc on everything · CEL everywhere · functions · plugins · viewpoints
```

Dependencies only point upward: notation refers to metamodel types, constraints to metamodel and coordinates, persistence to metamodel and coordinates — never the reverse. A headless validator therefore only needs layers 1, 2, 5 and 8.

---

## 4. Layer 1 — Metamodel

The metamodel defines the abstract syntax of the language: the kinds of elements that can exist, their attributes, how they nest, how they connect, and which ports they expose. It says nothing about appearance.

### 4.1 Overview

```json
{
  "metamodel": {
    "diagram": { "attributes": { "title": { "type": "string" } } },
    "dataTypes": { "Email": { "base": "string", "format": "email" } },
    "enums": { "Priority": { "values": { "low": {}, "normal": {}, "high": {} }, "ordered": true } },
    "types": { "Task": { "attributes": { "title": { "type": "string", "required": true } } } },
    "relations": { "DependsOn": { "source": "Task", "target": "Task" } }
  }
}
```

| Property    | Type                | Description                                                                                         |
|-------------|---------------------|-----------------------------------------------------------------------------------------------------|
| `diagram`   | `{attributes, doc}` | Attributes of the diagram root element (title, author, version, settings).                          |
| `dataTypes` | map → DataType      | Named value types with facets, or structs (4.4).                                                    |
| `enums`     | map → Enum          | Enumerations (4.5).                                                                                 |
| `types`     | map → NodeType      | Node types — everything that is drawn as a node, including containers, lanes and annotations (4.6). |
| `relations` | map → RelationType  | Relation types — everything that is drawn as an edge (4.9).                                         |
| `doc`       | Doc                 | Documentation of the metamodel.                                                                     |

### 4.2 Primitive types

| Type         | CEL type                  | JSON representation | Facets                                                                          |
|--------------|---------------------------|---------------------|---------------------------------------------------------------------------------|
| `string`     | `string`                  | string              | `minLength`, `maxLength`, `pattern`, `format`                                   |
| `text`       | `string`                  | string (multi-line) | as `string`, plus `markup: "plain" \| "markdown"`                               |
| `int`        | `int`                     | integer             | `min`, `max`, `step`, `unit`                                                    |
| `number`     | `double`                  | number              | `min`, `max`, `exclusiveMin`, `exclusiveMax`, `step`, `precision`, `unit`       |
| `bool`       | `bool`                    | boolean             | –                                                                               |
| `date`       | `timestamp`               | `"YYYY-MM-DD"`      | `min`, `max` (as dates)                                                         |
| `datetime`   | `timestamp`               | RFC 3339 string     | `min`, `max`, `timezone` (stored zone policy: `"utc"`, `"preserve"`, IANA name) |
| `time`       | `duration` since midnight | `"HH:MM[:SS]"`      | `min`, `max`, `step`                                                            |
| `duration`   | `duration`                | ISO 8601 duration   | `min`, `max`, `calendar` (allow `P1M`/`P1Y`)                                    |
| `color`      | `string`                  | CSS color string    | `palette` (list of allowed colors), `alpha` (bool)                              |
| `uri`        | `string`                  | URI string          | `schemes` (allowed schemes)                                                     |
| `expression` | `string`                  | CEL source          | `context` (name of the CEL context it will be evaluated in), `resultType`       |
| `json`       | `dyn`                     | any JSON            | `schema` (inline JSON Schema)                                                   |
| `binary`     | `bytes`                   | base64 string       | `mediaTypes`, `maxBytes`                                                        |

Unit facets (`unit`) are informational strings (`"h"`, `"kg"`, `"EUR"`); runtimes SHOULD show them as field suffixes.

### 4.3 Attributes

An attribute describes one named value on a node, relation, port or the diagram.

| Property                              | Type                              | Description                                                                                                          |
|---------------------------------------|-----------------------------------|----------------------------------------------------------------------------------------------------------------------|
| `type`                                | TypeName                          | Primitive, enum, data type, or node/relation type (a reference, 4.8). **Required.**                                  |
| `label`                               | LocalizedText                     | Display name.                                                                                                        |
| `doc`                                 | Doc                               | Shown as field help.                                                                                                 |
| `required`                            | bool                              | Must have a non-empty value. Enforced as a built-in constraint with severity `error` (section 8.7). Default `false`. |
| `default`                             | literal or `{cel}`                | Initial value on creation. A CEL default is evaluated in the `create` context (12.3).                                |
| `many`                                | bool                              | The attribute holds a list. Default `false`.                                                                         |
| `minItems`, `maxItems`, `uniqueItems` | int, int, bool                    | List facets when `many`.                                                                                             |
| `readOnly`                            | bool                              | Not editable by users (may still be set by behavior).                                                                |
| `derived`                             | Expression                        | Computed, never stored; evaluated in the `element` context. Implies `readOnly`.                                      |
| `transient`                           | bool                              | Editable but not persisted (for example UI-only flags).                                                              |
| `unique`                              | `"diagram"`, `"parent"`, `"type"` | Value must be unique within the scope. Enforced as a built-in constraint.                                            |
| `key`                                 | bool                              | Part of the element's natural key (used for `natural` ids, 11.5, and for display).                                   |
| `secret`                              | bool                              | Masked in forms and excluded from exports and logs.                                                                  |
| `facets`                              | object                            | Primitive facets from 4.2 (`min`, `max`, `pattern`, …); may also be written directly on the attribute.               |
| `group`                               | string                            | Default form section when a form is generated.                                                                       |
| `order`                               | int                               | Default position in generated forms.                                                                                 |
| `x-*`                                 | any                               | Extensions.                                                                                                          |

```json
{
  "attributes": {
    "name":      { "type": "string", "required": true, "maxLength": 80, "unique": "parent",
                   "doc": "Unique within the enclosing region." },
    "priority":  { "type": "Priority", "default": "normal" },
    "effort":    { "type": "number", "min": 0, "step": 0.5, "unit": "h" },
    "tags":      { "type": "string", "many": true, "uniqueItems": true },
    "slug":      { "type": "string", "derived": "self.name.lowerAscii().replace(' ', '-')" },
    "owner":     { "type": "Person", "doc": "Reference to a person node in the same diagram." },
    "createdAt": { "type": "datetime", "readOnly": true, "default": { "cel": "env.now" } }
  }
}
```

**Unset values.** Reading an attribute that has no stored value yields its `default` when one is declared, otherwise the zero value of its CEL type (`''`, `0`, `0.0`, `false`, `[]`, `{}`, `null` for references, the Unix epoch for timestamps, `0s` for durations). The CEL macro `has(self.attr)` tests whether a value is explicitly stored. Persistence omits unset values (11.8).

### 4.4 Data types

A data type is either a **constrained primitive** or a **struct**.

```json
{
  "dataTypes": {
    "Percentage": { "base": "number", "min": 0, "max": 100, "unit": "%", "doc": "0–100 %" },
    "Iso4217":    { "base": "string", "pattern": "^[A-Z]{3}$", "doc": "Currency code" },
    "Money": {
      "fields": {
        "amount":   { "type": "number", "required": true },
        "currency": { "type": "Iso4217", "default": "EUR" }
      },
      "display": { "cel": "string(value.amount) + ' ' + value.currency" }
    }
  }
}
```

| Property       | Type                   | Description                                                                 |
|----------------|------------------------|-----------------------------------------------------------------------------|
| `base`         | primitive              | For constrained primitives.                                                 |
| facets         |                        | Facets of the base primitive.                                               |
| `fields`       | map → Attribute        | For structs; fields may themselves be structs, lists or references.         |
| `display`      | Bindable&lt;string&gt; | How a value is summarised in labels and list cells (`value` is the struct). |
| `label`, `doc` |                        |                                                                             |

Struct values are CEL maps; fields are accessed as `self.budget.amount`.

### 4.5 Enumerations

```json
{
  "enums": {
    "Priority": {
      "ordered": true,
      "values": {
        "low":    { "label": "Low",    "color": "#639922", "icon": "arrow-down" },
        "normal": { "label": "Normal" },
        "high":   { "label": "High",   "color": "#E24B4A", "icon": "arrow-up",
                    "doc": "Must be scheduled in the current iteration." }
      }
    }
  }
}
```

| Property       | Type                      | Description                                                                                   |
|----------------|---------------------------|-----------------------------------------------------------------------------------------------|
| `values`       | map → EnumValue (ordered) | Value ids are simple identifiers and are what is stored. Map order is the display order.      |
| `ordered`      | bool                      | Values have a meaningful order; enables `<`, `>` comparison via `ordinal(value, 'Priority')`. |
| `extensible`   | bool                      | Users may enter values not listed (combobox).                                                 |
| `label`, `doc` |                           |                                                                                               |

EnumValue: `label`, `doc`, `color`, `icon`, `deprecated`. The optional `color` and `icon` are hints that notations may use (`{ "cel": "enumColor('Priority', self.priority)" }`).

### 4.6 Node types

A node type describes a kind of element that is drawn as a node.

| Property               | Type                 | Description                                                                                                                                                                                                                                |
|------------------------|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `label`, `doc`, `icon` |                      | Display name, documentation, default icon.                                                                                                                                                                                                 |
| `abstract`             | bool                 | Cannot be instantiated; exists for inheritance and type references.                                                                                                                                                                        |
| `extends`              | TypeRef or TypeRef[] | Supertypes (4.7).                                                                                                                                                                                                                          |
| `attributes`           | map → Attribute      | Own attributes.                                                                                                                                                                                                                            |
| `ports`                | map → PortType       | Connection points (4.10).                                                                                                                                                                                                                  |
| `children`             | Containment          | What may be nested inside (4.8).                                                                                                                                                                                                           |
| `multiplicity`         | `{min, max}`         | Number of instances allowed per diagram (for example exactly one `Start`). Enforced as a built-in constraint.                                                                                                                              |
| `viewOnly`             | bool                 | The element has no model meaning and lives only in a view: notes, free text, frames, images, annotations. View-only elements are stored in view data (11.6) and are excluded from `diagram.nodes` unless `includeViewOnly` is used (12.4). |
| `labelAttribute`       | attribute name       | The attribute used as the element's name in lists, problem messages, reference pickers and default labels. Default: the first `key` attribute, else the first required `string` attribute, else the first `string` attribute.              |
| `tags`                 | string[]             | Free classification, usable in CEL as `self.isTagged('x')`.                                                                                                                                                                                |
| `x-*`                  |                      | Extensions.                                                                                                                                                                                                                                |

### 4.7 Inheritance

A type inherits all attributes, ports, containment rules and tags from its supertypes, and is accepted wherever a supertype is expected (in relation ends, containment, references, constraint scopes, notation lookups).

- Multiple inheritance is allowed. The set of supertypes MUST form a directed acyclic graph.
- A subtype MAY redeclare an inherited attribute to *narrow* it: tighten facets, change `default`, `label` or `doc`, set `required: true`, or narrow a reference type to a subtype. It MUST NOT change the base type or relax facets. Conflicting inherited declarations of the same attribute from two supertypes are a specification error unless the subtype redeclares it.
- Notation, forms and constraints are looked up along the linearised supertype chain (C3 linearisation, as in Python): the most specific declaration wins, and a node type without its own notation uses its nearest supertype's notation.
- Relation types inherit from relation types only; node types from node types only.

### 4.8 Containment and references

**Containment** makes nodes nest: a pool contains lanes, a lane contains tasks, a table contains columns. A contained node has exactly one `parent`; deleting the parent deletes its contents (unless behavior says otherwise, 9.5).

```json
{
  "Lane": {
    "attributes": { "name": { "type": "string" } },
    "children": {
      "allowed": ["Task", "Event", "Gateway"],
      "min": 0,
      "max": null,
      "ordered": true,
      "slots": {
        "header":  { "allowed": ["LaneHeader"], "max": 1 },
        "content": { "allowed": ["Task", "Event", "Gateway"] }
      }
    }
  }
}
```

| Property      | Type                             | Description                                                                                                                                 |
|---------------|----------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| `allowed`     | TypeRef[]                        | Types that may be direct children.                                                                                                          |
| `min`, `max`  | int / null                       | Child count bounds (`null` = unbounded).                                                                                                    |
| `perType`     | map TypeRef → `{min, max}`       | Per-type bounds.                                                                                                                            |
| `ordered`     | bool                             | Child order is meaningful and persisted (for example stacked compartments, table columns).                                                  |
| `slots`       | map → `{allowed, min, max, doc}` | Named sub-containers when a node has several distinct regions; each child records its slot. Notation maps slots to compartments or regions. |
| `acrossViews` | bool                             | Whether a child may be shown outside its parent in other viewpoints. Default `false`.                                                       |

A node type without `children` cannot contain other nodes. Top-level nodes have the diagram as parent (`parent == null` in CEL, `self.owner == diagram`).

**References** are attributes whose type is a node or relation type. They store the target's id, are resolved to elements in CEL, and are not containment: deleting the target sets the reference to `null` (or deletes the referencing element when behavior declares `onDelete: cascade-references`, 9.5). References are drawn as edges only if a notation says so (6.10, `edges` for reference attributes).

### 4.9 Relation types

A relation type describes a kind of connection, drawn as an edge.

```json
{
  "relations": {
    "Transition": {
      "doc": "A change from one state to another, fired by a trigger.",
      "source": { "types": ["State"], "max": null },
      "target": { "types": ["State"], "exclude": ["InitialState"] },
      "directed": true,
      "allowSelfLoops": true,
      "allowParallel": true,
      "attributes": {
        "trigger": { "type": "string" },
        "guard":   { "type": "expression", "context": "x-guard" }
      }
    }
  }
}
```

| Property               | Type                              | Description                                                                                                                       |
|------------------------|-----------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| `label`, `doc`, `icon` |                                   |                                                                                                                                   |
| `abstract`, `extends`  |                                   | As for node types.                                                                                                                |
| `source`, `target`     | TypeRef, TypeRef[] or RelationEnd | Allowed endpoints. **Required.**                                                                                                  |
| `directed`             | bool                              | Default `true`. Undirected relations treat `source`/`target` as unordered for `allowParallel` and cycle checks.                   |
| `allowSelfLoops`       | bool                              | Source and target may be the same element. Default `false`.                                                                       |
| `allowParallel`        | bool                              | More than one relation of this type between the same pair. Default `true`.                                                        |
| `acyclic`              | bool                              | Shorthand for a built-in constraint forbidding cycles over this relation type.                                                    |
| `attributes`           | map → Attribute                   | Relation attributes.                                                                                                              |
| `connectsRelations`    | bool                              | Endpoints may be relations, not only nodes (for example UML association classes, annotations pointing at edges). Default `false`. |
| `derived`              | Expression                        | Derived relations are computed (list of `{source, target}` maps) and drawn read-only.                                             |
| `viewOnly`             | bool                              | As for node types — connectors between notes, for instance.                                                                       |

**RelationEnd**

| Property     | Type       | Description                                                                                                     |
|--------------|------------|-----------------------------------------------------------------------------------------------------------------|
| `types`      | TypeRef[]  | Allowed element types.                                                                                          |
| `exclude`    | TypeRef[]  | Subtypes excluded from `types`.                                                                                 |
| `ports`      | string[]   | Port types the end must attach to (4.10). If set, the end MUST be a port of that type.                          |
| `min`, `max` | int / null | How many relations of this type an element may have at this end (outgoing for `source`, incoming for `target`). |
| `role`       | string     | Role name, usable in CEL and labels (for example `"parent"` / `"child"`).                                       |
| `doc`        | Doc        |                                                                                                                 |

Connectivity rules that depend on attributes or on the pair of endpoints are written as `connect` constraints (8.4).

### 4.10 Ports

Ports are named connection points on nodes: pins of a circuit component, input/output handles of a data-flow block, the sockets of a UML component.

```json
{
  "Block": {
    "attributes": { "name": { "type": "string" } },
    "ports": {
      "in":  { "direction": "in",  "multiplicity": { "min": 1, "max": 8 }, "dynamic": true,
               "attributes": { "name": { "type": "string" }, "dataType": { "type": "string" } } },
      "out": { "direction": "out", "multiplicity": { "min": 1, "max": 1 } }
    }
  }  
}
```

| Property         | Type                       | Description                                                                                  |
|------------------|----------------------------|----------------------------------------------------------------------------------------------|
| `label`, `doc`   |                            |                                                                                              |
| `direction`      | `"in"`, `"out"`, `"inout"` | Allowed edge direction at this port. Default `"inout"`.                                      |
| `multiplicity`   | `{min, max}`               | Number of port instances of this type per node. Default `{min: 1, max: 1}` (one fixed port). |
| `dynamic`        | bool                       | Users may add and remove instances (within `multiplicity`).                                  |
| `maxConnections` | int / null                 | Edges per port instance.                                                                     |
| `accepts`        | TypeRef[]                  | Relation types that may attach. Default: all whose ends allow this node type.                |
| `attributes`     | map → Attribute            | Attributes of each port instance.                                                            |

Port instances are elements with `kind == "port"`, an `id`, a `type` of the form `Block.in`, and an `owner` (the node). They are persisted with their owner (11.4).


---

## 5. Layer 2 — Coordinate systems, placement and snapping

Most diagram tools assume a single, infinite pixel plane. Many real diagrams do not fit that assumption: a Gantt chart places tasks along **time**; a swimlane diagram places activities in **categories** (lanes); a sequence diagram orders messages along a **logical sequence**; a floor plan measures in **millimetres**; a radial mind map uses **angles and radii**. DISL makes the coordinate system an explicit layer so that positions keep their meaning, can be bound to model data, and can be snapped in domain units.

### 5.1 Concepts

- An **axis** maps *domain values* (numbers, timestamps, categories) to *canvas distance* along one direction. It is a scale in the sense of charting libraries.
- A **coordinate system** combines two axes (x and y, or angle and radius) and defines orientation, bounds and the grid display.
- **Placement** (5.8) defines, per node type, where each coordinate of an element comes from: stored freely in the view, **bound** to a model attribute (two-way), or **computed** by an expression (read-only).
- **Snapping** (5.9–5.11) restricts positions and sizes to discrete values, independently per axis, in the axis's own units.
- **Canvas units** are the internal unit of rendering at zoom 1. The screen maps canvas units to device pixels via the zoom factor.

```
  domain value ──axis.scale──▶ canvas units ──zoom──▶ screen pixels
  "2026-10-05"                 x = 480                 x = 720 at zoom 1.5
       ▲                            │
       └── snapping works here ◀────┘ (in domain units, then mapped back)
```

### 5.2 The coordinates object

```json
{
  "coordinates": {
    "axes": { "px": { "kind": "linear", "unit": "px" } },
    "systems": {
      "canvas": {
        "kind": "cartesian",
        "x": "px", "y": "px",
        "orientation": "y-down",
        "grid": { "visible": true, "style": "dots", "spacing": 10, "majorEvery": 5 },
        "snapping": "grid10"
      }
    },
    "snapProfiles": { "grid10": { "x": { "grid": { "spacing": 10 } }, "y": { "grid": { "spacing": 10 } } } },
    "default": "canvas"
  }
}
```

| Property       | Type                   | Description                                            |
|----------------|------------------------|--------------------------------------------------------|
| `axes`         | map → Axis             | Named axes; may also be written inline inside systems. |
| `systems`      | map → CoordinateSystem | Named coordinate systems.                              |
| `snapProfiles` | map → Snapping         | Reusable snapping definitions.                         |
| `default`      | name                   | System used by viewpoints that do not name one.        |
| `doc`          | Doc                    |                                                        |

If `coordinates` is absent, the default is a single cartesian system `canvas` with two linear pixel axes, y pointing down, unbounded, grid hidden and snapping off.

### 5.3 Axes: common properties

| Property     | Type                                                    | Description                                                                                                          |
|--------------|---------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| `kind`       | `"linear"`, `"log"`, `"time"`, `"ordinal"`, `"angular"` | **Required.**                                                                                                        |
| `label`      | LocalizedText                                           | Axis title, shown on rulers and headers.                                                                             |
| `doc`        | Doc                                                     | Explains to users what the axis means ("Calendar time in the project's time zone").                                  |
| `min`, `max` | domain value                                            | Domain bounds; placements outside are rejected by a built-in placement constraint.                                   |
| `reversed`   | bool                                                    | Domain increases towards negative canvas direction (for example values increasing upward in a y-down system).        |
| `origin`     | domain value                                            | The domain value mapped to canvas coordinate 0.                                                                      |
| `ruler`      | Ruler                                                   | Ruler or header display (5.13).                                                                                      |
| `expand`     | `"none"`, `"auto"`                                      | Whether the axis domain grows automatically when elements are placed beyond it. Default `"auto"` for unbounded axes. |

### 5.4 Numeric axes (`linear`, `log`)

| Property    | Type   | Description                                                                                                                          |
|-------------|--------|--------------------------------------------------------------------------------------------------------------------------------------|
| `unit`      | string | `"px"` (default), `"pt"`, `"mm"`, `"cm"`, `"in"`, `"m"`, `"unitless"`, or any custom unit label.                                     |
| `scale`     | number | Canvas units per domain unit at zoom 1. Default: 1 for `px`; 96/25.4 for `mm` (CSS reference pixel); 96 for `in`; 72/… for `pt` etc. |
| `precision` | int    | Decimal places stored (overrides persistence default for this axis).                                                                 |
| `base`      | number | For `log` axes (default 10). Domain values MUST be > 0.                                                                              |
| `format`    | string | Number format pattern for rulers (ICU/Unicode LDML, for example `"#,##0.0 'mm'"`).                                                   |

```json
{
  "mm": { "kind": "linear", "unit": "mm", "precision": 1, "label": "Millimetres",
        "doc": "Real-world length on the printed sheet. 1 mm = 3.78 px at 100 %." }
}
```

### 5.5 Time axes (`time`)

Time axes place elements by date or timestamp. They are used for Gantt charts, roadmaps, timelines, event storms with a real time dimension, and schedules.

| Property     | Type                                              | Description                                                                                                                                                                                                                                                                                                                 |
|--------------|---------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `valueType`  | `"date"`, `"datetime"`, `"epoch-ms"`, `"epoch-s"` | Stored representation of positions on this axis. Default `"datetime"`.                                                                                                                                                                                                                                                      |
| `timezone`   | IANA name, `"UTC"`, `"floating"`                  | Zone in which dates are interpreted and calendar snapping is computed. `"floating"` means local wall-clock time without zone. Default `"UTC"`. A bindable form `{ "attribute": "timezone" }` refers to a diagram attribute.                                                                                                 |
| `scale`      | `{unit, size}`                                    | How much canvas distance one unit of time occupies at zoom 1, for example `{ "unit": "day", "size": 40 }` (40 canvas units per day). Units: `millisecond`, `second`, `minute`, `hour`, `day`, `week`, `month`, `quarter`, `year`. For `month` and larger units the scale is the average length (a month is 30.436875 days). |
| `calendar`   | Calendar                                          | Working time definition (below).                                                                                                                                                                                                                                                                                            |
| `collapse`   | `"none"`, `"non-working"`                         | If `"non-working"`, non-working time takes no canvas space (a *compressed* timeline in which weekends vanish). Default `"none"`.                                                                                                                                                                                            |
| `min`, `max` | timestamp or `{cel}`                              | Bounds; may be bound to diagram attributes such as project start and end.                                                                                                                                                                                                                                                   |
| `origin`     | timestamp or `{cel}`                              | Timestamp at canvas x = 0. Default: `min` if set, else the Unix epoch.                                                                                                                                                                                                                                                      |
| `zoomLevels` | ZoomLevel[]                                       | Presets that change `scale` and the header (for example *days*, *weeks*, *months*).                                                                                                                                                                                                                                         |
| `today`      | object                                            | `{ "visible": true, "style": StyleRef, "label": "Today" }` — a marker line at `env.now`.                                                                                                                                                                                                                                    |

**Calendar**

```json
{
  "calendar": {
    "id": "project",
    "workingDays": [1, 2, 3, 4, 5],
    "workingHours": [["09:00", "12:30"], ["13:30", "17:30"]],
    "holidays": { "attribute": "holidays" },
    "firstDayOfWeek": 1,
    "doc": "Mon–Fri, 8 working hours; holidays come from the diagram's holiday list."
  }
}
```

| Property         | Type                     | Description                                                           |
|------------------|--------------------------|-----------------------------------------------------------------------|
| `id`             | identifier               | Name used by CEL time functions (`workingDays(a, b, 'project')`).     |
| `workingDays`    | int[]                    | ISO weekday numbers (1 = Monday … 7 = Sunday). Default `[1,2,3,4,5]`. |
| `workingHours`   | `[start, end]`[]         | Working intervals per working day. Default `[["00:00","24:00"]]`.     |
| `holidays`       | date[] or Bindable       | Non-working dates.                                                    |
| `exceptions`     | `{date, workingHours}`[] | Special days (half days, working Saturdays).                          |
| `firstDayOfWeek` | int                      | For week snapping and headers. Default 1 (ISO).                       |

The grid and header of time axes show non-working time shaded by default; the style is set in `ruler.nonWorkingStyle`.

### 5.6 Ordinal axes (`ordinal`) and angular axes

**Ordinal axes** place elements into discrete **bands** (categories): lanes, rows, resources, lifelines, columns of a Kanban board, days of a timetable.

| Property                     | Type                               | Description                                                                                                                                                                                                                                                                                                                                                                                                                                               |
|------------------------------|------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `categories`                 | Category[] or `{cel}` or `{nodes}` | The bands. Static list, a CEL expression returning a list of `{id, label}` maps, or `{ "nodes": "Resource", "orderBy": "self.order" }` — one band per node of a type. With `nodes`, the bands *are* model elements: they can be edited, reordered and deleted, their node notation is used to draw the band header, their placement is determined by the axis (not by `placement`), and attributes bound to this axis store a reference to the band node. |
| `bandSize`                   | number or `"auto"`                 | Canvas size of each band. `"auto"` grows each band to fit its content.                                                                                                                                                                                                                                                                                                                                                                                    |
| `minBandSize`, `maxBandSize` | number                             | Limits for auto sizing.                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `bandSizes`                  | `{attribute}`                      | Per-band size stored on the category element.                                                                                                                                                                                                                                                                                                                                                                                                             |
| `padding`                    | number                             | Space before the first and after the last band.                                                                                                                                                                                                                                                                                                                                                                                                           |
| `gap`                        | number                             | Space between bands.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `reorderable`                | bool                               | Users may drag bands to reorder them (updates the order attribute or category list).                                                                                                                                                                                                                                                                                                                                                                      |
| `allowUnassigned`            | bool                               | Whether elements may lie outside any band. Default `false`.                                                                                                                                                                                                                                                                                                                                                                                               |
| `header`                     | object                             | `{ "size": 120, "label": {cel}, "style": StyleRef }` — band headers (the "lane titles").                                                                                                                                                                                                                                                                                                                                                                  |

A **Category** is `{ "id": "backlog", "label": "Backlog", "doc": "...", "color": "#…", "size": 200 }`.

Position values on an ordinal axis are **band references**: either the band id as a string, or `{ "band": "backlog", "offset": 12.5 }` where `offset` is the canvas distance from the band's start edge. The offset lets several elements share a band at different positions (for example activities within a swimlane).

**Angular axes** (`angular`) are used with polar coordinate systems (5.7). Properties: `unit` (`"deg"` default or `"rad"`), `start` (angle of domain 0, default −90 = pointing up), `direction` (`"clockwise"` default or `"counterclockwise"`), `wrap` (default `true`, values modulo 360°).

### 5.7 Coordinate systems

| Property          | Type                           | Description                                                                                                                            |
|-------------------|--------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `kind`            | `"cartesian"`, `"polar"`       | **Required.**                                                                                                                          |
| `x`, `y`          | Axis or name                   | For cartesian systems.                                                                                                                 |
| `angle`, `radius` | Axis or name                   | For polar systems; `radius` is linear or ordinal (concentric rings).                                                                   |
| `center`          | `[x, y]`                       | Canvas point of the polar origin.                                                                                                      |
| `orientation`     | `"y-down"`, `"y-up"`           | Cartesian direction of the positive y axis on screen. Default `"y-down"` (screen convention); engineering drawings often use `"y-up"`. |
| `bounds`          | `{x: [min,max], y: [min,max]}` | Canvas bounds (in domain values); elements must stay inside.                                                                           |
| `infinite`        | bool                           | Canvas extends indefinitely. Default `true` unless `bounds` is set.                                                                    |
| `grid`            | GridDisplay                    | Visible grid (5.13). Independent of snapping, but defaults to the snapping grid.                                                       |
| `snapping`        | Snapping or profile name       | Default snapping in this system (5.9).                                                                                                 |
| `guides`          | Guides                         | Alignment and distribution guides (5.12).                                                                                              |
| `nested`          | map TypeRef → system name      | Coordinate systems local to containers of a type (below).                                                                              |
| `label`, `doc`    |                                |                                                                                                                                        |

**Nested coordinate systems.** A container node may establish its own coordinate system for its children. The children's positions are then stored relative to the container in the nested system's units. Examples: a Kanban board node whose x axis is the ordinal *status* column set; a sub-timeline inside a project phase; a pin layout inside a chip outline measured in millimetres.

```json
{
  "systems": {
    "board": {
      "kind": "cartesian",
      "x": { "kind": "ordinal", "categories": { "nodes": "Column", "orderBy": "self.position" }, "bandSize": 260, "gap": 16 },
      "y": { "kind": "linear", "unit": "px" },
      "nested": { "Swimlane": "laneLocal" }
    }
  }
}
```

A position in a nested system is converted to canvas coordinates through the container's placement. Frames compose: a node inside a lane inside a pool resolves its canvas position through all three.

### 5.8 Placement

Placement tells the runtime, for each node type, where each coordinate of an element comes from. It is declared in the node notation (6.9) under `placement`, because the same model type may be placed differently in different viewpoints.

| Property          | Type             | Description                                                                                                                                                                                                                                                                      |
|-------------------|------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `system`          | name             | Coordinate system. Default: the viewpoint's system, or the nearest container's nested system.                                                                                                                                                                                    |
| `x`, `y`          | PlacementSource  | Position of the element's anchor on each axis.                                                                                                                                                                                                                                   |
| `x2`, `y2`        | PlacementSource  | Position of the opposite edge; if given, the extent is `x2 − x` in domain units (for example `end − start` on a time axis).                                                                                                                                                      |
| `width`, `height` | PlacementSource  | Extent in domain units (a duration on time axes, a number of bands on ordinal axes). Mutually exclusive with `x2`/`y2`.                                                                                                                                                          |
| `angle`, `radius` | PlacementSource  | For polar systems.                                                                                                                                                                                                                                                               |
| `anchor`          | Anchor           | Which point of the node the position refers to: `"top-left"` (default), `"top"`, `"top-right"`, `"left"`, `"center"`, `"right"`, `"bottom-left"`, `"bottom"`, `"bottom-right"`, or `[fx, fy]` fractions. Point-like elements on time axes (milestones) typically use `"center"`. |
| `movable`         | bool or `{x, y}` | Whether users may move the element along each axis. Default `true`. `{ "x": true, "y": false }` constrains dragging to the x direction.                                                                                                                                          |
| `resizable`       | bool or `{x, y}` | Whether users may change the extent along each axis (see also `size` in 6.9).                                                                                                                                                                                                    |
| `stack`           | Stack            | How elements that share a band are arranged (below).                                                                                                                                                                                                                             |
| `clampToParent`   | bool             | Keep the element within its container's content area. Default `true` for contained nodes.                                                                                                                                                                                        |
| `doc`             | Doc              | Explains placement to users ("Drag horizontally to reschedule; drag vertically to reassign").                                                                                                                                                                                    |

**PlacementSource** is one of:

| Form                                                                       | Kind                  | Meaning                                                                                                                                                                                                                                           |
|----------------------------------------------------------------------------|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `"free"` (or absent)                                                       | free                  | The value is stored in view data (11.6); moving the element updates the view only.                                                                                                                                                                |
| `{ "attribute": "start" }`                                                 | bound                 | The value is read from and written to a model attribute. Moving the element changes the model (and triggers `change` hooks and constraints).                                                                                                      |
| `{ "attribute": "start", "offset": "P1D" }`                                | bound                 | Bound with a constant offset in domain units.                                                                                                                                                                                                     |
| `{ "cel": "…" }`                                                           | computed              | Read-only; the element cannot be moved along this axis.                                                                                                                                                                                           |
| `{ "cel": "…", "write": { "set": { "attr": "value - duration('1h')" } } }` | computed with inverse | The expression computes the position; when the user moves the element, the `write` actions (an Action, 9.4) run with `value` bound to the new snapped domain value. This allows bindings such as "x is `start`, width is `durationDays * 1 day`". |
| `{ "layout": true }`                                                       | layout                | Determined by the layout algorithm (section 10); not user-movable.                                                                                                                                                                                |

The attribute type MUST be compatible with the axis: `number`/`int` for numeric axes, `date`/`datetime` for time axes, `string`, enum or a reference to a category node type for ordinal axes, `number` for angular axes.

**Stacking** — when several elements fall into the same ordinal band and overlap along the other axis (two tasks of one resource in the same week), `stack` decides what happens:

| Property   | Type                             | Description                                                                                                                                                           |
|------------|----------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `mode`     | `"overlap"`, `"stack"`, `"pack"` | `overlap`: draw over each other; `stack`: every element gets its own sub-row in order; `pack`: greedy interval packing into the fewest sub-rows. Default `"overlap"`. |
| `order`    | Expression                       | Sort key for stacking (for example `"self.start"`).                                                                                                                   |
| `rowSize`  | number                           | Sub-row height.                                                                                                                                                       |
| `growBand` | bool                             | Band grows to fit sub-rows (requires `bandSize: "auto"`).                                                                                                             |

#### Example: a Gantt task

```json
{
  "placement": {
    "system": "schedule",
    "x":  { "attribute": "start" },
    "x2": { "attribute": "end" },
    "y":  { "attribute": "assignee" },
    "movable": { "x": true, "y": true },
    "resizable": { "x": true, "y": false },
    "stack": { "mode": "pack", "order": "self.start", "rowSize": 28, "growBand": true },
    "doc": "Drag to reschedule or reassign. Drag the right edge to change the end date."
  }
}
```

Dragging the task horizontally moves both `start` and `end` (keeping the duration); dragging its right edge changes `end` only; dragging it into another lane changes `assignee` to that lane's category id (or node reference).

### 5.9 Snapping: model

Snapping restricts where elements can be placed and how they can be sized, so that diagrams stay tidy and values stay meaningful (a task starts on a day, not at 13:47:12; a component sits on a 2.54 mm pitch).

Snapping is defined **per axis**. Each axis of a coordinate system can have its own rule, so a diagram type may snap only horizontally, only vertically, or both, with different rules on each. The same rule model applies to positions, sizes, edge bendpoints, label offsets and rotation.

```json
{
  "snapping": {
    "enabled": true,
    "mode": "always",
    "x": { "calendar": { "unit": "day", "align": "nearest" } },
    "y": { "bands": { "align": "center" } },
    "size": { "x": { "calendar": { "unit": "day" }, "min": "P1D" } },
    "bendpoints": "inherit",
    "targets": ["rule", "objects", "guides"],
    "toleranceScreenPx": 8,
    "bypassModifier": "Alt",
    "feedback": { "showGhost": true, "showValue": true },
    "doc": {
      "summary": "Tasks snap to whole days and into resource lanes.",
      "rationale": "Plans are made in days; sub-day precision would suggest accuracy the plan does not have."
    }
  }
}
```

| Property              | Type                                             | Description                                                                                                                                                                                                                                             |
|-----------------------|--------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `enabled`             | bool                                             | Master switch; users MAY toggle it at run time if `userToggle` is true. Default `true` when `snapping` is present.                                                                                                                                      |
| `userToggle`          | bool                                             | Users may switch snapping on and off (toolbar button, shortcut). Default `true`.                                                                                                                                                                        |
| `mode`                | `"always"`, `"magnetic"`                         | `always`: the value is always replaced by the nearest allowed value; `magnetic`: only when within `toleranceScreenPx` of an allowed value (free placement otherwise). Default `"always"` for rule snapping, `"magnetic"` for object and guide snapping. |
| `x`, `y`              | SnapRule                                         | Rule for positions along each axis (5.10). Absent or `"none"` = continuous.                                                                                                                                                                             |
| `both`                | SnapRule                                         | Shorthand applying the same rule to `x` and `y` (numeric axes only).                                                                                                                                                                                    |
| `angle`, `radius`     | SnapRule                                         | For polar systems.                                                                                                                                                                                                                                      |
| `size`                | `{x, y, both}` of SnapRule                       | Rules for extents (width/height). Default: follows the position rule of the axis for bound extents, none for free ones.                                                                                                                                 |
| `reference`           | `"anchor"`, `"bounds"`, `"center"`, `"edges"`    | Which point(s) of the element are snapped: the placement anchor (default), any edge of the bounds (the nearest wins), the center, or leading edges only.                                                                                                |
| `rotation`            | `{step, tolerance}`                              | Rotation snapping in degrees (for example `{ "step": 15 }`).                                                                                                                                                                                            |
| `bendpoints`          | `"inherit"`, `"none"` or `{x, y}`                | Snapping for edge bendpoints and orthogonal segments.                                                                                                                                                                                                   |
| `labels`              | `"none"` or LabelSnap                            | Snapping for draggable labels (for example to the nearest of `start`, `middle`, `end` on an edge).                                                                                                                                                      |
| `targets`             | string[]                                         | Which snapping sources participate, in priority order: `"rule"` (the axis rules), `"objects"` (edges and centers of other elements), `"guides"` (user guides), `"ports"`, `"parent"` (container edges and padding). Default `["rule"]`.                 |
| `toleranceScreenPx`   | number                                           | Attraction distance for magnetic snapping and object snapping. Default 8.                                                                                                                                                                               |
| `applyToProgrammatic` | bool                                             | Whether changes made by operations, hooks and templates are snapped too. Default `false`.                                                                                                                                                               |
| `bypassModifier`      | `"Alt"`, `"Shift"`, `"Ctrl"`, `"Meta"`, `"none"` | Holding this key temporarily disables snapping. Default `"Alt"`.                                                                                                                                                                                        |
| `feedback`            | object                                           | `showGhost` (preview of snapped position), `showValue` (tooltip with the snapped domain value, formatted by the axis), `highlightBand` (for ordinal axes), `style` (StyleRef for snap indicator lines).                                                 |
| `doc`                 | Doc                                              | Explains the snapping to users; runtimes SHOULD show `summary` when snapping is toggled or while dragging.                                                                                                                                              |

**Where snapping is declared, and precedence.** Snapping can be declared in a snap profile, on a coordinate system, on a viewpoint's canvas, on a node or edge notation (`snapping` property, 6.9 and 6.10), and on a placement. The most specific declaration wins **per property and per axis**: a node notation that only declares `x` keeps the system's `y` rule. `"inherit"` explicitly refers to the next level.

### 5.10 Snap rules

A **SnapRule** is `"none"`, a profile name, or an object with exactly one of the rule keys below, plus optional common properties.

| Rule key    | Applies to               | Description                                                                                                                                                                                                                                                |
|-------------|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `grid`      | numeric axes             | Regular grid: `{ "spacing": 10, "offset": 0, "subdivisions": 2 }`. Positions snap to `offset + k·spacing` (or to subdivisions when zoomed in beyond `subdivideAtZoom`).                                                                                    |
| `values`    | numeric, time, angular   | Explicit list of allowed values: `{ "values": [0, 12.5, 25, 50, 100] }`. May be `{cel}` returning a list.                                                                                                                                                  |
| `calendar`  | time                     | Calendar units: `{ "unit": "day", "step": 1, "align": "nearest", "workingTime": true, "calendar": "project", "at": "09:00" }` (details below).                                                                                                             |
| `ticks`     | any                      | Snap to the axis ticks visible at the current zoom level: `{ "ticks": { "level": "minor" } }`. Useful for zoom-adaptive snapping.                                                                                                                          |
| `bands`     | ordinal                  | Snap into bands: `{ "align": "start" \| "center" \| "end" \| "keep-offset", "offsetGrid": 8 }`. `keep-offset` preserves the offset within the band but still snaps `offsetGrid` if given.                                                                  |
| `divisions` | numeric extents, angular | Divide a range into n equal parts: `{ "count": 12, "of": "parent" }` — positions at twelfths of the container (column layouts).                                                                                                                            |
| `ratio`     | sizes                    | Keep the aspect ratio or snap to preferred ratios: `{ "ratios": [1, 1.5, 2] }`.                                                                                                                                                                            |
| `cel`       | any                      | Custom function: `{ "cel": "value < 100.0 ? snap(value, 5.0) : snap(value, 25.0)" }`. Receives `value` (domain value), `axis`, `zoom`, `self`, `parent`; returns the snapped domain value.                                                                 |
| `byZoom`    | any                      | Zoom-dependent rules: `{ "byZoom": [ { "maxZoom": 0.5, "rule": { "grid": { "spacing": 50 } } }, { "rule": { "grid": { "spacing": 10 } } } ] }` — the first entry whose `maxZoom` ≥ current zoom applies; the last entry without `maxZoom` is the fallback. |
| `plugin`    | any                      | `{ "plugin": "acme.snap-to-rails", "args": {…} }`.                                                                                                                                                                                                         |

Common properties of snap rules are written next to the rule key, not inside it (`{ "grid": { "spacing": 10 }, "min": 20 }`):

| Property     | Type                             | Description                                                      |
|--------------|----------------------------------|------------------------------------------------------------------|
| `min`, `max` | domain value                     | Clamp the snapped value (for sizes: minimum and maximum extent). |
| `direction`  | `"nearest"`, `"floor"`, `"ceil"` | Rounding direction. Default `"nearest"`.                         |
| `mode`       | `"always"`, `"magnetic"`         | Overrides the snapping-level mode for this rule.                 |
| `doc`        | Doc                              | Explanation for this axis.                                       |

**Calendar rules** snap timestamps using the axis's time zone and calendar:

| Property      | Type                            | Description                                                                                                                                                                        |
|---------------|---------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `unit`        | `millisecond` … `year`          | Snapping unit. `week` respects `firstDayOfWeek`; `month`, `quarter`, `year` snap to calendar boundaries (not to fixed durations).                                                  |
| `step`        | int                             | Multiples of the unit (for example 15 minutes: `{ "unit": "minute", "step": 15 }`). Steps are counted from the start of the next larger unit (15-minute steps restart every hour). |
| `align`       | `"start"`, `"end"`, `"nearest"` | Snap to the start of the unit, its end, or whichever boundary is closer. Default `"nearest"`.                                                                                      |
| `workingTime` | bool                            | Only working time of `calendar` is allowed; values in non-working time move to the nearest working boundary (in `direction`).                                                      |
| `calendar`    | id                              | Calendar to use; default: the axis calendar.                                                                                                                                       |
| `at`          | time                            | Time of day for day-level snapping (tasks start at 09:00, not midnight).                                                                                                           |

Size snapping on time axes uses durations: `{ "calendar": { "unit": "day" }, "min": "P1D" }` makes every task at least one day long and a whole number of days.

**Applying rules on an axis — algorithm.** When the user drags an element (or a handle, bendpoint or label), for each axis independently:

1. Convert the pointer's canvas position to the axis's domain value through the axis scale (and the container's nested frame, if any).
2. If snapping is disabled (globally, by the bypass modifier, or for this axis), use the raw value.
3. Compute candidates: the rule result (if `"rule"` is a target), the nearest object/guide/port/parent alignment candidates within tolerance.
4. Choose the highest-priority candidate in `targets` order that exists; for `magnetic` mode, discard candidates farther than the tolerance (measured in screen pixels after mapping back).
5. Clamp to rule `min`/`max`, axis `min`/`max` and container bounds.
6. For bound placements, write the domain value to the attribute; for free placements, to the view data.

The rule result MUST be idempotent: snapping an already snapped value returns the same value. Runtimes MUST apply snapping to programmatic changes made through tools and operations only if the specification sets `snapping.applyToProgrammatic: true` (default `false`); values typed into forms are never snapped, but a placement constraint (8.4) can reject them.

### 5.11 Snapping examples

Grid in both directions (classic node-and-edge diagram):

```json
{
  "snapProfiles": {
    "grid10": {
      "both": { "grid": { "spacing": 10 } },
      "size": { "both": { "grid": { "spacing": 10 }, "min": 20 } },
      "doc": "Everything aligns to a 10 px grid."
    }
  }
}
```

Horizontal only (a timeline of freely stacked cards):

```json
{
  "snapping": { "x": { "calendar": { "unit": "week", "align": "start" } }, "y": "none" }
}
```

Vertical only (a sequence diagram: lifelines are placed by layout on an ordinal x axis, messages snap to 20 px rows):

```json
{
  "snapping": { "x": { "bands": { "align": "center" } }, "y": { "grid": { "spacing": 20, "offset": 60 } } }
}
```

Different rules per axis and zoom (a floor plan in millimetres):

```json
{
  "snapping": {
    "x": { "byZoom": [ { "maxZoom": 0.25, "rule": { "grid": { "spacing": 500 } } },
                       { "maxZoom": 1.0,  "rule": { "grid": { "spacing": 100 } } },
                       { "rule": { "grid": { "spacing": 10 } } } ] },
    "y": "inherit-x",
    "rotation": { "step": 90 },
    "doc": "Walls snap to 10 cm, 50 cm or 1 cm depending on zoom; rotation in right angles."
  }
}
```

`"inherit-x"` / `"inherit-y"` copy the rule of the other axis, a convenience when rules are long.

Working-time snapping (15-minute slots during office hours):

```json
{
  "x": { "calendar": { "unit": "minute", "step": 15, "workingTime": true, "calendar": "office" } }
}
```

Circuit pins on a 2.54 mm pitch with magnetic port snapping:

```json
{
  "snapping": { "both": { "grid": { "spacing": 2.54 } }, "targets": ["ports", "rule"], "toleranceScreenPx": 10 }
}
```

### 5.12 Guides

| Property       | Type     | Description                                                                                   |
|----------------|----------|-----------------------------------------------------------------------------------------------|
| `smart`        | bool     | Show alignment guides to edges and centers of nearby elements while dragging. Default `true`. |
| `distribution` | bool     | Show equal-spacing guides. Default `true`.                                                    |
| `user`         | bool     | Users may drag guides out of rulers; guides are stored in view data. Default `false`.         |
| `style`        | StyleRef | Style of guide lines.                                                                         |

### 5.13 Grid display and rulers

The **visible grid** is separate from snapping (a grid can be displayed without snapping and vice versa) but defaults to mirroring the snapping rules.

| Property                   | Type                                       | Description                                                                                                       |
|----------------------------|--------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `visible`                  | bool                                       | Default `false`.                                                                                                  |
| `style`                    | `"lines"`, `"dots"`, `"crosses"`, `"none"` | Default `"lines"`.                                                                                                |
| `spacing`                  | number or `{x, y}`                         | Canvas spacing; for time axes, a calendar unit `{ "unit": "day" }`. Default: from snapping.                       |
| `majorEvery`               | int or `{x, y}`                            | Every n-th line is major.                                                                                         |
| `minorColor`, `majorColor` | Paint                                      | Colors (tokens recommended).                                                                                      |
| `minZoomForMinor`          | number                                     | Hide minor lines below this zoom.                                                                                 |
| `bands`                    | object                                     | For ordinal axes: `{ "alternate": true, "fill": [Paint, Paint], "separator": Stroke }` — zebra striping of lanes. |
| `nonWorking`               | Style                                      | For time axes: fill for non-working time.                                                                         |

A **Ruler** (axis property `ruler`) configures rulers and headers: `visible`, `position` (`"top"`, `"bottom"`, `"left"`, `"right"`), `size`, and `levels` — a list of header rows for multi-level time scales:

```json
{
  "ruler": {
    "position": "top",
    "levels": [
      { "unit": "month", "format": "MMMM yyyy" },
      { "unit": "week",  "format": "'W'w",  "minZoom": 0.5 },
      { "unit": "day",   "format": "EEE d", "minZoom": 1.0 }
    ]
  }
}
```

Formats use Unicode LDML date patterns for time axes and number patterns for numeric axes; ordinal axes show category labels.


---

## 6. Layer 3 — Notation (visual definition)

The notation layer defines the concrete syntax: how every node, edge, port and label looks, from a plain rectangle to a finely parameterised shape with draggable handles and embedded form widgets, and from a straight line to a rounded orthogonal route with a double casing, custom arrowheads and labels at its start, middle and end.

### 6.1 Overview and resolution

```json
{
  "notation": {
    "theme":   { "tokens": {}, "modes": { "dark": {} } },
    "styles":  { "base": {}, "state": { "extends": "base" } },
    "shapes":  { "folder": {} },
    "markers": { "openDiamond": {} },
    "icons":   { "bolt": { "svg": "…" } },
    "nodes":   { "State": {} },
    "edges":   { "Transition": {} },
    "ports":   { "Block.in": {} },
    "canvas":  {},
    "doc":     "…"
  }
}
```

**Resolution of a visual property.** For a given element, the value of a visual property (for example `stroke.width` of a node's body) is resolved in this order; the first value found wins:

1. **Per-element style override** stored in the DID definition's view data (11.6), if the specification allows overrides.
2. **Interaction state** styles (`states.selected`, `states.hover`, …) that are active, in the fixed priority `dragging` > `selected` > `focused` > `hover` > `highlighted` > `dropTarget` > `invalid` > `warning` > `disabled`.
3. **Conditional styles** (`conditions`) whose `when` expression is true, in declaration order (later wins).
4. **Variants** (`variants`) whose `when` is true — they may replace shape, size, labels and style.
5. The notation's own `style` (inline or referenced), with `extends` chains resolved.
6. The notation of the nearest supertype (C3 order), repeating steps 2–5.
7. The viewpoint override and then the global `notation.defaults` for the element kind.
8. The built-in default (Appendix B.1).

Properties merge per key: a state style that only sets `stroke.color` keeps the resolved `stroke.width`.

### 6.2 Theme and tokens

Tokens give colors, fonts and sizes semantic names so that one specification renders correctly in light mode, dark mode, high contrast and the brand palette of an organisation.

```json
{
  "theme": {
    "tokens": {
      "color.surface":      "#FFFFFF",
      "color.text":         "#1F1E1C",
      "color.border":       "#8A8880",
      "color.accent":       "#534AB7",
      "color.accent.soft":  "#EEEDFE",
      "color.danger":       "#E24B4A",
      "font.body":          "Inter, system-ui, sans-serif",
      "font.mono":          "JetBrains Mono, monospace",
      "size.corner":        8,
      "size.stroke":        1.25
    },
    "modes": {
      "dark": {
        "color.surface":     "#1F1E1C",
        "color.text":        "#F1EFE8",
        "color.border":      "#B4B2A9",
        "color.accent.soft": "#3C3489"
      },
      "high-contrast": { "color.border": "#000000", "size.stroke": 2 }
    },
    "defaultMode": "light",
    "followSystem": true
  }
}
```

| Property       | Type                     | Description                                                                                              |
|----------------|--------------------------|----------------------------------------------------------------------------------------------------------|
| `tokens`       | map qualified id → value | Base token values (colors, font stacks, numbers, strings).                                               |
| `modes`        | map mode → token map     | Overrides per mode. Mode names are free; `light`, `dark` and `high-contrast` are recognised by runtimes. |
| `defaultMode`  | string                   | Initial mode.                                                                                            |
| `followSystem` | bool                     | Follow the operating system's light/dark preference.                                                     |
| `extends`      | string                   | Name of an imported theme to extend (`"corp.theme"`).                                                    |

Tokens are referenced with `{ "token": "color.accent" }` in any Bindable position, and from CEL with `token('color.accent')`. Runtimes MAY let users switch modes; DID definitions never store resolved token values unless a user explicitly overrides a style.

### 6.3 Paint

A **Paint** fills an area or colors a stroke.

| Form                    | Example                                                                                                                         |
|-------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| Color                   | `"#EEEDFE"`, `"transparent"`, `"currentColor"`                                                                                  |
| Token / CEL / attribute | `{ "token": "color.accent" }`, `{ "cel": "self.done ? '#639922' : '#BA7517'" }`, `{ "attribute": "color" }`                     |
| `none`                  | `"none"` — no paint (unlike `transparent`, `none` is not hit-testable).                                                         |
| Linear gradient         | `{ "type": "linear", "angle": 90, "stops": [ { "offset": 0, "color": "#FAC775" }, { "offset": 1, "color": "#EF9F27" } ] }`      |
| Radial gradient         | `{ "type": "radial", "center": [0.5, 0.5], "radius": 0.7, "stops": [ … ] }`                                                     |
| Pattern                 | `{ "type": "pattern", "pattern": "hatch", "color": "#888780", "background": "#FFFFFF", "spacing": 6, "angle": 45, "width": 1 }` |
| Image                   | `{ "type": "image", "src": "icons/brick.png", "fit": "tile", "opacity": 0.5 }`                                                  |

Built-in patterns: `hatch`, `cross-hatch`, `dots`, `grid`, `vertical`, `horizontal`, `zigzag`, `checker`, `bricks`. Patterns are also RECOMMENDED as a secondary visual cue when color distinguishes categories, for accessibility (6.15).

Gradient `stops` accept Bindable colors, so gradients can follow tokens. `offset` is a fraction.

### 6.4 Stroke and line styles

A **Stroke** describes how an outline or a line is drawn. The same object is used for node outlines, edge lines, separators, grid lines and marker outlines.

| Property           | Type                                               | Description                                                                                                                                |
|--------------------|----------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| `color`            | Paint                                              | Default `{ "token": "color.border" }` or `#5F5E5A`.                                                                                        |
| `width`            | Bindable number                                    | Canvas units. Default 1.                                                                                                                   |
| `minWidthScreenPx` | number                                             | Lines never render thinner than this on screen when zoomed out (hairline preservation).                                                    |
| `opacity`          | fraction                                           | Default 1.                                                                                                                                 |
| `dash`             | DashStyle                                          | See below. Default `"solid"`.                                                                                                              |
| `dashOffset`       | number                                             | Phase of the dash pattern.                                                                                                                 |
| `dashScale`        | `"absolute"`, `"width"`                            | Whether dash lengths are canvas units or multiples of `width`. Default `"width"`.                                                          |
| `cap`              | `"butt"`, `"round"`, `"square"`                    | Line cap. Default `"butt"`.                                                                                                                |
| `join`             | `"miter"`, `"round"`, `"bevel"`                    | Line join. Default `"miter"`.                                                                                                              |
| `miterLimit`       | number                                             | Default 4.                                                                                                                                 |
| `align`            | `"center"`, `"inside"`, `"outside"`                | Stroke alignment on closed outlines. Default `"center"`.                                                                                   |
| `double`           | `{ "gap": 2, "innerColor": Paint }`                | Draw two parallel lines (UML composition borders, "is-a" rails, road casings).                                                             |
| `casing`           | `{ "color": Paint, "width": 4 }`                   | Draw a wider line underneath (halo). Makes edges readable where they cross others.                                                         |
| `effect`           | LineEffect                                         | Geometric effect along the path (below).                                                                                                   |
| `flow`             | `{ "speed": 20, "direction": "forward" }`          | Animated dash movement along the path (data flow, active connections). Runtimes MUST honour reduced-motion preferences and MAY disable it. |
| `sketch`           | `{ "roughness": 1.2, "bowing": 1, "seed": {cel} }` | Hand-drawn rendering. The seed SHOULD be derived from the element id so the sketch is stable.                                              |

**DashStyle** is one of the named presets or an explicit array of alternating dash and gap lengths:

| Preset         | Pattern (in multiples of width) | Typical use                                     |
|----------------|---------------------------------|-------------------------------------------------|
| `solid`        | –                               | Default                                         |
| `dashed`       | `[4, 3]`                        | Optional, dependency, inheritance of interfaces |
| `long-dash`    | `[8, 4]`                        | Boundaries, planned items                       |
| `short-dash`   | `[2, 2]`                        |                                                 |
| `dotted`       | `[0.1, 2]` with round cap       | Annotations, notes, traces                      |
| `dash-dot`     | `[6, 3, 0.1, 3]` with round cap | Center lines, axes                              |
| `dash-dot-dot` | `[6, 3, 0.1, 3, 0.1, 3]`        | Phantom lines                                   |
| `[n, …]`       | explicit                        | Anything else                                   |

**LineEffect** modifies the geometry of a line or outline:

| `type`   | Parameters                                                  | Result                                                                   |
|----------|-------------------------------------------------------------|--------------------------------------------------------------------------|
| `wave`   | `amplitude`, `wavelength`                                   | Sine wave along the path (signals, "wireless", uncertain dependencies).  |
| `zigzag` | `amplitude`, `wavelength`                                   | Zigzag (lightning, "breaks" on axes).                                    |
| `loops`  | `radius`, `spacing`                                         | Coil (springs, inductors).                                               |
| `ticks`  | `length`, `spacing`, `side` (`"left"`, `"right"`, `"both"`) | Tick marks along the line (railways, fences, boundaries).                |
| `arrows` | `spacing`, `marker`                                         | Repeated small arrowheads along the line (flow direction on long edges). |
| `offset` | `distance`                                                  | Parallel offset (lane markings).                                         |
| `plugin` | `name`, `args`                                              | Custom effect.                                                           |

Effects apply to the path before dashes, so a dashed wave is possible. Effects never change the hit-test geometry, which follows the base path widened by `hitWidth` (6.10).

### 6.5 Text and fonts

A **Font** object:

| Property          | Type                                                    | Description                                                                                  |
|-------------------|---------------------------------------------------------|----------------------------------------------------------------------------------------------|
| `family`          | Bindable string                                         | Font stack. Default `{ "token": "font.body" }` or `"system-ui, sans-serif"`.                 |
| `size`            | Bindable number                                         | Canvas units. Default 14.                                                                    |
| `minSizeScreenPx` | number                                                  | Text below this on-screen size is hidden or replaced by a placeholder bar (level of detail). |
| `weight`          | 100–900 or `"normal"`, `"bold"`                         | Default 400.                                                                                 |
| `style`           | `"normal"`, `"italic"`                                  |                                                                                              |
| `color`           | Paint                                                   | Default `{ "token": "color.text" }`.                                                         |
| `lineHeight`      | number                                                  | Multiple of size. Default 1.3.                                                               |
| `letterSpacing`   | number                                                  | Canvas units.                                                                                |
| `decoration`      | `"none"`, `"underline"`, `"line-through"`, `"overline"` | UML static members are underlined, for instance.                                             |
| `transform`       | `"none"`, `"uppercase"`, `"lowercase"`, `"capitalize"`  |                                                                                              |
| `variant`         | `"normal"`, `"small-caps"`, `"tabular-nums"`            |                                                                                              |
| `halo`            | `{ "color": Paint, "width": 3 }`                        | Outline around glyphs for legibility over lines and fills.                                   |

Font files MAY be declared in `notation.fonts`: `{ "Inter": { "src": ["fonts/Inter.woff2"], "weights": [400, 600] } }`. Runtimes that cannot load a font use the next family in the stack.

### 6.6 Styles

A **Style** bundles visual properties. Styles are declared in `notation.styles` and referenced by name, or written inline.

| Property        | Type                                         | Description                                                            |
|-----------------|----------------------------------------------|------------------------------------------------------------------------|
| `extends`       | style name or name[]                         | Inherit from other styles (merged left to right, then own properties). |
| `fill`          | Paint                                        | Area fill.                                                             |
| `fillOpacity`   | fraction                                     |                                                                        |
| `stroke`        | Stroke                                       | Outline or line.                                                       |
| `opacity`       | fraction                                     | Whole-element opacity.                                                 |
| `cornerRadius`  | number or `[tl, tr, br, bl]`                 | For shapes that support it.                                            |
| `shadow`        | `{dx, dy, blur, color}` or `"none"`          | Drop shadow. Runtimes MAY omit shadows in low-power modes.             |
| `font`          | Font                                         | Default font for labels of the element.                                |
| `textAlign`     | `"left"`, `"center"`, `"right"`, `"justify"` |                                                                        |
| `verticalAlign` | `"top"`, `"middle"`, `"bottom"`              |                                                                        |
| `padding`       | Insets                                       | Inner spacing for labels and content.                                  |
| `cursor`        | CSS cursor name                              | Pointer cursor over the element.                                       |
| `filter`        | `"none"`, `"grayscale"`, `"blur"`            | Visual filter (for disabled or ghost elements).                        |
| `blend`         | CSS blend mode                               |                                                                        |
| `visible`       | Bindable bool                                |                                                                        |

```json
{
  "styles": {
    "base":     { "fill": { "token": "color.surface" },
                  "stroke": { "color": { "token": "color.border" }, "width": { "token": "size.stroke" } },
                  "font": { "size": 13 } },
    "emphasis": { "extends": "base", "stroke": { "width": 2 }, "font": { "weight": 600 } },
    "ghost":    { "extends": "base", "opacity": 0.5, "stroke": { "dash": "dashed" } }
  }
}
```

**Interaction states.** Every node, edge, port and label notation MAY declare `states`, a map from state to Style:

| State         | Active when                                                                                          |
|---------------|------------------------------------------------------------------------------------------------------|
| `hover`       | Pointer is over the element.                                                                         |
| `selected`    | Element is in the selection.                                                                         |
| `focused`     | Element has keyboard focus.                                                                          |
| `dragging`    | Element is being moved or resized.                                                                   |
| `highlighted` | Highlighted by search, a problem link, a hook action or a related selection.                         |
| `dropTarget`  | A dragged element can be dropped into this container or connected to this element.                   |
| `dropReject`  | A dragged element cannot be dropped or connected here (a `connect`/`containment` constraint failed). |
| `invalid`     | The element has at least one problem with severity `error`.                                          |
| `warning`     | The element has at least one problem with severity `warning` (and none with `error`).                |
| `disabled`    | The element is read-only (locked, or `enabled` of its notation is false).                            |
| `editing`     | A label of the element is being edited inline.                                                       |

Runtimes provide sensible defaults for `hover`, `selected`, `dropTarget`, `dropReject`, `invalid` and `warning` (for example a selection outline and a red problem badge) that apply when the specification declares none.

**Conditional styles** apply when an expression holds:

```json
{
  "conditions": [
    { "when": "self.priority == 'high'", "style": { "stroke": { "color": { "token": "color.danger" }, "width": 2 } },
      "doc": "High-priority tasks have a red border." },
    { "when": "self.done", "style": "ghost" }
  ]
}
```

### 6.7 Shapes: built-in primitives

A node's body is a **shape**. A shape reference is either a name (`"ellipse"`), or an object with a `type` and parameters, where every parameter is Bindable:

```json
{
  "shape": "roundedRect",
  "shape": { "type": "roundedRect", "params": { "radius": 12 } },
  "shape": { "type": "polygon", "params": { "sides": { "cel": "self.corners" }, "rotation": 0 } },
  "shape": { "type": "note", "params": { "fold": 14 }, "doc": "Folded corner signals a comment." }
}
```

The standard library offers these primitives (all parameters optional; defaults in Appendix B.2):

| Shape           | Parameters                                                                        | Notes                                                            |
|-----------------|-----------------------------------------------------------------------------------|------------------------------------------------------------------|
| `rect`          | –                                                                                 |                                                                  |
| `roundedRect`   | `radius`, `radii` `[tl,tr,br,bl]`                                                 |                                                                  |
| `pill`          | –                                                                                 | Stadium; radius = half the smaller side.                         |
| `ellipse`       | –                                                                                 | Circle when width = height.                                      |
| `circle`        | –                                                                                 | Always circular; size is min(width, height).                     |
| `diamond`       | –                                                                                 | Rhombus touching the bounds' midpoints.                          |
| `triangle`      | `apex` (fraction along top edge), `direction` (`up`, `down`, `left`, `right`)     |                                                                  |
| `parallelogram` | `skew` (fraction or length), `direction` (`right`, `left`)                        | Data, I/O.                                                       |
| `trapezoid`     | `inset` (fraction), `direction`                                                   | Manual operations.                                               |
| `hexagon`       | `inset`, `orientation` (`flat`, `pointy`)                                         | Preparation.                                                     |
| `octagon`       | `inset`                                                                           |                                                                  |
| `polygon`       | `sides`, `rotation`, `points` (explicit fractional points)                        | Regular or explicit polygon.                                     |
| `star`          | `points`, `innerRadius` (fraction), `rotation`                                    |                                                                  |
| `cross`         | `thickness` (fraction)                                                            | Plus shape.                                                      |
| `cylinder`      | `cap` (height of the ellipse cap), `orientation` (`vertical`, `horizontal`)       | Databases, storage.                                              |
| `document`      | `wave` (amplitude fraction)                                                       | Wavy bottom.                                                     |
| `multiDocument` | `wave`, `offset`, `count`                                                         | Stacked documents.                                               |
| `note`          | `fold` (size of the folded corner)                                                | Comments.                                                        |
| `folder`        | `tabWidth`, `tabHeight`, `tabPosition` (`left`, `right`)                          | Packages.                                                        |
| `frame`         | `tabWidth`, `tabHeight`                                                           | UML frames with name tab.                                        |
| `cloud`         | `bumps`                                                                           | External systems.                                                |
| `process`       | `inset`                                                                           | Predefined process (double side bars).                           |
| `delay`         | –                                                                                 | D-shape.                                                         |
| `display`       | –                                                                                 | Flowchart display.                                               |
| `manualInput`   | `slope`                                                                           | Sloped top.                                                      |
| `offPage`       | `pointer`                                                                         | Pentagon pointing down.                                          |
| `callout`       | `pointerX`, `pointerY` (fractions, may lie outside 0–1), `pointerWidth`, `radius` | Speech bubble with a tail.                                       |
| `blockArrow`    | `direction`, `headLength`, `shaftThickness`, `doubleHeaded`                       | Arrow as a node.                                                 |
| `chevron`       | `depth`, `direction`                                                              | Process steps.                                                   |
| `actor`         | –                                                                                 | Stick figure; label below by default.                            |
| `component`     | –                                                                                 | UML component icon rectangle.                                    |
| `line`          | `orientation` (`horizontal`, `vertical`)                                          | A line node (separators, lifeline bodies).                       |
| `bracket`       | `side`, `curl`                                                                    | Braces for annotations.                                          |
| `text`          | –                                                                                 | No visible body; just the label (free text).                     |
| `image`         | `src` (Bindable URI), `fit` (`contain`, `cover`, `fill`, `none`), `crop`          | Image nodes.                                                     |
| `icon`          | `icon` (IconRef), `padding`                                                       | Icon filling the node.                                           |
| `none`          | –                                                                                 | Invisible body; used for pure containers or label-only elements. |

Every built-in shape defines its **outline** (for edge anchoring and hit testing) and its **text area** (where the main label goes). For example, a cylinder's text area excludes its top cap; an actor's text area lies below the figure.

### 6.8 Custom shapes

When no primitive fits, a specification declares its own shapes in `notation.shapes`. A custom shape can be as simple as a static SVG path, or a fully parameterised, handle-editable shape whose geometry is computed with CEL.

| Property       | Type                                       | Description                                                                                                        |
|----------------|--------------------------------------------|--------------------------------------------------------------------------------------------------------------------|
| `label`, `doc` |                                            | Shown in shape pickers and documentation.                                                                          |
| `params`       | map → ShapeParam                           | Parameters (below).                                                                                                |
| `path`         | PathDef                                    | A single path (below).                                                                                             |
| `parts`        | ShapePart[]                                | A composite of several shapes (below).                                                                             |
| `svg`          | string                                     | Inline SVG markup scaled into the bounds (static shapes only). MUST be sanitised (section 16).                     |
| `plugin`       | `{name, args}`                             | Rendered by a plugin.                                                                                              |
| `outline`      | `"path"`, `"bounds"`, `"ellipse"`, PathDef | Geometry used for edge anchoring and hit testing. Default: the path, or the union of parts marked `outline: true`. |
| `textArea`     | Box                                        | Where the main label is laid out, in shape coordinates. Default: the bounds minus padding.                         |
| `handles`      | Handle[]                                   | Interactive handles that edit parameters (below).                                                                  |
| `defaultSize`  | Size                                       | Suggested size when used without an explicit node size.                                                            |
| `aspectRatio`  | number                                     | Fixed aspect ratio, if any.                                                                                        |
| `scaling`      | ScaleMode                                  | How static geometry maps into bounds (below).                                                                      |

Exactly one of `path`, `parts`, `svg` or `plugin` MUST be present.

**Shape coordinate context.** Geometry expressions (GeomExpr, 2.5c) are evaluated with these variables:

| Variable | Type    | Meaning                                                |
|----------|---------|--------------------------------------------------------|
| `w`, `h` | double  | Width and height of the node's bounds in canvas units. |
| `p`      | map     | Resolved parameter values (`p.fold`).                  |
| `self`   | Element | The model element (attributes available, read-only).   |
| `env`    | Env     | Zoom, theme mode, locale.                              |

Coordinates are relative to the top-left of the bounds; x grows right, y grows down, regardless of the coordinate system orientation.

**ShapeParam**

| Property       | Type                                                           | Description                                                                                                          |
|----------------|----------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| `type`         | `"number"`, `"int"`, `"bool"`, `"enum"`, `"color"`, `"string"` | **Required.**                                                                                                        |
| `default`      | value or `{cel}`                                               | Default value; CEL defaults may depend on `w` and `h` (for example `"min(w, h) * 0.15"`).                            |
| `min`, `max`   | GeomExpr                                                       | Bounds; may depend on `w` and `h`.                                                                                   |
| `values`       | string[]                                                       | For `enum`.                                                                                                          |
| `unit`         | `"length"`, `"fraction"`, `"angle"`, `"count"`                 | Semantics for property forms and handle behavior.                                                                          |
| `label`, `doc` |                                                                | Shown in the shape parameter panel.                                                                                  |
| `persist`      | `"view"`, `"none"`                                             | Whether user-adjusted values (via handles or the style panel) are stored per element in view data. Default `"view"`. |

**PathDef** — a path is either an SVG path string in a declared `viewBox`, scaled into the bounds, or a list of segments whose coordinates are GeomExprs:

```json
{
  "path": { "viewBox": [0, 0, 100, 60], "d": "M0 10 Q50 -10 100 10 L100 50 Q50 70 0 50 Z" }
}
```

```json
{
  "path": {
    "segments": [
      { "op": "M", "x": 0,            "y": 0 },
      { "op": "L", "x": "w - p.fold", "y": 0 },
      { "op": "L", "x": "w",          "y": "p.fold" },
      { "op": "L", "x": "w",          "y": "h" },
      { "op": "L", "x": 0,            "y": "h" },
      { "op": "Z" }
    ]
  }
}
```

| `op`     | Fields                                                | Meaning                         |
|----------|-------------------------------------------------------|---------------------------------|
| `M`      | `x`, `y`                                              | Move to.                        |
| `L`      | `x`, `y`                                              | Line to.                        |
| `H`, `V` | `x` or `y`                                            | Horizontal or vertical line to. |
| `Q`      | `cx`, `cy`, `x`, `y`                                  | Quadratic Bézier.               |
| `C`      | `c1x`, `c1y`, `c2x`, `c2y`, `x`, `y`                  | Cubic Bézier.                   |
| `A`      | `rx`, `ry`, `rotation`, `largeArc`, `sweep`, `x`, `y` | Elliptical arc (SVG semantics). |
| `R`      | `x`, `y`, `w`, `h`, `r`                               | Rounded rectangle sub-path.     |
| `E`      | `cx`, `cy`, `rx`, `ry`                                | Ellipse sub-path.               |
| `Z`      | –                                                     | Close.                          |

A path MAY have several sub-paths and a `fillRule` (`"nonzero"` default, `"evenodd"`). Each segment MAY carry `when` (Expression) to include it conditionally, which enables shapes whose topology depends on parameters (for example an optional double border).

**ScaleMode** controls how `viewBox` geometry and `svg` content fit the bounds: `"stretch"` (default), `"uniform"` (keep aspect ratio, centered), `"none"` (1:1 at the top-left), or `{ "nineSlice": [top, right, bottom, left] }` — the corners of the viewBox keep their size and only the middle stretches, so rounded corners and tabs do not distort.

**ShapePart** — composite shapes combine parts, each of which is itself a shape (built-in or custom) with its own box and style. This is how an actor, a database with a label band, or a UML class header is composed.

| Property  | Type                       | Description                                                           |
|-----------|----------------------------|-----------------------------------------------------------------------|
| `id`      | identifier                 | Name of the part; styles and states can address parts (`partStyles`). |
| `shape`   | ShapeRef                   | The part's shape.                                                     |
| `box`     | `{x, y, w, h}` of GeomExpr | Part bounds in shape coordinates.                                     |
| `style`   | StyleRef                   | Style of the part, merged over the node style.                        |
| `rotate`  | GeomExpr                   | Rotation in degrees around the part's center.                         |
| `when`    | Expression                 | Include only when true.                                               |
| `outline` | bool                       | Part contributes to the connection outline.                           |
| `hit`     | bool                       | Part is hit-testable. Default `true`.                                 |

**Handles** let users fine-tune a shape directly on the canvas — dragging the fold of a note, the tail of a callout, the skew of a parallelogram — like the yellow diamonds of classic drawing tools.

| Property           | Type                               | Description                                                                                                                                                                       |
|--------------------|------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `param`            | param name                         | The parameter the handle edits. **Required.**                                                                                                                                     |
| `x`, `y`           | GeomExpr                           | Handle position in shape coordinates, computed from the current parameter values.                                                                                                 |
| `axis`             | `"x"`, `"y"`, `"both"`, `"radial"` | Direction the handle moves in.                                                                                                                                                    |
| `value`            | Expression                         | Inverse mapping: computes the new parameter value from the pointer position `px`, `py` (shape coordinates), for example `"w - px"`. Default: the pointer coordinate along `axis`. |
| `yParam`, `yValue` | param name, Expression             | For two-parameter handles (`axis: "both"`).                                                                                                                                       |
| `snap`             | SnapRule                           | Snapping of the parameter value (for example `{ "grid": { "spacing": 2 } }` or `{ "values": [0, 0.25, 0.5] }`).                                                                   |
| `cursor`, `style`  |                                    | Handle appearance.                                                                                                                                                                |
| `label`, `doc`     |                                    | Tooltip while hovering or dragging ("Fold size: 14 px").                                                                                                                          |

**Example — a callout with a draggable tail and adjustable radius.**

```json
{
  "shapes": {
    "speech": {
      "label": "Speech bubble",
      "doc": "Drag the round handle to point the tail, the square handle to change the corner radius.",
      "params": {
        "tipX":   { "type": "number", "unit": "fraction", "default": 0.2, "min": -0.5, "max": 1.5 },
        "tipY":   { "type": "number", "unit": "fraction", "default": 1.4, "min": -0.8, "max": 1.8 },
        "base":   { "type": "number", "unit": "fraction", "default": 0.3, "min": 0.1, "max": 0.8 },
        "radius": { "type": "number", "unit": "length", "default": 8, "min": 0, "max": "min(w, h) / 2" }
      },
      "parts": [
        { "id": "body", "shape": { "type": "roundedRect", "params": { "radius": { "param": "radius" } } },
          "box": { "x": 0, "y": 0, "w": "w", "h": "h" }, "outline": true },
        { "id": "tail",
          "shape": { "path": { "segments": [
            { "op": "M", "x": "w * p.base",        "y": "h - 1" },
            { "op": "L", "x": "w * p.tipX",        "y": "h * p.tipY" },
            { "op": "L", "x": "w * (p.base + 0.15)", "y": "h - 1" },
            { "op": "Z" } ] } },
          "box": { "x": 0, "y": 0, "w": "w", "h": "h" } }
      ],
      "textArea": { "x": 10, "y": 8, "w": "w - 20", "h": "h - 16" },
      "handles": [
        { "param": "tipX", "yParam": "tipY", "axis": "both",
          "x": "w * p.tipX", "y": "h * p.tipY",
          "value": "px / w", "yValue": "py / h", "label": "Tail tip" },
        { "param": "radius", "axis": "x", "x": "p.radius", "y": 0, "value": "px",
          "snap": { "grid": { "spacing": 2 } }, "label": "Corner radius" }
      ]
    }
  }
}
```

**Example — a static path from a viewBox with nine-slice scaling.**

```json
{
  "ticket": {
    "path": { "viewBox": [0, 0, 120, 60],
              "d": "M8 0 H112 A8 8 0 0 0 120 8 V52 A8 8 0 0 0 112 60 H8 A8 8 0 0 0 0 52 V8 A8 8 0 0 0 8 0 Z" },
    "scaling": { "nineSlice": [8, 8, 8, 8] }
  }
}
```

### 6.9 Node notation

`notation.nodes` maps node type names to **NodeNotation** objects.

| Property                                             | Type                                                                    | Description                                                                             |
|------------------------------------------------------|-------------------------------------------------------------------------|-----------------------------------------------------------------------------------------|
| `shape`                                              | ShapeRef                                                                | Body shape. Default `"rect"`.                                                           |
| `style`                                              | StyleRef or StyleRef[]                                                  | Base style(s).                                                                          |
| `partStyles`                                         | map part id → StyleRef                                                  | Styles for parts of composite shapes.                                                   |
| `size`                                               | SizeSpec                                                                | Default, minimum, maximum size and resize behavior (below).                             |
| `placement`                                          | Placement                                                               | Coordinate binding (5.8).                                                               |
| `snapping`                                           | Snapping                                                                | Per-type snapping override (5.9).                                                       |
| `rotation`                                           | `{allowed, default, step}`                                              | Whether nodes may rotate; rotation is stored in view data.                              |
| `labels`                                             | Label[]                                                                 | Text labels (6.12). If absent, one centered label bound to the type's `labelAttribute`. |
| `compartments`                                       | Compartment[]                                                           | Stacked regions listing items (below).                                                  |
| `form`                                               | EmbeddedForm                                                            | Form widgets drawn inside the node (7.6).                                               |
| `icon`                                               | NodeIcon                                                                | Icon placement (below).                                                                 |
| `badges`                                             | Badge[]                                                                 | Small indicators at corners or edges (below).                                           |
| `ports`                                              | map port name → PortNotation                                            | Port visuals (below).                                                                   |
| `anchors`                                            | AnchorSpec                                                              | Where edges attach when no port is used (below).                                        |
| `container`                                          | ContainerSpec                                                           | How children are laid out and clipped (below).                                          |
| `variants`                                           | Variant[]                                                               | Conditional alternative notations (below).                                              |
| `lod`                                                | LodRule[]                                                               | Level of detail by zoom (below).                                                        |
| `states`                                             | map state → Style                                                       | Interaction states (6.6).                                                               |
| `conditions`                                         | `{when, style, doc}`[]                                                  | Conditional styles (6.6).                                                               |
| `tooltip`                                            | LocalizedText or `{cel}`                                                | Hover text. Default: the type's `doc.summary`.                                          |
| `layer`                                              | `"background"`, `"default"`, `"foreground"`, or int                     | Rendering layer (6.16).                                                                 |
| `selectable`, `deletable`, `copyable`, `connectable` | Bindable bool                                                           | Interaction permissions (default `true`).                                               |
| `hitPaddingScreenPx`                                 | number                                                                  | Extra hit area around the outline.                                                      |
| `doubleClick`                                        | `"editLabel"`, `"openForm"`, `"drillDown"`, `"none"`, or operation name | Double-click action. Default `"editLabel"`.                                             |
| `drillDown`                                          | `{viewpoint, filter}`                                                   | Open a sub-diagram (for example a sub-process) when drilling down.                      |
| `accessibility`                                      | `{role, name, description}`                                             | Accessible name and description (6.15).                                                 |
| `doc`                                                | Doc                                                                     | Documents the notation itself ("Rounded corners mark states, circles pseudo-states").   |

**SizeSpec**

| Property          | Type                                                            | Description                                                                                                                            |
|-------------------|-----------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `default`         | Size                                                            | Size on creation.                                                                                                                      |
| `min`, `max`      | Size                                                            | Limits (`null` for unbounded in one dimension).                                                                                        |
| `fixed`           | Size                                                            | Shorthand for `default = min = max` and not resizable.                                                                                 |
| `resizable`       | bool, `"horizontal"`, `"vertical"`                              | Default `true`.                                                                                                                        |
| `aspectRatio`     | number or `"keep"`                                              | Fixed ratio or keep the ratio of the default size while resizing.                                                                      |
| `autoSize`        | `"none"`, `"fitContent"`, `"fitWidth"`, `"fitHeight"`, `"grow"` | Size follows content: labels, compartments, children, embedded forms. `grow` fits content but never shrinks below the user's size.     |
| `width`, `height` | Bindable number                                                 | Computed or attribute-bound size in canvas units (for example a bar chart node). Placement `width`/`x2` take precedence on bound axes. |

**Compartments** are stacked horizontal regions inside a node that list items — class attributes and operations, table columns, BPMN lanes' contents, checklist items.

| Property                   | Type                                                       | Description                                                                                                                  |
|----------------------------|------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------|
| `id`                       | identifier                                                 | **Required.**                                                                                                                |
| `title`                    | LocalizedText                                              | Optional header text.                                                                                                        |
| `items`                    | `{attribute}`, `{children}`, or `{cel}`                    | Source list: a `many` attribute, children of certain types (`{ "children": ["Column"], "slot": "columns" }`), or a CEL list. |
| `itemText`                 | Bindable string                                            | Text per item; the context adds `item` and `index`. For child elements, a label binding writes back.                         |
| `itemIcon`                 | Bindable IconRef                                           | Icon per item.                                                                                                               |
| `itemStyle`                | StyleRef                                                   | Style of every item.                                                                                                         |
| `itemConditions`           | `{when, style}`[]                                          | Conditional item styles; `when` sees `item` and `index` (for example primary-key columns underlined).                        |
| `layout`                   | `"vertical"` (default), `"horizontal"`, `"grid"`, `"wrap"` | Arrangement of items.                                                                                                        |
| `separator`                | Stroke or `"none"`                                         | Line above the compartment.                                                                                                  |
| `size`                     | `"auto"` or number or `{min, max}`                         | Height.                                                                                                                      |
| `overflow`                 | `"grow"`, `"clip"`, `"scroll"`, `"ellipsis"`               | When items exceed `max`. `ellipsis` shows "… 3 more".                                                                        |
| `maxItems`                 | int                                                        | Items shown before overflow.                                                                                                 |
| `collapsible`, `collapsed` | bool, Bindable bool                                        | Collapse state persisted in view data.                                                                                       |
| `emptyText`                | LocalizedText                                              | Placeholder when empty.                                                                                                      |
| `editable`                 | `{add, remove, reorder, inline}` of bool                   | In-place editing of items.                                                                                                   |
| `visible`                  | Bindable bool                                              |                                                                                                                              |
| `padding`, `style`         |                                                            |                                                                                                                              |

**NodeIcon**: `{ "icon": IconRef, "position": Position, "size": 16, "color": Paint, "visible": Bindable }`. **Badge**: `{ "id", "position": Position, "offset": [dx, dy], "shape": ShapeRef, "text": Bindable string, "icon": IconRef, "style": StyleRef, "size", "visible": Bindable bool, "tooltip", "onClick": operation }` — for example a problem counter, a lock, a stereotype glyph, a progress ring.

**Positions** inside a node are one of `"center"`, `"top"`, `"bottom"`, `"left"`, `"right"`, `"top-left"`, `"top-right"`, `"bottom-left"`, `"bottom-right"`, the same prefixed with `outside-` (for example `"outside-bottom"` below the node, as for actors and events), or an object `{ "anchor": [fx, fy], "offset": [dx, dy], "align": "center" }`.

**Ports notation**

| Property          | Type                                                         | Description                                                                                     |
|-------------------|--------------------------------------------------------------|-------------------------------------------------------------------------------------------------|
| `shape`           | ShapeRef                                                     | Port shape. Default `"rect"` 8 × 8.                                                             |
| `size`            | Size                                                         |                                                                                                 |
| `style`, `states` |                                                              |                                                                                                 |
| `side`            | `"top"`, `"right"`, `"bottom"`, `"left"`, `"auto"`, Bindable | Side of the node. `auto` chooses by direction (in = left, out = right) in the layout direction. |
| `position`        | Bindable fraction or `"distribute"`                          | Position along the side; `distribute` spaces all instances evenly. Default `"distribute"`.      |
| `inset`           | number                                                       | Offset from the outline: negative = outside, 0 = centered on the outline, positive = inside.    |
| `movable`         | bool                                                         | Users may drag ports along the outline (positions stored in view).                              |
| `label`           | Label                                                        | Port label; default position `"outside"` of the side.                                           |
| `order`           | Expression                                                   | Sort key for distributed ports.                                                                 |

**AnchorSpec** — when edges attach to the node itself (not a port):

| Property | Type                                          | Description                                                                                                                                                                                                                   |
|----------|-----------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `mode`   | `"outline"`, `"center"`, `"fixed"`, `"sides"` | `outline` (default): intersection of the line towards the center with the outline; `center`: all edges aim at the center; `fixed`: only at listed points; `sides`: at the midpoint of the nearest side (orthogonal diagrams). |
| `points` | `{id, x, y}`[]                                | Fixed anchor points as fractions of the bounds.                                                                                                                                                                               |
| `gap`    | number                                        | Distance between the outline and the edge end.                                                                                                                                                                                |
| `spread` | bool                                          | Distribute several edges arriving on the same side instead of converging on one point.                                                                                                                                        |

**ContainerSpec** — for nodes whose type has `children`:

| Property          | Type                                                                  | Description                                                                                                                                    |
|-------------------|-----------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| `layout`          | `"free"`, `"stack"`, `"grid"`, `"flow"`, `"lanes"`, `"layout:<name>"` | Arrangement of children. `lanes` splits the container into bands (pools with lanes). `layout:<name>` delegates to a named layout (section 10). |
| `direction`       | `"vertical"`, `"horizontal"`                                          | For stack, flow and lanes.                                                                                                                     |
| `gap`, `padding`  | number, Insets                                                        |                                                                                                                                                |
| `columns`         | int                                                                   | For grid.                                                                                                                                      |
| `header`          | `{size, side, label, style}`                                          | Header band (title bar of a group, vertical name band of a BPMN pool on `side: "left"`).                                                       |
| `contentArea`     | Box                                                                   | Area children are placed in, in node coordinates.                                                                                              |
| `clip`            | bool                                                                  | Clip children to the content area.                                                                                                             |
| `autoGrow`        | bool                                                                  | Grow when children are moved to the edge.                                                                                                      |
| `collapsible`     | bool                                                                  | Collapsing hides children and optionally switches to a `collapsed` variant.                                                                    |
| `dropZones`       | `{slot, box, style}`[]                                                | Explicit regions that accept children of a slot (4.8).                                                                                         |
| `highlightOnDrop` | bool                                                                  | Apply the `dropTarget` state while a valid child is dragged over.                                                                              |

**Variants** switch whole parts of a notation based on model state — for example a collapsed sub-process, an event rendered differently when interrupting, a gateway symbol that depends on its kind:

```json
{
  "variants": [
    { "when": "self.kind == 'exclusive'", "doc": "XOR gateway shows an ×.",
      "icon": { "icon": "std.x", "position": "center", "size": 18 } },
    { "when": "self.kind == 'parallel'",
      "icon": { "icon": "std.plus", "position": "center", "size": 18 } },
    { "when": "self.view.collapsed", "shape": "roundedRect", "size": { "fixed": [120, 60] }, "compartments": [] }
  ]
}
```

A Variant may contain any NodeNotation property except `placement`; matching variants are applied in order over the base notation.

**Level of detail** (`lod`) implements semantic zoom: `[ { "maxZoom": 0.3, "hide": ["compartments", "badges", "form"], "labels": "primary", "shape": "rect" }, { "maxZoom": 0.1, "render": "box" } ]`. `hide` lists notation properties or label ids; `render: "box"` draws a plain filled rectangle for performance.

### 6.10 Edge notation

`notation.edges` maps relation type names — and optionally `Type.attribute` names for reference attributes that should be drawn as edges — to **EdgeNotation** objects.

| Property                                              | Type                                | Description                                                                                                                |
|-------------------------------------------------------|-------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| `line`                                                | LineSpec                            | Stroke, routing and geometry (below).                                                                                      |
| `style`                                               | StyleRef                            | Style whose `stroke` and `font` apply to line and labels.                                                                  |
| `sourceMarker`, `targetMarker`                        | MarkerRef or Bindable               | Arrowheads and end decorations (6.11). Default: `none` at source, `arrowFilled` at target for directed relations.          |
| `midMarkers`                                          | MidMarker[]                         | Decorations along the edge (below).                                                                                        |
| `labels`                                              | EdgeLabel[]                         | Labels at start, middle, end or any fraction (6.12).                                                                       |
| `anchoring`                                           | `{source, target}` of EndAnchor     | How ends attach (below).                                                                                                   |
| `selfLoop`                                            | SelfLoopSpec                        | Geometry of self loops.                                                                                                    |
| `parallel`                                            | `{spread, mode}`                    | How parallel edges between the same nodes are separated: `spread` distance and `mode` (`"offset"`, `"curve"`, `"bundle"`). |
| `jumps`                                               | JumpSpec                            | How this edge crosses others.                                                                                              |
| `snapping`                                            | Snapping                            | Bendpoint snapping override.                                                                                               |
| `hitWidthScreenPx`                                    | number                              | Width of the hit area. Default 8.                                                                                          |
| `layer`                                               | `"belowNodes"`, `"aboveNodes"`, int | Rendering layer (6.16). Default `"belowNodes"`.                                                                            |
| `states`, `conditions`, `variants`                    |                                     | As for nodes; variants may replace line, markers and labels.                                                               |
| `tooltip`, `selectable`, `deletable`, `reconnectable` |                                     | `reconnectable` controls whether users may drag an end to another element.                                                 |
| `accessibility`, `doc`                                |                                     |                                                                                                                            |

**LineSpec**

| Property                         | Type                                                        | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
|----------------------------------|-------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `stroke`                         | Stroke                                                      | Everything from 6.4: color, width, dash, caps, double, casing, effect, flow, sketch.                                                                                                                                                                                                                                                                                                                                                                                |
| `routing`                        | Routing                                                     | `"straight"` (default), `"polyline"` (user bendpoints), `"orthogonal"` (horizontal/vertical segments), `"rounded"` (orthogonal with rounded corners), `"curved"` (smooth curve through bendpoints), `"bezier"` (cubic with editable control points), `"spline"` (Catmull-Rom through points), `"arc"` (single circular arc), `"tree"` (fork from a common trunk), `"metro"` (octilinear: 0°/45°/90°), `"layout"` (from the layout algorithm), or `{ "plugin": … }`. |
| `cornerRadius`                   | number                                                      | Rounding for `orthogonal`, `metro` and `polyline`.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `curvature`                      | number                                                      | For `arc` and `curved` (0 = straight, 1 = semicircle).                                                                                                                                                                                                                                                                                                                                                                                                              |
| `avoidNodes`                     | bool                                                        | Route around nodes that are not endpoints.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `avoidPadding`                   | number                                                      | Clearance around avoided nodes.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `bendpoints`                     | `{editable, max, addOnDrag, removeOnStraighten}`            | User editing of bendpoints; `removeOnStraighten` merges collinear points.                                                                                                                                                                                                                                                                                                                                                                                           |
| `segments`                       | `{editable, keepOrthogonal}`                                | Dragging whole segments of orthogonal edges.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `minSegmentLength`               | number                                                      | Minimum length of the first and last segment (so markers do not sit on a corner).                                                                                                                                                                                                                                                                                                                                                                                   |
| `startDirection`, `endDirection` | `"auto"`, `"up"`, `"down"`, `"left"`, `"right"`, `"normal"` | Direction the line leaves or enters its node; `normal` is perpendicular to the outline.                                                                                                                                                                                                                                                                                                                                                                             |

**JumpSpec**: `{ "style": "none" | "arc" | "gap" | "square" | "sharp", "size": 6, "over": "later" | "horizontal" | "all" }` — draws a small bridge where this edge crosses another. `over` decides which of two crossing edges jumps: the later-drawn one (default), always the horizontal one, or both.

**EndAnchor**: `{ "mode": "outline" | "center" | "port" | "fixed" | "sides", "gap": 2, "points": [...] }` overrides the node's AnchorSpec for this edge type; `gap` leaves space between the node outline and the marker.

**SelfLoopSpec**: `{ "shape": "arc" | "rect" | "circle", "size": 30, "side": "top" | "right" | "bottom" | "left" | "auto", "spread": 10 }`.

**MidMarker** — decorations anywhere along the path:

| Property  | Type                                     | Description                                           |
|-----------|------------------------------------------|-------------------------------------------------------|
| `marker`  | MarkerRef                                | The decoration.                                       |
| `at`      | fraction, `"middle"`, `"start"`, `"end"` | Position along the path length. Default `"middle"`.   |
| `repeat`  | `{spacing, from, to}`                    | Repeat every `spacing` canvas units within the range. |
| `orient`  | `"auto"`, `"auto-reverse"`, angle        | Rotation relative to the path tangent.                |
| `visible` | Bindable bool                            |                                                       |

**Example — a richly decorated edge.**

```json
{
  "edges": {
    "Association": {
      "line": {
        "stroke": { "color": { "token": "color.border" }, "width": 1.25,
                    "dash": { "cel": "self.derived ? 'dashed' : 'solid'" },
                    "casing": { "color": { "token": "color.surface" }, "width": 5 } },
        "routing": "rounded", "cornerRadius": 6, "avoidNodes": true,
        "bendpoints": { "editable": true, "removeOnStraighten": true },
        "minSegmentLength": 16
      },
      "jumps": { "style": "arc", "size": 5 },
      "sourceMarker": { "cel": "self.sourceAggregation == 'composite' ? 'diamondFilled' : (self.sourceAggregation == 'shared' ? 'diamond' : 'none')" },
      "targetMarker": { "cel": "self.navigable ? 'arrow' : 'none'" },
      "labels": [
        { "id": "name",   "text": { "attribute": "name" }, "at": "middle", "side": "above", "editable": "inline" },
        { "id": "srcRole","text": { "attribute": "sourceRole" }, "at": "start", "offset": 12, "side": "above", "editable": "inline" },
        { "id": "srcMul", "text": { "attribute": "sourceMultiplicity" }, "at": "start", "offset": 12, "side": "below" },
        { "id": "tgtRole","text": { "attribute": "targetRole" }, "at": "end", "offset": 12, "side": "above", "editable": "inline" },
        { "id": "tgtMul", "text": { "attribute": "targetMultiplicity" }, "at": "end", "offset": 12, "side": "below" }
      ],
      "states": { "selected": { "stroke": { "color": { "token": "color.accent" }, "width": 2 } } }
    }
  }
}
```

### 6.11 Markers (arrowheads and end decorations)

A **marker** is drawn at an edge end (or along the edge) and oriented along the path tangent. References are a name, a name with parameters, or an inline declaration:

```json
{
  "targetMarker": "arrowFilled",
  "targetMarker": { "type": "arrow", "params": { "length": 12, "width": 10, "angle": 30 } },
  "targetMarker": { "type": "stack", "markers": ["bar", "erMany"], "spacing": 3 },
  "targetMarker": { "cel": "self.optional ? 'erZeroOrMany' : 'erOneOrMany'" }
}
```

**Built-in markers** (details and default sizes in Appendix B.3):

| Group               | Markers                                                                                                                                                                                                                                                            |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Arrows              | `arrow` (open V), `arrowFilled` (solid triangle), `arrowHollow` (outlined triangle, UML generalisation), `arrowConcave` (swept-back barbed head), `arrowThin`, `arrowDouble` (two heads), `halfArrowTop`, `halfArrowBottom` (asynchronous messages), `arrowCircle` |
| Geometric           | `diamond`, `diamondFilled`, `circle`, `circleFilled`, `square`, `squareFilled`, `dot`, `triangle`, `triangleFilled`                                                                                                                                                |
| Lines               | `bar` (perpendicular line), `doubleBar`, `cross` (×), `slash`                                                                                                                                                                                                      |
| Crow's foot (ER)    | `erOne`, `erOnlyOne`, `erMany`, `erZeroOrOne`, `erOneOrMany`, `erZeroOrMany`                                                                                                                                                                                       |
| UML and engineering | `ballSocketBall` (provided interface), `socket` (required interface), `containment` (circled plus), `ground`, `fork`                                                                                                                                               |
| Other               | `none`                                                                                                                                                                                                                                                             |

**Marker parameters** (all optional, Bindable):

| Parameter         | Description                                                                                                                                                                              |
|-------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `length`          | Size along the path (canvas units).                                                                                                                                                      |
| `width`           | Size across the path.                                                                                                                                                                    |
| `angle`           | Half-opening angle of arrows, in degrees.                                                                                                                                                |
| `scaleWithStroke` | Scale with the line width (default `true`, relative to width 1).                                                                                                                         |
| `fill`            | Paint, or `"stroke"` (same as line color, default for filled markers) or `"background"` (canvas or token `color.surface`, default for hollow markers so the line does not show through). |
| `stroke`          | Stroke of the marker outline; default inherits the line's color and width, never its dash.                                                                                               |
| `inset`           | Distance from the edge end point (move the marker back).                                                                                                                                 |
| `shorten`         | How far the line is shortened so it ends inside the marker rather than poking through its tip. Default: computed per marker.                                                             |
| `minSizeScreenPx` | Minimum on-screen size when zoomed out.                                                                                                                                                  |

**Custom markers** in `notation.markers`:

| Property         | Type                                    | Description                                                                                                         |
|------------------|-----------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| `path`           | PathDef                                 | Geometry in marker coordinates: x points along the path tangent towards the end, the tip is at the reference point. |
| `parts`          | ShapePart[]                             | Composite marker.                                                                                                   |
| `ref`            | `[x, y]`                                | Reference point placed exactly at the edge end. Default `[0, 0]`.                                                   |
| `size`           | `[length, width]`                       | Nominal size (scales `viewBox` geometry).                                                                           |
| `params`         | map → ShapeParam                        | Parameters, used in GeomExprs as `p.<name>` (plus `sw` = stroke width).                                             |
| `orient`         | `"auto"`, `"auto-start-reverse"`, angle | Default `"auto"`; source markers are automatically reversed.                                                        |
| `fill`, `stroke` | Paint, Stroke                           | Defaults as above.                                                                                                  |
| `shorten`        | GeomExpr                                | Line shortening.                                                                                                    |
| `label`, `doc`   |                                         | Shown in marker pickers and generated docs.                                                                         |

```json
{
  "markers": {
    "chevronPair": {
      "label": "Double chevron",
      "doc": "Signals a streamed (continuous) flow.",
      "params": { "gap": { "type": "number", "default": 4 } },
      "path": { "segments": [
        { "op": "M", "x": -10, "y": -5 }, { "op": "L", "x": 0,           "y": 0 }, { "op": "L", "x": -10,          "y": 5 },
        { "op": "M", "x": "-10 - p.gap", "y": -5 }, { "op": "L", "x": "-p.gap", "y": 0 }, { "op": "L", "x": "-10 - p.gap", "y": 5 } ] },
      "fill": "none",
      "shorten": 0
    }
  }
}
```

**Stacked markers** (`type: "stack"`) compose several markers from the end inward with a `spacing`, for example `bar` + `erMany` for "one or many" in some ER dialects, or an arrow followed by a circle.

### 6.12 Labels

Labels display text on nodes, edges, ports and compartments. The same **Label** object is used everywhere; edges add path-relative positioning.

| Property         | Type                                            | Description                                                                                                                                           |
|------------------|-------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`             | identifier                                      | Unique within the notation; used in view data (label offsets), `lod.hide` and styles.                                                                 |
| `text`           | Bindable string or `{ "attribute": … }`         | Content. Attribute bindings make the label editable.                                                                                                  |
| `format`         | `"plain"`, `"markdown"`, `"rich"`               | `markdown` renders a safe inline subset (emphasis, code, links); `rich` enables spans from `{ "cel": … }` returning a list of `{text, style}`.        |
| `placeholder`    | LocalizedText                                   | Shown (dimmed) when text is empty and the element is selected.                                                                                        |
| `editable`       | `false`, `"inline"`, `"multiline"`, `"form"`    | How users edit the text; `form` opens the field in the form. Requires an attribute binding. Default: `"inline"` for attribute bindings, else `false`. |
| `parse`          | `{cel, write}`                                  | Parse edited text into several attributes (for example `"name : Type"` → `name`, `type`), with `value` = entered text and `write` actions (9.4).      |
| `position`       | Position                                        | For nodes and ports (6.9).                                                                                                                            |
| `style`          | StyleRef                                        | Font, color, alignment.                                                                                                                               |
| `background`     | `{fill, stroke, padding, cornerRadius}`         | Box behind the text (tags, pills).                                                                                                                    |
| `maxWidth`       | number or `"parent"`                            | Wrap width.                                                                                                                                           |
| `wrap`           | `"none"`, `"word"`, `"char"`                    | Default `"word"` for node labels, `"none"` for edge labels.                                                                                           |
| `maxLines`       | int                                             |                                                                                                                                                       |
| `overflow`       | `"visible"`, `"clip"`, `"ellipsis"`, `"shrink"` | `shrink` reduces font size down to `font.minSizeScreenPx`.                                                                                            |
| `rotation`       | angle or `"vertical"`                           | Vertical text for lane headers.                                                                                                                       |
| `icon`           | IconRef                                         | Icon before the text.                                                                                                                                 |
| `visible`        | Bindable bool                                   |                                                                                                                                                       |
| `draggable`      | bool                                            | Users may move the label; the offset is stored in view data. Default `true` for edge labels, `false` for node labels.                                 |
| `link`           | Bindable URI                                    | Clickable label.                                                                                                                                      |
| `layer`          | `"top"`                                         | Draw the label above all elements (6.16) so it is never covered.                                                                                      |
| `tooltip`, `doc` |                                                 |                                                                                                                                                       |

**Edge label positioning** — for labels in `EdgeNotation.labels`:

| Property        | Type                                              | Description                                                                                                            |
|-----------------|---------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| `at`            | `"start"`, `"middle"`, `"end"`, or fraction       | Anchor along the path. `start` and `end` are measured from the visible ends (after markers). Default `"middle"`.       |
| `offset`        | number                                            | Distance along the path from the anchor, in canvas units (towards the middle for `start`/`end`).                       |
| `side`          | `"above"`, `"below"`, `"left"`, `"right"`, `"on"` | Side of the line relative to its direction. `on` centers the label on the line (with a background that interrupts it). |
| `distance`      | number                                            | Perpendicular distance from the line. Default 4 plus half the label height.                                            |
| `orientation`   | `"horizontal"`, `"follow"`, `"upright"`           | Keep text horizontal (default), rotate along the path, or rotate but never upside down.                                |
| `avoidMarkers`  | bool                                              | Push start/end labels clear of markers. Default `true`.                                                                |
| `keepOnSegment` | bool                                              | For orthogonal routes, keep `start`/`end` labels on the first/last segment.                                            |

Together, `at` and `side` place labels in any of the conventional slots:

```
   start-above            middle-above              end-above
 ●──────────────────────────────┬─────────────────────────────▶
   start-below            middle-below              end-below
```

### 6.13 Canvas

`notation.canvas` (or a viewpoint's `canvas`) configures the drawing surface:

| Property     | Type                                       | Description                                                                         |
|--------------|--------------------------------------------|-------------------------------------------------------------------------------------|
| `background` | Paint                                      | Canvas background (default token `color.canvas`).                                   |
| `page`       | `{size, orientation, margins, showBreaks}` | Paged canvas for printing: size `"A4"`, `"Letter"`, `[w, h]` in mm.                 |
| `bounds`     | Box                                        | Fixed drawing area.                                                                 |
| `zoom`       | `{min, max, default, steps}`               | Zoom limits and presets.                                                            |
| `watermark`  | Label                                      | Text drawn under everything (for example "DRAFT" when `diagram.status == 'draft'`). |
| `legend`     | `{visible, position, entries}`             | Auto-generated legend of types, markers and conditional styles that carry `doc`.    |
| `minimap`    | bool                                       | Show an overview map.                                                               |
| `selection`  | `{style, handles}`                         | Selection outline and resize handle appearance.                                     |

### 6.14 Icons

`notation.icons` declares icons used by tools, nodes, badges and labels.

| Form            | Example                                                             |
|-----------------|---------------------------------------------------------------------|
| Inline SVG      | `{ "svg": "<svg viewBox='0 0 24 24'>…</svg>" }` (sanitised)         |
| Path            | `{ "path": { "viewBox": [0,0,24,24], "d": "M…" }, "stroke": true }` |
| Image           | `{ "src": "icons/db.png", "size": [24, 24] }`                       |
| Icon font glyph | `{ "font": "tabler", "glyph": "database" }`                         |
| Library         | `"std.database"` or `"tabler:database"`                             |

Icons are monochrome by default and take `currentColor`, so they follow the theme; `colored: true` keeps their own colors.

### 6.15 Accessibility

Notations SHOULD make diagrams accessible:

- `accessibility.name` (Bindable string) names each element for screen readers; the default is the type label plus `labelAttribute`.
- `accessibility.description` describes relations (default: "Transition from Idle to Running, trigger start").
- Runtimes SHOULD provide keyboard navigation between elements and along edges, and expose the model as an accessible tree.
- Color MUST NOT be the only carrier of meaning in built-in defaults; specifications SHOULD pair color with shape, pattern, dash, icon or text. Validators MAY warn when two types differ only in fill color.
- Themes SHOULD provide a `high-contrast` mode; runtimes SHOULD honour reduced-motion settings (disable `flow` animations).

### 6.16 Rendering order

Elements are drawn in layers: canvas background → grid and bands → `background` layer nodes → edges with `layer: "belowNodes"` → `default` nodes (containers before their children; siblings by `zIndex` in view data, then by stored order) → edges with `layer: "aboveNodes"` → `foreground` nodes → labels that are marked `layer: "top"` → selection, handles, guides and snapping feedback. Integer layers sort numerically between these named layers (background = −100, default = 0, foreground = 100).


---

## 7. Layer 4 — Toolbox, context tools and forms

This layer defines how users create and edit elements: the palette (toolbox), tools that appear next to a selection, reusable templates, and forms — both property inspectors and widgets embedded directly in nodes.

### 7.1 Toolbox

```json
{
  "toolbox": {
    "layout": "list",
    "searchable": true,
    "showRecent": 5,
    "groups": [
      { "id": "states", "label": "States", "icon": "square-rounded",
        "doc": "Elements that describe where the system can be.",
        "tools": [
          { "id": "state",   "creates": "State",        "shortcut": "S" },
          { "id": "initial", "creates": "InitialState", "shortcut": "I" },
          { "id": "final",   "creates": "FinalState" }
        ] },
      { "id": "connections", "label": "Connections",
        "tools": [ { "id": "transition", "creates": "Transition", "mode": "drag", "shortcut": "T" } ] }
    ]
  }
}
```

| Property     | Type                                                        | Description                                                                       |
|--------------|-------------------------------------------------------------|-----------------------------------------------------------------------------------|
| `groups`     | ToolGroup[]                                                 | Ordered groups.                                                                   |
| `tools`      | map → Tool                                                  | Library of tools referenced from groups by id (a group entry may be a string id). |
| `layout`     | `"list"`, `"grid"`, `"icons"`, `"compact"`                  | Presentation. Default `"list"`.                                                   |
| `position`   | `"left"`, `"right"`, `"top"`, `"floating"`                  | Suggested placement; runtimes MAY ignore it.                                      |
| `searchable` | bool                                                        | Offer a search box (matches labels, `doc.summary`, `doc.tags`). Default `true`.   |
| `showRecent` | int                                                         | Show a group with the n most recently used tools.                                 |
| `generic`    | `{select, pan, lasso, text, note, image, freehand}` of bool | Which generic tools are offered. Defaults: select and pan `true`, others `false`. |
| `doc`        | Doc                                                         |                                                                                   |

If `toolbox` is absent, the runtime generates one group per 10 concrete types, alphabetically, with one creation tool per concrete node and relation type.

**ToolGroup**: `id`, `label`, `doc`, `icon`, `collapsed` (bool), `visible` (Expression in the `diagram` context), `viewpoints` (string[]), `tools` (Tool or tool id)[], and nested `groups` for sub-groups.

### 7.2 Tools

| Property               | Type                                              | Description                                                                                          |
|------------------------|---------------------------------------------------|------------------------------------------------------------------------------------------------------|
| `id`                   | identifier                                        | **Required**.                                                                                        |
| `kind`                 | ToolKind                                          | Default: `"create-node"` or `"create-edge"` depending on `creates`; otherwise required.              |
| `label`, `doc`, `icon` |                                                   | Default: from the created type. `doc.summary` is the tooltip.                                        |
| `creates`              | TypeRef                                           | Type to create.                                                                                      |
| `initial`              | map attribute → value or `{cel}`                  | Initial attribute values, overriding metamodel defaults. CEL values use the `create` context (12.3). |
| `size`                 | Size                                              | Initial size overriding the notation default.                                                        |
| `variantOf`            | tool id                                           | Presents this tool as a variant (dropdown) of another.                                               |
| `mode`                 | see below                                         | Interaction mode.                                                                                    |
| `sticky`               | bool                                              | Tool stays active after use until Escape. Default `false`; shift-click MAY toggle.                   |
| `shortcut`             | string                                            | Keyboard shortcut (`"S"`, `"Ctrl+Shift+E"`). Conflicts are a validator warning.                      |
| `enabled`, `visible`   | Expression                                        | Context `diagram`.                                                                                   |
| `preview`              | `{style, shape}`                                  | Ghost appearance while placing.                                                                      |
| `after`                | `"select"`, `"editLabel"`, `"openForm"`, `"none"` | What happens after creation. Default `"editLabel"` when the type has an editable label.              |
| `template`             | template id                                       | For `kind: "template"`.                                                                              |
| `operation`            | operation id                                      | For `kind: "operation"`.                                                                             |
| `plugin`               | `{name, args}`                                    | For `kind: "plugin"`.                                                                                |

**ToolKind**: `create-node`, `create-edge`, `template` (inserts a fragment), `operation` (runs an operation on the selection or diagram), `select`, `pan`, `lasso`, `text`, `note`, `image`, `freehand`, `plugin`.

**Modes.** For node tools: `"click"` (place at default size), `"drag"` (drag out the size; default), `"stamp"` (click repeatedly, implies sticky). For edge tools: `"drag"` (drag from source to target; default), `"click-click"` (click source, then target, with intermediate clicks adding bendpoints), `"chain"` (each click continues from the last target), `"auto"` (drag between nodes or start from a port). When a node tool is dragged on a coordinate system with bound placement, the dragged extent is written to the bound attributes: dragging across five days of a time axis creates a task with `start` and `end` set to those days, dropped into a lane it sets the lane attribute. Edge tools that start on empty canvas may create the source node when `createSource: TypeRef` is set; ending on empty canvas may create the target when `createTarget: TypeRef` is set (or offer a context menu of valid targets when `createTarget: "ask"`).

### 7.3 Context tools

Context tools appear next to the selected element (a "quick bar" or radial menu) and are the fastest way to grow a diagram. They are declared in `toolbox.contextTools`.

```json
{
  "contextTools": [
    {
      "for": ["State"],
      "placement": "around",
      "tools": [
        { "kind": "create-connected", "creates": "State", "via": "Transition", "direction": "outgoing",
          "label": "Add next state", "icon": "arrow-right", "position": "right" },
        { "kind": "connect", "via": "Transition", "icon": "link", "position": "bottom" },
        { "kind": "operation", "operation": "makeFinal", "icon": "flag", "position": "top-right" },
        { "kind": "delete", "position": "top-right" }
      ]
    }
  ]
}
```

| Property    | Type                                          | Description                               |
|-------------|-----------------------------------------------|-------------------------------------------|
| `for`       | TypeRef[]                                     | Element types the context tools apply to. |
| `when`      | Expression                                    | Additional condition (`element` context). |
| `placement` | `"around"`, `"toolbar"`, `"menu"`, `"radial"` | Presentation.                             |
| `tools`     | ContextTool[]                                 | Items.                                    |

ContextTool kinds: `create-connected` (create a node of type `creates` connected via relation `via`, placed at `position` using the layout's spacing; `direction` `outgoing` or `incoming`), `connect` (start an edge of type `via` from this element), `create-child` (create a child of `creates` in `slot`), `operation`, `delete`, `duplicate`, `editLabel`, `openForm`, `plugin`. All kinds accept `label`, `doc`, `icon`, `shortcut`, `enabled`, `position`.

Right-click **context menus** are defined the same way under `toolbox.contextMenus` with `placement: "menu"`; runtimes add standard entries (cut, copy, paste, delete, arrange) unless `standardEntries: false`.

### 7.4 Templates

Templates insert pre-built fragments — patterns, starter structures, snippets. They are declared in `toolbox.templates`:

```json
{
  "templates": {
    "retryLoop": {
      "label": "Retry loop",
      "doc": "A state that retries up to three times before failing.",
      "params": { "attempts": { "type": "int", "default": 3, "label": "Attempts" } },
      "fragment": {
        "nodes": [
          { "ref": "try",  "type": "State", "attributes": { "name": "'Trying'" }, "at": [0, 0] },
          { "ref": "fail", "type": "FinalState", "attributes": { "name": "'Failed'" }, "at": [200, 0] }
        ],
        "relations": [
          { "type": "Transition", "source": "try", "target": "try",  "attributes": { "guard": "'retries < ' + string(p.attempts)" } },
          { "type": "Transition", "source": "try", "target": "fail", "attributes": { "guard": "'retries >= ' + string(p.attempts)" } }
        ]
      },
      "preview": "templates/retry.svg"
    }
  }
}
```

`fragment` uses local `ref` names instead of ids; attribute values are Expressions (strings are CEL) evaluated with template parameters as `p`. `at` positions are relative to the insertion point, in the coordinate system of the target container (time values are durations relative to the drop time on time axes). Templates are placed with a `kind: "template"` tool or dragged from a template gallery. Templates MAY also be offered on the creation of a new diagram (`language`-level starter templates: `toolbox.starters: ["retryLoop", …]`).

### 7.5 Forms

A **form** is a declarative description of editable fields for one element type. Forms are used as property inspectors (side panel or popover), as creation dialogs, and — embedded — inside nodes on the canvas.

If no form is defined for a type, runtimes generate one: one field per non-derived attribute, grouped by the attribute `group`, ordered by `order` then declaration order, with widgets chosen by type (Appendix B.7).

```json
{
  "forms": {
    "taskInspector": {
      "for": "Task",
      "usage": ["inspector", "create"],
      "layout": { "columns": 2 },
      "items": [
        { "kind": "section", "title": "General", "items": [
          { "attribute": "title", "colSpan": 2, "widget": "text" },
          { "attribute": "assignee", "widget": "reference",
            "options": { "cel": "diagram.nodesOfType('Resource')" } },
          { "attribute": "priority", "widget": "segmented" }
        ] },
        { "kind": "section", "title": "Schedule", "items": [
          { "attribute": "start", "widget": "date" },
          { "attribute": "end",   "widget": "date",
            "validate": [ { "rule": "value >= self.start", "message": "End must not be before start." } ] },
          { "kind": "computed", "label": "Duration",
            "value": { "cel": "string(workingDays(self.start, self.end, 'project')) + ' working days'" } }
        ] },
        { "kind": "section", "title": "Notes", "collapsed": true, "items": [
          { "attribute": "notes", "widget": "markdown", "rows": 6 }
        ] },
        { "kind": "button", "label": "Split task", "operation": "splitTask", "icon": "scissors" }
      ]
    }
  }
}
```

**Form**

| Property               | Type                                                               | Description                                                                                                                                                                     |
|------------------------|--------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `for`                  | TypeRef or TypeRef[]                                               | Types edited. For relations, the relation type. `"diagram"` edits the diagram root.                                                                                             |
| `usage`                | (`"inspector"`, `"create"`, `"embedded"`, `"popover"`, `"bulk"`)[] | Where the form is used. `create` shows it as a dialog before creation; `bulk` supports editing several selected elements (fields show "mixed" values). Default `["inspector"]`. |
| `layout`               | `"vertical"`, `"horizontal"`, `{columns, labelPosition, density}`  | `labelPosition`: `"top"`, `"left"`, `"inline"`, `"none"`; `density`: `"comfortable"`, `"compact"`.                                                                              |
| `items`                | FormItem[]                                                         | Fields and containers.                                                                                                                                                          |
| `commit`               | `"immediate"`, `"onBlur"`, `"explicit"`                            | When edits become model changes (each commit is one undoable transaction). Default `"immediate"` for inspectors, `"explicit"` for create dialogs.                               |
| `label`, `doc`, `icon` |                                                                    | Title and help of the form.                                                                                                                                                     |

**Field** (an item with `attribute`, or `kind: "field"`):

| Property                   | Type                                | Description                                                                                                                |
|----------------------------|-------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| `attribute`                | path                                | Attribute edited (dotted path into structs). **Required** for fields.                                                      |
| `widget`                   | Widget                              | Default by type (Appendix B.7).                                                                                            |
| `label`                    | LocalizedText                       | Default: attribute label.                                                                                                  |
| `doc`                      | Doc                                 | Field help. Default: attribute `doc`. Shown below the field (`summary`) and via an info icon (`description`, `rationale`). |
| `placeholder`              | LocalizedText                       | Hint text inside empty inputs.                                                                                             |
| `visible`, `enabled`       | Expression                          | Context `form` (12.3): `self`, `value`, `diagram`.                                                                         |
| `required`                 | bool                                | Visual required marker; may tighten but not loosen the attribute.                                                          |
| `validate`                 | `{rule, message, severity}`[]       | Field-local validation shown immediately; does not replace constraints.                                                    |
| `options`                  | `{cel}` or `{enum}` or literal list | Choices for select-like widgets: values or `{value, label, icon, doc}` maps, or elements for `reference`.                  |
| `widgetOptions`            | object                              | Widget-specific settings (below).                                                                                          |
| `colSpan`, `width`         | int, length                         | Grid layout.                                                                                                               |
| `prefix`, `suffix`, `unit` | LocalizedText                       | Adornments.                                                                                                                |
| `format`                   | string                              | Display format for numbers and dates.                                                                                      |
| `rows`                     | int                                 | For multi-line widgets.                                                                                                    |
| `readOnly`                 | Bindable bool                       |                                                                                                                            |
| `onChange`                 | Action[]                            | Actions run after the value is committed (9.4).                                                                            |

**Widgets**: `text`, `textarea`, `markdown`, `code` (with `widgetOptions.language`: `"cel"`, `"json"`, `"sql"`, …; the `cel` language is type-checked in the attribute's `context`), `number`, `slider` (`min`, `max`, `step`, `marks`), `spinner`, `rating` (`max`, `icon`), `checkbox`, `switch`, `select`, `combobox` (free entry allowed), `radio`, `segmented` (button group), `multiselect`, `tags`, `date`, `datetime`, `time`, `duration`, `daterange` (edits two attributes: `attribute` and `widgetOptions.endAttribute`), `color` (`palette`, `alpha`), `icon` (icon picker), `reference` (element picker, with `widgetOptions.pickOnCanvas: true` to select by clicking), `references` (for `many` references), `list` (editable list of primitives), `table` (list of structs, with `widgetOptions.columns`), `struct` (nested sub-form), `file` (binary or URI, `mediaTypes`), `image`, `link`, `progress` (read-only bar), `readonly` (plain text), `plugin`.

**Containers and other items** (by `kind`): `section` (`title`, `collapsible`, `collapsed`, `items`), `row` (horizontal group), `tabs` (`tabs: [{title, icon, items}]`), `group` (a bordered box with `title`), `text` (static help text, Markdown), `divider`, `computed` (read-only `value` Bindable), `button` (`label`, `icon`, `operation` or `actions`, `enabled`, `confirm`), `problems` (list of the element's current constraint problems with quick fixes), `plugin`.

### 7.6 Embedded forms (widgets inside nodes)

Nodes MAY display live form widgets on the canvas — checkboxes in a to-do card, a slider on a parameter block, a dropdown on a gateway, a table inside an entity — via `NodeNotation.form`:

```json
{
  "form": {
    "form": "taskCard",
    "region": { "x": 8, "y": 30, "w": "w - 16", "h": "h - 38" },
    "interaction": "always",
    "minZoom": 0.6,
    "fallback": "labels",
    "autoSize": true
  }
}
```

| Property      | Type                                                      | Description                                                                                                                       |
|---------------|-----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------|
| `form`        | form id or inline Form                                    | The form (its `usage` SHOULD include `"embedded"`).                                                                               |
| `region`      | Box of GeomExpr                                           | Area inside the node, in shape coordinates. Default: the shape's text area.                                                       |
| `interaction` | `"always"`, `"onSelect"`, `"onDoubleClick"`, `"readOnly"` | When the widgets accept input. `readOnly` renders values only. Default `"onSelect"`.                                              |
| `minZoom`     | number                                                    | Below this zoom, the form is not rendered; `fallback` decides what is shown instead (`"labels"`, `"none"`, `"summary"`).          |
| `autoSize`    | bool                                                      | The node grows to fit the form.                                                                                                   |
| `style`       | StyleRef                                                  | Styling of embedded widgets (font, density). Runtimes SHOULD render embedded widgets in the node's style, not the platform style. |

Embedded forms MUST NOT capture canvas gestures outside their widgets: dragging on a non-interactive area moves the node. Every widget change is an undoable model transaction, exactly as in the inspector.

---

## 8. Layer 5 — Constraints

Constraints state what makes a diagram valid. They are written in CEL, evaluated by the runtime (live, on save, or on demand) and by headless validators, and reported to users with explanations and quick fixes.

### 8.1 Overview

```json
{
  "constraints": {
    "groups": {
      "structure": { "label": "Structure", "doc": "Rules without which the machine cannot run." },
      "style":     { "label": "Style guide", "enabledByDefault": false }
    },
    "rules": [
      {
        "id": "singleInitial",
        "group": "structure",
        "scope": "diagram",
        "rule": "diagram.nodesOfType('InitialState').size() == 1",
        "severity": "error",
        "message": "A state machine needs exactly one initial state.",
        "doc": { "rationale": "Execution must start somewhere, and only in one place." },
        "fixes": [
          { "label": "Add an initial state", "when": "diagram.nodesOfType('InitialState').size() == 0",
            "actions": [ { "create": { "type": "'InitialState'", "at": "[40.0, 40.0]" } } ] }
        ]
      }
    ]
  }
}
```

| Property      | Type                                                     | Description                                                                                                                                 |
|---------------|----------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| `rules`       | Constraint[]                                             | Ordered list of constraints.                                                                                                                |
| `groups`      | map → `{label, doc, enabledByDefault, severityOverride}` | Groups users can enable, disable or re-rate as a unit ("rule sets").                                                                        |
| `defaults`    | `{severity, timing}`                                     | Defaults for rules.                                                                                                                         |
| `blockSaveOn` | `"never"`, `"error"`                                     | Whether saving is prevented while errors exist. Default `"never"` (never lose work); DID definitions are saved with problems and remain loadable. |
| `builtIn`     | map built-in id → `{severity, enabled}`                  | Tune the built-in constraints (8.7).                                                                                                        |

### 8.2 Constraint object

| Property       | Type                                                                       | Description                                                                                                                                                                                   |
|----------------|----------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`           | identifier                                                                 | **Required**, unique. Stored with suppressions and reported in problems.                                                                                                                      |
| `label`        | LocalizedText                                                              | Short name ("Single initial state").                                                                                                                                                          |
| `doc`          | Doc                                                                        | `summary` explains the rule; `rationale` why it exists; `description` how to comply; `examples` valid and invalid snippets. Runtimes show it with every reported problem.                     |
| `kind`         | ConstraintKind                                                             | Default `"invariant"` (8.3, 8.4).                                                                                                                                                             |
| `scope`        | `"diagram"`, `"node"`, `"relation"`, `"port"`, `"*"`, TypeRef or TypeRef[] | Which elements the rule is evaluated for; `self` is bound to each. `diagram` evaluates once. Default `"diagram"`.                                                                             |
| `when`         | Expression                                                                 | Precondition; the rule is only evaluated where it holds.                                                                                                                                      |
| `rule`         | Expression → bool                                                          | The condition that MUST hold. **Required.**                                                                                                                                                   |
| `severity`     | `"error"`, `"warning"`, `"info"`, `"hint"`, or `{cel}`                     | Default `"error"`.                                                                                                                                                                            |
| `message`      | LocalizedText or `{cel}`                                                   | Problem text. CEL messages may interpolate values: `{ "cel": "'State ' + self.name + ' is unreachable'" }`.                                                                                   |
| `target`       | `"self"` or Expression                                                     | Element(s) the problem is attached to; an expression returning an element or list (for example all duplicates). Default `self`.                                                               |
| `attribute`    | path                                                                       | Attribute to mark in forms.                                                                                                                                                                   |
| `timing`       | (`"live"`, `"save"`, `"explicit"`, `"export"`)[]                           | When evaluated. `live`: after each transaction (debounced); `save`: before saving; `explicit`: on "Validate" command; `export`: before export. Default `["live", "save"]`.                    |
| `enforcement`  | `"report"`, `"prevent"`, `"prevent-and-report"`                            | `prevent`: a transaction that would make the rule false (for elements it was true for before) is rejected with the message. Default `"report"` for invariants, `"prevent"` for gesture kinds. |
| `fixes`        | QuickFix[]                                                                 | Suggested corrections.                                                                                                                                                                        |
| `suppressible` | bool                                                                       | Users may suppress the problem for a specific element; suppressions are stored in the DID definition (11.7). Default `true` for warnings and below, `false` for errors.                             |
| `enabled`      | bool                                                                       | Default `true` (subject to group).                                                                                                                                                            |
| `group`        | group id                                                                   |                                                                                                                                                                                               |
| `tags`         | string[]                                                                   |                                                                                                                                                                                               |
| `cost`         | `"cheap"`, `"expensive"`                                                   | Hint: expensive rules (graph traversals) MAY be evaluated with lower frequency or off the main thread.                                                                                        |

### 8.3 Invariants

Invariants (`kind: "invariant"`) are statements about the current state of the diagram, evaluated for each element in `scope`:

```json
[
  { "id": "nameRequired", "scope": "State", "rule": "self.name.trim() != ''",
    "attribute": "name", "severity": "error", "message": "Every state needs a name." },

  { "id": "uniqueNames", "scope": "State",
    "rule": "diagram.nodesOfType('State').filter(s, s.name == self.name).size() == 1",
    "severity": "warning", "message": { "cel": "'The name \"' + self.name + '\" is used more than once.'" },
    "target": "diagram.nodesOfType('State').filter(s, s.name == self.name)" },

  { "id": "reachable", "scope": "State",
    "when": "!self.isA('InitialState')",
    "rule": "diagram.nodesOfType('InitialState').exists(i, self in i.reachable('Transition'))",
    "severity": "warning", "cost": "expensive",
    "message": { "cel": "'State \"' + self.name + '\" can never be reached.'" } },

  { "id": "deterministic", "scope": "State",
    "rule": "self.outgoingOf('Transition').map(t, t.trigger).isUnique()",
    "severity": "error",
    "message": "Two transitions leave this state on the same trigger.",
    "doc": { "rationale": "The machine would not know which transition to take." } }
]
```

### 8.4 Gesture constraints

Gesture constraints are evaluated **before** a user action is applied, while the user is still dragging, so the runtime can show a "not allowed" cursor, apply the `dropReject` state and explain why. Their default enforcement is `prevent`.

| `kind`        | Evaluated when                                     | Variables (in addition to `diagram`, `env`)                                                                                                   |
|---------------|----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| `connect`     | Creating or reconnecting an edge                   | `relationType` (string), `source`, `target` (elements or ports), `sourcePort`, `targetPort`, `self` (the edge when reconnecting, else `null`) |
| `containment` | Dropping or creating an element inside a container | `child` (element or `{type}` for new elements), `parent`, `slot`                                                                              |
| `create`      | Creating an element with a tool or operation       | `elementType` (string), `parent`, `position`                                                                                                  |
| `delete`      | Deleting elements                                  | `self`, `selection` (all elements being deleted)                                                                                              |
| `placement`   | Moving or resizing                                 | `self`, `oldBounds`, `newBounds` (in domain values: `newBounds.x` is a timestamp on time axes), `newParent`                                   |
| `change`      | Changing an attribute in a form or label           | `self`, `attribute`, `oldValue`, `newValue`                                                                                                   |

```json
[
  { "id": "noEntryIntoInitial", "kind": "connect",
    "when": "relationType == 'Transition'",
    "rule": "!target.isA('InitialState')",
    "message": "Transitions cannot enter the initial state." },

  { "id": "noOverlapPerResource", "kind": "placement", "scope": "Task",
    "rule": "!diagram.nodesOfType('Task').exists(t, t.id != self.id && t.assignee == self.assignee && t.start < newBounds.x2 && newBounds.x < t.end)",
    "enforcement": "report", "severity": "warning",
    "message": "This resource already has a task in that period." },

  { "id": "lockedPhase", "kind": "delete", "scope": "Phase",
    "rule": "!self.locked", "message": "Unlock the phase before deleting it." }
]
```

When enforcement is `report` on a gesture kind, the gesture is allowed and a problem is reported afterwards if the corresponding state still violates the rule.

### 8.5 Quick fixes

| Property     | Type                     | Description                                                                                    |
|--------------|--------------------------|------------------------------------------------------------------------------------------------|
| `label`      | LocalizedText or `{cel}` | Menu text ("Rename to 'Idle 2'").                                                              |
| `doc`        | Doc                      | What the fix does.                                                                             |
| `when`       | Expression               | Offer the fix only if true.                                                                    |
| `actions`    | Action[]                 | Behavior actions (9.4) executed as one transaction with `self` bound to the problem's element. |
| `operation`  | operation id             | Alternatively run a declared operation.                                                        |
| `preferred`  | bool                     | The fix offered by "fix all" and keyboard shortcut.                                            |
| `applyToAll` | bool                     | May be applied to all problems of this constraint at once.                                     |

### 8.6 Problems

Evaluation produces **problems**: `{ constraint, severity, message, target, attribute, fixes }`. Runtimes MUST present problems on the canvas (the `invalid`/`warning` states and a badge), in a problems list (sortable, filterable, clicking reveals the element), and in forms (next to `attribute`). A headless validator reports problems as JSON (an array of `{constraintId, severity, message, elementId, attribute, pointer}`) and exits non-zero if errors exist.

### 8.7 Built-in constraints

Metamodel declarations generate built-in constraints automatically. They behave like declared constraints, can be re-rated in `constraints.builtIn`, and their messages are localised by the runtime.

| Id                 | Generated from                                                                             | Default severity / enforcement                                |
|--------------------|--------------------------------------------------------------------------------------------|---------------------------------------------------------------|
| `std.required`     | `required: true`                                                                           | error / report                                                |
| `std.facets`       | `min`, `max`, `pattern`, `minLength`, …                                                    | error / report (and prevent in forms)                         |
| `std.unique`       | `unique`                                                                                   | error / report                                                |
| `std.multiplicity` | `multiplicity`, `children.min/max`, `perType`, relation end `min/max`, port `multiplicity` | lower bounds: warning / report; upper bounds: error / prevent |
| `std.endpoints`    | relation `source`/`target`, `ports`, `accepts`, `allowSelfLoops`, `allowParallel`          | error / prevent                                               |
| `std.containment`  | `children.allowed`, `slots`                                                                | error / prevent                                               |
| `std.acyclic`      | `acyclic: true`                                                                            | error / prevent                                               |
| `std.references`   | references to missing elements                                                             | error / report                                                |
| `std.axisBounds`   | axis `min`/`max`, system `bounds`                                                          | error / prevent                                               |
| `std.typeExists`   | unknown types in loaded DID definitions                                                     | error / report (element preserved, 14.3)                      |

---

## 9. Layer 6 — Behavior

Behavior declares what happens in response to user actions, beyond the direct manipulation that the other layers already define: derived updates, cascades, generated names, multi-step operations.

### 9.1 Overview

```json
{
  "behavior": {
    "hooks": [
      { "id": "nameNewState", "on": "create", "for": "State", "when": "!has(self.name)",
        "actions": [ { "set": { "name": "'State ' + string(diagram.nodesOfType('State').size())" } } ],
        "doc": "New states are numbered automatically." }
    ],
    "operations": {
      "makeFinal": {
        "label": "Convert to final state", "for": "State", "icon": "flag",
        "enabled": "self.outgoing.size() == 0",
        "actions": [ { "retype": { "to": "'FinalState'" } } ]
      }
    },
    "deletion": { "State": { "relations": "delete" } },
    "clipboard": { "relations": "internal", "ids": "regenerate", "offset": [20, 20] },
    "undo": { "mergeWindowMs": 500 }
  }
}
```

### 9.2 Hooks

| Property    | Type                  | Description                                                                                                                                                                                       |
|-------------|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `id`        | identifier            | **Required.**                                                                                                                                                                                     |
| `on`        | Event or Event[]      | `create`, `delete`, `change`, `connect`, `disconnect`, `reconnect`, `reparent`, `move`, `resize`, `paste`, `duplicate`, `retype`, `load`, `save`, `viewpointOpen`.                                |
| `for`       | TypeRef or TypeRef[]  | Element types; absent for diagram-level events (`load`, `save`).                                                                                                                                  |
| `attribute` | path or path[]        | For `change`: only when these attributes change.                                                                                                                                                  |
| `when`      | Expression            | Condition (context `hook`, 12.3).                                                                                                                                                                 |
| `actions`   | Action[]              | Executed in order.                                                                                                                                                                                |
| `phase`     | `"before"`, `"after"` | `before` hooks run inside the gesture transaction before constraints and may `abort`; `after` hooks (default) run after the change and before live constraints, in the same undoable transaction. |
| `order`     | int                   | Ordering among hooks for the same event.                                                                                                                                                          |
| `doc`       | Doc                   |                                                                                                                                                                                                   |

Hook context variables: `self` (the element after the change), `old` (a snapshot before the change, or `null` for `create`), `event` (`{kind, attribute, oldValue, newValue, source}` where `source` is `"user"`, `"hook"`, `"operation"`, `"layout"`, `"import"`, `"remote"`).

**Termination.** Actions of a hook MAY trigger further hooks. Runtimes MUST detect cycles: the same hook MUST NOT run twice for the same element within one transaction, and the total number of hook executions per transaction is bounded by `behavior.maxHookDepth` (default 100); exceeding it aborts the transaction.

**Remote changes.** Hooks do not run for changes received from collaborators (`event.source == "remote"`); those changes were already processed on the originating client.

### 9.3 Operations

Operations are named, documented commands, invoked from tools, context tools, form buttons, quick fixes, keyboard shortcuts or menus.

| Property                           | Type                                  | Description                                                                                                            |
|------------------------------------|---------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| `label`, `doc`, `icon`, `shortcut` |                                       |                                                                                                                        |
| `for`                              | TypeRef[], `"selection"`, `"diagram"` | What the operation applies to. For type lists, `self` is the target element; for `selection`, `selection` is the list. |
| `params`                           | map → Attribute                       | Parameters; if present, the runtime shows a generated dialog (or `paramsForm`). Available as `p` in actions.           |
| `paramsForm`                       | form id                               | Custom dialog.                                                                                                         |
| `enabled`                          | Expression                            | Whether available.                                                                                                     |
| `confirm`                          | LocalizedText                         | Confirmation question before running.                                                                                  |
| `actions`                          | Action[]                              | Body, executed as one transaction.                                                                                     |
| `plugin`                           | `{name, args}`                        | Alternatively implemented by a plugin.                                                                                 |

### 9.4 Actions

Actions are a small, closed set of declarative steps. **All values in actions are Expressions** (2.5d).

| Action      | Form                                                                                                                      | Effect                                                                       |
|-------------|---------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| `set`       | `{ "set": { "attr": expr, … }, "target": expr }`                                                                          | Assign attributes of `target` (default `self`).                              |
| `unset`     | `{ "unset": ["attr"], "target": expr }`                                                                                   | Remove stored values.                                                        |
| `create`    | `{ "create": { "type": expr, "attributes": {…}, "parent": expr, "slot": expr, "at": expr, "size": expr }, "as": "name" }` | Create a node; the new element is available as `name` in subsequent actions. |
| `connect`   | `{ "connect": { "type": expr, "source": expr, "target": expr, "attributes": {…} }, "as": "name" }`                        | Create a relation.                                                           |
| `delete`    | `{ "delete": expr }`                                                                                                      | Delete an element or list.                                                   |
| `move`      | `{ "move": { "target": expr, "x": expr, "y": expr, "parent": expr } }`                                                    | Change placement (domain values, snapped if `applyToProgrammatic`).          |
| `resize`    | `{ "resize": { "target": expr, "width": expr, "height": expr } }`                                                         |                                                                              |
| `retype`    | `{ "retype": { "to": expr, "target": expr } }`                                                                            | Change the type, keeping compatible attributes and relations.                |
| `reparent`  | `{ "reparent": { "target": expr, "parent": expr, "slot": expr } }`                                                        |                                                                              |
| `let`       | `{ "let": { "name": expr } }`                                                                                             | Bind a variable for later actions.                                           |
| `if`        | `{ "if": expr, "then": [ … ], "else": [ … ] }`                                                                            | Conditional.                                                                 |
| `forEach`   | `{ "forEach": expr, "as": "item", "do": [ … ] }`                                                                          | Iterate a list (bounded: lists are finite).                                  |
| `select`    | `{ "select": expr }`                                                                                                      | Change the selection.                                                        |
| `reveal`    | `{ "reveal": expr }`                                                                                                      | Scroll the canvas to elements.                                               |
| `highlight` | `{ "highlight": expr, "durationMs": 2000 }`                                                                               | Apply the `highlighted` state.                                               |
| `editLabel` | `{ "editLabel": { "target": expr, "label": "id" } }`                                                                      | Start inline editing.                                                        |
| `openForm`  | `{ "openForm": { "target": expr, "form": "id" } }`                                                                        |                                                                              |
| `notify`    | `{ "notify": { "message": expr, "severity": "info" } }`                                                                   | Toast message.                                                               |
| `layout`    | `{ "layout": { "scope": expr, "algorithm": "id" } }`                                                                      | Run a layout (section 10).                                                   |
| `abort`     | `{ "abort": { "message": expr } }`                                                                                        | Cancel the transaction (only in `before` hooks and operations).              |
| `call`      | `{ "call": "operationId", "args": { … } }`                                                                                | Run another operation.                                                       |
| `plugin`    | `{ "plugin": "name", "args": { … } }`                                                                                     | Delegate to a plugin action.                                                 |

Every action MAY carry `when` (skip unless true) and `doc`.

### 9.5 Deletion, clipboard, retyping and undo policies

**Deletion** (`behavior.deletion`, per type):

| Property     | Values                                                  | Description                                                                                                     |
|--------------|---------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| `children`   | `"delete"` (default), `"reparent"`, `"forbid"`          | What happens to contained elements. `reparent` moves them to the deleted node's parent.                         |
| `relations`  | `"delete"` (default), `"forbid"`, `"reconnect"`         | Attached edges. `reconnect` bridges incoming to outgoing edges of the same type (removing a step from a chain). |
| `references` | `"unset"` (default), `"delete-referencing"`, `"forbid"` | Reference attributes pointing at the element.                                                                   |
| `confirm`    | LocalizedText                                           | Ask before deleting.                                                                                            |

**Clipboard** (`behavior.clipboard`): `relations` (`"internal"` — only edges between copied elements, `"all"`, `"none"`), `ids` (`"regenerate"`), `names` (`"keep"`, `"suffix"` — adds " (copy)" to the label attribute), `offset` (canvas offset on paste; on time axes a duration), `crossDocument` (bool), `formats` (clipboard MIME types offered: `application/vnd.did.fragment+json` (DID, section 7), `image/svg+xml`, `text/plain`).

**Retyping** (`behavior.retype`): map of type → allowed target types, with `attributeMapping` (target attr → Expression over `old`).

**Undo** (`behavior.undo`): `mergeWindowMs` (typing in a label merges into one step), `maxSteps`, `persistHistory` (bool, stores history in the DID definition for collaborative review, default `false`).

---

## 10. Layer 7 — Layout

Automatic layout arranges nodes and routes edges. DISL does not define layout algorithms; it names them, passes options, and declares when layout runs and how it interacts with user placement and bound coordinates.

```json
{
  "layout": {
    "algorithms": {
      "flow": {
        "algorithm": "layered",
        "direction": "right",
        "spacing": { "node": 40, "layer": 80, "edge": 12 },
        "edgeRouting": "orthogonal",
        "options": { "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP" },
        "doc": "Left-to-right flow; transitions become orthogonal."
      }
    },
    "default": "flow",
    "trigger": "manual",
    "respect": "pinned",
    "animate": { "durationMs": 300 }
  }
}
```

| Property      | Type                                                                    | Description                                                                                                                                                                                                            |
|---------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `algorithms`  | map → LayoutConfig                                                      | Named configurations.                                                                                                                                                                                                  |
| `default`     | name                                                                    | Used by the "Arrange" command and `trigger`.                                                                                                                                                                           |
| `containers`  | map TypeRef → name or LayoutConfig                                      | Layout inside containers of a type (in addition to ContainerSpec's simple layouts).                                                                                                                                    |
| `trigger`     | `"manual"`, `"onCreate"`, `"onChange"`, `"onLoadIfMissing"`, `"always"` | When layout runs automatically. `onLoadIfMissing`: when a DID definition lacks view data (for example generated by a program). `always`: positions are never user-controlled (pure layout-driven diagrams). Default `"manual"`. |
| `respect`     | `"none"`, `"pinned"`, `"all"`                                           | Which user positions survive automatic layout: none, only pinned elements (users can pin), or all existing (incremental layout places new elements only). Default `"pinned"`.                                          |
| `incremental` | bool                                                                    | Prefer stability: minimise movement of existing elements.                                                                                                                                                              |
| `animate`     | `{durationMs, easing}` or `false`                                       |                                                                                                                                                                                                                        |
| `doc`         | Doc                                                                     |                                                                                                                                                                                                                        |

**LayoutConfig**

| Property          | Type                                   | Description                                                                                                                                                                                                                                                                                                                |
|-------------------|----------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `algorithm`       | string                                 | `"none"`, `"layered"` (Sugiyama), `"tree"`, `"mrtree"`, `"radial"`, `"force"`, `"stress"`, `"orthogonal"`, `"box"`, `"grid"`, `"circular"`, `"rectpacking"`, `"lanes"` (assign nodes to ordinal bands, then layer within bands), `"sequence"` (sequence diagrams), `"elk:<id>"` (any ELK algorithm id), `"plugin:<name>"`. |
| `direction`       | `"right"`, `"down"`, `"left"`, `"up"`  | Main flow direction.                                                                                                                                                                                                                                                                                                       |
| `spacing`         | `{node, layer, edge, component, port}` | Canvas units.                                                                                                                                                                                                                                                                                                              |
| `edgeRouting`     | Routing                                | Routing applied to edges with `routing: "layout"` or when `overrideRouting` is true.                                                                                                                                                                                                                                       |
| `overrideRouting` | bool                                   | Layout replaces user bendpoints.                                                                                                                                                                                                                                                                                           |
| `options`         | map string → JSON                      | Pass-through options for the algorithm (ELK option ids recommended for interoperability). Unknown options are ignored.                                                                                                                                                                                                     |
| `scope`           | `"all"`, `"selection"`, `"component"`  | Default scope when invoked.                                                                                                                                                                                                                                                                                                |
| `includeViewOnly` | bool                                   | Whether notes and annotations take part.                                                                                                                                                                                                                                                                                   |
| `doc`             | Doc                                    |                                                                                                                                                                                                                                                                                                                            |

**Interaction with coordinate systems.** Layout only assigns coordinates whose PlacementSource is `free` or `layout`. Bound coordinates (a task's start date) are never changed by layout; algorithms receive them as fixed constraints. For example, `"lanes"` on a schedule keeps x (time) fixed and only packs y within bands. Layout results are snapped with the rules of the coordinate system unless `options["dedl.snap"]` is `false`.


---

## 11. Layer 8 — Persistence

The persistence layer declares exactly how the diagrams users draw are stored as DID definitions: which format, which files, how identifiers are generated, how elements and keys are ordered, which view data is kept, how precise numbers are, how old DID definitions are migrated, and how several people can edit at once. The goal is that any two conforming runtimes produce identical files for the same diagram, that files diff and merge well in version control, and that stored diagrams remain readable for decades. The structure these settings configure, and the rules a writer follows, are specified by DID ([DID-specification.md](../did/DID-specification.md)).

### 11.1 Overview

```json
{
  "persistence": {
    "format": "json",
    "files": { "mode": "split", "model": "{name}.sm.json", "view": "{name}.sm.view.json" },
    "ids": { "strategy": "uuid-v7", "prefix": { "State": "st_", "Transition": "tr_" } },
    "references": "id",
    "ordering": { "elements": "type-then-id", "keys": "canonical" },
    "omitDefaults": true,
    "precision": { "canvas": 2 },
    "timestamps": { "format": "rfc3339", "timezone": "utc" },
    "view": { "store": ["bounds", "waypoints", "labelOffsets", "collapsed", "zIndex", "rotation", "viewport"],
              "styleOverrides": ["fill", "stroke.color", "font.weight"] },
    "metadata": ["languageVersion", "createdAt", "modifiedAt", "generator"],
    "migrations": [],
    "collaboration": { "mode": "crdt", "engine": "yjs" }
  }
}
```

### 11.2 Formats and encoding

| Property       | Type                                                                 | Description                                                                                                                                                                            |
|----------------|----------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `format`       | `"json"` (default), `"yaml"`, `"jsonl"`, `"cbor"`, `"plugin:<name>"` | Serialization. All formats encode the same logical DID definition (11.4). `jsonl` writes one element per line, which merges particularly well. `cbor` is for large binary-efficient storage. |
| `encoding`     | `"utf-8"`                                                            | Only UTF-8 is allowed.                                                                                                                                                                 |
| `indent`       | int or `"tab"`                                                       | Default 2. `0` writes minified JSON.                                                                                                                                                   |
| `newline`      | `"lf"`, `"crlf"`                                                     | Default `"lf"`.                                                                                                                                                                        |
| `finalNewline` | bool                                                                 | Default `true`.                                                                                                                                                                        |
| `compression`  | `"none"`, `"gzip"`, `"zip-bundle"`                                   | `zip-bundle` stores model, views and binary assets (images) in one archive with a manifest.                                                                                            |
| `mediaType`    | string                                                               | Media type of DID definitions.                                                                                                                                                            |

YAML output MUST quote strings that would otherwise be read as other types (the "Norway problem": `no`, `yes`, `on`, `off`, `~`, numeric-looking strings, dates) and MUST NOT use anchors, aliases or tags.

### 11.3 Files

| Property                 | Type                                                         | Description                                                                                                                                                                                                                                                                                         |
|--------------------------|--------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `mode`                   | `"single"` (default), `"split"`, `"per-element"`, `"bundle"` | `single`: one file with model and views. `split`: model and view data in separate files, so layout edits never touch the model file. `per-element`: one file per top-level element in a directory plus an index (for very large models edited by teams). `bundle`: see `compression: "zip-bundle"`. |
| `model`, `view`, `index` | pattern                                                      | File name patterns; `{name}` is the diagram's name, `{id}` and `{type}` the element's id and type for `per-element`.                                                                                                                                                                                 |
| `assets`                 | `{mode, dir}`                                                | Binary assets: `"inline"` (base64), `"external"` (files in `dir`, referenced by relative URI), `"bundle"`.                                                                                                                                                                                          |
| `lock`                   | bool                                                         | Write a lock file while open (for file-based single-user editing).                                                                                                                                                                                                                                  |

### 11.4 Stored structure

What a stored diagram looks like, independently of format and file split, is specified by DID, the Diagram Definition Language ([DID-specification.md](../did/DID-specification.md), section 3): the element, relation and view records, and the node and edge view data. Every DID definition names the DISL specification it was made with in its `language` object. The settings in this section and in 11.5–11.7 are declared by a specification and configure that structure; DID specifies what a conforming writer produces from them.

### 11.5 Identifiers

| Property     | Type                                                                                           | Description                                                                                                                                                                                                                                                                                                                         |
|--------------|------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `strategy`   | `"uuid-v4"`, `"uuid-v7"` (default), `"ulid"`, `"nanoid"`, `"sequential"`, `"natural"`, `"cel"` | How new ids are generated (DID, section 4). `uuid-v7` and `ulid` are time-ordered, which keeps `id`-sorted files in creation order and helps merges. `sequential` uses per-type counters (`State_1`) and is only suitable for single-user editing. `natural` derives ids from `key` attributes (unique by constraint). `cel` evaluates `expression`. |
| `prefix`     | string or map TypeRef → string                                                                 | Type prefixes (`"st_"`), making ids self-describing in diffs.                                                                                                                                                                                                                                                                       |
| `expression` | Expression                                                                                     | For `cel`: context `create`, must return a string; uniqueness is enforced by appending `-2`, `-3`, …                                                                                                                                                                                                                                |
| `stable`     | bool                                                                                           | Ids never change once assigned, even if `natural` keys change (the first derived id is kept). Default `true`.                                                                                                                                                                                                                       |
| `pattern`    | regex                                                                                          | Allowed id syntax; default `^[A-Za-z0-9_.:#-]{1,128}$`.                                                                                                                                                                                                                                                                             |

### 11.6 View data and style overrides

`view.store` lists which kinds of view data are persisted: `bounds`, `waypoints`, `anchors`, `labelOffsets`, `collapsed`, `zIndex`, `rotation`, `params`, `ports`, `viewport`, `guides`, `pinned`, `settings`. Anything not listed is recomputed on load (by layout or defaults). A pure layout-driven language stores nothing but the model. DID, section 5, specifies the stored form.

`view.styleOverrides` is `"none"` (default), `"all"`, or a list of style property paths users may override per element (`"fill"`, `"stroke.color"`, `"stroke.dash"`, `"font.size"`). Overrides are stored in `NodeView.style` / `EdgeView.style` and have the highest precedence (6.1).

### 11.7 Ordering, precision and canonical form

| Property            | Type                                                      | Description                                                                                                                                                                                 |
|---------------------|-----------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `ordering.elements` | `"creation"`, `"id"`, `"type-then-id"`, `"tree"`, `"cel"` | Order of `elements` and `relations`. `tree` writes parents before children (depth-first, siblings by `order`). Default `"id"`.                                                              |
| `ordering.orderBy`  | Expression                                                | For `cel`: sort key per element.                                                                                                                                                            |
| `ordering.keys`     | `"canonical"`, `"alphabetical"`                           | Key order within objects. `canonical`: the order of this specification's tables (id, type, parent, slot, order, attributes, ports; then x-); attribute keys in metamodel declaration order. |
| `omitDefaults`      | bool                                                      | Do not write attribute values equal to their default, view sizes equal to the notation default, or empty collections. Default `true`.                                                       |
| `precision`         | `{canvas, numbers}`                                       | Decimal places for canvas coordinates (default 2) and for `number` attributes without `precision` facet (default: shortest round-trip representation).                                      |
| `timestamps`        | `{format, timezone}`                                      | `format`: `"rfc3339"` (default) or `"epoch-ms"`; `timezone`: `"utc"` (normalise to `Z`) or `"preserve"` (keep the offset entered).                                                          |
| `canonical`         | bool                                                      | Follow RFC 8785 (JSON Canonicalization Scheme) number and string serialization. Default `true`.                                                                                             |

A conforming writer applies these settings as DID, section 6, specifies, including its determinism requirement: the same logical DID definition and specification MUST produce byte-identical output. Suppressions of constraint problems are stored as DID, section 3, describes.

### 11.8 Metadata and specification embedding

`metadata` lists the metadata a DID definition carries in `meta`: `languageVersion` (always written in `language.version`), `createdAt`, `modifiedAt`, `generator`, `authors` (from `env.user` if the user consents), `title` (mirrors a diagram attribute), `checksum`.

`definition` controls how DID definitions refer to their specification: `{ "embed": "none" | "reference" | "inline", "uri": "https://…/statemachine-1.2.0.disl" }`. `reference` writes `language.definition` with the URI of the specification and its integrity hash; `inline` embeds the whole specification (self-contained archives). The property names `definition` are kept unchanged from the earlier format.

### 11.9 Migrations

Migrations upgrade DID definitions written with older language versions. They run on load, before validation, in version order.

```json
{
  "migrations": [
    {
      "from": ">=1.0.0 <1.1.0", "to": "1.1.0",
      "doc": "Renamed 'label' to 'name'; transitions got explicit priorities.",
      "steps": [
        { "renameAttribute": { "type": "State", "from": "label", "to": "name" } },
        { "setAttribute": { "type": "Transition", "attribute": "priority", "value": "0", "when": "!has(element.attributes.priority)" } }
      ]
    },
    {
      "from": ">=1.1.0 <2.0.0", "to": "2.0.0",
      "steps": [
        { "renameType": { "from": "EndState", "to": "FinalState" } },
        { "transform": { "type": "State", "cel": "element.attributes.with({'entryAction': element.attributes.?entry.orValue('')})" } },
        { "deleteAttribute": { "type": "State", "attribute": "entry" } },
        { "convertView": { "system": "canvas", "x": "value * 2.0", "y": "value * 2.0" } }
      ]
    }
  ]
}
```

| Step                       | Fields                                            | Effect                                                                                |
|----------------------------|---------------------------------------------------|---------------------------------------------------------------------------------------|
| `renameType`               | `from`, `to`                                      | Changes `type` of elements, relations and references.                                 |
| `renameAttribute`          | `type`, `from`, `to`                              | Renames stored attribute keys (including in subtypes).                                |
| `deleteType`               | `type`, `mode` (`"delete"`, `"keep-as-unknown"`)  | Removes elements of a type (and attached relations).                                  |
| `deleteAttribute`          | `type`, `attribute`                               |                                                                                       |
| `setAttribute`             | `type`, `attribute`, `value` (Expression), `when` | Sets a value, for example a default for a new required attribute.                     |
| `convertAttribute`         | `type`, `attribute`, `cel`                        | Converts a value; `value` is the old value.                                           |
| `transform`                | `type`, `cel`                                     | Returns a replacement `attributes` map; `element` is the raw element record as a map. |
| `retype`                   | `type`, `to`, `when`                              | Changes the type conditionally.                                                       |
| `convertView`              | `system`, `x`, `y`, `w`, `h`                      | Converts stored view coordinates (unit or origin changes).                            |
| `renamePort`, `renameSlot` |                                                   |                                                                                       |
| `plugin`                   | `name`, `args`                                    | Custom migration.                                                                     |

Migration expressions run in the `migration` context (12.3), which sees raw records as maps (`element`, `value`, `document`) rather than typed elements, because the old DID definition does not conform to the new metamodel. A migration that fails aborts loading; the original file is never modified until the user saves. Runtimes SHOULD tell users that a diagram was migrated and to which version, and MAY keep a backup.

DID definitions with a **newer** minor or patch language version than the loaded specification are opened with a warning; newer major versions are opened read-only or refused.

### 11.10 Collaboration

| Property      | Type                                           | Description                                                                                                                   |
|---------------|------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------|
| `mode`        | `"none"` (default), `"lock"`, `"ot"`, `"crdt"` | Single user; pessimistic element locks; operational transformation; conflict-free replicated data types.                      |
| `engine`      | `"yjs"`, `"automerge"`, `"plugin:<name>"`      | CRDT or OT engine.                                                                                                            |
| `granularity` | `"element"`, `"attribute"`                     | Conflict unit. `attribute` merges concurrent edits of different attributes of one element.                                    |
| `text`        | `"replace"`, `"merge"`                         | Concurrent edits of `text`/`string` attributes: last writer wins or character-level merge.                                    |
| `ordering`    | `"fractional-index"`                           | Order keys for ordered children and lists that merge without renumbering.                                                     |
| `presence`    | bool                                           | Share cursors and selections.                                                                                                 |
| `conflicts`   | `"last-writer-wins"`, `"report"`               | Whether semantic conflicts (both sides valid, the merge invalid) are reported as constraint problems attributed to the merge. |

The CRDT state is a transport concern; the persisted DID definition remains the canonical form (DID, section 6). Constraints are re-evaluated after merges.

### 11.11 Import and export

`persistence.export` and `persistence.import` declare conversions: `[{ "format": "svg" | "png" | "pdf" | "did-fragment" | "plugin:<name>", "label", "doc", "options" }]`. `did-fragment` writes a DID fragment (DID, section 7). Image exports render the notation exactly as on screen (without interaction states) at a chosen scale; `pdf` honours `canvas.page`. Constraints with `timing: "export"` run before export.

---

## 12. The CEL environment

### 12.1 Base language

DISL uses CEL as specified at https://github.com/google/cel-spec, with these standard extensions REQUIRED: **strings** (`charAt`, `indexOf`, `lowerAscii`, `replace`, `split`, `substring`, `trim`, `upperAscii`, `format`, `join`, `reverse`, `quote`), **math** (`math.greatest`, `math.least`, `math.ceil`, `math.floor`, `math.round`, `math.abs`, `math.sqrt`, …), **lists** (`distinct`, `flatten`, `range`, `slice`, `sort`, `sortBy`), **sets** (`sets.contains`, `sets.intersects`, `sets.equivalent`), **optional types** (`?.`, `.?`, `optional.of`, `orValue`), and the `cel.bind` macro. Comprehension macros `all`, `exists`, `exists_one`, `map`, `filter` and `has` are available as in core CEL.

### 12.2 DISL types

| CEL type                                     | Fields and methods                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|----------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `Element` (nodes, relations, ports, diagram) | `id` (string), `type` (string), `kind` (`"node"`, `"relation"`, `"port"`, `"diagram"`), every attribute as a field (typed from the metamodel; references resolve to `Element` or `null`), `isA(typeName) → bool`, `isTagged(tag) → bool`, `view → ViewData` (placement of the element in the current view, `null` in headless contexts), `label() → string` (value of `labelAttribute`).                                                                                                                                                           |
| Node-specific                                | `parent → Element?`, `owner → Element` (parent or diagram), `slot → string`, `children → list(Element)`, `childrenOfType(t)`, `descendants()`, `ancestors()`, `ancestorsOfType(t)`, `depth() → int`, `ports → list(Element)`, `portsOfType(name)`, `incoming → list(Element)`, `outgoing → list(Element)`, `incomingOf(relType)`, `outgoingOf(relType)`, `neighbors()`, `successors(relType)`, `predecessors(relType)`, `reachable(relType) → list(Element)` (transitive successors, excluding self unless on a cycle), `inCycle(relType) → bool`. |
| Relation-specific                            | `source → Element`, `target → Element`, `sourcePort`, `targetPort` (`Element?`), `other(e) → Element` (the opposite end).                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Port-specific                                | `owner → Element`, `connections → list(Element)`, `direction → string`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Diagram                                      | `nodes → list(Element)` (model nodes, not view-only), `relations`, `elements` (both), `nodesOfType(t)`, `relationsOfType(t)`, `elementById(id) → Element?`, `hasCycle(relType) → bool`, `viewOnly → list(Element)` (in the current view), diagram attributes as fields.                                                                                                                                                                                                                                                                            |
| `ViewData`                                   | `x`, `y`, `x2`, `y2`, `width`, `height` (domain values, `dyn`: `double`, `timestamp`, `duration` or band id), `bounds → Bounds` (canvas units), `collapsed`, `rotation`, `z`, `pinned`, `params` (map).                                                                                                                                                                                                                                                                                                                                            |
| `Bounds`                                     | `x`, `y`, `width`, `height`, `x2`, `y2` (canvas or domain units depending on the context, as documented there), `center() → list(double)`, `intersects(Bounds) → bool`, `contains(Bounds) → bool`.                                                                                                                                                                                                                                                                                                                                                 |
| `Env`                                        | `now → timestamp`, `locale → string`, `mode → string` (theme mode), `zoom → double`, `user → map` (`id`, `name`; empty unless the runtime is configured to expose it), `viewpoint → string`, `readOnly → bool`.                                                                                                                                                                                                                                                                                                                                    |

Attribute types map to CEL types per 4.2; enum values are strings; structs are `map(string, dyn)` with statically known fields; `many` attributes are lists.

### 12.3 Contexts

The context of an expression determines its variables. Validators type-check each expression in exactly one context.

| Context           | Used by                                                                                                                                      | Variables                                                                                 |
|-------------------|----------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| `element`         | derived attributes, labels, styles conditions, variants, visibility, tooltips, markers, notation Bindables, `form.visible` of embedded forms | `self`, `diagram`, `env`                                                                  |
| `compartmentItem` | `itemText`, `itemIcon`, `itemStyle`                                                                                                          | `self`, `item`, `index`, `diagram`, `env`                                                 |
| `shape`           | GeomExpr in shapes, markers, handles, form regions                                                                                           | `w`, `h`, `p`, `self`, `env`; in markers additionally `sw` (stroke width)                 |
| `handle`          | `Handle.value`, `yValue`                                                                                                                     | as `shape`, plus `px`, `py`                                                               |
| `placement`       | computed placement sources                                                                                                                   | `self`, `diagram`, `env`, `parent`, `axis` (`{kind, min, max}`)                           |
| `placementWrite`  | placement `write` actions                                                                                                                    | as `placement`, plus `value` (snapped domain value)                                       |
| `snap`            | CEL snap rules                                                                                                                               | `value`, `axis`, `zoom`, `self`, `parent`, `diagram`                                      |
| `categories`      | ordinal `categories` expressions                                                                                                             | `diagram`, `env`                                                                          |
| `constraint`      | invariant `when`, `rule`, `message`, `target`, `severity`, fix `when`                                                                        | `self`, `diagram`, `env` (`env.now` is fixed at the start of a validation run)            |
| `gesture:<kind>`  | gesture constraints                                                                                                                          | per 8.4                                                                                   |
| `create`          | attribute CEL defaults, tool `initial`, id `expression`                                                                                      | `diagram`, `env`, `parent`, `elementType`, `position`                                     |
| `form`            | form `visible`, `enabled`, `validate`, `options`                                                                                             | `self`, `value` (current field value), `diagram`, `env`                                   |
| `hook`            | hook `when` and actions                                                                                                                      | `self`, `old`, `event`, `diagram`, `env`, plus `let`/`as` bindings                        |
| `operation`       | operation `enabled` and actions                                                                                                              | `self` or `selection`, `p`, `diagram`, `env`, plus bindings                               |
| `template`        | template attribute and position expressions                                                                                                  | `p`, `diagram`, `env`, `refs` (map of created elements by ref)                            |
| `migration`       | migration steps                                                                                                                              | `element` (raw record map), `value`, `document` (raw map), `from`, `to` (version strings) |
| `function`        | user functions                                                                                                                               | parameters, plus `diagram`/`env` if declared in `uses`                                    |

### 12.4 DISL function library

In addition to the members listed in 12.2, these global functions are available in all contexts unless noted:

| Function                                                                                                                     | Description                                                                                                            |
|------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------|
| `l.isUnique() → bool`                                                                                                        | All elements of the list differ.                                                                                       |
| `l.sum()`, `l.min()`, `l.max()`, `l.avg()`                                                                                   | Numeric aggregates (`int`/`double`/`duration`).                                                                        |
| `l.count(x, pred)`                                                                                                           | Macro: number of elements satisfying `pred`.                                                                           |
| `l.indexOf(v) → int`                                                                                                         | First index or −1.                                                                                                     |
| `l.first()`, `l.last()`                                                                                                      | `optional` element.                                                                                                    |
| `snap(v, step) → double`                                                                                                     | Round to the nearest multiple. `snapFloor`, `snapCeil`.                                                                |
| `snapTo(v, list) → double`                                                                                                   | Nearest value from a list.                                                                                             |
| `clamp(v, lo, hi)`                                                                                                           | Clamp a number.                                                                                                        |
| `min(a, b, …)`, `max(a, b, …)`                                                                                               | Smallest or largest of two to four numbers (aliases of `math.least` / `math.greatest`, convenient in geometry).        |
| `m.with(m2) → map`                                                                                                           | A copy of map `m` with the entries of `m2` added or replaced (used in migrations and actions to build attribute maps). |
| `ordinal(value, enumName) → int`                                                                                             | Position of an enum value.                                                                                             |
| `enumLabel(enumName, value) → string`, `enumColor(...)`, `enumIcon(...)`                                                     | Enum metadata.                                                                                                         |
| `token(name) → string`                                                                                                       | Resolved theme token (element, shape contexts).                                                                        |
| `color(c).lighten(f)`, `.darken(f)`, `.alpha(f)`, `.mix(c2, f)`, `.contrastText() → string`                                  | Color manipulation; `contrastText` returns a readable text color for a background.                                     |
| `formatNumber(n, pattern) → string`                                                                                          | ICU number formatting in `env.locale`.                                                                                 |
| `formatDate(t, pattern) → string`, `formatDate(t, pattern, tz)`                                                              | LDML date formatting.                                                                                                  |
| `formatDuration(d, style) → string`                                                                                          | `"short"` (`3d 4h`), `"long"`, `"iso"`.                                                                                |
| `date(y, m, d) → timestamp`, `timestamp(string)` (core)                                                                      | Construction.                                                                                                          |
| `t.startOf(unit[, tz])`, `t.endOf(unit[, tz])`, `t.addUnits(n, unit[, tz])`                                                  | Calendar arithmetic (units as in 5.5).                                                                                 |
| `workingDays(a, b, calendarId) → int`, `addWorkingDays(t, n, calendarId) → timestamp`, `isWorkingTime(t, calendarId) → bool` | Calendar functions using axis calendars.                                                                               |
| `daysBetween(a, b) → int`                                                                                                    | Calendar days.                                                                                                         |
| `distance(p1, p2) → double`                                                                                                  | Euclidean distance of points.                                                                                          |
| `lower(s)`, `upper(s)`                                                                                                       | Aliases of `lowerAscii`/`upperAscii` with Unicode case mapping.                                                        |
| `matchesGlob(s, glob) → bool`                                                                                                | Glob matching (safer than regex for users).                                                                            |
| `diagram.nodesOfType(t, includeViewOnly)`                                                                                    | Include view-only elements.                                                                                            |

Implementations MUST provide cost estimates for all library functions; graph traversals (`reachable`, `hasCycle`, `inCycle`) have cost proportional to the number of relations of the given type and SHOULD be memoised per validation run.

### 12.5 Determinism

Expressions in the contexts `constraint`, `migration`, `create` (except `env.now`), `placement` and `snap` MUST be deterministic given the DID definition. `env.now` is the only source of time and is fixed per evaluation run. Random functions do not exist. Iteration order of `diagram.nodes` and similar lists is the persistence order (11.7), so results are reproducible across tools.

---

## 13. Extensions and plugins

### 13.1 Plugin declarations

Plugins provide what the declarative core does not: exotic shapes, special routers and layouts, domain-specific widgets, imports/exports, snapping to external data, custom actions. A specification declares every plugin it uses:

```json
{
  "plugins": {
    "acme.bpmnRouter": {
      "version": "^2.0.0",
      "provides": ["routing", "layout"],
      "required": false,
      "fallback": { "routing": "orthogonal", "layout": "layered" },
      "args": { "gridAware": { "type": "bool", "default": true } },
      "doc": "Specialised BPMN router that keeps sequence flows off pool boundaries.",
      "source": { "npm": "@acme/disl-bpmn-router", "integrity": "sha256-…" }
    }
  }
}
```

| Property       | Type                                   | Description                                                                                                                                                                                     |
|----------------|----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `version`      | SemVer range                           | Accepted plugin versions.                                                                                                                                                                       |
| `provides`     | string[]                               | Extension points: `shape`, `marker`, `lineEffect`, `routing`, `layout`, `snap`, `widget`, `action`, `celFunctions`, `import`, `export`, `persistenceFormat`, `collaboration`.                   |
| `required`     | bool                                   | If `true`, runtimes without the plugin MUST refuse to open diagrams of the type for editing (read-only viewing MAY still be offered). If `false`, `fallback` is used.                                      |
| `fallback`     | map extension point → built-in name    | Declarative fallbacks.                                                                                                                                                                          |
| `args`         | map → Attribute                        | Declared arguments with types, so uses of the plugin are validated.                                                                                                                             |
| `source`       | object                                 | Hints where implementations can be obtained (`npm`, `maven`, `url`, …) with integrity hashes. Runtimes MUST NOT download and execute code automatically without user or administrator approval. |
| `celFunctions` | `{name, params, returns, cost, doc}`[] | Declarations of CEL functions the plugin adds, so validators can type-check expressions that use them.                                                                                          |
| `doc`          | Doc                                    |                                                                                                                                                                                                 |

Every plugin use (`{ "plugin": "acme.bpmnRouter", "args": {…} }`) references a declared plugin; `args` are validated against the declaration.

### 13.2 Extension properties and profiles

`x-` properties (2.8) carry tool-specific data. A group of related extension properties MAY be documented as a **profile** — a JSON Schema published by a vendor or community that constrains `x-<prefix>-*` properties. Specifications list profiles they use in `language.profiles: ["https://…/simulation-profile.json"]`; validators that know a profile validate accordingly.

---

## 14. Processing model

### 14.1 Loading a specification

1. **Parse** the JSON; reject duplicate keys.
2. **Check versions**: `disl` major version supported (or its deprecated alias, section 18).
3. **Resolve imports** recursively, verify integrity hashes, detect cycles, apply `include` filters, prefix names with aliases.
4. **Validate structure** against the JSON Schema `$defs/Specification`.
5. **Resolve names**: every type, style, shape, marker, icon, form, tool, snap profile, layout, operation, function and plugin reference must resolve.
6. **Flatten inheritance**: compute C3 linearisations; merge attributes, ports, containment; check narrowing rules (4.7).
7. **Derive built-ins**: generate built-in constraints (8.7), default notations, default forms and the default toolbox where absent.
8. **Compile CEL**: parse and type-check every expression in its context (12.3); estimate costs against `language.limits.celCost`; check user functions for recursion.
9. **Check semantic rules** not expressible in JSON Schema: reserved attribute names, placement attribute types compatible with axes, snapping rules compatible with axis kinds, `x2` vs `width` exclusivity, handle parameters exist, label `editable` requires attribute binding, exactly one of `path`/`parts`/`svg`/`plugin` in shapes, and all other MUST statements of this document.
10. **Build** the runtime model.

Validators report every problem with the JSON Pointer of its location, a severity (`error` makes the specification unusable; `warning` does not) and a message.

### 14.2 Loading a DID definition

A runtime loads a stored diagram as DID specifies ([DID-specification.md](../did/DID-specification.md), section 8.1): it checks the language id and version against the specification's, runs this specification's migrations (11.9), validates, resolves view data, evaluates `live` constraints and renders.

### 14.3 Unknown content

Unknown types, attributes and view properties in a stored diagram are preserved as DID specifies ([DID-specification.md](../did/DID-specification.md), section 8.2), and unknown elements are reported by `std.typeExists`.

### 14.4 The editing transaction

Every user gesture, form commit, operation or quick fix is one **transaction**:

```
 gesture ─▶ gesture constraints (prevent?) ─▶ snapping ─▶ apply change
        ─▶ "before" hooks (may abort) ─▶ "after" hooks ─▶ recompute derived values & bindings
        ─▶ invariants with enforcement "prevent" (reject → roll back)
        ─▶ commit (one undo step) ─▶ live constraints (debounced) ─▶ render
```

Transactions are atomic: either all effects apply or none. Remote changes from collaborators apply as transactions without hooks but with constraint evaluation.

### 14.5 Saving

1. Evaluate constraints with `save` timing. If `blockSaveOn: "error"` and errors exist, ask the user (saving MUST remain possible under a different name or as a draft if the runtime supports drafts).
2. Write the DID definition canonically and atomically, as DID specifies ([DID-specification.md](../did/DID-specification.md), section 8.3).

---

## 15. Conformance

### 15.1 Conformance classes

| Class                  | Requirements                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Specification**      | A specification is conforming if it validates against the JSON Schema, passes all checks of 14.1 without errors, and uses only declared plugins.                                                                                                                                                                                                                                                                                                             |
| **DID definition**     | Conformance of a stored diagram to a specification is defined by DID ([DID-specification.md](../did/DID-specification.md), section 9).                                                                                                                                                                                                                                                                                                                       |
| **Validator**          | Implements 14.1 and DID's loading rules (without rendering), reports problems with JSON Pointers, and evaluates constraints headlessly.                                                                                                                                                                                                                                                                                                                                      |
| **Runtime — Core**     | Metamodel, persistence (including migrations, determinism), constraints, behavior, CEL environment, one cartesian numeric coordinate system with grid snapping, built-in shapes `rect`, `roundedRect`, `ellipse`, `diamond`, `text`, straight and polyline edges, markers `none`, `arrow`, `arrowFilled`, generated forms and toolbox.                                                                                                                        |
| **Runtime — Standard** | Core, plus: all built-in shapes and markers, styles with states and conditions, labels at all positions, compartments, ports, containers, custom path shapes, orthogonal and curved routing, all snap rules for numeric axes, per-axis snapping, time axes with calendar snapping, ordinal axes with bands, bound and computed placement, explicit forms and all standard widgets, context tools, templates, documentation surfaces (2.4), themes with modes. |
| **Runtime — Full**     | Standard, plus: composite shapes with handles, nine-slice scaling, line effects, jump-overs, stacked and custom markers, embedded forms, nested coordinate systems, polar systems, level of detail, variants, collaboration, all export formats, plugins.                                                                                                                                                                                                     |

A runtime MUST state its conformance class and list unsupported optional features. When a specification `requires` a higher class or unsupported features, the runtime MUST inform the user and MAY open the diagram read-only.

### 15.2 Graceful degradation

Runtimes that do not support a visual feature SHOULD degrade visually rather than refuse: a `sketch` stroke renders as solid, a `wave` effect as a straight line, an unsupported marker as `arrowFilled` (target) or `none` (source), an unsupported shape as `rect` with its label, an embedded form as its `fallback`. Semantic features — metamodel, constraints, persistence — MUST NOT degrade.

---

## 16. Security, privacy and robustness

- **No code execution.** Specifications contain no executable code other than CEL, which is sandboxed, side-effect free and terminating. Plugins are code and MUST be installed through an explicit trust decision.
- **Resource limits.** Runtimes MUST enforce CEL cost limits (2.5), limits on stored diagram size and element count (`language.limits`), hook depth (9.2), import depth (default 16) and path segment counts in custom shapes (default 10 000).
- **Sanitisation.** Inline SVG (shapes, icons) MUST be sanitised: no `<script>`, no event handler attributes, no `<foreignObject>`, no external references except data URIs of images. Markdown in labels and docs MUST be rendered without raw HTML. URIs in labels and links MUST be restricted to `http`, `https`, `mailto` and internal references unless the specification allows more.
- **Remote resources.** Imports, fonts, images and icons from remote URIs SHOULD carry integrity hashes; runtimes MAY block remote loading and SHOULD cache with integrity verification.
- **Privacy.** `env.user` is empty unless the runtime is configured to expose it; DID definitions store user names in metadata only with consent (11.8). Attributes marked `secret` are excluded from exports, logs, telemetry and AI assistant context.
- **Integrity of stored diagrams.** Unknown content is preserved (14.3); failed migrations never overwrite originals; saves are atomic.
- **Denial of service through geometry.** Runtimes SHOULD cap the number of rendered sub-rows in stacking, bands in ordinal axes and grid lines per frame.


---

## 17. Complete examples

The three specifications below are complete, and each one validates against the JSON Schema of Appendix A. Every CEL expression in them compiles with a reference CEL implementation (cel-go) configured with the DISL library of section 12. Together they exercise most of the language. They are also distributed as separate files next to this specification.

### 17.1 State machine — free canvas, grid snapping in both directions

This example shows a classic node-and-edge diagram type:

- **Metamodel:** an abstract `Vertex` supertype, a `State` with containment (composite states), pseudo-states with `multiplicity`, a view-only `Comment`, a `Transition` with an `expression`-typed guard, and an `Anchor` relation that may point at other relations (`connectsRelations`).
- **Coordinates:** one pixel system with a 10 px grid applied to both axes, 10 px size snapping with a minimum of 20, 15° rotation steps and object snapping, all documented for users.
- **Notation:** theme tokens with a dark mode; a composite `bullseye` shape with a handle that adjusts the ring gap; the parameterised `speech` bubble from 6.8 used for comments; a compartment computed from attributes; curved transitions with a casing, a label whose inline edit is parsed back into `trigger`, `guard` and `effect`, a priority label at the start of the edge, and dashed lines for guarded transitions.
- **Toolbox:** grouped tools, a disabled tool once an initial state exists, context tools and a parameterised template.
- **Constraints:** structural rules (one initial state, reachability, determinism), a `connect` gesture rule, and style rules with quick fixes that apply to all problems at once.
- **Behavior:** automatic naming, an operation that groups the selection into a composite state, and deletion and clipboard policies.
- **Persistence:** split model and view files, prefixed UUIDv7 ids, tree ordering and a chain of migrations.

File `statemachine.disl`:

```json
{
  "$schema": "https://etalii.net/adp/disl/schema/0.1/disl.schema.json#/$defs/Specification",
  "disl": "0.1",
  "language": {
    "id": "org.example.statemachine",
    "version": "1.2.0",
    "label": { "en": "State machine", "de": "Zustandsautomat" },
    "doc": {
      "summary": "Finite state machines with triggers, guards and effects.",
      "description": "Draw **states** and connect them with **transitions**. Every machine has exactly one initial state. Guards are CEL expressions over the machine's variables."
    },
    "defaultLocale": "en",
    "locales": ["en", "de"],
    "fileExtension": "sm.json",
    "requires": { "conformance": "standard" }
  },

  "functions": {
    "displayName": {
      "params": [{ "name": "e", "type": "Element" }],
      "returns": "string",
      "cel": "has(e.name) && e.name != '' ? e.name : e.type",
      "doc": "Name of a state, or its type when unnamed."
    },
    "transitionText": {
      "params": [{ "name": "t", "type": "Element" }],
      "returns": "string",
      "cel": "t.trigger + (t.guard != '' ? ' [' + t.guard + ']' : '') + (t.effect != '' ? ' / ' + t.effect : '')",
      "doc": "UML-style transition label: trigger [guard] / effect."
    }
  },

  "metamodel": {
    "diagram": {
      "attributes": {
        "title": { "type": "string", "label": "Title" },
        "variables": { "type": "Variable", "many": true, "doc": "Variables that guards may read." }
      }
    },
    "dataTypes": {
      "Variable": {
        "fields": {
          "name": { "type": "string", "required": true, "pattern": "^[a-z][A-Za-z0-9]*$" },
          "dataType": { "type": "VarKind", "default": "int" }
        },
        "display": { "cel": "value.name + ': ' + value.dataType" }
      }
    },
    "enums": {
      "VarKind": { "values": { "int": {}, "bool": {}, "string": {} } }
    },
    "types": {
      "Vertex": {
        "abstract": true,
        "doc": "Anything a transition can connect."
      },
      "State": {
        "extends": "Vertex",
        "doc": { "summary": "A condition the system can be in.", "tags": ["core"] },
        "attributes": {
          "name": { "type": "string", "required": true, "maxLength": 60, "unique": "parent",
                    "doc": "Unique within the enclosing region." },
          "entry": { "type": "string", "label": "Entry action", "doc": "Runs every time the state is entered." },
          "exit": { "type": "string", "label": "Exit action" },
          "color": { "type": "color", "palette": ["#EEEDFE", "#E1F5EE", "#FAEEDA", "#FAECE7"] }
        },
        "children": { "allowed": ["Vertex"] },
        "labelAttribute": "name"
      },
      "InitialState": { "extends": "Vertex", "multiplicity": { "min": 1, "max": 1 },
                        "doc": "Where execution starts. Exactly one per machine." },
      "FinalState": { "extends": "Vertex", "doc": "Execution ends when a final state is reached." },
      "Choice": { "extends": "Vertex", "doc": "Dynamic branch; outgoing guards are evaluated in order." },
      "Comment": {
        "viewOnly": true,
        "attributes": { "text": { "type": "text", "markup": "markdown" } },
        "doc": "A note on the diagram. Comments have no meaning for execution."
      }
    },
    "relations": {
      "Transition": {
        "doc": "A change from one vertex to another, fired by a trigger when the guard holds.",
        "source": { "types": ["Vertex"], "exclude": ["FinalState"] },
        "target": { "types": ["Vertex"], "exclude": ["InitialState"] },
        "allowSelfLoops": true,
        "attributes": {
          "trigger": { "type": "string" },
          "guard": { "type": "expression", "context": "x-guard", "resultType": "bool" },
          "effect": { "type": "string" },
          "priority": { "type": "int", "default": 0, "min": 0 }
        }
      },
      "Anchor": {
        "viewOnly": true,
        "source": "Comment",
        "target": ["Vertex", "Transition"],
        "connectsRelations": true,
        "doc": "Attaches a comment to an element."
      }
    }
  },

  "coordinates": {
    "axes": { "px": { "kind": "linear", "unit": "px" } },
    "systems": {
      "canvas": {
        "kind": "cartesian",
        "x": "px",
        "y": "px",
        "grid": { "visible": true, "style": "dots", "spacing": 10, "majorEvery": 5 },
        "snapping": "grid10",
        "guides": { "smart": true, "distribution": true }
      }
    },
    "snapProfiles": {
      "grid10": {
        "both": { "grid": { "spacing": 10 } },
        "size": { "both": { "grid": { "spacing": 10 }, "min": 20 } },
        "targets": ["objects", "rule"],
        "rotation": { "step": 15 },
        "doc": { "summary": "Everything aligns to a 10 px grid.", "rationale": "Aligned diagrams are easier to read and diff." }
      }
    },
    "default": "canvas"
  },

  "notation": {
    "theme": {
      "tokens": {
        "color.surface": "#FFFFFF",
        "color.text": "#2C2C2A",
        "color.border": "#5F5E5A",
        "color.accent": "#534AB7",
        "color.accent.soft": "#EEEDFE",
        "color.note": "#FAEEDA",
        "font.body": "Inter, system-ui, sans-serif",
        "font.mono": "JetBrains Mono, monospace"
      },
      "modes": {
        "dark": {
          "color.surface": "#2C2C2A",
          "color.text": "#F1EFE8",
          "color.border": "#B4B2A9",
          "color.accent.soft": "#3C3489",
          "color.note": "#633806"
        }
      },
      "followSystem": true
    },
    "styles": {
      "base": {
        "fill": { "token": "color.surface" },
        "stroke": { "color": { "token": "color.border" }, "width": 1.25 },
        "font": { "family": { "token": "font.body" }, "size": 13, "color": { "token": "color.text" } }
      },
      "stateBody": {
        "extends": "base",
        "fill": { "attribute": "color" },
        "cornerRadius": 10
      },
      "pseudo": { "fill": { "token": "color.text" }, "stroke": { "width": 0 } }
    },
    "shapes": {
      "bullseye": {
        "label": "Final state",
        "doc": "A filled circle inside a ring.",
        "params": { "gap": { "type": "number", "unit": "length", "default": 4, "min": 2, "max": "min(w, h) / 3" } },
        "parts": [
          { "id": "ring", "shape": "ellipse", "box": { "x": 0, "y": 0, "w": "w", "h": "h" }, "outline": true,
            "style": { "fill": "none" } },
          { "id": "dot", "shape": "ellipse", "box": { "x": "p.gap", "y": "p.gap", "w": "w - 2.0 * p.gap", "h": "h - 2.0 * p.gap" },
            "style": { "fill": { "token": "color.text" }, "stroke": { "width": 0 } } }
        ],
        "handles": [
          { "param": "gap", "axis": "x", "x": "p.gap", "y": "h / 2.0", "value": "px", "label": "Ring gap",
            "snap": { "grid": { "spacing": 1 } } }
        ],
        "aspectRatio": 1
      },
      "speech": {
        "label": "Speech bubble",
        "doc": "Drag the round handle to point the tail, the square handle to change the corner radius.",
        "params": {
          "tipX": { "type": "number", "unit": "fraction", "default": 0.2, "min": -0.5, "max": 1.5 },
          "tipY": { "type": "number", "unit": "fraction", "default": 1.4, "min": -0.8, "max": 1.8 },
          "base": { "type": "number", "unit": "fraction", "default": 0.3, "min": 0.1, "max": 0.8 },
          "radius": { "type": "number", "unit": "length", "default": 8, "min": 0, "max": "min(w, h) / 2.0" }
        },
        "parts": [
          { "id": "body", "shape": { "type": "roundedRect", "params": { "radius": { "param": "radius" } } },
            "box": { "x": 0, "y": 0, "w": "w", "h": "h" }, "outline": true },
          { "id": "tail",
            "shape": { "path": { "segments": [
              { "op": "M", "x": "w * p.base", "y": "h - 1.0" },
              { "op": "L", "x": "w * p.tipX", "y": "h * p.tipY" },
              { "op": "L", "x": "w * (p.base + 0.15)", "y": "h - 1.0" },
              { "op": "Z" } ] } },
            "box": { "x": 0, "y": 0, "w": "w", "h": "h" } }
        ],
        "textArea": { "x": 10, "y": 8, "w": "w - 20.0", "h": "h - 16.0" },
        "handles": [
          { "param": "tipX", "yParam": "tipY", "axis": "both", "x": "w * p.tipX", "y": "h * p.tipY",
            "value": "px / w", "yValue": "py / h", "label": "Tail tip" },
          { "param": "radius", "axis": "x", "x": "p.radius", "y": 0, "value": "px",
            "snap": { "grid": { "spacing": 2 } }, "label": "Corner radius" }
        ]
      }
    },
    "nodes": {
      "State": {
        "shape": { "type": "roundedRect", "params": { "radius": 10 } },
        "style": "stateBody",
        "size": { "default": [140, 70], "min": [80, 40], "autoSize": "grow" },
        "labels": [
          { "id": "name", "text": { "attribute": "name" }, "position": "top", "editable": "inline",
            "style": { "font": { "weight": 600 } }, "placeholder": "Unnamed state" }
        ],
        "compartments": [
          { "id": "actions",
            "items": { "cel": "(self.entry != '' ? ['entry / ' + self.entry] : []) + (self.exit != '' ? ['exit / ' + self.exit] : [])" },
            "itemText": { "cel": "item" },
            "style": { "font": { "family": { "token": "font.mono" }, "size": 11 } },
            "separator": { "color": { "token": "color.border" }, "width": 0.5 },
            "visible": { "cel": "self.entry != '' || self.exit != ''" } }
        ],
        "container": { "layout": "free", "padding": [36, 12, 12, 12], "autoGrow": true, "highlightOnDrop": true },
        "badges": [
          { "id": "hidden", "position": "bottom-right", "shape": "pill", "size": 16,
            "text": { "cel": "'+' + string(self.children.size())" },
            "visible": { "cel": "self.view != null && self.view.collapsed && self.children.size() > 0" },
            "tooltip": "Collapsed composite state: number of hidden sub-states" }
        ],
        "conditions": [
          { "when": "self.children.size() > 0", "style": { "stroke": { "width": 2 } },
            "doc": "Composite states have a heavier border." }
        ],
        "states": {
          "selected": { "stroke": { "color": { "token": "color.accent" }, "width": 2 } },
          "dropTarget": { "fill": { "token": "color.accent.soft" } }
        },
        "tooltip": { "cel": "displayName(self) + ' — ' + string(self.outgoing.size()) + ' outgoing transitions'" },
        "lod": [ { "maxZoom": 0.35, "hide": ["compartments", "badges"] } ]
      },
      "InitialState": {
        "shape": "circle",
        "style": "pseudo",
        "size": { "fixed": [20, 20] },
        "placement": { "anchor": "center" },
        "labels": [],
        "tooltip": "Initial state"
      },
      "FinalState": {
        "shape": "bullseye",
        "style": "base",
        "size": { "fixed": [24, 24] },
        "placement": { "anchor": "center" },
        "labels": []
      },
      "Choice": {
        "shape": "diamond",
        "style": "base",
        "size": { "fixed": [28, 28] },
        "placement": { "anchor": "center" },
        "labels": []
      },
      "Comment": {
        "shape": "speech",
        "style": { "fill": { "token": "color.note" }, "stroke": { "color": "#BA7517", "width": 0.75 } },
        "size": { "default": [180, 70] },
        "labels": [ { "id": "text", "text": { "attribute": "text" }, "format": "markdown", "editable": "multiline",
                      "position": "top-left", "overflow": "ellipsis" } ],
        "layer": "foreground"
      }
    },
    "edges": {
      "Transition": {
        "line": {
          "stroke": { "color": { "token": "color.border" }, "width": 1.25,
                      "casing": { "color": { "token": "color.surface" }, "width": 5 } },
          "routing": "curved",
          "curvature": 0.2,
          "bendpoints": { "editable": true, "removeOnStraighten": true }
        },
        "targetMarker": { "type": "arrowFilled", "params": { "length": 10, "width": 8 } },
        "labels": [
          { "id": "text", "text": { "cel": "transitionText(self)" }, "at": "middle", "side": "above",
            "background": { "fill": { "token": "color.surface" }, "padding": 2, "cornerRadius": 3 },
            "editable": "inline",
            "parse": { "cel": "value", "write": [
              { "set": {
                  "trigger": "value.split('[')[0].split('/')[0].trim()",
                  "guard": "value.contains('[') ? value.split('[')[1].split(']')[0].trim() : ''",
                  "effect": "value.contains('/') ? value.split('/')[1].trim() : ''" } } ] } },
          { "id": "prio", "text": { "cel": "self.priority > 0 ? string(self.priority) : ''" }, "at": "start", "offset": 10,
            "side": "below", "style": { "font": { "size": 10 } } }
        ],
        "selfLoop": { "shape": "arc", "size": 36, "side": "top" },
        "parallel": { "spread": 14, "mode": "curve" },
        "states": { "selected": { "stroke": { "color": { "token": "color.accent" }, "width": 2 } } },
        "conditions": [ { "when": "self.guard != ''", "style": { "stroke": { "dash": "dashed" } },
                          "doc": "Guarded transitions are dashed." } ]
      },
      "Anchor": {
        "line": { "stroke": { "dash": "dotted", "cap": "round", "color": "#BA7517", "width": 1 } },
        "targetMarker": "none"
      }
    }
  },

  "toolbox": {
    "layout": "list",
    "searchable": true,
    "groups": [
      { "id": "vertices", "label": { "en": "States", "de": "Zustände" }, "tools": [
        { "id": "state", "creates": "State", "shortcut": "S", "icon": "square-rounded" },
        { "id": "initial", "creates": "InitialState", "shortcut": "I", "icon": "circle-dot",
          "enabled": "diagram.nodesOfType('InitialState').size() == 0" },
        { "id": "final", "creates": "FinalState", "icon": "circle-dot" },
        { "id": "choice", "creates": "Choice", "icon": "diamond" }
      ] },
      { "id": "connections", "label": { "en": "Connections", "de": "Verbindungen" }, "tools": [
        { "id": "transition", "creates": "Transition", "mode": "drag", "shortcut": "T", "createTarget": "State" }
      ] },
      { "id": "annotations", "label": "Annotations", "collapsed": true, "tools": [
        { "id": "comment", "creates": "Comment", "icon": "message" },
        { "id": "anchor", "creates": "Anchor" },
        { "id": "retry", "kind": "template", "template": "retryLoop", "label": "Retry loop" }
      ] }
    ],
    "contextTools": [
      { "for": ["State", "Choice", "InitialState"], "placement": "around", "tools": [
        { "kind": "create-connected", "creates": "State", "via": "Transition", "direction": "outgoing",
          "label": "Add next state", "icon": "arrow-right", "position": "right" },
        { "kind": "connect", "via": "Transition", "icon": "link", "position": "bottom" },
        { "kind": "delete", "position": "top-right" }
      ] }
    ],
    "templates": {
      "retryLoop": {
        "label": "Retry loop",
        "doc": "A state that retries a number of times before failing.",
        "params": { "attempts": { "type": "int", "default": 3, "min": 1, "label": "Attempts" } },
        "fragment": {
          "nodes": [
            { "ref": "try", "type": "State", "attributes": { "name": "'Trying'" }, "at": [0, 0] },
            { "ref": "fail", "type": "FinalState", "at": [220, 20] }
          ],
          "relations": [
            { "type": "Transition", "source": "try", "target": "try",
              "attributes": { "trigger": "'error'", "guard": "'retries < ' + string(p.attempts)" } },
            { "type": "Transition", "source": "try", "target": "fail",
              "attributes": { "trigger": "'error'", "guard": "'retries >= ' + string(p.attempts)" } }
          ]
        }
      }
    }
  },

  "forms": {
    "stateInspector": {
      "for": "State",
      "usage": ["inspector"],
      "items": [
        { "attribute": "name" },
        { "attribute": "color", "widget": "color" },
        { "kind": "section", "title": "Actions", "items": [
          { "attribute": "entry", "widget": "code", "widgetOptions": { "language": "text" } },
          { "attribute": "exit", "widget": "code", "widgetOptions": { "language": "text" } }
        ] },
        { "kind": "problems" }
      ]
    },
    "transitionInspector": {
      "for": "Transition",
      "items": [
        { "attribute": "trigger", "placeholder": "e.g. open" },
        { "attribute": "guard", "widget": "code", "widgetOptions": { "language": "cel" },
          "doc": "Boolean CEL expression over the machine's variables." },
        { "attribute": "effect" },
        { "attribute": "priority", "widget": "spinner",
          "visible": "self.source.outgoingOf('Transition').size() > 1" }
      ]
    }
  },

  "constraints": {
    "groups": {
      "structure": { "label": "Structure", "doc": "Rules without which the machine cannot run." },
      "style": { "label": "Style guide", "enabledByDefault": true }
    },
    "rules": [
      {
        "id": "singleInitial", "group": "structure", "scope": "diagram",
        "rule": "diagram.nodesOfType('InitialState').size() == 1",
        "severity": "error",
        "message": "A state machine needs exactly one initial state.",
        "doc": { "rationale": "Execution must start somewhere, and in only one place." },
        "fixes": [
          { "label": "Add an initial state", "when": "diagram.nodesOfType('InitialState').size() == 0",
            "actions": [ { "create": { "type": "'InitialState'", "at": "[40.0, 40.0]" } } ] }
        ]
      },
      {
        "id": "initialHasOneExit", "group": "structure", "scope": "InitialState",
        "rule": "self.outgoing.size() == 1",
        "message": "The initial state must have exactly one outgoing transition."
      },
      {
        "id": "noEntryIntoInitial", "kind": "connect",
        "when": "relationType == 'Transition'",
        "rule": "!target.isA('InitialState')",
        "message": "Transitions cannot enter the initial state."
      },
      {
        "id": "reachable", "group": "structure", "scope": "Vertex",
        "when": "!self.isA('InitialState')",
        "rule": "diagram.nodesOfType('InitialState').exists(i, self in i.reachable('Transition'))",
        "severity": "warning", "cost": "expensive",
        "message": { "cel": "'\"' + displayName(self) + '\" can never be reached.'" }
      },
      {
        "id": "deterministic", "group": "structure", "scope": "State",
        "rule": "self.outgoingOf('Transition').filter(t, t.guard == '').map(t, t.trigger).isUnique()",
        "message": "Two unguarded transitions leave this state on the same trigger.",
        "doc": { "rationale": "The machine would not know which transition to take." }
      },
      {
        "id": "choiceNeedsElse", "group": "structure", "scope": "Choice",
        "rule": "self.outgoingOf('Transition').exists(t, t.guard == 'else')",
        "severity": "warning",
        "message": "A choice should have an 'else' branch.",
        "fixes": [ { "label": "Mark the last branch as else", "when": "self.outgoing.size() > 0",
                     "actions": [ { "set": { "guard": "'else'" }, "target": "self.outgoing[self.outgoing.size() - 1]" } ] } ]
      },
      {
        "id": "nameCase", "group": "style", "scope": "State",
        "rule": "self.name == '' || self.name.substring(0, 1) == self.name.substring(0, 1).upperAscii()",
        "severity": "hint", "attribute": "name",
        "message": "State names start with a capital letter.",
        "fixes": [ { "label": "Capitalise", "preferred": true, "applyToAll": true,
                     "actions": [ { "set": { "name": "self.name.substring(0, 1).upperAscii() + self.name.substring(1)" } } ] } ]
      }
    ]
  },

  "behavior": {
    "hooks": [
      { "id": "nameNewState", "on": "create", "for": "State", "when": "!has(self.name) || self.name == ''",
        "actions": [ { "set": { "name": "'State ' + string(diagram.nodesOfType('State').size())" } } ],
        "doc": "New states are numbered automatically." }
    ],
    "operations": {
      "makeFinal": {
        "label": "Convert to final state", "for": "State", "icon": "flag",
        "enabled": "self.outgoing.size() == 0",
        "actions": [ { "retype": { "to": "'FinalState'" } } ]
      },
      "extractComposite": {
        "label": "Group into composite state", "for": "selection",
        "enabled": "selection.all(e, e.isA('Vertex'))",
        "actions": [
          { "create": { "type": "'State'", "attributes": { "name": "'Composite'" } }, "as": "group" },
          { "forEach": "selection", "as": "v", "do": [ { "reparent": { "target": "v", "parent": "group" } } ] },
          { "layout": { "scope": "[group]" } }
        ]
      }
    },
    "deletion": { "State": { "children": "reparent", "relations": "delete" } },
    "clipboard": { "relations": "internal", "ids": "regenerate", "names": "suffix", "offset": [20, 20] },
    "undo": { "mergeWindowMs": 500 }
  },

  "layout": {
    "algorithms": {
      "flow": { "algorithm": "layered", "direction": "right",
                "spacing": { "node": 40, "layer": 90, "edge": 12 }, "edgeRouting": "curved",
                "doc": "Left-to-right flow." }
    },
    "default": "flow",
    "trigger": "onLoadIfMissing",
    "respect": "pinned"
  },

  "persistence": {
    "format": "json",
    "files": { "mode": "split", "model": "{name}.sm.json", "view": "{name}.sm.view.json" },
    "ids": { "strategy": "uuid-v7", "prefix": { "State": "st_", "Transition": "tr_", "Comment": "cm_" } },
    "ordering": { "elements": "tree", "keys": "canonical" },
    "omitDefaults": true,
    "precision": { "canvas": 1 },
    "view": { "store": ["bounds", "waypoints", "labelOffsets", "params", "viewport", "pinned"],
              "styleOverrides": ["fill"] },
    "metadata": ["languageVersion", "createdAt", "modifiedAt", "generator"],
    "migrations": [
      { "from": ">=1.0.0 <1.1.0", "to": "1.1.0",
        "doc": "Renamed 'label' to 'name'.",
        "steps": [ { "renameAttribute": { "type": "State", "from": "label", "to": "name" } } ] },
      { "from": ">=1.1.0 <1.2.0", "to": "1.2.0",
        "doc": "EndState became FinalState; transitions got a priority.",
        "steps": [
          { "renameType": { "from": "EndState", "to": "FinalState" } },
          { "setAttribute": { "type": "Transition", "attribute": "priority", "value": "0",
                              "when": "!has(element.attributes.priority)" } },
          { "transform": { "type": "State",
                           "cel": "element.attributes.with({'entry': element.attributes.?onEntry.orValue('')})" } },
          { "deleteAttribute": { "type": "State", "attribute": "onEntry" } }
        ] }
    ],
    "export": [ { "format": "svg" }, { "format": "png", "options": { "scale": 2 } } ]
  }
}
```

### 17.2 Project timeline — time on x, resource lanes on y, bound placement

This example shows the coordinate layer in action. The x axis is a **time axis** in working days: weekends and holidays are collapsed, the time zone comes from a diagram attribute, and the ruler has several levels with today marked. The y axis is an **ordinal axis** whose bands are the `Resource` nodes. Tasks are **bound** to the model: `x ↔ start`, `x2 ↔ end`, `y ↔ assignee`. Dragging a task changes dates and assignment, never view data, so the view record of a task is empty (see the DID definition in 17.4).

Snapping is **different per axis**. On x, tasks snap to whole working days using calendar rules. On y, they snap to the centre of a lane. Sizes snap to whole days with a minimum of one day. The task bar is a composite `progressBar` shape whose progress handle snaps to quarters. Dependencies anchor at the finish and start of bars; variants move the anchors for start-to-start and finish-to-finish links. The link type is shown at the edge start and the lag in the middle, and conditional styles turn a violated dependency red.

File `timeline.disl`:

```json
{
  "$schema": "https://etalii.net/adp/disl/schema/0.1/disl.schema.json#/$defs/Specification",
  "disl": "0.1",
  "language": {
    "id": "org.example.timeline",
    "version": "0.4.0",
    "label": "Project timeline",
    "doc": {
      "summary": "Plan tasks and milestones over calendar time, one lane per resource.",
      "description": "The horizontal axis is **calendar time** (working days only). Each lane is a **resource**. Tasks snap to whole working days; dragging a task vertically reassigns it."
    },
    "requires": { "conformance": "standard", "features": ["axis.time", "axis.ordinal", "placement.bound"] }
  },

  "metamodel": {
    "diagram": {
      "attributes": {
        "title": { "type": "string" },
        "projectStart": { "type": "date", "required": true },
        "projectEnd": { "type": "date" },
        "timezone": { "type": "string", "default": "Europe/Berlin", "doc": "IANA time zone of the plan." },
        "holidays": { "type": "date", "many": true, "doc": "Non-working days in addition to weekends." }
      }
    },
    "enums": {
      "DependencyKind": {
        "values": {
          "FS": { "label": "Finish → start", "doc": "Successor starts after predecessor finishes." },
          "SS": { "label": "Start → start" },
          "FF": { "label": "Finish → finish" }
        }
      },
      "Status": {
        "ordered": true,
        "values": {
          "planned": { "color": "#B4B2A9" },
          "active": { "color": "#378ADD" },
          "done": { "color": "#639922" },
          "blocked": { "color": "#E24B4A" }
        }
      }
    },
    "types": {
      "Resource": {
        "doc": "A person or team; each resource is one lane.",
        "attributes": {
          "name": { "type": "string", "required": true },
          "position": { "type": "int", "default": 0, "doc": "Lane order." },
          "capacity": { "type": "number", "default": 1, "min": 0, "unit": "FTE" }
        }
      },
      "Schedulable": {
        "abstract": true,
        "attributes": {
          "title": { "type": "string", "required": true },
          "start": { "type": "date", "required": true },
          "assignee": { "type": "Resource", "required": true },
          "status": { "type": "Status", "default": "planned" }
        },
        "labelAttribute": "title"
      },
      "Task": {
        "extends": "Schedulable",
        "attributes": {
          "end": { "type": "date", "required": true },
          "progress": { "type": "number", "min": 0, "max": 1, "default": 0, "step": 0.05 }
        }
      },
      "Milestone": { "extends": "Schedulable", "doc": "A zero-duration event." }
    },
    "relations": {
      "Dependency": {
        "source": "Schedulable",
        "target": "Schedulable",
        "acyclic": true,
        "allowParallel": false,
        "attributes": {
          "linkType": { "type": "DependencyKind", "default": "FS" },
          "lag": { "type": "int", "default": 0, "unit": "working days" }
        }
      }
    }
  },

  "coordinates": {
    "axes": {
      "time": {
        "kind": "time",
        "label": "Calendar",
        "doc": "Working days of the project calendar. Weekends and holidays are collapsed.",
        "valueType": "date",
        "timezone": { "attribute": "timezone" },
        "scale": { "unit": "day", "size": 36 },
        "calendar": { "id": "project", "workingDays": [1, 2, 3, 4, 5], "holidays": { "attribute": "holidays" } },
        "collapse": "non-working",
        "min": { "cel": "diagram.projectStart" },
        "zoomLevels": [
          { "label": "Days", "scale": { "unit": "day", "size": 36 } },
          { "label": "Weeks", "scale": { "unit": "day", "size": 12 } },
          { "label": "Months", "scale": { "unit": "day", "size": 4 } }
        ],
        "ruler": {
          "position": "top",
          "levels": [
            { "unit": "month", "format": "MMMM yyyy" },
            { "unit": "week", "format": "'W'w", "minZoom": 0.3 },
            { "unit": "day", "format": "EEE d", "minZoom": 0.9 }
          ]
        },
        "today": { "visible": true, "label": "Today", "style": { "stroke": { "color": "#E24B4A", "dash": "dashed" } } }
      },
      "lanes": {
        "kind": "ordinal",
        "label": "Resources",
        "categories": { "nodes": "Resource", "orderBy": "self.position" },
        "bandSize": "auto",
        "minBandSize": 40,
        "gap": 2,
        "reorderable": true,
        "header": { "size": 140, "side": "left" }
      }
    },
    "systems": {
      "schedule": {
        "kind": "cartesian",
        "x": "time",
        "y": "lanes",
        "grid": {
          "visible": true,
          "spacing": { "unit": "day" },
          "bands": { "alternate": true, "fill": ["#FFFFFF", "#F1EFE8"] }
        },
        "snapping": {
          "x": { "calendar": { "unit": "day", "align": "nearest", "workingTime": true } },
          "y": { "bands": { "align": "center" } },
          "size": { "x": { "calendar": { "unit": "day" }, "min": "P1D" } },
          "feedback": { "showGhost": true, "showValue": true, "highlightBand": true },
          "doc": {
            "summary": "Tasks snap to whole working days and into resource lanes.",
            "rationale": "Plans are made in days; finer precision would suggest accuracy the plan does not have."
          }
        }
      }
    },
    "default": "schedule"
  },

  "notation": {
    "styles": {
      "bar": {
        "fill": { "cel": "enumColor('Status', self.status)" },
        "fillOpacity": 0.25,
        "stroke": { "color": { "cel": "enumColor('Status', self.status)" }, "width": 1 },
        "cornerRadius": 4,
        "font": { "size": 12 }
      }
    },
    "shapes": {
      "progressBar": {
        "doc": "A bar whose darker part shows progress.",
        "params": { "progress": { "type": "number", "unit": "fraction", "default": 0, "min": 0, "max": 1 } },
        "parts": [
          { "id": "track", "shape": { "type": "roundedRect", "params": { "radius": 4 } },
            "box": { "x": 0, "y": 0, "w": "w", "h": "h" }, "outline": true },
          { "id": "done", "shape": { "type": "roundedRect", "params": { "radius": 4 } },
            "box": { "x": 0, "y": 0, "w": "w * p.progress", "h": "h" }, "when": "p.progress > 0.0",
            "style": { "fillOpacity": 0.8, "stroke": { "width": 0 } } }
        ],
        "handles": [
          { "param": "progress", "axis": "x", "x": "w * p.progress", "y": "h", "value": "px / w",
            "snap": { "values": [0, 0.25, 0.5, 0.75, 1] }, "label": "Progress" }
        ]
      }
    },
    "nodes": {
      "Resource": {
        "shape": "rect",
        "style": { "fill": "none", "stroke": { "width": 0 }, "font": { "weight": 600 } },
        "labels": [ { "id": "name", "text": { "attribute": "name" }, "position": "left", "editable": "inline" } ]
      },
      "Task": {
        "shape": { "type": "progressBar", "params": { "progress": { "attribute": "progress" } } },
        "style": "bar",
        "size": { "default": [null, 24], "resizable": "horizontal" },
        "placement": {
          "system": "schedule",
          "x": { "attribute": "start" },
          "x2": { "attribute": "end" },
          "y": { "attribute": "assignee" },
          "anchor": "left",
          "movable": { "x": true, "y": true },
          "resizable": { "x": true, "y": false },
          "stack": { "mode": "pack", "order": "self.start", "rowSize": 28, "growBand": true },
          "doc": "Drag to reschedule or reassign; drag the right edge to change the end date."
        },
        "labels": [
          { "id": "title", "text": { "attribute": "title" }, "position": "left", "editable": "inline",
            "overflow": "ellipsis", "style": { "padding": [0, 6] } },
          { "id": "dates", "text": { "cel": "formatDate(self.start, 'd MMM') + ' – ' + formatDate(self.end, 'd MMM')" },
            "position": "outside-right", "style": { "font": { "size": 10, "color": "#888780" } },
            "visible": { "cel": "env.zoom >= 0.8" } }
        ],
        "tooltip": { "cel": "self.title + ': ' + string(workingDays(self.start, self.end, 'project')) + ' working days'" },
        "states": { "selected": { "stroke": { "width": 2 } } }
      },
      "Milestone": {
        "shape": "diamond",
        "style": { "fill": "#2C2C2A", "stroke": { "width": 0 } },
        "size": { "fixed": [16, 16] },
        "placement": {
          "system": "schedule",
          "x": { "attribute": "start" },
          "y": { "attribute": "assignee" },
          "anchor": "center",
          "doc": "Milestones sit at the start of their day."
        },
        "labels": [ { "id": "title", "text": { "attribute": "title" }, "position": "outside-right", "editable": "inline" } ]
      }
    },
    "edges": {
      "Dependency": {
        "line": {
          "stroke": { "color": "#5F5E5A", "width": 1 },
          "routing": "rounded",
          "cornerRadius": 4,
          "startDirection": "right",
          "endDirection": "left",
          "minSegmentLength": 8
        },
        "anchoring": {
          "source": { "mode": "fixed", "points": [ { "id": "finish", "x": 1, "y": 0.5 } ] },
          "target": { "mode": "fixed", "points": [ { "id": "start", "x": 0, "y": 0.5 } ] }
        },
        "targetMarker": { "type": "arrowFilled", "params": { "length": 7, "width": 6 } },
        "labels": [
          { "id": "linkType", "text": { "cel": "self.linkType == 'FS' ? '' : self.linkType" }, "at": "start", "offset": 6, "side": "above",
            "style": { "font": { "size": 10 } } },
          { "id": "lag", "text": { "cel": "self.lag != 0 ? (self.lag > 0 ? '+' : '') + string(self.lag) + 'd' : ''" },
            "at": "middle", "side": "on", "background": { "fill": "#FFFFFF", "padding": 1 }, "style": { "font": { "size": 10 } } }
        ],
        "variants": [
          { "when": "self.linkType == 'SS'",
            "anchoring": { "source": { "mode": "fixed", "points": [ { "id": "start", "x": 0, "y": 0.5 } ] } } },
          { "when": "self.linkType == 'FF'",
            "anchoring": { "target": { "mode": "fixed", "points": [ { "id": "finish", "x": 1, "y": 0.5 } ] } } }
        ],
        "conditions": [
          { "when": "self.target.start < addWorkingDays(self.source.start, self.lag, 'project')",
            "style": { "stroke": { "color": "#E24B4A", "width": 1.5 } },
            "doc": "Red when the dependency is violated." }
        ]
      }
    }
  },

  "toolbox": {
    "groups": [
      { "id": "plan", "label": "Plan", "tools": [
        { "id": "task", "creates": "Task", "mode": "drag", "shortcut": "T",
          "doc": "Drag horizontally in a lane to create a task over those days.",
          "initial": { "progress": 0 } },
        { "id": "milestone", "creates": "Milestone", "mode": "click", "shortcut": "M" },
        { "id": "dependency", "creates": "Dependency", "shortcut": "D" }
      ] },
      { "id": "people", "label": "Resources", "tools": [ { "id": "resource", "creates": "Resource" } ] }
    ]
  },

  "forms": {
    "task": {
      "for": "Task",
      "usage": ["inspector", "create"],
      "layout": { "columns": 2 },
      "items": [
        { "attribute": "title", "colSpan": 2 },
        { "attribute": "assignee", "widget": "reference", "options": { "cel": "diagram.nodesOfType('Resource')" } },
        { "attribute": "status", "widget": "segmented" },
        { "attribute": "start", "widget": "daterange", "widgetOptions": { "endAttribute": "end" }, "colSpan": 2 },
        { "kind": "computed", "label": "Duration",
          "value": { "cel": "string(workingDays(self.start, self.end, 'project')) + ' working days'" } },
        { "attribute": "progress", "widget": "slider", "widgetOptions": { "min": 0, "max": 1, "step": 0.05 },
          "format": "#0%" }
      ]
    }
  },

  "constraints": {
    "rules": [
      { "id": "endAfterStart", "scope": "Task", "rule": "self.end >= self.start", "attribute": "end",
        "message": "A task cannot end before it starts.",
        "fixes": [ { "label": "Make it one day long", "actions": [ { "set": { "end": "self.start" } } ] } ] },
      { "id": "dependencyRespected", "scope": "Dependency",
        "rule": "self.linkType != 'FS' || self.target.start >= addWorkingDays(has(self.source.end) ? self.source.end : self.source.start, self.lag + 1, 'project')",
        "severity": "warning",
        "message": { "cel": "'\"' + self.target.title + '\" starts before \"' + self.source.title + '\" is finished.'" },
        "target": "[self, self.target]",
        "fixes": [ { "label": "Move successor after predecessor", "preferred": true, "when": "has(self.source.end)",
                     "actions": [
                       { "let": { "shift": "workingDays(self.target.start, addWorkingDays(self.source.end, self.lag + 1, 'project'), 'project')" } },
                       { "set": { "start": "addWorkingDays(self.target.start, shift, 'project')",
                                  "end": "addWorkingDays(self.target.end, shift, 'project')" },
                         "target": "self.target" } ] } ] },
      { "id": "noOverbooking", "kind": "placement", "scope": "Task", "enforcement": "report", "severity": "info",
        "rule": "diagram.nodesOfType('Task').filter(t, t.id != self.id && t.assignee == self.assignee && t.start <= newBounds.x2 && newBounds.x <= t.end).size() < int(self.assignee.capacity)",
        "message": "This resource is already fully booked in that period." },
      { "id": "withinProject", "scope": "Schedulable",
        "when": "has(diagram.projectEnd)",
        "rule": "self.start >= diagram.projectStart && self.start <= diagram.projectEnd",
        "severity": "warning", "message": "Scheduled outside the project period." }
    ]
  },

  "behavior": {
    "hooks": [
      { "id": "keepDuration", "on": "change", "for": "Task", "attribute": "start", "phase": "after",
        "when": "event.source == 'user' && old != null",
        "actions": [ { "set": { "end": "addWorkingDays(self.start, workingDays(old.start, old.end, 'project'), 'project')" } } ],
        "doc": "Changing the start date in the form keeps the task's duration." },
      { "id": "autoDone", "on": "change", "for": "Task", "attribute": "progress",
        "when": "self.progress >= 1.0 && self.status != 'done'",
        "actions": [ { "set": { "status": "'done'" } },
                     { "notify": { "message": "'\"' + self.title + '\" marked as done.'", "severity": "success" } } ] }
    ],
    "deletion": { "Resource": { "references": "forbid", "confirm": "Remove this resource?" } }
  },

  "layout": {
    "algorithms": {
      "lanes": { "algorithm": "lanes", "doc": "Packs tasks into sub-rows within their resource lane; dates never change." }
    },
    "default": "lanes",
    "trigger": "always"
  },

  "persistence": {
    "format": "json",
    "ids": { "strategy": "ulid", "prefix": { "Task": "task_", "Milestone": "ms_", "Resource": "res_", "Dependency": "dep_" } },
    "ordering": { "elements": "type-then-id" },
    "timestamps": { "format": "rfc3339", "timezone": "preserve" },
    "view": { "store": ["viewport", "labelOffsets"] },
    "collaboration": { "mode": "crdt", "engine": "yjs", "granularity": "attribute", "presence": true },
    "export": [ { "format": "pdf", "options": { "fitTo": "page" } } ]
  }
}
```

### 17.3 Entity–relationship diagram — compartments from children, crow's-foot markers

This example shows notation driven by the model. Columns are child elements listed in a compartment, with conditional item styles and icons. Relationship markers are **computed** from the cardinality attributes (`erZeroOrMany`, `erOne`, …). The line is dashed for non-identifying relationships. Cardinality labels sit at both ends and only appear when zoomed in. Tables align to a 20 px grid while bendpoints use a 10 px grid. Ids are **natural** (derived from table and column names), persistence is YAML, and a plugin provides SQL export.

File `erd.disl`:

```json
{
  "$schema": "https://etalii.net/adp/disl/schema/0.1/disl.schema.json#/$defs/Specification",
  "disl": "0.1",
  "language": {
    "id": "org.example.erd",
    "version": "2.0.0",
    "label": "Entity–relationship diagram",
    "doc": "Tables with typed columns and relationships in crow's-foot notation."
  },

  "metamodel": {
    "enums": {
      "SqlType": {
        "extensible": true,
        "values": { "uuid": {}, "text": {}, "varchar": {}, "int": {}, "bigint": {}, "numeric": {},
                    "bool": {}, "date": {}, "timestamptz": {}, "jsonb": {} }
      },
      "Cardinality": {
        "values": {
          "one": { "label": "Exactly one" },
          "zeroOrOne": { "label": "Zero or one" },
          "oneOrMany": { "label": "One or many" },
          "zeroOrMany": { "label": "Zero or many" }
        }
      }
    },
    "types": {
      "Table": {
        "attributes": {
          "name": { "type": "string", "required": true, "key": true, "pattern": "^[a-z_][a-z0-9_]*$", "unique": "diagram",
                    "doc": "snake_case table name." },
          "schema": { "type": "string", "default": "public" },
          "comment": { "type": "text" }
        },
        "children": { "allowed": ["Column"], "ordered": true, "min": 1,
                      "slots": { "columns": { "allowed": ["Column"], "min": 1 } } }
      },
      "Column": {
        "attributes": {
          "name": { "type": "string", "required": true, "key": true, "unique": "parent" },
          "dataType": { "type": "SqlType", "default": "text", "label": "Type" },
          "nullable": { "type": "bool", "default": true },
          "primaryKey": { "type": "bool", "default": false, "label": "Primary key" },
          "references": { "type": "Column", "doc": "Foreign-key target column." }
        }
      }
    },
    "relations": {
      "Relationship": {
        "source": "Table",
        "target": "Table",
        "directed": false,
        "allowSelfLoops": true,
        "attributes": {
          "name": { "type": "string" },
          "sourceCardinality": { "type": "Cardinality", "default": "one" },
          "targetCardinality": { "type": "Cardinality", "default": "zeroOrMany" },
          "identifying": { "type": "bool", "default": false,
                           "doc": "Identifying relationships make the parent key part of the child key." }
        }
      }
    }
  },

  "coordinates": {
    "snapProfiles": {
      "coarse": { "both": { "grid": { "spacing": 20 } }, "targets": ["objects", "rule"],
                  "doc": "Tables align to a 20 px grid; edges snap their bendpoints to 10 px.",
                  "bendpoints": { "both": { "grid": { "spacing": 10 } } } }
    },
    "systems": {
      "canvas": { "kind": "cartesian", "x": { "kind": "linear" }, "y": { "kind": "linear" }, "snapping": "coarse",
                  "grid": { "visible": true, "style": "lines", "spacing": 20, "majorEvery": 5 } }
    }
  },

  "notation": {
    "styles": {
      "table": { "fill": "#FFFFFF", "stroke": { "color": "#444441", "width": 1 }, "cornerRadius": 6,
                 "font": { "family": "Inter, sans-serif", "size": 12 }, "shadow": { "dx": 0, "dy": 1, "blur": 3, "color": "#00000022" } }
    },
    "nodes": {
      "Table": {
        "shape": { "type": "roundedRect", "params": { "radius": 6 } },
        "style": "table",
        "size": { "default": [220, 120], "autoSize": "fitHeight", "resizable": "horizontal" },
        "labels": [
          { "id": "name", "text": { "attribute": "name" }, "position": "top", "editable": "inline",
            "background": { "fill": "#EEEDFE", "padding": [6, 8] },
            "style": { "font": { "weight": 600, "color": "#3C3489" } } }
        ],
        "compartments": [
          { "id": "columns",
            "items": { "children": ["Column"], "slot": "columns" },
            "itemText": { "cel": "item.name + '  ' + item.dataType + (item.nullable ? '' : ' not null')" },
            "itemIcon": { "cel": "item.primaryKey ? 'key' : (has(item.references) ? 'link' : '')" },
            "itemConditions": [ { "when": "item.primaryKey", "style": { "font": { "weight": 600, "decoration": "underline" } } } ],
            "separator": { "color": "#D3D1C7", "width": 0.5 },
            "overflow": "ellipsis", "maxItems": 20,
            "editable": { "add": true, "remove": true, "reorder": true, "inline": true },
            "emptyText": "No columns" }
        ],
        "anchors": { "mode": "sides", "spread": true },
        "form": { "form": "columnsTable", "interaction": "onDoubleClick", "minZoom": 0.8, "fallback": "labels" },
        "lod": [ { "maxZoom": 0.4, "hide": ["compartments"] } ]
      },
      "Column": { "shape": "none", "labels": [] }
    },
    "edges": {
      "Relationship": {
        "line": {
          "stroke": { "color": "#444441", "width": 1.25,
                      "dash": { "cel": "self.identifying ? 'solid' : 'dashed'" } },
          "routing": "orthogonal",
          "cornerRadius": 0,
          "avoidNodes": true,
          "minSegmentLength": 18,
          "startDirection": "normal",
          "endDirection": "normal",
          "bendpoints": { "editable": true }
        },
        "jumps": { "style": "gap", "size": 5 },
        "sourceMarker": { "cel": "'er' + self.sourceCardinality.substring(0, 1).upperAscii() + self.sourceCardinality.substring(1)" },
        "targetMarker": { "cel": "'er' + self.targetCardinality.substring(0, 1).upperAscii() + self.targetCardinality.substring(1)" },
        "labels": [
          { "id": "name", "text": { "attribute": "name" }, "at": "middle", "side": "above", "orientation": "upright",
            "style": { "font": { "style": "italic", "size": 11 } }, "editable": "inline" },
          { "id": "srcCard", "text": { "cel": "enumLabel('Cardinality', self.sourceCardinality)" }, "at": "start", "offset": 20,
            "side": "below", "style": { "font": { "size": 10, "color": "#888780" } }, "visible": { "cel": "env.zoom > 1.2" } },
          { "id": "tgtCard", "text": { "cel": "enumLabel('Cardinality', self.targetCardinality)" }, "at": "end", "offset": 20,
            "side": "below", "style": { "font": { "size": 10, "color": "#888780" } }, "visible": { "cel": "env.zoom > 1.2" } }
        ]
      }
    }
  },

  "forms": {
    "columnsTable": {
      "for": "Table",
      "usage": ["embedded", "inspector"],
      "layout": { "density": "compact" },
      "items": [
        { "attribute": "name" },
        { "kind": "field", "attribute": "comment", "widget": "textarea", "rows": 2 }
      ]
    }
  },

  "toolbox": {
    "groups": [
      { "id": "model", "label": "Model", "tools": [
        { "id": "table", "creates": "Table", "shortcut": "T" },
        { "id": "rel", "creates": "Relationship", "shortcut": "R" },
        { "id": "rel1n", "creates": "Relationship", "variantOf": "rel", "label": "One-to-many",
          "initial": { "sourceCardinality": "one", "targetCardinality": "zeroOrMany" } },
        { "id": "rel11", "creates": "Relationship", "variantOf": "rel", "label": "One-to-one",
          "initial": { "sourceCardinality": "one", "targetCardinality": "zeroOrOne" } }
      ] }
    ],
    "contextTools": [
      { "for": ["Table"], "tools": [
        { "kind": "create-child", "creates": "Column", "slot": "columns", "label": "Add column", "icon": "plus", "position": "bottom" }
      ] }
    ]
  },

  "constraints": {
    "rules": [
      { "id": "hasPrimaryKey", "scope": "Table",
        "rule": "self.children.exists(c, c.primaryKey)",
        "severity": "warning", "message": { "cel": "'Table ' + self.name + ' has no primary key.'" },
        "fixes": [ { "label": "Add an id column",
                     "actions": [ { "create": { "type": "'Column'", "parent": "self", "slot": "'columns'",
                                                "attributes": { "name": "'id'", "dataType": "'uuid'", "primaryKey": "true", "nullable": "false" } } } ] } ] },
      { "id": "fkTypeMatches", "scope": "Column", "when": "has(self.references)",
        "rule": "self.references.dataType == self.dataType",
        "attribute": "dataType",
        "message": { "cel": "'Foreign key type ' + self.dataType + ' does not match ' + self.references.parent.name + '.' + self.references.name + ' (' + self.references.dataType + ').'" },
        "fixes": [ { "label": "Use the referenced column's type", "actions": [ { "set": { "dataType": "self.references.dataType" } } ] } ] },
      { "id": "pkNotNull", "scope": "Column", "when": "self.primaryKey", "rule": "!self.nullable",
        "enforcement": "prevent-and-report", "attribute": "nullable",
        "message": "Primary key columns cannot be nullable." }
    ]
  },

  "behavior": {
    "hooks": [
      { "id": "pkImpliesNotNull", "on": "change", "for": "Column", "attribute": "primaryKey", "phase": "before",
        "when": "self.primaryKey", "actions": [ { "set": { "nullable": "false" } } ] }
    ]
  },

  "layout": {
    "algorithms": { "orthogonal": { "algorithm": "elk:org.eclipse.elk.layered", "direction": "right",
                                    "edgeRouting": "orthogonal", "spacing": { "node": 60, "layer": 120 } } },
    "default": "orthogonal"
  },

  "persistence": {
    "format": "yaml",
    "ids": { "strategy": "natural", "stable": true },
    "ordering": { "elements": "tree" },
    "view": { "store": ["bounds", "waypoints", "labelOffsets", "collapsed"] },
    "export": [ { "format": "plugin:sql-ddl", "label": "SQL DDL" } ]
  },

  "plugins": {
    "sql-ddl": { "version": "^1.0.0", "provides": ["export"], "required": false,
                 "doc": "Generates CREATE TABLE statements." }
  }
}
```

### 17.4 A DID definition of the timeline diagram type

A diagram created with the timeline specification of 17.2 is stored as the DID definition `timeline.did`, shown and explained in DID ([DID-specification.md](../did/DID-specification.md), section 10). Section 17.5 reads it with the processing model.

### 17.5 Reading the examples with the processing model *(informative)*

When the timeline DID definition is loaded (14.2), the runtime:

1. finds `language.version` equal to the specification's, so no migrations run;
2. builds the `lanes` axis from the two `Resource` nodes, ordered by `position`;
3. resolves the `time` axis: origin at `projectStart`, zone `Europe/Berlin`, weekends and the three holidays collapsed;
4. places *Wireframes* from 1 to 9 October in the *Design team* lane, *Visual design* after it (the pack algorithm keeps both in one sub-row because they do not overlap), and *Build pages* in the *Frontend* lane;
5. evaluates constraints: `dependencyRespected` holds for all three dependencies — *Visual design* starts on Monday 12 October, the first working day after *Wireframes* ends on Friday 9 October; *Build pages* starts on Tuesday 3 November, the second working day after *Visual design* ends on Friday 30 October, as its lag of one day requires;
6. renders the three-level ruler, and today's line if `env.now` falls inside the visible range.

If a user then drags *Build pages* one working day to the left, the calendar snap rule keeps both ends on working days. Because the whole bar moves, the bindings write `start = 2026-11-02` and `end = 2026-11-26`. The `keepDuration` hook also fires (the user changed `start`), and it computes the same end date, so the transaction stays consistent. The `dependencyRespected` constraint now fails, because the task starts before the one-day lag has elapsed. The edge turns red through its conditional style, and the problem offers the quick fix *Move successor after predecessor*, which shifts the task back by exactly one working day.

---

## 18. Deprecated aliases

DISL 0.1 continues the combined format it came from: DEDL became DISL and DID, and the constructs did not change. What that format called a definition is a DISL specification, and what it called a document is a DID definition (DID, section 11). Runtimes of DISL 0.x **MUST** accept the following identifiers of the earlier format, version 0.1, as deprecated aliases, read them as their DISL form, and never write them:

| Deprecated alias                                                              | DISL 0.1                                                                       |
|-------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| file extension `.dedl`                                                        | `.disl`                                                                        |
| `$schema` `https://etalii.net/adp/dedl/schema/0.1/dedl.schema.json#/$defs/Definition` | `https://etalii.net/adp/disl/schema/0.1/disl.schema.json#/$defs/Specification` |
| media type `application/vnd.dedl.definition+json`                             | `application/vnd.disl.specification+json`                                      |
| version key `"dedl": "0.1"`                                                   | `"disl": "0.1"`                                                                |

A specification carries exactly one of the two version keys; the schema accepts either and marks the old one `deprecated`. The old schema address stays published unchanged, so files that name it keep validating. A legacy fixture in the earlier form, in `specifications/disl/legacy/`, is validated through these aliases on every change to this repository. The aliases are removed no earlier than DISL 1.0.

---

## Appendix A — JSON Schema

The normative JSON Schema is published as `disl.schema.json` (JSON Schema draft 2020-12), `$id` `https://etalii.net/adp/disl/schema/0.1/disl.schema.json`. Its root, `#/$defs/Specification`, validates **specifications**. Stored diagrams are validated by DID's schema, `did.schema.json`, which references this schema's `QualifiedId`, `SemVer` and `Point`. The schema is kept together with this document, and every specification example in section 17 validates against it.

### A.1 Structure

All objects in the schema:

- forbid unknown properties (`additionalProperties: false`), except extension properties matching `^x-`;
- accept an optional `doc` property where this specification allows documentation;
- use shared `$defs` for recurring concepts (`Expression`, `Dynamic`, `Paint`, `Stroke`, `SnapRule`, `Label`, `Action`, …).

Rules that JSON Schema cannot express — name resolution, CEL type checking, inheritance narrowing, reserved names, compatibility of placement bindings with axis kinds, and the other checks in 14.1 step 9 — are the job of a DISL validator.

### A.2 `$defs` by layer

| Layer                 | `$defs`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Common                | `SimpleId`, `QualifiedId`, `TypeRef`, `TypeRefs`, `SemVer`, `LocalizedText`, `Doc`, `CelSource`, `Expression`, `CelValue`, `AttrBinding`, `TokenRef`, `ParamRef`, `Dynamic`, `BString`, `BNumber`, `BBool`, `GeomExpr`, `Length`, `Color`, `Size`, `Insets`, `Point`, `Box`, `MinMax`, `PluginUse`, `PluginCall`, `Modifier`                                                                                                                                                                                                                                                                                                            |
| Top level             | `Specification`, `Language`, `Import`, `Function`, `Viewpoint`, `Plugin`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 1 · Metamodel         | `Metamodel`, `Attribute`, `DataType`, `Enum`, `EnumValue`, `NodeType`, `Containment`, `PortType`, `RelationType`, `RelationEnd`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2 · Coordinates       | `Coordinates`, `Axis`, `AxisRef`, `Calendar`, `Category`, `Ruler`, `ZoomLevel`, `CoordinateSystem`, `GridDisplay`, `Guides`, `Placement`, `PlacementSource`, `Anchor`, `Snapping`, `SnappingRef`, `SnapRule`, `SnapRuleObject`, `AxisRules`                                                                                                                                                                                                                                                                                                                                                                                             |
| 3 · Notation          | `Notation`, `Theme`, `Paint`, `Gradient`, `Pattern`, `ImagePaint`, `Stroke`, `DashStyle`, `LineEffect`, `Font`, `Style`, `StyleRef`, `StyleRefs`, `States`, `Conditions`, `IconDef`, `IconRef`, `ShapeRef`, `ShapeInstance`, `ShapeDef`, `ShapeParam`, `PathDef`, `PathSegment`, `ShapePart`, `Handle`, `ScaleMode`, `Position`, `Label`, `Compartment`, `NodeIcon`, `Badge`, `PortNotation`, `AnchorSpec`, `ContainerSpec`, `SizeSpec`, `EmbeddedForm`, `LodRule`, `NodeNotation`, `NodeVariant`, `MarkerDef`, `MarkerInstance`, `MarkerRef`, `MidMarker`, `Routing`, `LineSpec`, `EndAnchor`, `EdgeNotation`, `EdgeVariant`, `Canvas` |
| 4 · Toolbox and forms | `Toolbox`, `ToolGroup`, `Tool`, `ContextToolSet`, `ContextTool`, `Template`, `FragmentNode`, `FragmentRelation`, `Form`, `FormItem`, `FieldValidation`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 5 · Constraints       | `Constraints`, `Constraint`, `QuickFix`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 6 · Behavior          | `Behavior`, `Hook`, `Operation`, `Action`, `DeletionPolicy`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 7 · Layout            | `Layout`, `LayoutConfig`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 8 · Persistence       | `Persistence`, `Migration`, `MigrationStep`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Documents             | `Document`, `ElementRecord`, `RelationRecord`, `ViewRecord`, `NodeView`, `EdgeView`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

In total the schema has 135 `$defs` entries. The stored-diagram structures `Document`, `ElementRecord`, `RelationRecord`, `ViewRecord`, `NodeView` and `EdgeView` of the earlier combined schema moved to DID's schema.

### A.3 Excerpt: snapping

The following excerpt shows how per-axis snapping is encoded. A snap rule is either a string (`"none"`, `"inherit"`, `"inherit-x"`, `"inherit-y"`, or a profile name) or an object that carries exactly one rule key, enforced with `oneOf` over `required`.

```json
{
  "Snapping": {
    "type": "object",
    "properties": {
      "enabled": {
        "type": "boolean"
      },
      "userToggle": {
        "type": "boolean"
      },
      "mode": {
        "enum": [
          "always",
          "magnetic"
        ]
      },
      "x": {
        "$ref": "#/$defs/SnapRule"
      },
      "y": {
        "$ref": "#/$defs/SnapRule"
      },
      "both": {
        "$ref": "#/$defs/SnapRule"
      },
      "angle": {
        "$ref": "#/$defs/SnapRule"
      },
      "radius": {
        "$ref": "#/$defs/SnapRule"
      },
      "size": {
        "$ref": "#/$defs/AxisRules"
      },
      "reference": {
        "enum": [
          "anchor",
          "bounds",
          "center",
          "edges"
        ]
      },
      "rotation": {
        "type": "object",
        "properties": {
          "step": {
            "type": "number"
          },
          "tolerance": {
            "type": "number"
          }
        },
        "additionalProperties": false,
        "patternProperties": {
          "^x-": true
        }
      },
      "bendpoints": {
        "anyOf": [
          {
            "enum": [
              "inherit",
              "none"
            ]
          },
          {
            "$ref": "#/$defs/AxisRules"
          }
        ]
      },
      "labels": {
        "anyOf": [
          {
            "const": "none"
          },
          {
            "type": "object",
            "properties": {
              "positions": {
                "type": "array",
                "items": true
              },
              "doc": {
                "$ref": "#/$defs/Doc"
              }
            },
            "additionalProperties": false,
            "patternProperties": {
              "^x-": true
            }
          }
        ]
      },
      "targets": {
        "type": "array",
        "items": {
          "enum": [
            "rule",
            "objects",
            "guides",
            "ports",
            "parent"
          ]
        }
      },
      "toleranceScreenPx": {
        "type": "number"
      },
      "bypassModifier": {
        "$ref": "#/$defs/Modifier"
      },
      "feedback": {
        "type": "object",
        "properties": {
          "showGhost": {
            "type": "boolean"
          },
          "showValue": {
            "type": "boolean"
          },
          "highlightBand": {
            "type": "boolean"
          },
          "style": {
            "$ref": "#/$defs/StyleRef"
          }
        },
        "additionalProperties": false,
        "patternProperties": {
          "^x-": true
        }
      },
      "applyToProgrammatic": {
        "type": "boolean"
      },
      "doc": {
        "$ref": "#/$defs/Doc"
      }
    },
    "additionalProperties": false,
    "patternProperties": {
      "^x-": true
    }
  },
  "SnapRuleObject": {
    "type": "object",
    "properties": {
      "grid": {
        "type": "object",
        "properties": {
          "spacing": {
            "anyOf": [
              {
                "type": "number"
              },
              {
                "type": "string"
              }
            ]
          },
          "offset": true,
          "subdivisions": {
            "type": "integer"
          },
          "subdivideAtZoom": {
            "type": "number"
          },
          "doc": {
            "$ref": "#/$defs/Doc"
          }
        },
        "additionalProperties": false,
        "required": [
          "spacing"
        ],
        "patternProperties": {
          "^x-": true
        }
      },
      "values": {
        "anyOf": [
          {
            "type": "array",
            "items": true
          },
          {
            "$ref": "#/$defs/CelValue"
          }
        ]
      },
      "calendar": {
        "type": "object",
        "properties": {
          "unit": {
            "enum": [
              "millisecond",
              "second",
              "minute",
              "hour",
              "day",
              "week",
              "month",
              "quarter",
              "year"
            ]
          },
          "step": {
            "type": "integer"
          },
          "align": {
            "enum": [
              "start",
              "end",
              "nearest"
            ]
          },
          "workingTime": {
            "type": "boolean"
          },
          "calendar": {
            "type": "string"
          },
          "at": {
            "type": "string"
          },
          "doc": {
            "$ref": "#/$defs/Doc"
          }
        },
        "additionalProperties": false,
        "required": [
          "unit"
        ],
        "patternProperties": {
          "^x-": true
        }
      },
      "ticks": {
        "type": "object",
        "properties": {
          "level": {
            "enum": [
              "major",
              "minor"
            ]
          },
          "doc": {
            "$ref": "#/$defs/Doc"
          }
        },
        "additionalProperties": false,
        "patternProperties": {
          "^x-": true
        }
      },
      "bands": {
        "type": "object",
        "properties": {
          "align": {
            "enum": [
              "start",
              "center",
              "end",
              "keep-offset"
            ]
          },
          "offsetGrid": {
            "type": "number"
          },
          "doc": {
            "$ref": "#/$defs/Doc"
          }
        },
        "additionalProperties": false,
        "patternProperties": {
          "^x-": true
        }
      },
      "divisions": {
        "type": "object",
        "properties": {
          "count": {
            "type": "integer"
          },
          "of": {
            "enum": [
              "parent",
              "canvas",
              "axis"
            ]
          },
          "doc": {
            "$ref": "#/$defs/Doc"
          }
        },
        "additionalProperties": false,
        "required": [
          "count"
        ],
        "patternProperties": {
          "^x-": true
        }
      },
      "ratio": {
        "type": "object",
        "properties": {
          "ratios": {
            "type": "array",
            "items": {
              "type": "number"
            }
          },
          "doc": {
            "$ref": "#/$defs/Doc"
          }
        },
        "additionalProperties": false,
        "required": [
          "ratios"
        ],
        "patternProperties": {
          "^x-": true
        }
      },
      "cel": {
        "$ref": "#/$defs/CelSource"
      },
      "byZoom": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "maxZoom": {
              "type": "number"
            },
            "rule": {
              "$ref": "#/$defs/SnapRule"
            },
            "doc": {
              "$ref": "#/$defs/Doc"
            }
          },
          "additionalProperties": false,
          "required": [
            "rule"
          ],
          "patternProperties": {
            "^x-": true
          }
        },
        "minItems": 1
      },
      "plugin": {
        "$ref": "#/$defs/QualifiedId"
      },
      "args": {
        "type": "object"
      },
      "min": true,
      "max": true,
      "direction": {
        "enum": [
          "nearest",
          "floor",
          "ceil"
        ]
      },
      "mode": {
        "enum": [
          "always",
          "magnetic"
        ]
      },
      "doc": {
        "$ref": "#/$defs/Doc"
      }
    },
    "additionalProperties": false,
    "patternProperties": {
      "^x-": true
    },
    "oneOf": [
      {
        "required": [
          "grid"
        ]
      },
      {
        "required": [
          "values"
        ]
      },
      {
        "required": [
          "calendar"
        ]
      },
      {
        "required": [
          "ticks"
        ]
      },
      {
        "required": [
          "bands"
        ]
      },
      {
        "required": [
          "divisions"
        ]
      },
      {
        "required": [
          "ratio"
        ]
      },
      {
        "required": [
          "cel"
        ]
      },
      {
        "required": [
          "byZoom"
        ]
      },
      {
        "required": [
          "plugin"
        ]
      }
    ]
  }
}
```

### A.4 Excerpt: placement

```json
{
  "Placement": {
    "type": "object",
    "properties": {
      "system": {
        "$ref": "#/$defs/SimpleId"
      },
      "x": {
        "$ref": "#/$defs/PlacementSource"
      },
      "y": {
        "$ref": "#/$defs/PlacementSource"
      },
      "x2": {
        "$ref": "#/$defs/PlacementSource"
      },
      "y2": {
        "$ref": "#/$defs/PlacementSource"
      },
      "width": {
        "$ref": "#/$defs/PlacementSource"
      },
      "height": {
        "$ref": "#/$defs/PlacementSource"
      },
      "angle": {
        "$ref": "#/$defs/PlacementSource"
      },
      "radius": {
        "$ref": "#/$defs/PlacementSource"
      },
      "anchor": {
        "$ref": "#/$defs/Anchor"
      },
      "movable": {
        "anyOf": [
          {
            "type": "boolean"
          },
          {
            "type": "object",
            "properties": {
              "x": {
                "type": "boolean"
              },
              "y": {
                "type": "boolean"
              }
            },
            "additionalProperties": false,
            "patternProperties": {
              "^x-": true
            }
          }
        ]
      },
      "resizable": {
        "anyOf": [
          {
            "type": "boolean"
          },
          {
            "type": "object",
            "properties": {
              "x": {
                "type": "boolean"
              },
              "y": {
                "type": "boolean"
              }
            },
            "additionalProperties": false,
            "patternProperties": {
              "^x-": true
            }
          }
        ]
      },
      "stack": {
        "type": "object",
        "properties": {
          "mode": {
            "enum": [
              "overlap",
              "stack",
              "pack"
            ]
          },
          "order": {
            "$ref": "#/$defs/Expression"
          },
          "rowSize": {
            "type": "number"
          },
          "growBand": {
            "type": "boolean"
          },
          "doc": {
            "$ref": "#/$defs/Doc"
          }
        },
        "additionalProperties": false,
        "patternProperties": {
          "^x-": true
        }
      },
      "clampToParent": {
        "type": "boolean"
      },
      "doc": {
        "$ref": "#/$defs/Doc"
      }
    },
    "additionalProperties": false,
    "patternProperties": {
      "^x-": true
    },
    "not": {
      "anyOf": [
        {
          "required": [
            "x2",
            "width"
          ]
        },
        {
          "required": [
            "y2",
            "height"
          ]
        }
      ]
    }
  },
  "PlacementSource": {
    "anyOf": [
      {
        "const": "free"
      },
      {
        "$ref": "#/$defs/AttrBinding"
      },
      {
        "type": "object",
        "properties": {
          "cel": {
            "$ref": "#/$defs/CelSource"
          },
          "write": {
            "type": "array",
            "items": {
              "$ref": "#/$defs/Action"
            }
          },
          "doc": {
            "$ref": "#/$defs/Doc"
          }
        },
        "additionalProperties": false,
        "required": [
          "cel"
        ],
        "patternProperties": {
          "^x-": true
        }
      },
      {
        "type": "object",
        "properties": {
          "layout": {
            "const": true
          },
          "doc": {
            "$ref": "#/$defs/Doc"
          }
        },
        "additionalProperties": false,
        "required": [
          "layout"
        ],
        "patternProperties": {
          "^x-": true
        }
      }
    ]
  }
}
```

---

## Appendix B — Built-in catalogues

### B.1 Default notation

| Element                     | Default                                                                                                                                                                                    |
|-----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Node                        | `rect`, 120 × 60, fill token `color.surface` (`#FFFFFF`), stroke token `color.border` (`#5F5E5A`) width 1, one centered label bound to `labelAttribute`, word wrap, font 14 px `system-ui` |
| View-only node              | as node, with dashed stroke                                                                                                                                                                |
| Container node              | as node, with a 24 px header band holding the label; children laid out freely                                                                                                              |
| Relation (directed)         | straight line, width 1, color token `color.border`, `targetMarker: "arrowFilled"`, no labels, unless the relation has a `name` attribute, which is shown `middle`/`above`                  |
| Relation (undirected)       | as directed, without markers                                                                                                                                                               |
| Port                        | 8 × 8 `rect`, fill `color.surface`, sides by direction                                                                                                                                     |
| Selection                   | 1.5 px outline in token `color.accent` (`#534AB7`), 8 screen-px square handles                                                                                                             |
| `invalid` state             | stroke token `color.danger` (`#E24B4A`), problem badge top-right                                                                                                                           |
| `warning` state             | stroke token `color.warning` (`#BA7517`), warning badge top-right                                                                                                                          |
| `dropTarget` / `dropReject` | fill token `color.accent.soft` / stroke `color.danger` dashed                                                                                                                              |

**Standard theme tokens.** Runtimes provide these tokens with light and dark values, and specifications may override them: `color.canvas`, `color.surface`, `color.surface.alt`, `color.text`, `color.text.muted`, `color.border`, `color.border.strong`, `color.accent`, `color.accent.soft`, `color.danger`, `color.warning`, `color.success`, `color.info`, `font.body`, `font.mono`, `size.stroke`, `size.corner`, `size.font`.

### B.2 Shape parameter defaults

| Shape           | Parameter defaults                                                                     |
|-----------------|----------------------------------------------------------------------------------------|
| `roundedRect`   | `radius`: 8                                                                            |
| `triangle`      | `apex`: 0.5, `direction`: `up`                                                         |
| `parallelogram` | `skew`: 0.2, `direction`: `right`                                                      |
| `trapezoid`     | `inset`: 0.2, `direction`: `up` (narrow side at the top)                               |
| `hexagon`       | `inset`: 0.25, `orientation`: `flat`                                                   |
| `octagon`       | `inset`: 0.29                                                                          |
| `polygon`       | `sides`: 5, `rotation`: 0                                                              |
| `star`          | `points`: 5, `innerRadius`: 0.5, `rotation`: 0                                         |
| `cross`         | `thickness`: 0.33                                                                      |
| `cylinder`      | `cap`: 0.15 × height, `orientation`: `vertical`                                        |
| `document`      | `wave`: 0.1                                                                            |
| `multiDocument` | `wave`: 0.1, `offset`: 6, `count`: 3                                                   |
| `note`          | `fold`: 12                                                                             |
| `folder`        | `tabWidth`: 0.4, `tabHeight`: 12, `tabPosition`: `left`                                |
| `frame`         | `tabWidth`: 0.35, `tabHeight`: 20                                                      |
| `cloud`         | `bumps`: 8                                                                             |
| `process`       | `inset`: 10                                                                            |
| `manualInput`   | `slope`: 0.25                                                                          |
| `offPage`       | `pointer`: 0.25                                                                        |
| `callout`       | `pointerX`: 0.2, `pointerY`: 1.3, `pointerWidth`: 0.15, `radius`: 6                    |
| `blockArrow`    | `direction`: `right`, `headLength`: 0.35, `shaftThickness`: 0.5, `doubleHeaded`: false |
| `chevron`       | `depth`: 0.25, `direction`: `right`                                                    |
| `bracket`       | `side`: `left`, `curl`: 0.15                                                           |
| `image`         | `fit`: `contain`                                                                       |

Fractions refer to the bounds' width (horizontal parameters) or height (vertical parameters).

### B.3 Marker catalogue

Sizes are for a line width of 1 and scale with the stroke unless `scaleWithStroke` is false. "Hollow" markers are filled with `background` by default, and "filled" markers with `stroke`.

| Marker                            | Default length × width | Geometry                                    |
|-----------------------------------|------------------------|---------------------------------------------|
| `arrow`                           | 10 × 8                 | Open V, 2 strokes, angle 30°                |
| `arrowFilled`                     | 10 × 8                 | Filled triangle                             |
| `arrowHollow`                     | 12 × 10                | Hollow triangle (generalisation)            |
| `arrowConcave`                    | 12 × 10                | Filled, swept-back base                     |
| `arrowThin`                       | 8 × 6                  | Open V, angle 20°                           |
| `arrowDouble`                     | 16 × 8                 | Two filled triangles in sequence            |
| `halfArrowTop`, `halfArrowBottom` | 10 × 5                 | One barb only                               |
| `arrowCircle`                     | 14 × 8                 | Filled triangle followed by a hollow circle |
| `diamond` / `diamondFilled`       | 14 × 8                 | Rhombus                                     |
| `circle` / `circleFilled`         | 8 × 8                  | Circle, tangent to the end point            |
| `square` / `squareFilled`         | 8 × 8                  | Square                                      |
| `dot`                             | 4 × 4                  | Filled circle centered on the end point     |
| `triangle` / `triangleFilled`     | 10 × 10                | Equilateral                                 |
| `bar`                             | 0 × 10                 | Perpendicular line                          |
| `doubleBar`                       | 4 × 10                 | Two perpendicular lines                     |
| `cross`                           | 8 × 8                  | ×                                           |
| `slash`                           | 6 × 10                 | Oblique line                                |
| `erOne`                           | 8 × 12                 | One perpendicular bar                       |
| `erOnlyOne`                       | 12 × 12                | Two perpendicular bars                      |
| `erMany`                          | 12 × 12                | Crow's foot                                 |
| `erZeroOrOne`                     | 18 × 12                | Bar and hollow circle                       |
| `erOneOrMany`                     | 16 × 12                | Crow's foot and bar                         |
| `erZeroOrMany`                    | 20 × 12                | Crow's foot and hollow circle               |
| `ballSocketBall`                  | 10 × 10                | Hollow circle on a short stem               |
| `socket`                          | 10 × 12                | Half circle open towards the end            |
| `containment`                     | 10 × 10                | Circle with a plus                          |
| `ground`                          | 6 × 14                 | Three bars of decreasing length             |
| `fork`                            | 10 × 10                | Two short diverging lines                   |

### B.4 Snap rule summary

| Rule        | Numeric | Time | Ordinal | Angular | Sizes                |
|-------------|---------|------|---------|---------|----------------------|
| `grid`      | ✓      | –    | –       | ✓      | ✓                   |
| `values`    | ✓      | ✓   | –       | ✓      | ✓                   |
| `calendar`  | –       | ✓   | –       | –       | ✓ (durations)       |
| `ticks`     | ✓      | ✓   | ✓      | ✓      | –                    |
| `bands`     | –       | –    | ✓      | –       | ✓ (number of bands) |
| `divisions` | ✓      | –    | –       | ✓      | ✓                   |
| `ratio`     | –       | –    | –       | –       | ✓                   |
| `cel`       | ✓      | ✓   | ✓      | ✓      | ✓                   |
| `byZoom`    | ✓      | ✓   | ✓      | ✓      | ✓                   |
| `plugin`    | ✓      | ✓   | ✓      | ✓      | ✓                   |

### B.5 Time units and formats

Units: `millisecond`, `second`, `minute`, `hour`, `day`, `week` (starts on `firstDayOfWeek`), `month`, `quarter`, `year`. Date format patterns follow Unicode LDML (`yyyy`, `MM`, `MMM`, `MMMM`, `d`, `EEE`, `w`, `HH:mm`). Number patterns follow ICU (`#,##0.00`, `#0%`).

### B.6 Standard icons

Runtimes provide these monochrome icons under `std.`: `add`, `remove`, `delete`, `edit`, `copy`, `link`, `unlink`, `lock`, `unlock`, `eye`, `eye-off`, `info`, `warning`, `error`, `check`, `x`, `plus`, `minus`, `arrow-right`, `arrow-left`, `arrow-up`, `arrow-down`, `flag`, `key`, `database`, `table`, `user`, `users`, `clock`, `calendar`, `message`, `note`, `folder`, `file`, `image`, `code`, `play`, `pause`, `stop`, `settings`, `search`, `filter`, `star`, `bolt`, `circle`, `circle-dot`, `square`, `square-rounded`, `diamond`, `triangle`, `hexagon`. Specifications may also reference icon sets by prefix (`tabler:database`, `material:table_chart`) when the runtime supports them.

### B.7 Default widgets by attribute type

| Attribute type                         | Widget                                                                                 |
|----------------------------------------|----------------------------------------------------------------------------------------|
| `string`                               | `text` (`combobox` if `extensible` enum)                                               |
| `text`                                 | `textarea` (`markdown` if `markup: "markdown"`)                                        |
| `int`, `number`                        | `number` (`slider` if both `min` and `max` are set and the range is at most 100 steps) |
| `bool`                                 | `checkbox`                                                                             |
| `date`, `datetime`, `time`, `duration` | `date`, `datetime`, `time`, `duration`                                                 |
| `color`                                | `color`                                                                                |
| `uri`                                  | `link`                                                                                 |
| `expression`                           | `code` with `language: "cel"`                                                          |
| `json`                                 | `code` with `language: "json"`                                                         |
| `binary`                               | `file`                                                                                 |
| enum (≤ 4 values)                      | `segmented`                                                                            |
| enum (> 4 values)                      | `select`                                                                               |
| data type (struct)                     | `struct`                                                                               |
| reference                              | `reference`                                                                            |
| `many` primitive                       | `tags` for strings, `list` otherwise                                                   |
| `many` struct                          | `table`                                                                                |
| `many` reference                       | `references`                                                                           |

### B.8 Feature identifiers

`language.requires.features` uses these identifiers: `axis.log`, `axis.time`, `axis.time.collapse`, `axis.ordinal`, `axis.angular`, `system.polar`, `system.nested`, `placement.bound`, `placement.computed`, `placement.stack`, `snap.calendar`, `snap.byZoom`, `snap.objects`, `shape.custom`, `shape.composite`, `shape.handles`, `shape.nineSlice`, `stroke.effect`, `stroke.sketch`, `stroke.flow`, `edge.jumps`, `edge.bezier`, `edge.metro`, `marker.custom`, `marker.stack`, `label.rich`, `label.parse`, `node.variants`, `node.lod`, `form.embedded`, `layout.elk`, `collab.crdt`, `persist.yaml`, `persist.split`, `persist.perElement`, `export.pdf`.

---

## Appendix C — Glossary

| Term                   | Meaning                                                                                                      |
|------------------------|--------------------------------------------------------------------------------------------------------------|
| **Axis**               | A scale from domain values (numbers, timestamps, categories, angles) to canvas distance along one direction. |
| **Band**               | One category of an ordinal axis, drawn as a lane, row or column.                                             |
| **Bindable**           | A property that accepts a literal or a dynamic value (`cel`, `attribute`, `token`, `param`).                 |
| **Bound placement**    | A coordinate read from and written to a model attribute.                                                     |
| **Canvas units**       | Rendering units at zoom 1; pixels for the default axis.                                                      |
| **CEL**                | Common Expression Language, the only expression language of DISL.                                            |
| **Compartment**        | A stacked region inside a node listing items.                                                                |
| **Context (CEL)**      | The set of variables available to an expression, determined by where it appears.                             |
| **DID definition**     | A diagram a user created of a diagram type, stored as a `.did` file (DID, the Diagram Definition Language).   |
| **Document**           | The content a user works on in a host; for a diagram, its stored form is a DID definition.                   |
| **Domain value**       | A position in the units of its axis: a number, a timestamp or a band reference.                              |
| **Gesture constraint** | A constraint evaluated before a user action is applied (connect, contain, create, delete, place, change).    |
| **Handle**             | An interactive point on a shape that edits a shape parameter.                                                |
| **Invariant**          | A constraint on the current state of the diagram.                                                            |
| **Marker**             | A decoration at an edge end or along an edge, such as an arrowhead.                                          |
| **Metamodel**          | The abstract syntax: types, attributes, relations, containment and ports.                                    |
| **Notation**           | The concrete syntax: shapes, styles, labels and markers.                                                     |
| **Plugin**             | Named, declared, versioned code that extends a runtime.                                                      |
| **Port**               | A named connection point on a node.                                                                          |
| **Runtime**            | Software in a host that loads a specification and lets users create and change DID definitions with it.      |
| **Specification**      | A DISL file (`.disl`) in which a tool engineer specifies one diagram type.                                   |
| **Tool engineer**      | The person who specifies a diagram type in DISL.                                                             |
| **Snap rule**          | A function mapping a raw domain value to an allowed value on one axis.                                       |
| **Token**              | A named theme value (a color, font or size), resolved per theme mode.                                        |
| **Transaction**        | An atomic, undoable unit of change.                                                                          |
| **Variant**            | An alternative notation applied when a condition holds.                                                      |
| **View data**          | Per-diagram placement and presentation data stored separately from the model.                                |
| **View-only element**  | An element that exists only in a view (a note or frame) and has no model meaning.                            |
| **Viewpoint**          | A kind of diagram over the model, with its own types, coordinates, toolbox and layout.                       |

---

## Appendix D — Design rationale and open questions

### D.1 Rationale *(informative)*

**Why JSON rather than YAML as the normative form?** JSON has a single, unambiguous data model, universal parser support, and first-class JSON Schema tooling. It also avoids YAML's implicit typing pitfalls. Tool engineers who prefer YAML can write it and convert, because the logical content is identical, and persistence may still write DID definitions as YAML (11.2).

**Why CEL?** DISL needs expressions everywhere, but it must stay safe to load specifications from untrusted sources and must guarantee termination for live evaluation on every keystroke. CEL is non-Turing-complete, side-effect free, has a static type checker and cost estimation, and runs in all major ecosystems. User functions are allowed but may not recurse, which preserves those guarantees. OCL was considered too heavy, and JavaScript too powerful.

**Why coordinate systems as a separate layer?** Coordinates carry meaning in many diagram kinds (schedules, lanes, sequences, floor plans), and snapping only makes sense in domain units ("snap to working days"). Binding coordinates to attributes removes the classic duplication between a task's date field and its position on the canvas, along with the bugs that duplication causes.

**Why per-axis snapping?** Real diagrams often need different discreteness on each axis: continuous time with discrete lanes, discrete time with free vertical stacking, a coarse horizontal grid with a fine vertical one. A single "grid size" cannot express that.

**Why flat element lists in DID definitions?** Nesting elements physically makes moves between containers produce large diffs and makes merge conflicts likely. Flat lists with `parent` references keep changes local.

**Why so much documentation structure?** A diagram type is also a teaching tool. When every type, field, rule and snapping behavior can explain itself, users learn the language while working, and documentation cannot drift from the implementation because both come from the same source.

### D.2 Open questions for 0.2

1. **Diagram-to-diagram links:** references across DID definitions (a sub-process defined in another file) and their persistence and integrity rules.
2. **Typed CEL for view-only data:** stronger static typing for `self.view` fields per coordinate system (currently `dyn`).
3. **Animation and simulation:** a standard extension profile for token-flow animation (Petri nets, BPMN simulation) driven by CEL.
4. **Responsive notation:** notation variants driven by available screen size (mobile editing).
5. **Standard library packaging:** a registry of shareable DISL libraries (shapes, markers, themes) with semantic versioning and signatures.
6. **Bidirectional text formats:** declaring a textual syntax (grammar) alongside the graphical one, to support round-tripping with textual DSLs such as PlantUML or Mermaid.
7. **Accessibility conformance:** measurable requirements (contrast ratios of built-in tokens, keyboard coverage) as a conformance class of its own.
8. **Constraint explanations:** machine-generated explanations of why a CEL rule failed (counterexample elements), beyond the declared `target`.
