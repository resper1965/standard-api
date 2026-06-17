/**
 * @module compose-observability
 * @description Factory for Observability + Alert dependency graphs.
 */
import {
  AlertService,
  SecurityEventService,
  WebhookAlertSink,
} from "@standard/observability";
import { createDrizzleObservabilityDependencies } from "./observability.repository";
import type { ObservabilityDependencies } from "@standard/observability";
import type { Env } from "../types/env";
import type { DbClient } from "./db";

/**
 * Type bridge: NeonHttpDatabase (edge) â†” PostgresJsDatabase (packages).
 */
const asDb = (db: DbClient) =>
  db as unknown as Parameters<typeof createDrizzleObservabilityDependencies>[0];

export const composeDrizzleObservability = (
  db: DbClient,
  env?: Env,
): { observability: ObservabilityDependencies; alerts: AlertService } => {
  const observability = createDrizzleObservabilityDependencies(asDb(db));
  const alerts = new AlertService(new SecurityEventService(observability));
  if (env?.SOC_WEBHOOK_URL) {
    alerts.addSink(new WebhookAlertSink(env.SOC_WEBHOOK_URL));
  }
  return { observability, alerts };
};

