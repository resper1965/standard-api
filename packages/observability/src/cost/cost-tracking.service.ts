// @ts-nocheck -- Zod v4 CI type compat
import { AgentUsageRecordSchema, UsageRecordSchema, type AgentUsageRecord, type UsageRecord } from "@standard/schemas";
import { assertMetadataSafe } from "../logger/redaction";
import type { ObservabilityDependencies } from "../repositories";
import { PricingProviderPlaceholder, type PricingProvider } from "./pricing-provider.placeholder";

export type RecordUsageInput = Omit<UsageRecord, "id" | "created_at" | "currency"> & {
  currency?: string;
};

export type RecordAgentUsageInput = Omit<AgentUsageRecord, "id" | "created_at" | "currency"> & {
  currency?: string;
};

export class CostTrackingService {
  constructor(
    private readonly deps: Pick<ObservabilityDependencies, "usage" | "agentUsage">,
    private readonly pricingProvider: PricingProvider = new PricingProviderPlaceholder()
  ) {}

  async recordUsage(input: RecordUsageInput): Promise<UsageRecord> {
    assertMetadataSafe(input.metadata_safe ?? {});
    const estimate = await this.pricingProvider.estimate({
      service_name: input.service_name,
      operation_name: input.operation_name,
      ...(input.provider ? { provider: input.provider } : {}),
      ...(input.model_name ? { model_name: input.model_name } : {}),
      usage_quantity: input.usage_quantity,
      usage_unit: input.usage_unit
    });
    return this.deps.usage.create(UsageRecordSchema.parse({
      id: crypto.randomUUID(),
      ...input,
      ...(estimate ? { cost_estimate: estimate } : {}),
      currency: input.currency ?? estimate?.currency ?? "USD",
      metadata_safe: input.metadata_safe ?? {},
      created_at: new Date().toISOString()
    }));
  }

  async recordAgentUsage(input: RecordAgentUsageInput): Promise<AgentUsageRecord> {
    return this.deps.agentUsage.create(AgentUsageRecordSchema.parse({
      id: crypto.randomUUID(),
      ...input,
      currency: input.currency ?? "USD",
      created_at: new Date().toISOString()
    }));
  }
}


