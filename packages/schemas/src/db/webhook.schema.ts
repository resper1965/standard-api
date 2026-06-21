import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import { webhookDeliveryStatusEnum } from "./_shared-enums";
import { organizations } from "./core.schema";

export const webhookEndpoints = pgTable(
  "webhook_endpoints",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    url: text("url").notNull(),
    events: jsonb("events").$type<string[]>().default([]).notNull(),
    description: text("description"),
    enabled: boolean("enabled").default(true).notNull(),
    signingSecretHash: text("signing_secret_hash").notNull(),
    signingSecretMasked: text("signing_secret_masked").notNull(),
    ...timestamps(),
  },
  (table) => [
    index("webhook_endpoints_tenant_org_idx").on(table.organizationId),
    index("webhook_endpoints_org_idx").on(table.organizationId),
  ],
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    endpointId: uuid("endpoint_id")
      .notNull()
      .references(() => webhookEndpoints.id),
    eventId: text("event_id").notNull(),
    eventType: text("event_type").notNull(),
    status: webhookDeliveryStatusEnum("status").default("pending").notNull(),
    httpStatus: integer("http_status"),
    attemptCount: integer("attempt_count").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(3).notNull(),
    lastAttemptedAt: timestamp("last_attempted_at", { withTimezone: true }),
    nextRetryAt: timestamp("next_retry_at", { withTimezone: true }),
    responseBody: text("response_body"),
    ...timestamps(),
  },
  (table) => [
    index("webhook_deliveries_endpoint_idx").on(table.endpointId),
    index("webhook_deliveries_event_id_idx").on(table.eventId),
    index("webhook_deliveries_status_idx").on(table.status),
  ],
);
