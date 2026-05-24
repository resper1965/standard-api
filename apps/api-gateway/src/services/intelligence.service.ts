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
