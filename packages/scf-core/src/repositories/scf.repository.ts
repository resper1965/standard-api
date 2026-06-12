import type {
  ScfAssessmentObjective,
  ScfControl,
  ScfDataset,
  ScfDomain,
  ScfEvidenceRequest,
  ScfFramework,
  ScfFrameworkRequirement,
  ScfImportRun,
  ScfMapping,
  ScfMaturityCriteria,
  ScfRisk,
  ScfStrmRelationship,
  ScfThreat,
  ScfVersion,
} from "../types";

export type ScfCrossMappingItem = {
  framework: string;
  control_id: string;
  control_title: string;
  control_description: string;
  mapping_type: string;
};

export type ScfControlCrossMapping = {
  scf_control_id: string;
  scf_control_title: string;
  mappings: ScfCrossMappingItem[];
};

export type ScfRepository = {
  getControlCrossMappings(
    versionId: string,
    controlCode: string,
    frameworkFilter?: string,
  ): Promise<ScfControlCrossMapping | null>;
  listVersions(organizationId?: string): Promise<ScfVersion[]>;
  getVersion(id: string): Promise<ScfVersion | null>;
  getLatestVersion(organizationId?: string): Promise<ScfVersion | null>;
  findVersionByLabel(label: string): Promise<ScfVersion | null>;
  saveVersion(version: ScfVersion): Promise<void>;
  listDomains(versionId: string): Promise<ScfDomain[]>;
  getDomain(id: string): Promise<ScfDomain | null>;
  listControls(versionId: string): Promise<ScfControl[]>;
  searchControls(
    query: import("../types").ScfControlSearchQuery,
  ): Promise<ScfControl[]>;
  getControl(id: string): Promise<ScfControl | null>;
  getControlByCode(
    versionId: string,
    controlCode: string,
  ): Promise<ScfControl | null>;
  listFrameworks(): Promise<ScfFramework[]>;
  getFramework(id: string): Promise<ScfFramework | null>;
  listRequirements(frameworkId: string): Promise<ScfFrameworkRequirement[]>;
  /** Returns only requirements classified as MCR (Minimum Compliance Requirements)
   *  for a given framework. MCR gaps are compliance blockers, not risk-based decisions. */
  listMcrRequirements(frameworkId: string): Promise<ScfFrameworkRequirement[]>;
  getRequirement(id: string): Promise<ScfFrameworkRequirement | null>;
  listMappingsByRequirement(
    requirementId: string,
    versionId: string,
  ): Promise<ScfMapping[]>;
  listMappingsByControl(
    controlId: string,
    versionId: string,
  ): Promise<ScfMapping[]>;
  /** Bulk fetch minimal mapping data (relationship_type + strength_score) for multiple controls.
   *  Used by dashboard compliance calculation (ADR-001) to avoid N+1 queries. */
  listMappingsByControlIds(
    controlIds: string[],
    scfVersionId: string,
  ): Promise<
    Array<{
      scf_control_id: string;
      relationship_type: string;
      strength_score: number | null;
    }>
  >;
  listMappingsByFramework(
    frameworkId: string,
    versionId: string,
  ): Promise<ScfMapping[]>;
  listStrmRelationships(): Promise<ScfStrmRelationship[]>;
  /** Lookup STRM relationships by FDE code (e.g. "AC-1", "A.5.1"). */
  lookupStrmByFdeCode(
    fdeCode: string,
    opts?: { relationshipType?: string; limit?: number },
  ): Promise<ScfStrmRelationship[]>;
  /** Lookup STRM relationships by SCF control code (e.g. "GOV-001"). */
  lookupStrmByControlCode(
    controlCode: string,
    opts?: { relationshipType?: string; limit?: number },
  ): Promise<ScfStrmRelationship[]>;
  searchStrm(
    query: import("@standard/schemas").ScfStrmQuery,
  ): Promise<ScfStrmRelationship[]>;
  createImportRun(run: ScfImportRun): Promise<ScfImportRun>;
  saveImportRun(run: ScfImportRun): Promise<void>;
  listImportRuns(): Promise<ScfImportRun[]>;
  getImportRun(id: string): Promise<ScfImportRun | null>;
  replaceDataset(dataset: ScfDataset): Promise<void>;
  // ── New SCF Meta-Model Entity Methods ──────────────────────────────
  listAssessmentObjectivesForControl(
    controlId: string,
  ): Promise<ScfAssessmentObjective[]>;
  listEvidenceRequestsForControl(
    controlId: string,
  ): Promise<ScfEvidenceRequest[]>;
  listMaturityCriteriaForControl(
    controlId: string,
  ): Promise<ScfMaturityCriteria[]>;
  listRisksForControl(controlId: string): Promise<ScfRisk[]>;
  listThreatsForControl(controlId: string): Promise<ScfThreat[]>;
};

export const createInMemoryScfRepository = (
  initial: ScfDataset,
): ScfRepository => {
  const versions = new Map(initial.versions.map((item) => [item.id, item]));
  const domains = new Map(initial.domains.map((item) => [item.id, item]));
  const controls = new Map(initial.controls.map((item) => [item.id, item]));
  const frameworks = new Map(initial.frameworks.map((item) => [item.id, item]));
  const requirements = new Map(
    initial.requirements.map((item) => [item.id, item]),
  );
  const mappings = new Map(initial.mappings.map((item) => [item.id, item]));
  const strmRelationships = new Map(
    initial.strmRelationships.map((item) => [item.id, item]),
  );
  const importRuns = new Map(initial.importRuns.map((item) => [item.id, item]));

  const assessmentObjectives = new Map(
    (initial.assessmentObjectives ?? []).map((item) => [item.id, item]),
  );
  const evidenceRequests = new Map(
    (initial.evidenceRequests ?? []).map((item) => [item.id, item]),
  );
  const maturityCriteria = new Map(
    (initial.maturityCriteria ?? []).map((item) => [item.id, item]),
  );
  const risks = new Map((initial.risks ?? []).map((item) => [item.id, item]));
  const threats = new Map(
    (initial.threats ?? []).map((item) => [item.id, item]),
  );
  const riskControlMappings = new Map(
    (initial.riskControlMappings ?? []).map((item) => [item.id, item]),
  );
  const threatControlMappings = new Map(
    (initial.threatControlMappings ?? []).map((item) => [item.id, item]),
  );

  return {
    listVersions: async (organizationId) => {
      const all = [...versions.values()];
      // SCF versions without organization_id are global (visible to all).
      // Org-specific versions are visible only to the owning org.
      if (organizationId) {
        return all.filter(
          (v) =>
            v.organization_id == null || v.organization_id === organizationId,
        );
      }
      // Unauthenticated: only global versions
      return all.filter((v) => v.organization_id == null);
    },
    getVersion: async (id) => versions.get(id) ?? null,
    getLatestVersion: async (organizationId) => {
      const all = [...versions.values()];
      const filtered = organizationId
        ? all.filter(
            (v) =>
              v.organization_id == null || v.organization_id === organizationId,
          )
        : all.filter((v) => v.organization_id == null);
      return (
        filtered.sort((a, b) =>
          (b.imported_at ?? "").localeCompare(a.imported_at ?? ""),
        )[0] ?? null
      );
    },
    findVersionByLabel: async (label) =>
      [...versions.values()].find(
        (v) => v.version_label.toLowerCase() === label.toLowerCase(),
      ) ?? null,
    saveVersion: async (version) => {
      versions.set(version.id, version);
    },
    listDomains: async (versionId) =>
      [...domains.values()]
        .filter((item) => item.scf_version_id === versionId)
        .sort((a, b) => a.sort_order - b.sort_order),
    getDomain: async (id) => domains.get(id) ?? null,
    listControls: async (versionId) =>
      [...controls.values()]
        .filter((item) => item.scf_version_id === versionId)
        .sort((a, b) => a.control_code.localeCompare(b.control_code)),
    searchControls: async (query) => {
      let result = [...controls.values()];
      if (query.scf_version_id)
        result = result.filter(
          (c) => c.scf_version_id === query.scf_version_id,
        );
      if (query.control_code)
        result = result.filter((c) =>
          c.control_code
            .toLowerCase()
            .includes(query.control_code!.toLowerCase()),
        );
      if (query.domain_code) {
        const dIds = new Set(
          [...domains.values()]
            .filter(
              (d) =>
                (query.scf_version_id
                  ? d.scf_version_id === query.scf_version_id
                  : true) &&
                d.domain_code.toLowerCase() ===
                  query.domain_code!.toLowerCase(),
            )
            .map((d) => d.id),
        );
        result = result.filter((c) => dIds.has(c.scf_domain_id));
      }
      if (query.tags && query.tags.length > 0) {
        return [];
      }
      if (query.q) {
        const qStr = query.q.toLowerCase();
        result = result.filter((c) =>
          `${c.control_code} ${c.control_title} ${c.control_description ?? ""}`
            .toLowerCase()
            .includes(qStr),
        );
      }
      return result.sort((a, b) =>
        a.control_code.localeCompare(b.control_code),
      );
    },
    getControl: async (id) => controls.get(id) ?? null,
    getControlByCode: async (versionId, controlCode) =>
      [...controls.values()].find(
        (item) =>
          item.scf_version_id === versionId &&
          item.control_code.toLowerCase() === controlCode.toLowerCase(),
      ) ?? null,
    listFrameworks: async () =>
      [...frameworks.values()].sort((a, b) =>
        a.framework_code.localeCompare(b.framework_code),
      ),
    getFramework: async (id) => frameworks.get(id) ?? null,
    listRequirements: async (frameworkId) =>
      [...requirements.values()]
        .filter((item) => item.scf_framework_id === frameworkId)
        .sort((a, b) => a.sort_order - b.sort_order),
    listMcrRequirements: async (frameworkId) =>
      [...requirements.values()]
        .filter(
          (item) =>
            item.scf_framework_id === frameworkId && item.is_mcr === true,
        )
        .sort((a, b) => a.sort_order - b.sort_order),
    getRequirement: async (id) => requirements.get(id) ?? null,

    listMappingsByRequirement: async (requirementId, versionId) =>
      [...mappings.values()].filter(
        (item) =>
          item.scf_version_id === versionId &&
          item.scf_framework_requirement_id === requirementId,
      ),
    listMappingsByControl: async (controlId, versionId) =>
      [...mappings.values()].filter(
        (item) =>
          item.scf_version_id === versionId &&
          item.scf_control_id === controlId,
      ),
    listMappingsByControlIds: async (controlIds, scfVersionId) => {
      const idSet = new Set(controlIds);
      return [...mappings.values()]
        .filter(
          (item) =>
            item.scf_version_id === scfVersionId &&
            idSet.has(item.scf_control_id),
        )
        .map((m) => ({
          scf_control_id: m.scf_control_id,
          relationship_type: m.relationship_type,
          strength_score: m.relationship_strength
            ? parseFloat(m.relationship_strength)
            : null,
        }));
    },
    listMappingsByFramework: async (frameworkId, versionId) =>
      [...mappings.values()].filter(
        (item) =>
          item.scf_version_id === versionId &&
          item.scf_framework_id === frameworkId,
      ),
    getControlCrossMappings: async (
      versionId,
      controlCode,
      frameworkFilter,
    ) => {
      const control = [...controls.values()].find(
        (c) =>
          c.scf_version_id === versionId &&
          c.control_code.toLowerCase() === controlCode.toLowerCase(),
      );
      if (!control) return null;

      const list = [...mappings.values()].filter(
        (m) =>
          m.scf_version_id === versionId && m.scf_control_id === control.id,
      );

      const items: ScfCrossMappingItem[] = [];
      for (const m of list) {
        const req = requirements.get(m.scf_framework_requirement_id);
        if (!req) continue;
        const fw = frameworks.get(req.scf_framework_id);
        if (!fw) continue;

        items.push({
          framework: fw.framework_name,
          control_id: req.requirement_code,
          control_title: req.requirement_title,
          control_description: req.requirement_text ?? "",
          mapping_type: m.relationship_type,
        });
      }

      let filtered = items;
      if (frameworkFilter) {
        const filterLower = frameworkFilter.toLowerCase();
        filtered = items.filter((i) => {
          const req = [...requirements.values()].find(
            (r) => r.requirement_code === i.control_id,
          );
          const fw = req ? frameworks.get(req.scf_framework_id) : null;
          return (
            i.framework.toLowerCase().includes(filterLower) ||
            (fw && fw.framework_code.toLowerCase().includes(filterLower))
          );
        });
      }

      return {
        scf_control_id: control.control_code,
        scf_control_title: control.control_title,
        mappings: filtered,
      };
    },
    listStrmRelationships: async () => [...strmRelationships.values()],
    lookupStrmByFdeCode: async (fdeCode, opts) => {
      const code = fdeCode.trim().toLowerCase();
      let results = [...strmRelationships.values()].filter(
        (r) => (r.fde_code ?? "").toLowerCase() === code,
      );
      if (opts?.relationshipType)
        results = results.filter(
          (r) => r.relationship_type === opts.relationshipType,
        );
      return results.slice(0, opts?.limit ?? 100);
    },
    lookupStrmByControlCode: async (controlCode, opts) => {
      const code = controlCode.trim().toLowerCase();
      let results = [...strmRelationships.values()].filter(
        (r) => (r.scf_control_id ?? "").toLowerCase() === code,
      );
      if (opts?.relationshipType)
        results = results.filter(
          (r) => r.relationship_type === opts.relationshipType,
        );
      return results.slice(0, opts?.limit ?? 100);
    },
    searchStrm: async (query) => {
      let results = [...strmRelationships.values()];

      if (query.control_id) {
        results = results.filter((r) => r.scf_control_id === query.control_id);
      }
      if (query.relationship_type) {
        results = results.filter(
          (r) => r.relationship_type === query.relationship_type,
        );
      }
      if (query.min_confidence_score !== undefined) {
        results = results.filter(
          (r) =>
            Number(r.relationship_strength ?? 0) >= query.min_confidence_score!,
        );
      }
      // Note: Full join-based mock (framework_id, source_framework_id) is simplified here.
      // A proper in-memory implementation would need to cross-reference mappings and requirements.
      return results.slice(
        query.offset ?? 0,
        (query.offset ?? 0) + (query.limit ?? 100),
      );
    },
    createImportRun: async (run) => {
      importRuns.set(run.id, run);
      return run;
    },
    saveImportRun: async (run) => {
      importRuns.set(run.id, run);
    },
    listImportRuns: async () =>
      [...importRuns.values()].sort((a, b) =>
        b.started_at.localeCompare(a.started_at),
      ),
    getImportRun: async (id) => importRuns.get(id) ?? null,
    replaceDataset: async (dataset) => {
      versions.clear();
      domains.clear();
      controls.clear();
      frameworks.clear();
      requirements.clear();
      mappings.clear();
      strmRelationships.clear();
      importRuns.clear();

      assessmentObjectives.clear();
      evidenceRequests.clear();
      maturityCriteria.clear();
      risks.clear();
      threats.clear();
      riskControlMappings.clear();
      threatControlMappings.clear();

      dataset.versions.forEach((item) => versions.set(item.id, item));
      dataset.domains.forEach((item) => domains.set(item.id, item));
      dataset.controls.forEach((item) => controls.set(item.id, item));
      dataset.frameworks.forEach((item) => frameworks.set(item.id, item));
      dataset.requirements.forEach((item) => requirements.set(item.id, item));
      dataset.mappings.forEach((item) => mappings.set(item.id, item));
      dataset.strmRelationships.forEach((item) =>
        strmRelationships.set(item.id, item),
      );
      dataset.importRuns.forEach((item) => importRuns.set(item.id, item));

      if (dataset.assessmentObjectives) {
        dataset.assessmentObjectives.forEach((item) =>
          assessmentObjectives.set(item.id, item),
        );
      }
      if (dataset.evidenceRequests) {
        dataset.evidenceRequests.forEach((item) =>
          evidenceRequests.set(item.id, item),
        );
      }
      if (dataset.maturityCriteria) {
        dataset.maturityCriteria.forEach((item) =>
          maturityCriteria.set(item.id, item),
        );
      }
      if (dataset.risks) {
        dataset.risks.forEach((item) => risks.set(item.id, item));
      }
      if (dataset.threats) {
        dataset.threats.forEach((item) => threats.set(item.id, item));
      }
      if (dataset.riskControlMappings) {
        dataset.riskControlMappings.forEach((item) =>
          riskControlMappings.set(item.id, item),
        );
      }
      if (dataset.threatControlMappings) {
        dataset.threatControlMappings.forEach((item) =>
          threatControlMappings.set(item.id, item),
        );
      }
    },
    // ── New SCF Meta-Model Entity Methods ───────────────────────────
    listAssessmentObjectivesForControl: async (controlId) =>
      [...assessmentObjectives.values()].filter(
        (item) => item.scf_control_id === controlId,
      ),
    listEvidenceRequestsForControl: async (controlId) =>
      [...evidenceRequests.values()].filter(
        (item) => item.scf_control_id === controlId,
      ),
    listMaturityCriteriaForControl: async (controlId) =>
      [...maturityCriteria.values()].filter(
        (item) => item.scf_control_id === controlId,
      ),
    listRisksForControl: async (controlId) => {
      const riskIds = [...riskControlMappings.values()]
        .filter((item) => item.scf_control_id === controlId)
        .map((item) => item.scf_risk_id);
      return [...risks.values()].filter((item) => riskIds.includes(item.id));
    },
    listThreatsForControl: async (controlId) => {
      const threatIds = [...threatControlMappings.values()]
        .filter((item) => item.scf_control_id === controlId)
        .map((item) => item.scf_threat_id);
      return [...threats.values()].filter((item) =>
        threatIds.includes(item.id),
      );
    },
  };
};
