import type { CostEstimate } from "@standard/schemas";

export type PricingLookupInput = {
  service_name: string;
  operation_name: string;
  provider?: string | undefined;
  model_name?: string | undefined;
  usage_quantity: number;
  usage_unit: string;
};

export type PricingProvider = {
  estimate(input: PricingLookupInput): Promise<CostEstimate | null>;
};

export class PricingProviderPlaceholder implements PricingProvider {
  async estimate(): Promise<null> {
    return null;
  }
}


