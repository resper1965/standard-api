# @standard/scf-core

Status: stable | Layer: normative | Source: Secure Controls Framework (SCF)

## Overview

The normative data layer for the Secure Controls Framework. Contains 1,468
controls across all SCF domains and the official crosswalk mappings to 100+
compliance frameworks (ISO 27001, NIST CSF, SOC 2, GDPR, etc.).

This package is the **single source of truth** for SCF controls and mappings.
No other package may create or infer SCF mappings independently.

## Install

```bash
pnpm add @standard/scf-core
```

## Usage

```ts
import { createScfCoreServices } from "@standard/scf-core";

const scf = createScfCoreServices({ repository });

// Look up a control by SCF ID
const control = await scf.controls.getById("IAM-01", { scf_version: "2024.2" });

// Search controls by keyword
const results = await scf.search.query("access control", { domainId: "IAM" });

// Resolve framework mappings (official only)
const mappings = await scf.mappings.forControl("IAM-01", "ISO27001-2022");
```

## API

| Service | Purpose |
|---------|---------|
| `scf.controls` | Get, list, and filter SCF controls |
| `scf.frameworks` | List all supported compliance frameworks |
| `scf.domains` | List SCF domains and sub-domains |
| `scf.mappings` | Resolve official control crosswalks |
| `scf.search` | Full-text and structured search over controls |
| `scf.versions` | Enumerate available SCF catalog versions |
| `scf.requirements` | Fetch control requirement narratives |
| `createDrizzleScfRepository` | Drizzle/PostgreSQL repository factory |

## Rules

- Every output must record `scf_version` and `framework_id`.
- Official mappings exist only when present in the structured SCF catalog.
- **Never infer or invent crosswalks** — absence of mapping must be surfaced explicitly.
- Distinguish: official mapping vs. technical derivation vs. consultive inference.
- Consultive inference must never be persisted as an official mapping.
- Use `scf-importer` / `xlsx-importer` / `csv-importer` for catalog ingestion.
- STRM and relational artifacts must be versioned and traceable.

## Dependencies

| Package | Role |
|---------|------|
| `@standard/schemas` | Shared Zod schemas and TypeScript contracts |
