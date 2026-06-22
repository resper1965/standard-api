import { RISK_TAXONOMY } from "../routes/risk.routes";
import { REGULATIONS } from "../routes/regulations.routes";
import {
  DATA_CATEGORIES,
  VOLUME_SCALE,
  RETENTION_RULES,
} from "../routes/reference-data.routes";
import type { AppDependencies } from "../http";
import { AgentRuntimeService } from "@standard/agent-runtime";
import { computeComplianceIndex } from "@standard/assessment-engine";
import type { StrmControlInput } from "@standard/assessment-engine";
import type { StrmOperator } from "@standard/schemas";

export class IntelligenceService {
  constructor(private readonly deps?: AppDependencies) {}

  async getJobStatus(jobId: string, organizationId: string) {
    if (!this.deps || !this.deps.agentRuntime) {
      throw new Error("Agent Runtime dependency required to fetch job status.");
    }
    const run = await this.deps.agentRuntime.runs.get(jobId);
    if (run && run.organization_id !== organizationId) return null;
    return run;
  }

  /**
   * Helper for stateless rule extraction based on framework or regulation mask
   */
  static extractFrameworkControls(mask: string): Set<string> {
    const reqControls = new Set<string>();

    if (mask === "standard" || mask === "risk") {
      for (const cat of RISK_TAXONOMY.categories) {
        for (const risk of cat.risks) {
          for (const control of risk.scf_controls) {
            reqControls.add(control);
          }
        }
      }
    }

    for (const reg of REGULATIONS) {
      if (mask === reg.id || mask === "standard") {
        for (const trigger of reg.dpia_triggers) {
          trigger.scf_controls.forEach((c: string) => reqControls.add(c));
        }
        reg.consent_rules.scf_controls.forEach((c: string) =>
          reqControls.add(c),
        );
        reg.breach_rules.scf_controls.forEach((c: string) =>
          reqControls.add(c),
        );
        reg.legal_bases.forEach((lb: any) =>
          lb.scf_controls.forEach((c: string) => reqControls.add(c)),
        );
        reg.sensitive_legal_bases.forEach((lb: any) =>
          lb.scf_controls.forEach((c: string) => reqControls.add(c)),
        );
        reg.data_subject_rights.forEach((r: any) =>
          r.scf_controls.forEach((c: string) => reqControls.add(c)),
        );
      }
    }

    // NOTE: Frameworks like iso27001, nist800-53, fedramp, soc2, etc. are NOT handled here.
    // Their SCF control mappings live in the database (seeded SCF XLSX 2026.1.1).
    // Use getControlsForFramework() (instance method) for DB-backed resolution.
    // RULE (AGENTS.md Â§8): Never infer mapping if not in the structured SCF base.
    //                       Returning an empty set is correct â€” do not invent crosswalks.

    return reqControls;
  }

  static calculateBlastRadius(controlId: string) {
    const rawControlId = controlId.toUpperCase();
    const linkedRegulations: any[] = [];
    const linkedRisks: any[] = [];
    const linkedDataCategories: any[] = [];
    const linkedRetentionRules: any[] = [];

    for (const cat of RISK_TAXONOMY.categories) {
      for (const r of cat.risks) {
        if (r.scf_controls.includes(rawControlId)) {
          linkedRisks.push({ category: cat.id, risk: r.name_i18n });
        }
      }
    }

    for (const reg of REGULATIONS) {
      let hit = false;
      if (
        reg.dpia_triggers.some((t: any) =>
          t.scf_controls.includes(rawControlId),
        )
      )
        hit = true;
      if (reg.consent_rules.scf_controls.includes(rawControlId)) hit = true;
      if (reg.breach_rules.scf_controls.includes(rawControlId)) hit = true;
      if (
        reg.legal_bases.some((lb: any) =>
          lb.scf_controls.includes(rawControlId),
        )
      )
        hit = true;
      if (
        reg.sensitive_legal_bases.some((lb: any) =>
          lb.scf_controls.includes(rawControlId),
        )
      )
        hit = true;
      if (
        reg.data_subject_rights.some((r: any) =>
          r.scf_controls.includes(rawControlId),
        )
      )
        hit = true;
      if (hit) linkedRegulations.push({ id: reg.id, name: reg.name_i18n });
    }

    for (const dc of DATA_CATEGORIES) {
      if ((dc as any).scf_controls?.includes(rawControlId)) {
        linkedDataCategories.push({ id: dc.id, name: dc.name_i18n });
      }
    }

    for (const rr of RETENTION_RULES) {
      if ((rr as any).scf_controls?.includes(rawControlId)) {
        linkedRetentionRules.push({
          category: rr.data_category_id,
          context: rr.context_id,
        });
      }
    }

    return {
      control_id: rawControlId,
      linked_entities: {
        risks: linkedRisks,
        regulations: linkedRegulations,
        data_categories: linkedDataCategories,
        retention_rules: linkedRetentionRules,
      },
    };
  }

  /**
   * Mapping from user-facing framework mask â†’ SCF catalog framework_id.
   * These IDs come from the seeded SCF XLSX data (2026.1.1).
   * ISO 27001 uses ISO 27002:2022 as its control catalog (framework_id: '27-2022').
   */
  private static readonly FRAMEWORK_ID_MAP: Record<string, string[]> = {
    iso27001: ["27-2022"], // ISO 27002:2022 (controls for ISO 27001)
    iso27002: ["27-2022"],
    iso27017: ["27-2015"], // ISO 27017:2015
    iso27701: ["27-2025"], // ISO 27701:2025
    "nist800-53": ["80-R5"], // NIST 800-53 R5
    "nist-csf": ["CS-2.0"], // NIST CSF 2.0
    fedramp: ["FE-HIGH", "FE-MODERATE", "FE-LOW"], // FedRAMP
    soc2: ["SO-2"], // SOC 2
    "pci-dss": ["4.-SAQ-D-SERVICE-PROVIDER"], // PCI-DSS
    lgpd: ["BR-LGPD"], // Brazil LGPD
    gdpr: ["EU-GDPR"], // EU GDPR
    cmmc: ["CM-LEVEL-2"], // CMMC Level 2
    "tx-ramp": ["TX-LEVEL-1", "TX-LEVEL-2"], // TX-RAMP Level 1+2
    "tx-ramp-1": ["TX-LEVEL-1"], // TX-RAMP Level 1
    "tx-ramp-2": ["TX-LEVEL-2"], // TX-RAMP Level 2
    "tx-level-1": ["TX-LEVEL-1"], // TX-RAMP Level 1 (by ID)
    "tx-level-2": ["TX-LEVEL-2"], // TX-RAMP Level 2 (by ID)
  };

  /**
   * Get required SCF controls for a framework from the database.
   * Returns SCF control_codes (e.g. GOV-01, IAC-02) â€” NOT framework requirement codes.
   * Falls back to static extraction if DB is unavailable or framework not found.
   */
  async getControlsForFramework(mask: string): Promise<Set<string>> {
    if (!this.deps?.scf) {
      return IntelligenceService.extractFrameworkControls(mask);
    }

    // Determine which framework_codes to look for
    const frameworkIds =
      IntelligenceService.FRAMEWORK_ID_MAP[mask.toLowerCase()];
    const codesToResolve =
      frameworkIds && frameworkIds.length > 0 ? frameworkIds : [mask]; // Try raw mask as framework_code (e.g. 'TX-LEVEL-2')

    try {
      const controlSet = new Set<string>();
      const allFrameworks = await this.deps.scf.frameworks.listFrameworks();
      const allVersions = await this.deps.scf.versions.listVersions();

      for (const frameworkCode of codesToResolve) {
        // Find all framework records matching this code (may span multiple versions)
        const matchingFws = allFrameworks.filter(
          (f) => f.framework_code.toLowerCase() === frameworkCode.toLowerCase(),
        );
        if (matchingFws.length === 0) continue;

        // Try each version to find mappings (framework is linked to a version)
        for (const fw of matchingFws) {
          for (const version of allVersions) {
            const mappings = await this.deps.scf.mappings.mapFrameworkToScf(
              fw.id,
              version.id,
            );
            if (mappings.length > 0) {
              const enriched =
                await this.deps.scf.mappings.enrichMappings(mappings);
              for (const m of enriched) {
                if (m.control_code) controlSet.add(m.control_code);
              }
              break; // Found mappings for this fw, no need to check other versions
            }
          }
        }
      }

      if (controlSet.size > 0) {
        return controlSet;
      }
    } catch (err) {
      console.warn(
        "[IntelligenceService] SCF DB lookup failed, falling back to static:",
        err,
      );
    }

    // Fallback: static extraction (regulations-based)
    return IntelligenceService.extractFrameworkControls(mask);
  }

  private async getFrameworkMappings(mask: string): Promise<any[]> {
    if (!this.deps?.scf) return [];

    const frameworkIds =
      IntelligenceService.FRAMEWORK_ID_MAP[mask.toLowerCase()];
    const codesToResolve =
      frameworkIds && frameworkIds.length > 0 ? frameworkIds : [mask];

    try {
      const allFrameworks = await this.deps.scf.frameworks.listFrameworks();
      const allVersions = await this.deps.scf.versions.listVersions();

      for (const frameworkCode of codesToResolve) {
        const matchingFws = allFrameworks.filter(
          (f) => f.framework_code.toLowerCase() === frameworkCode.toLowerCase(),
        );
        if (matchingFws.length === 0) continue;

        for (const fw of matchingFws) {
          for (const version of allVersions) {
            const mappings = await this.deps.scf.mappings.mapFrameworkToScf(
              fw.id,
              version.id,
            );
            if (mappings.length > 0) {
              return await this.deps.scf.mappings.enrichMappings(mappings);
            }
          }
        }
      }
    } catch (err) {
      console.warn(
        "[IntelligenceService] Failed to retrieve framework mappings from DB:",
        err,
      );
    }
    return [];
  }

  /**
   * Async version of calculateGapAnalysis — uses DB-backed framework controls and STRM weights (ADR-001) when available.
   */
  async calculateGapAnalysisAsync(
    frameworkMask: string,
    implementedControls: string[],
  ) {
    const implementedSet = new Set(implementedControls);
    const requiredControls = await this.getControlsForFramework(frameworkMask);

    const missingControls: string[] = [];
    let implementedCount = 0;
    const totalControls = requiredControls.size;

    for (const reqControl of requiredControls) {
      if (implementedSet.has(reqControl)) {
        implementedCount++;
      } else {
        missingControls.push(reqControl);
      }
    }

    // Try to get actual database mappings for the framework
    const enrichedMappings = await this.getFrameworkMappings(frameworkMask);
    const controlInputs: StrmControlInput[] = [];

    if (enrichedMappings.length > 0) {
      const mappingMap = new Map<string, any>();
      for (const m of enrichedMappings) {
        if (m.control_code) {
          mappingMap.set(m.control_code, m);
        }
      }

      for (const code of requiredControls) {
        const isImplemented = implementedSet.has(code);
        const mapping = mappingMap.get(code);
        if (mapping) {
          controlInputs.push({
            maturity_level: isImplemented ? 5 : 0,
            strm_operator: sanitizeStrmOperator(mapping.relationship_type),
            strength_score: mapping.relationship_strength
              ? parseFloat(mapping.relationship_strength)
              : null,
          });
        } else {
          // Fallback if this control code isn't in mapping metadata
          controlInputs.push({
            maturity_level: isImplemented ? 5 : 0,
            strm_operator: "intersects" as const,
            strength_score: 0.5,
          });
        }
      }
    } else {
      // Fallback: conservative STRM proxy
      for (const code of requiredControls) {
        const isImplemented = implementedSet.has(code);
        controlInputs.push({
          maturity_level: isImplemented ? 5 : 0,
          strm_operator: "intersects" as const,
          strength_score: 0.5,
        });
      }
    }

    const compliancePercentage =
      totalControls === 0
        ? 100
        : Math.round(computeComplianceIndex(controlInputs).percentage);

    return {
      totalControls,
      implementedCount,
      missingControls,
      compliancePercentage,
    };
  }

  static calculateGapAnalysis(
    frameworkMask: string,
    implementedControls: string[],
  ) {
    const implementedSet = new Set(implementedControls);
    const requiredControls = this.extractFrameworkControls(frameworkMask);

    const missingControls: string[] = [];
    let implementedCount = 0;
    const totalControls = requiredControls.size;

    for (const reqControl of requiredControls) {
      if (implementedSet.has(reqControl)) {
        implementedCount++;
      } else {
        missingControls.push(reqControl);
      }
    }

    // Static fallback: conservative STRM proxy
    const controlInputs: StrmControlInput[] = Array.from(requiredControls).map(
      (code) => {
        const isImplemented = implementedSet.has(code);
        return {
          maturity_level: isImplemented ? 5 : 0,
          strm_operator: "intersects" as const,
          strength_score: 0.5,
        };
      },
    );

    const compliancePercentage =
      totalControls === 0
        ? 100
        : Math.round(computeComplianceIndex(controlInputs).percentage);

    return {
      totalControls,
      implementedCount,
      missingControls,
      compliancePercentage,
    };
  }
}

function sanitizeStrmOperator(op: string | null | undefined): StrmOperator {
  if (!op) return "intersects";
  const lower = op.toLowerCase();
  if (lower === "equal") return "equal";
  if (lower === "subset") return "subset";
  if (lower === "intersects" || lower === "intersecting") return "intersects";
  if (lower === "superset") return "superset";
  if (lower === "no_relation" || lower === "no_relationship")
    return "no_relation";
  return "intersects"; // Safe fallback
}
