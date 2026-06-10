/**
 * @module organization-schema
 * @description Organization e API Keys — auth Neon branch (control plane).
 *
 * Organization é a entidade de tenancy — 1 user : 1 organization.
 * Não existe memberships nem roles — modelo simplificado para SaaS single-user-per-org.
 *
 * API Keys persistidas aqui; a verificação usa KV cache (STANDARD_CACHE) como fast path.
 * Todo o produto (assessments, SCF, findings) referencia organization_id como UUID simples
 * — sem FK cross-database. A validação é feita no auth middleware.
 */
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { baUser } from "./auth-schema";

// ── Organization ──────────────────────────────────────────────────────────────

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(), // URL-safe, único
    // FK directa para o owner (baUser) — relação 1:1
    userId: text("user_id")
      .notNull()
      .references(() => baUser.id, { onDelete: "restrict" }),
    plan: text("plan").default("trial").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("orgs_user_idx").on(t.userId),
    index("orgs_slug_idx").on(t.slug),
  ],
);

// ── API Keys ──────────────────────────────────────────────────────────────────

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(), // SHA-256 do raw key — único
    maskedKey: text("masked_key").notNull(), // sk_live_xxxx...xxxx
    // M2M permission scopes — ex: ["assessment:read", "tpra:read"]
    scopes: text("scopes").array().default([]).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    // Soft-delete: preenchido quando revogada. Null = activa.
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    // Revogação agendada (rotação). Null = sem revogação pendente.
    scheduledRevokeAt: timestamp("scheduled_revoke_at", { withTimezone: true }),
    // Rastreabilidade de rotação — aponta para a chave que substituiu esta.
    rotatedToKeyId: uuid("rotated_to_key_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("api_keys_org_idx").on(t.organizationId),
    index("api_keys_hash_idx").on(t.keyHash),
  ],
);
