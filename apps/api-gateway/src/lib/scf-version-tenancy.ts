/**
 * @module scf-version-tenancy
 * @description Tenancy guard helpers for scf_versions queries.
 *
 * scf_versions.organization_id design:
 *   - NULL â†’ versÃ£o global SCF oficial (visÃ­vel a todas as orgs)
 *   - non-null â†’ versÃ£o privada de org (visÃ­vel apenas a essa org)
 *
 * Este mÃ³dulo garante que futuras queries a scf_versions que adicionem
 * filtro por org nunca excluam as versÃµes globais por acidente.
 *
 * @see docs/decisions/ADR-T4-scf-versions-tenancy.md
 */
import { or, isNull, eq } from "drizzle-orm";
import { scfVersions } from "@standard/schemas";

/**
 * buildScfVersionFilter â€” descriptor de intenÃ§Ã£o de isolamento.
 *
 * Retorna um objecto simples que documenta explicitamente:
 *   - organizationId: a org cujas versÃµes privadas sÃ£o permitidas
 *   - includesGlobal: sempre true â€” versÃµes globais sÃ£o sempre visÃ­veis
 *
 * Uso: passar para scfVersionTenancyWhere() para obter a clÃ¡usula Drizzle.
 */
export function buildScfVersionFilter(organizationId: string): {
  organizationId: string;
  includesGlobal: boolean;
} {
  return { organizationId, includesGlobal: true };
}

/**
 * scfVersionTenancyWhere â€” WHERE clause Drizzle correcta para scf_versions.
 *
 * Garante que:
 *   - VersÃµes globais (organization_id IS NULL) sÃ£o SEMPRE incluÃ­das
 *   - VersÃµes privadas de outras orgs sÃ£o SEMPRE excluÃ­das
 *
 * Uso:
 *   db.select().from(scfVersions).where(scfVersionTenancyWhere(organizationId))
 *
 * â›” NÃƒO usar: .where(eq(scfVersions.organizationId, orgId))
 *    Isso exclui as versÃµes globais (NULL nÃ£o satisfaz eq()).
 */
export function scfVersionTenancyWhere(organizationId: string) {
  return or(
    isNull(scfVersions.organizationId),          // versÃµes globais SCF oficial
    eq(scfVersions.organizationId, organizationId), // versÃµes privadas da org
  );
}

