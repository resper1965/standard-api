import type { KbRequestContext, KbServiceDependencies } from "../types";
import { KbIndexingService } from "./kb-indexing.service";

export class KbReprocessService {
  constructor(private readonly deps: KbServiceDependencies) {}

  async reindexDocument(documentId: string, context: KbRequestContext) {
    const indexing = new KbIndexingService(this.deps);
    return indexing.indexAssessment(context, { document_id: documentId, force_reindex: true });
  }
}
