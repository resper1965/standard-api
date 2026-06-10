/**
 * @module scf-version-tenancy
 * @description Tenancy guard helpers for scf_versions queries.
 *
 * scf_versions.organization_id design:
 *   - NULL → versão global SCF oficial (visível a todas as orgs)
 *   - non-null → versão privada de org (visível apenas a essa org)
 *
 * Este módulo garante que futuras queries a scf_versions que adicionem
 * filtro por org nunca excluam as versões globais por acidente.
 *
 * @see docs/decisions/ADR-T4-scf-versions-tenancy.md
 */
import { or, isNull, eq } from "drizzle-orm";
import { scfVersions } from "@standard/schemas";

/**
 * buildScfVersionFilter — descriptor de intenção de isolamento.
 *
 * Retorna um objecto simples que documenta explicitamente:
 *   - organizationId: a org cujas versões privadas são permitidas
 *   - includesGlobal: sempre true — versões globais são sempre visíveis
 *
 * Uso: passar para scfVersionTenancyWhere() para obter a cláusula Drizzle.
 */
export function buildScfVersionFilter(organizationId: string): {
  organizationId: string;
  includesGlobal: boolean;
} {
  return { organizationId, includesGlobal: true };
}

/**
 * scfVersionTenancyWhere — WHERE clause Drizzle correcta para scf_versions.
 *
 * Garante que:
 *   - Versões globais (organization_id IS NULL) são SEMPRE incluídas
 *   - Versões privadas de outras orgs são SEMPRE excluídas
 *
 * Uso:
 *   db.select().from(scfVersions).where(scfVersionTenancyWhere(organizationId))
 *
 * ⛔ NÃO usar: .where(eq(scfVersions.organizationId, orgId))
 *    Isso exclui as versões globais (NULL não satisfaz eq()).
 */
export function scfVersionTenancyWhere(organizationId: string) {
  return or(
    isNull(scfVersions.organizationId),          // versões globais SCF oficial
    eq(scfVersions.organizationId, organizationId), // versões privadas da org
  );
}
