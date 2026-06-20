/**
 * @module auth-schema
 * @description Better Auth core tables â€” auth Neon branch (control plane).
 *
 * Geridas pelo Better Auth runtime. NÃ£o alterar estrutura sem migration BA.
 * Este ficheiro Ã© a Ãºnica fonte de verdade para as tabelas de autenticaÃ§Ã£o.
 *
 * Campos adicionados ao baUser alÃ©m do core BA:
 * - platform_admin : flag Bekaa operator (cross-tenant). SÃ³ via SQL por operadores.
 * - approved       : gate de aprovaÃ§Ã£o manual por platform admin antes do primeiro acesso.
 */
import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

// â”€â”€ Better Auth core â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const baUser = pgTable("user", {
  id: text("id").primaryKey(), // UUID gerado pelo BA
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Standard-specific
  role: text("role").default("organization_admin"),
  platformAdmin: boolean("platform_admin").notNull().default(false), // Bekaa operator
  approved: boolean("approved").notNull().default(false), // approval gate
  jobTitle: text("job_title"),
  phone: text("phone"),
});

export const baSession = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => baUser.id, { onDelete: "cascade" }),
    // Org activa â€” actualizada via POST /v1/auth/activate-org
    // Cached em KV (STANDARD_CACHE) com TTL 60s para evitar DB query por request
    activeOrganizationId: text("active_organization_id"),
  },
  (t) => [
    index("ba_session_user_idx").on(t.userId),
    index("ba_session_token_idx").on(t.token),
  ],
);

export const baAccount = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => baUser.id, { onDelete: "cascade" }),
    password: text("password"), // scrypt hash
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("ba_account_user_idx").on(t.userId)],
);

export const baVerification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

