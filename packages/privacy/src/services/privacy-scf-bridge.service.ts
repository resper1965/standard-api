// @ts-nocheck -- Zod v4 CI type compat
import type { ScfRepository } from "@standard/scf-core";
import type { ScfFramework, ScfControl, ScfMapping, PrivacyRegime } from "@standard/schemas";

// â”€â”€â”€ Regime â†’ SCF Framework Code Mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Maps privacy_regime enum values to the REAL framework_code values
// present in the production SCF database (sourced from official XLSX 2026.1.1).
//
// These codes come from: infra/docker/postgres/seeds/0010_scf_official_frameworks_seed.sql
// Verified via: SELECT framework_id FROM scf_frameworks WHERE framework_id IN (...)
//
// RULE: Never invent a code. If a regime has no corresponding framework
// in the SCF catalog, map it to "" and resolveFramework will return null.

const REGIME_TO_FRAMEWORK_CODE: Record<PrivacyRegime, string[]> = {
  lgpd: ["BR-LGPD"],
  gdpr: ["EU-GDPR"],
  uk_gdpr: ["UK-DPA"],
  ccpa_cpra: ["CC-2025"],             // California Consumer Privacy Act / CPRA
  popia: ["EMEA-SOUTH-AFRICA"],       // Protection of Personal Information Act
  pipl: ["CN-PRIVACY-LAW"],           // China Personal Information Protection Law
  appi: ["JP-APPI"],                  // Japan Act on Protection of Personal Information
  pdpd: ["APAC-SINGAPORE"],           // Singapore Personal Data Protection Act (closest match)
  lpdp_turkey: ["EMEA-TURKEY"],       // Turkey Law on Protection of Personal Data
  nzpa: ["NZ-PRIVACY-ACT-OF-2020"],   // New Zealand Privacy Act 2020
  custom: [],                          // No SCF mapping for custom regimes
};

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type PrivacyControlMapping = {
  control: ScfControl;
  mappings: ScfMapping[];
};

export type PrivacyScfAnchor = {
  scf_version_label: string;
  scf_version_id: string;
  framework_id: string | null;
  framework_code: string | null;
  anchored_controls: Array<{
    control_code: string;
    control_title: string;
    control_id: string;
  }>;
};

// â”€â”€â”€ Bridge Service â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * PrivacyScfBridge resolves privacy_regime enum values to SCF Framework
 * records and retrieves PRI-domain controls applicable to each regime.
 *
 * This is an OPTIONAL integration layer. When scfRepository is not
 * available, the privacy module falls back to hardcoded rules
 * (which remain operationally correct, just not SCF-anchored).
 */
export class PrivacyScfBridge {
  constructor(private readonly scfRepo: ScfRepository) {}

  /**
   * Resolve a privacy regime to its SCF Framework record.
   * Uses EXACT match on framework_code from the production database.
   */
  async resolveFramework(regime: PrivacyRegime): Promise<ScfFramework | null> {
    const codes = REGIME_TO_FRAMEWORK_CODE[regime];
    if (!codes || codes.length === 0) return null;

    const frameworks = await this.scfRepo.listFrameworks();
    // Try each candidate code in order (exact case-insensitive match)
    for (const code of codes) {
      const match = frameworks.find((f) =>
        f.framework_code.toUpperCase() === code.toUpperCase()
      );
      if (match) return match;
    }
    return null;
  }

  /**
   * Get all controls from the PRI (Privacy) domain for a specific SCF version.
   * Returns empty array if PRI domain doesn't exist in the dataset.
   */
  async getPrivacyControls(scfVersionId: string): Promise<ScfControl[]> {
    const domains = await this.scfRepo.listDomains(scfVersionId);
    const priDomain = domains.find((d) => d.domain_code === "PRI");
    if (!priDomain) return [];

    const controls = await this.scfRepo.listControls(scfVersionId);
    return controls.filter((c) => c.scf_domain_id === priDomain.id);
  }

  /**
   * Get PRI controls that are mapped to a specific framework (regime).
   * Returns controls with their framework-specific mappings.
   */
  async getPrivacyControlsForRegime(
    regime: PrivacyRegime,
    scfVersionId: string
  ): Promise<PrivacyControlMapping[]> {
    const framework = await this.resolveFramework(regime);
    if (!framework) return [];

    const priControls = await this.getPrivacyControls(scfVersionId);
    const results: PrivacyControlMapping[] = [];

    for (const control of priControls) {
      const mappings = await this.scfRepo.listMappingsByControl(
        control.id,
        scfVersionId
      );
      const frameworkMappings = mappings.filter(
        (m) => m.scf_framework_id === framework.id
      );
      if (frameworkMappings.length > 0) {
        results.push({ control, mappings: frameworkMappings });
      }
    }

    return results;
  }

  /**
   * Build a lightweight SCF anchor record for embedding in screening results.
   * Returns null if SCF is not available or has no PRI controls.
   */
  async buildAnchor(regime: PrivacyRegime): Promise<PrivacyScfAnchor | null> {
    const version = await this.scfRepo.getLatestVersion();
    if (!version) return null;

    const framework = await this.resolveFramework(regime);
    const priControls = await this.getPrivacyControls(version.id);

    if (priControls.length === 0) return null;

    // If framework exists, filter to mapped controls only
    let relevantControls = priControls;
    if (framework) {
      const mapped = await this.getPrivacyControlsForRegime(regime, version.id);
      if (mapped.length > 0) {
        relevantControls = mapped.map((m) => m.control);
      }
    }

    return {
      scf_version_label: version.version_label,
      scf_version_id: version.id,
      framework_id: framework?.id ?? null,
      framework_code: framework?.framework_code ?? null,
      anchored_controls: relevantControls.map((c) => ({
        control_code: c.control_code,
        control_title: c.control_title,
        control_id: c.id,
      })),
    };
  }

  /**
   * Check if a specific PRI control code exists and is mapped to a given regime.
   * Useful for checking "is PRI-06 (Privacy Impact Assessment) required by LGPD?"
   */
  async isControlMappedToRegime(
    controlCode: string,
    regime: PrivacyRegime,
    scfVersionId: string
  ): Promise<boolean> {
    const framework = await this.resolveFramework(regime);
    if (!framework) return false;

    const control = await this.scfRepo.getControlByCode(scfVersionId, controlCode);
    if (!control) return false;

    const mappings = await this.scfRepo.listMappingsByControl(control.id, scfVersionId);
    return mappings.some((m) => m.scf_framework_id === framework.id);
  }
}

