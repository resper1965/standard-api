/**
 * CB-A: Privacy Regulations Catalog (Spec v3)
 *
 * Full regulation objects with all sub-schemas per spec:
 * - legal_bases + sensitive_legal_bases
 * - data_subject_rights with can_be_denied + denial_grounds
 * - dsar_statuses + breach_statuses (workflow)
 * - breach_rules with authority_name + severity + scf_controls
 * - international_transfer with safeguards
 * - dpa_requirements with article + scf_controls
 * - consent_rules with consent_types + proof_types
 * - dpia_triggers with scf_controls
 * - penalties with max_fine_pct_revenue + article
 *
 * All fields link to SCF via scf_controls[] or scf_domain.
 */
import type { RouteDefinition } from "../http";
import { json, routeParam, routeUuidParam } from "../http";
import { ApiError } from "../errors/api-error";
import { flattenI18n } from "../utils/i18n";

// â”€â”€ Regulations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

import { REGULATIONS, Regulation } from "@standard/scf-data";
export { REGULATIONS };

const REGULATION_INDEX = new Map<string, Regulation>(
  REGULATIONS.map((r: Regulation) => [r.id, r]),
);

// â”€â”€ Routes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const regulationsRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/regulations",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const summary = REGULATIONS.map((r) => ({
        id: r.id,
        name_i18n: r.name_i18n,
        jurisdiction: r.jurisdiction,
        authority: r.authority,
        effective_date: r.effective_date,
        scf_domain: r.scf_domain,
        version: r.version,
        legal_base_count: r.legal_bases.length,
        sensitive_legal_base_count: r.sensitive_legal_bases.length,
        rights_count: r.data_subject_rights.length,
        transfer_mechanism_count: r.international_transfer.mechanisms.length,
        dpia_trigger_count: r.dpia_triggers.length,
      }));
      return json({ data: flattenI18n(summary, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const reg = REGULATION_INDEX.get(routeUuidParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({ data: flattenI18n(reg, locale), trace_id: traceId });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/legal-bases",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeUuidParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      const data = {
        legal_bases: reg.legal_bases,
        sensitive_legal_bases: reg.sensitive_legal_bases,
      };
      return json({
        data: flattenI18n(data, locale),
        regulation: reg.id,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/rights",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeUuidParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({
        data: flattenI18n(reg.data_subject_rights, locale),
        regulation: reg.id,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/dsar-statuses",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeUuidParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({
        data: flattenI18n(reg.dsar_statuses, locale),
        regulation: reg.id,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/breach-rules",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeUuidParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({
        data: flattenI18n(reg.breach_rules, locale),
        breach_statuses: flattenI18n(reg.breach_statuses, locale),
        regulation: reg.id,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/transfer-mechanisms",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeUuidParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({
        data: flattenI18n(reg.international_transfer, locale),
        dpa: flattenI18n(reg.dpa_requirements, locale),
        regulation: reg.id,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/consent",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeUuidParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({
        data: flattenI18n(reg.consent_rules, locale),
        regulation: reg.id,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/dpia-triggers",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ request, params, traceId }) => {
      const locale = new URL(request.url).searchParams.get("locale") || "pt";
      const reg = REGULATION_INDEX.get(routeUuidParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({
        data: flattenI18n(reg.dpia_triggers, locale),
        regulation: reg.id,
        trace_id: traceId,
      });
    },
  },
  {
    method: "GET",
    path: "/api/v1/regulations/:regulationId/penalties",
    authRequired: true,
    tenantRequired: false,
    handler: async ({ params, request, traceId }) => {
      const locale = (new URL(request.url).searchParams.get("locale") ||
        "pt") as any;
      const reg = REGULATION_INDEX.get(routeUuidParam(params, "regulationId"));
      if (!reg) throw new ApiError("NOT_FOUND", "Regulation not found.", 404);
      return json({
        data: flattenI18n(reg.penalties, locale),
        regulation: reg.id,
        trace_id: traceId,
      });
    },
  },
];
