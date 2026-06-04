import { OperationalMetricSchema, type MetricType, type OperationalMetric } from "@standard/schemas";
import type { ObservabilityDependencies } from "../repositories";

export type RecordMetricInput = {
  organization_id?: string | undefined;
  assessment_id?: string | undefined;
  metric_name: string;
  metric_type: MetricType;
  metric_value: number;
  unit: string;
  dimensions?: Record<string, string> | undefined;
  trace_id: string;
};

export class MetricsService {
  constructor(private readonly deps: Pick<ObservabilityDependencies, "metrics">) {}

  async record(input: RecordMetricInput): Promise<OperationalMetric> {
    return this.deps.metrics.create(OperationalMetricSchema.parse({
      id: crypto.randomUUID(),
      ...input,
      dimensions: input.dimensions ?? {},
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString()
    }));
  }
}

