import { randomUUID } from "node:crypto";
import type { 
  ThreatAnalysisRepositoryAdapter, 
  ApplicationVersionRecord, 
  ThreatModelRecord 
} from "../http";

export const createInMemoryThreatAnalysisRepository = (): ThreatAnalysisRepositoryAdapter => {
  const versions = new Map<string, ApplicationVersionRecord>();
  const threats = new Map<string, ThreatModelRecord>();

  // Pre-seed some default versions for nCommand Lite since we are not building
  // the full Application asset inventory yet.
  const seedVersion: ApplicationVersionRecord = {
    id: "ncl-v1.0",
    versionString: "v1.0",
    releaseDate: "2024-01-15",
    status: "Published",
  };
  const seedVersion2: ApplicationVersionRecord = {
    id: "ncl-v1.1",
    versionString: "v1.1",
    releaseDate: "2024-06-20",
    status: "Draft",
  };
  versions.set(seedVersion.id, seedVersion);
  versions.set(seedVersion2.id, seedVersion2);

  // Pre-seed a few threats for v1.0
  const seedThreat1: ThreatModelRecord = {
    id: "t-1",
    versionId: "ncl-v1.0",
    element: "Data Flow",
    componentName: "Patient Data Sync API",
    strideCategory: "T", // Tampering
    description: "An attacker could intercept and modify the patient vitals payload in transit if TLS is misconfigured.",
    fmea: { severity: 8, occurrence: 4, detection: 5 },
    rpn: 160,
    mitigation: "Enforce TLS 1.3 and implement payload signing verification.",
    status: "Mitigated"
  };
  const seedThreat2: ThreatModelRecord = {
    id: "t-2",
    versionId: "ncl-v1.0",
    element: "Actor",
    componentName: "Hospital Administrator",
    strideCategory: "S", // Spoofing
    description: "Compromised admin credentials could allow unauthorized access to the nCommand Lite dashboard.",
    fmea: { severity: 9, occurrence: 5, detection: 3 },
    rpn: 135,
    mitigation: "Require MFA for all administrative logins.",
    status: "Open"
  };
  threats.set(seedThreat1.id, seedThreat1);
  threats.set(seedThreat2.id, seedThreat2);

  return {
    async createVersion(input) {
      const record: ApplicationVersionRecord = {
        ...input,
        id: randomUUID(),
      };
      versions.set(record.id, record);
      return record;
    },
    async getVersions() {
      return Array.from(versions.values());
    },
    async getVersion(id) {
      return versions.get(id) || null;
    },
    async addThreat(input) {
      const rpn = input.fmea.severity * input.fmea.occurrence * input.fmea.detection;
      const record: ThreatModelRecord = {
        ...input,
        id: randomUUID(),
        rpn,
      };
      threats.set(record.id, record);
      return record;
    },
    async getThreats(versionId) {
      return Array.from(threats.values()).filter(t => t.versionId === versionId);
    },
    async updateThreat(threatId, updates) {
      const existing = threats.get(threatId);
      if (!existing) return null;

      const updatedFmea = updates.fmea || existing.fmea;
      const rpn = updatedFmea.severity * updatedFmea.occurrence * updatedFmea.detection;

      const updatedRecord: ThreatModelRecord = {
        ...existing,
        ...updates,
        fmea: updatedFmea,
        rpn,
      };
      threats.set(threatId, updatedRecord);
      return updatedRecord;
    },
    async deleteThreat(threatId) {
      return threats.delete(threatId);
    }
  };
};
