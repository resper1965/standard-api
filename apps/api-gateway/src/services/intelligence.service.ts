import { RISK_TAXONOMY } from "../routes/risk.routes";
import { REGULATIONS } from "../routes/regulations.routes";
import { DATA_CATEGORIES, VOLUME_SCALE, RETENTION_RULES } from "../routes/reference-data.routes";
import type { AppDependencies } from "../http";
import { AgentRuntimeService, createDrizzleAgentRuntimeDependencies } from "@standard/agent-runtime";

export class IntelligenceService {
  constructor(private readonly deps?: AppDependencies) {}

  async getJobStatus(jobId: string, tenantId: string) {
    if (!this.deps || !this.deps.agentRuntime) {
       throw new Error("Agent Runtime dependency required to fetch job status.");
    }
    const run = await this.deps.agentRuntime.runs.get(jobId);
    if (run && run.tenant_id !== tenantId) return null;
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
        reg.consent_rules.scf_controls.forEach((c: string) => reqControls.add(c));
        reg.breach_rules.scf_controls.forEach((c: string) => reqControls.add(c));
        reg.legal_bases.forEach((lb: any) => lb.scf_controls.forEach((c: string) => reqControls.add(c)));
        reg.sensitive_legal_bases.forEach((lb: any) => lb.scf_controls.forEach((c: string) => reqControls.add(c)));
        reg.data_subject_rights.forEach((r: any) => r.scf_controls.forEach((c: string) => reqControls.add(c)));
      }
    }

    if (mask === "iso27001") {
      ["GOV-01", "GOV-02", "POL-01", "POL-02", "RSK-01", "RSK-02"].forEach(c => reqControls.add(c));
    }

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
      if (reg.dpia_triggers.some((t: any) => t.scf_controls.includes(rawControlId))) hit = true;
      if (reg.consent_rules.scf_controls.includes(rawControlId)) hit = true;
      if (reg.breach_rules.scf_controls.includes(rawControlId)) hit = true;
      if (reg.legal_bases.some((lb: any) => lb.scf_controls.includes(rawControlId))) hit = true;
      if (reg.sensitive_legal_bases.some((lb: any) => lb.scf_controls.includes(rawControlId))) hit = true;
      if (reg.data_subject_rights.some((r: any) => r.scf_controls.includes(rawControlId))) hit = true;
      if (hit) linkedRegulations.push({ id: reg.id, name: reg.name_i18n });
    }

    for (const dc of DATA_CATEGORIES) {
      if ((dc as any).scf_controls?.includes(rawControlId)) {
        linkedDataCategories.push({ id: dc.id, name: dc.name_i18n });
      }
    }

    for (const rr of RETENTION_RULES) {
      if ((rr as any).scf_controls?.includes(rawControlId)) {
        linkedRetentionRules.push({ category: rr.data_category_id, context: rr.context_id });
      }
    }

    return {
      control_id: rawControlId,
      linked_entities: {
        risks: linkedRisks,
        regulations: linkedRegulations,
        data_categories: linkedDataCategories,
        retention_rules: linkedRetentionRules
      }
    };
  }

  /**
   * Mapping from user-facing framework mask → SCF catalog framework_id.
   * These IDs come from the seeded SCF XLSX data (2026.1.1).
   * ISO 27001 uses ISO 27002:2022 as its control catalog (framework_id: '27-2022').
   */
  private static readonly FRAMEWORK_ID_MAP: Record<string, string[]> = {
    'iso27001':      ['27-2022'],                         // ISO 27002:2022 (controls for ISO 27001)
    'iso27002':      ['27-2022'],
    'iso27017':      ['27-2015'],                         // ISO 27017:2015
    'iso27701':      ['27-2025'],                         // ISO 27701:2025
    'nist800-53':    ['80-R5'],                           // NIST 800-53 R5
    'nist-csf':      ['CS-2.0'],                          // NIST CSF 2.0
    'fedramp':       ['FE-HIGH', 'FE-MODERATE', 'FE-LOW'],// FedRAMP
    'soc2':          ['SO-2'],                            // SOC 2
    'pci-dss':       ['4.-SAQ-D-SERVICE-PROVIDER'],       // PCI-DSS
    'lgpd':          ['BR-LGPD'],                         // Brazil LGPD
    'gdpr':          ['EU-GDPR'],                         // EU GDPR
    'cmmc':          ['CM-LEVEL-2'],                      // CMMC Level 2
  };

  /**
   * Get required SCF controls for a framework from the database.
   * Falls back to static extraction if DB is unavailable or framework not found.
   */
  async getControlsForFramework(mask: string): Promise<Set<string>> {
    if (!this.deps?.scf) {
      return IntelligenceService.extractFrameworkControls(mask);
    }

    const frameworkIds = IntelligenceService.FRAMEWORK_ID_MAP[mask.toLowerCase()];
    if (!frameworkIds || frameworkIds.length === 0) {
      return IntelligenceService.extractFrameworkControls(mask);
    }

    try {
      const controlSet = new Set<string>();
      // Look up each framework by its code and collect requirement codes
      // (e.g., ISO 27002:2022 requirements like 'A.5.1', 'A.8.2')
      const allFrameworks = await this.deps.scf.frameworks.listFrameworks();
      for (const frameworkCode of frameworkIds) {
        const fw = allFrameworks.find(f => f.framework_code === frameworkCode);
        if (!fw) continue;
        const reqs = await this.deps.scf.frameworks.listRequirements(fw.id);
        for (const req of reqs) {
          if (req.requirement_code) controlSet.add(req.requirement_code);
        }
      }
      if (controlSet.size > 0) {
        return controlSet;
      }

    } catch (err) {
      console.warn('[IntelligenceService] SCF DB lookup failed, falling back to static:', err instanceof Error ? err.message : String(err));
    }

    // Fallback: static extraction
    return IntelligenceService.extractFrameworkControls(mask);
  }

  /**
   * Async version of calculateGapAnalysis — uses DB-backed framework controls when available.
   */
  async calculateGapAnalysisAsync(frameworkMask: string, implementedControls: string[]) {
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

    const compliancePercentage = totalControls === 0 ? 100 : Math.round((implementedCount / totalControls) * 100);

    return { totalControls, implementedCount, missingControls, compliancePercentage };
  }

  static calculateGapAnalysis(frameworkMask: string, implementedControls: string[]) {
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

    const compliancePercentage = totalControls === 0 ? 100 : Math.round((implementedCount / totalControls) * 100);

    return {
      totalControls,
      implementedCount,
      missingControls,
      compliancePercentage
    };
  }
}
