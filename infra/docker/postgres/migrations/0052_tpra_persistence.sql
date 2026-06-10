-- Migration: 0052 — TPRA Persistence (vendors, assessments, risk_scores)
-- Date: 2026-06-10
-- Ref: docs/decisions/IMPLEMENTATION-CONSTRAINTS.md §4
--
-- Cria estrutura para persistência de TPRA assessments por vendor.
-- Anteriormente: POST /tpra/score calculava em memória e descartava.
-- Agora: tudo é persistido e webhooks são disparados.
--
-- tpra_risk_scores é APPEND-ONLY — não fazer UPDATE.
-- NOTA: Executar statement-by-statement via MCP run_sql (limitação Neon MCP)

-- 1. tpra_vendors — registo de fornecedores por organização
CREATE TABLE IF NOT EXISTS "tpra_vendors" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id"),
  "vendor_name"     TEXT NOT NULL,
  "vendor_type"     TEXT,
  "contact_email"   TEXT,
  "metadata"        JSONB NOT NULL DEFAULT '{}',
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. tpra_assessments — questionário TPRA por vendor
CREATE TABLE IF NOT EXISTS "tpra_assessments" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id" UUID NOT NULL REFERENCES "organizations"("id"),
  "vendor_id"       UUID NOT NULL REFERENCES "tpra_vendors"("id"),
  "assessment_id"   UUID REFERENCES "assessments"("id"),
  "status"          TEXT NOT NULL DEFAULT 'draft',
  "submitted_at"    TIMESTAMPTZ,
  "responses"       JSONB NOT NULL DEFAULT '{}',
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. tpra_risk_scores — scores calculados (APPEND-ONLY)
--    Nunca fazer UPDATE. Estado actual = registo mais recente por vendor_id.
CREATE TABLE IF NOT EXISTS "tpra_risk_scores" (
  "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "organization_id"      UUID NOT NULL REFERENCES "organizations"("id"),
  "tpra_assessment_id"   UUID NOT NULL,
  "vendor_id"            UUID NOT NULL,
  "raw_score"            NUMERIC(5,2) NOT NULL,
  "risk_category"        TEXT NOT NULL,
  "scf_domain_failures"  JSONB NOT NULL DEFAULT '[]',
  "scf_version"          TEXT NOT NULL DEFAULT 'unknown',
  "computed_at"          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS "tpra_vendors_org_idx"
  ON "tpra_vendors" ("organization_id");

CREATE INDEX IF NOT EXISTS "tpra_assessments_vendor_idx"
  ON "tpra_assessments" ("vendor_id", "organization_id");

CREATE INDEX IF NOT EXISTS "tpra_risk_scores_vendor_time_idx"
  ON "tpra_risk_scores" ("vendor_id", "computed_at" DESC);

CREATE INDEX IF NOT EXISTS "tpra_risk_scores_org_idx"
  ON "tpra_risk_scores" ("organization_id", "computed_at" DESC);
