# Feature Specification: Naming Compatibility

**Feature Branch**: `features/006-naming-compat`
**Created**: 2026-09-29
**Status**: Draft
**Input**: etalii.adp spec 002 "Naming convention alignment", Part 1 "Site reads both forms" (tasks T012–T017).

## Context

This feature has no specification of its own: it is Part 1 of [etalii.adp spec 002, naming convention alignment](https://github.com/etalii-adp/etalii.adp/tree/develop/specs/002-naming-convention-alignment), whose [tasks](https://github.com/etalii-adp/etalii.adp/blob/develop/specs/002-naming-convention-alignment/tasks.md) (T012–T017), [research R6](https://github.com/etalii-adp/etalii.adp/blob/develop/specs/002-naming-convention-alignment/research.md) and [rename map](https://github.com/etalii-adp/etalii.adp/blob/develop/specs/002-naming-convention-alignment/contracts/rename-map.md) (section etalii.adp.site) are its requirements. This file only records that, so the site's spec numbering and branch agree (constitution, Development Workflow).

## What it requires

Before the other parts of spec 002 rename what the site reads, the site's refresh procedures **MUST** accept both the old and the new upstream names, so the hourly refresh never breaks:

- **FR-001**: the catalogue is read from each host's `docs/tools.md`, falling back to `docs/diagrams.md` (T012).
- **FR-002**: the reference is read from `specifications/disl/` and `specifications/did/` once `specifications/disl/` exists in etalii.adp, falling back to `specifications/dedl/` while it is absent; DISL and DID are registered in `languages.json` but get no pages yet (T013, T014).
- **FR-003**: `disl` is accepted as a procedure name beside `dedl` by `npm run refresh`, `npm run refresh:decide` and `refresh.yml` (T015).
- **FR-004**: the Notion columns are read under their new names (`Kind`; `Standalone`, `IntelliJ`, `VS Code`, `Eclipse`) and their old ones, and the write-back writes to whichever host column exists (T016).
- **FR-005**: the site's gates exit 0 with test counts at least those of the spec 002 baseline (T017).

The old forms are dropped in spec 002 Part 7; the new pages, addresses and procedure name come in its Part 5.
