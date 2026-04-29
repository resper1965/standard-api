import type { AuditRepositoryAdapter } from "../http";

export const createAuditRepository = (): AuditRepositoryAdapter => {
  const records: Array<{ event: string; metadata: Record<string, unknown> }> = [];

  return {
    async record(event, metadata) {
      records.push({ event, metadata });
    }
  };
};
