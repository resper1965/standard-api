import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";
import { organizations } from "./core.schema";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    maskedKey: text("masked_key").notNull(),
    /** M2M permission scopes — at least one scope required (M4 least privilege). */
    scopes: jsonb("scopes").$type<string[]>().default([]).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    /** Soft-delete: set when key is revoked. Null means active. */
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    /** Scheduled revocation time — set by key rotation. Null = no pending revocation. */
    scheduledRevokeAt: timestamp("scheduled_revoke_at", { withTimezone: true }),
    /** ID of the key that replaced this one (rotation chain traceability). */
    rotatedToKeyId: uuid("rotated_to_key_id"),
    ...timestamps(),
  },
  (table) => [
    index("api_keys_org_idx").on(table.organizationId),
    uniqueIndex("api_keys_hash_uidx").on(table.keyHash),
  ],
);

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    assessmentId: uuid("assessment_id"),
    actorId: uuid("actor_id"),
    eventType: text("event_type").notNull(),
    severity: text("severity").notNull(),
    outcome: text("outcome").notNull(),
    source: text("source").notNull(),
    resourceType: text("resource_type"),
    resourceId: text("resource_id"),
    messageSafe: text("message_safe").notNull(),
    traceId: text("trace_id").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadataSafe: jsonb("metadata_safe")
      .$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("security_events_org_idx").on(table.organizationId),
    index("security_events_type_idx").on(table.eventType),
    index("security_events_severity_idx").on(table.severity),
    index("security_events_trace_idx").on(table.traceId),
    index("security_events_created_idx").on(table.createdAt),
  ],
);
