import type {
  ScfControl,
  ScfDataset,
  ScfDomain,
  ScfFramework,
  ScfFrameworkRequirement,
  ScfImportRun,
  ScfMapping,
  ScfStrmRelationship,
  ScfVersion
} from "../types";

export type ScfRepository = {
  listVersions(): Promise<ScfVersion[]>;
  getVersion(id: string): Promise<ScfVersion | null>;
  getLatestVersion(): Promise<ScfVersion | null>;
  findVersionByLabel(label: string): Promise<ScfVersion | null>;
  saveVersion(version: ScfVersion): Promise<void>;
  listDomains(versionId: string): Promise<ScfDomain[]>;
  getDomain(id: string): Promise<ScfDomain | null>;
  listControls(versionId: string): Promise<ScfControl[]>;
  searchControls(query: import("../types").ScfControlSearchQuery): Promise<ScfControl[]>;
  getControl(id: string): Promise<ScfControl | null>;
  getControlByCode(versionId: string, controlCode: string): Promise<ScfControl | null>;
  listFrameworks(): Promise<ScfFramework[]>;
  getFramework(id: string): Promise<ScfFramework | null>;
  listRequirements(frameworkId: string): Promise<ScfFrameworkRequirement[]>;
  getRequirement(id: string): Promise<ScfFrameworkRequirement | null>;
  listMappingsByRequirement(requirementId: string, versionId: string): Promise<ScfMapping[]>;
  listMappingsByControl(controlId: string, versionId: string): Promise<ScfMapping[]>;
  listMappingsByFramework(frameworkId: string, versionId: string): Promise<ScfMapping[]>;
  listStrmRelationships(): Promise<ScfStrmRelationship[]>;
  createImportRun(run: ScfImportRun): Promise<ScfImportRun>;
  saveImportRun(run: ScfImportRun): Promise<void>;
  listImportRuns(): Promise<ScfImportRun[]>;
  getImportRun(id: string): Promise<ScfImportRun | null>;
  replaceDataset(dataset: ScfDataset): Promise<void>;
};

export const createInMemoryScfRepository = (initial: ScfDataset): ScfRepository => {
  const versions = new Map(initial.versions.map((item) => [item.id, item]));
  const domains = new Map(initial.domains.map((item) => [item.id, item]));
  const controls = new Map(initial.controls.map((item) => [item.id, item]));
  const frameworks = new Map(initial.frameworks.map((item) => [item.id, item]));
  const requirements = new Map(initial.requirements.map((item) => [item.id, item]));
  const mappings = new Map(initial.mappings.map((item) => [item.id, item]));
  const strmRelationships = new Map(initial.strmRelationships.map((item) => [item.id, item]));
  const importRuns = new Map(initial.importRuns.map((item) => [item.id, item]));

  return {
    listVersions: async () => [...versions.values()],
    getVersion: async (id) => versions.get(id) ?? null,
    getLatestVersion: async () => [...versions.values()].sort((a, b) => (b.imported_at ?? "").localeCompare(a.imported_at ?? ""))[0] ?? null,
    findVersionByLabel: async (label) => [...versions.values()].find((v) => v.version_label.toLowerCase() === label.toLowerCase()) ?? null,
    saveVersion: async (version) => {
      versions.set(version.id, version);
    },
    listDomains: async (versionId) => [...domains.values()].filter((item) => item.scf_version_id === versionId).sort((a, b) => a.sort_order - b.sort_order),
    getDomain: async (id) => domains.get(id) ?? null,
    listControls: async (versionId) => [...controls.values()].filter((item) => item.scf_version_id === versionId).sort((a, b) => a.control_code.localeCompare(b.control_code)),
    searchControls: async (query) => {
      let result = [...controls.values()];
      if (query.scf_version_id) result = result.filter(c => c.scf_version_id === query.scf_version_id);
      if (query.control_code) result = result.filter(c => c.control_code.toLowerCase().includes(query.control_code!.toLowerCase()));
      if (query.domain_code) {
        const dIds = new Set([...domains.values()].filter(d => (query.scf_version_id ? d.scf_version_id === query.scf_version_id : true) && d.domain_code.toLowerCase() === query.domain_code!.toLowerCase()).map(d => d.id));
        result = result.filter(c => dIds.has(c.scf_domain_id));
      }
      if (query.tags && query.tags.length > 0) {
        // Mock doesn't load metadata! So we'll skip filtering or filter by an empty array assumption for testing.
        // Actually, without metadata in memory, tags search will just return 0 items if strictly mock.
        // For simplicity, we just return empty array if tags are required and the mock has no metadata support.
        return [];
      }
      if (query.q) {
        const qStr = query.q.toLowerCase();
        result = result.filter(c => `${c.control_code} ${c.control_title} ${c.control_description ?? ""}`.toLowerCase().includes(qStr));
      }
      return result.sort((a, b) => a.control_code.localeCompare(b.control_code));
    },
    getControl: async (id) => controls.get(id) ?? null,
    getControlByCode: async (versionId, controlCode) =>
      [...controls.values()].find((item) => item.scf_version_id === versionId && item.control_code.toLowerCase() === controlCode.toLowerCase()) ?? null,
    listFrameworks: async () => [...frameworks.values()].sort((a, b) => a.framework_code.localeCompare(b.framework_code)),
    getFramework: async (id) => frameworks.get(id) ?? null,
    listRequirements: async (frameworkId) =>
      [...requirements.values()].filter((item) => item.scf_framework_id === frameworkId).sort((a, b) => a.sort_order - b.sort_order),
    getRequirement: async (id) => requirements.get(id) ?? null,
    listMappingsByRequirement: async (requirementId, versionId) =>
      [...mappings.values()].filter((item) => item.scf_version_id === versionId && item.scf_framework_requirement_id === requirementId),
    listMappingsByControl: async (controlId, versionId) =>
      [...mappings.values()].filter((item) => item.scf_version_id === versionId && item.scf_control_id === controlId),
    listMappingsByFramework: async (frameworkId, versionId) =>
      [...mappings.values()].filter((item) => item.scf_version_id === versionId && item.scf_framework_id === frameworkId),
    listStrmRelationships: async () => [...strmRelationships.values()],
    createImportRun: async (run) => {
      importRuns.set(run.id, run);
      return run;
    },
    saveImportRun: async (run) => {
      importRuns.set(run.id, run);
    },
    listImportRuns: async () => [...importRuns.values()].sort((a, b) => b.started_at.localeCompare(a.started_at)),
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
      dataset.versions.forEach((item) => versions.set(item.id, item));
      dataset.domains.forEach((item) => domains.set(item.id, item));
      dataset.controls.forEach((item) => controls.set(item.id, item));
      dataset.frameworks.forEach((item) => frameworks.set(item.id, item));
      dataset.requirements.forEach((item) => requirements.set(item.id, item));
      dataset.mappings.forEach((item) => mappings.set(item.id, item));
      dataset.strmRelationships.forEach((item) => strmRelationships.set(item.id, item));
      dataset.importRuns.forEach((item) => importRuns.set(item.id, item));
    }
  };
};
