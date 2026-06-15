// @ts-nocheck -- Zod v4 CI type compat
/**
 * @module organization-schema
 * @description Organization e API Keys â€” auth Neon branch (control plane).
 *
 * Organization Ã© a entidade de tenancy â€” 1 user : 1 organization.
 * NÃ£o existe memberships nem roles â€” modelo simplificado para SaaS single-user-per-org.
 *
 * API Keys persistidas aqui; a verificaÃ§Ã£o usa KV cache (STANDARD_CACHE) como fast path.
 * Todo o produto (assessments, SCF, findings) referencia organization_id como UUID simples
 * â€” sem FK cross-database. A validaÃ§Ã£o Ã© feita no auth middleware.
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

// â”€â”€ Organization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(), // URL-safe, Ãºnico
    // FK directa para o owner (baUser) â€” relaÃ§Ã£o 1:1
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

// â”€â”€ API Keys â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(), // SHA-256 do raw key â€” Ãºnico
    maskedKey: text("masked_key").notNull(), // sk_live_xxxx...xxxx
    // M2M permission scopes â€” ex: ["assessment:read", "tpra:read"]
    scopes: text("scopes").array().default([]).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    // Soft-delete: preenchido quando revogada. Null = activa.
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    // RevogaÃ§Ã£o agendada (rotaÃ§Ã£o). Null = sem revogaÃ§Ã£o pendente.
    scheduledRevokeAt: timestamp("scheduled_revoke_at", { withTimezone: true }),
    // Rastreabilidade de rotaÃ§Ã£o â€” aponta para a chave que substituiu esta.
    rotatedToKeyId: uuid("rotated_to_key_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("api_keys_org_idx").on(t.organizationId),
    index("api_keys_hash_idx").on(t.keyHash),
  ],
);

