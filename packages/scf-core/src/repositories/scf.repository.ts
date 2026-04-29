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
  saveVersion(version: ScfVersion): Promise<void>;
  listDomains(versionId: string): Promise<ScfDomain[]>;
  getDomain(id: string): Promise<ScfDomain | null>;
  listControls(versionId: string): Promise<ScfControl[]>;
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
    saveVersion: async (version) => {
      versions.set(version.id, version);
    },
    listDomains: async (versionId) => [...domains.values()].filter((item) => item.scf_version_id === versionId).sort((a, b) => a.sort_order - b.sort_order),
    getDomain: async (id) => domains.get(id) ?? null,
    listControls: async (versionId) => [...controls.values()].filter((item) => item.scf_version_id === versionId).sort((a, b) => a.control_code.localeCompare(b.control_code)),
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
