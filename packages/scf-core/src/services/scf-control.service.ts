import type { ScfRepository } from "../repositories/scf.repository";
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
    const versionId = query.scf_version_id ?? (await this.repository.getLatestVersion())?.id;
    if (!versionId) return [];

    let controls = await this.repository.listControls(versionId);
    if (query.control_code) {
      controls = controls.filter((control) => control.control_code.toLowerCase().includes(query.control_code!.toLowerCase()));
    }
    if (query.domain_code) {
      const domains = await this.repository.listDomains(versionId);
      const domainIds = new Set(domains.filter((domain) => domain.domain_code.toLowerCase() === query.domain_code!.toLowerCase()).map((domain) => domain.id));
      controls = controls.filter((control) => domainIds.has(control.scf_domain_id));
    }
    if (query.q) {
      const q = query.q.toLowerCase();
      controls = controls.filter((control) => `${control.control_code} ${control.control_title} ${control.control_description ?? ""}`.toLowerCase().includes(q));
    }
    return controls;
  }
}
