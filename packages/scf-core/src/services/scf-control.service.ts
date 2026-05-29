import type { ScfRepository, ScfControlCrossMapping } from "../repositories/scf.repository";
import type { ScfControl, ScfControlSearchQuery } from "../types";

export class ScfControlService {
  constructor(private readonly repository: ScfRepository) {}

  getControl(controlId: string): Promise<ScfControl | null> {
    return this.repository.getControl(controlId);
  }

  getControlByCode(versionId: string, controlCode: string): Promise<ScfControl | null> {
    return this.repository.getControlByCode(versionId, controlCode);
  }

  listControlsByDomain(versionId: string, domainId: string): Promise<ScfControl[]> {
    return this.repository.listControls(versionId).then((controls) => controls.filter((control) => control.scf_domain_id === domainId));
  }

  async searchControls(query: ScfControlSearchQuery): Promise<ScfControl[]> {
    if (!query.scf_version_id) {
      query.scf_version_id = (await this.repository.getLatestVersion())?.id;
    }
    if (!query.scf_version_id) return [];
    
    return this.repository.searchControls(query);
  }

  getControlCrossMappings(versionId: string, controlCode: string, frameworkFilter?: string): Promise<ScfControlCrossMapping | null> {
    return this.repository.getControlCrossMappings(versionId, controlCode, frameworkFilter);
  }
}
