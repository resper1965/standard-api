/**
 * @module compose-observability
 * @description Factory for Observability + Alert dependency graphs.
 */
import { createDrizzleObservabilityDependencies, AlertService, SecurityEventService, WebhookAlertSink } from "@standard/observability";
import type { ObservabilityDependencies } from "@standard/observability";
import type { Env } from "../index";
import type { DbClient } from "./db";

/**
 * Type bridge: NeonHttpDatabase (edge) ↔ PostgresJsDatabase (packages).
 */
const asDb = (db: DbClient) => db as unknown as Parameters<typeof createDrizzleObservabilityDependencies>[0];

export const composeDrizzleObservability = (db: DbClient, env?: Env): { observability: ObservabilityDependencies; alerts: AlertService } => {
  const observability = createDrizzleObservabilityDependencies(asDb(db));
  const alerts = new AlertService(new SecurityEventService(observability));
  if (env?.SOC_WEBHOOK_URL) {
    alerts.addSink(new WebhookAlertSink(env.SOC_WEBHOOK_URL));
  }
  return { observability, alerts };
};
