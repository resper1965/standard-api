/**
 * SCR-RMM Risk & Threat Catalog Schemas
 *
 * Read-only normative reference schemas for SCF Risk Catalog (scf_risks)
 * and SCF Threat Catalog (scf_threats).
 *
 * These are shared tables — no organization_id scope required.
 * References: AGENTS.md §8, ADR-014
 */
import { z } from "zod";
import { UuidSchema } from "./common";

// ── SCF Risk Catalog ──────────────────────────────────────────────────────────

export const ScfRiskResponseSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  risk_code: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  /** UUIDs of SCF controls that mitigate this risk (from scf_risk_control_mappings). */
  mitigating_control_ids: z.array(UuidSchema).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ScfRiskResponse = z.infer<typeof ScfRiskResponseSchema>;

export const ScfRiskListResponseSchema = z.object({
  data: z.array(ScfRiskResponseSchema),
  total: z.number().int(),
  trace_id: z.string(),
});

// ── SCF Threat Catalog ────────────────────────────────────────────────────────

export const ScfThreatResponseSchema = z.object({
  id: UuidSchema,
  scf_version_id: UuidSchema,
  threat_code: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  /** UUIDs of SCF controls that mitigate this threat. */
  mitigating_control_ids: z.array(UuidSchema).default([]),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ScfThreatResponse = z.infer<typeof ScfThreatResponseSchema>;

export const ScfThreatListResponseSchema = z.object({
  data: z.array(ScfThreatResponseSchema),
  total: z.number().int(),
  trace_id: z.string(),
});
