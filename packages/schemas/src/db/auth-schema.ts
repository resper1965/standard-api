/**
 * @module auth-schema
 * @description Standard Native Auth database tables for Drizzle ORM.
 *
 * Generated based on Standard Native Auth v1.2+ with plugins: admin, organization, apiKey.
 * These tables are managed by Standard Native Auth at runtime.
 *
 * NOTE: The `baApikey` table exported below is **deprecated and dead**.
 * All M2M API key operations use the domain `api_keys` table in schema.ts.
 * See ADR-008 for removal tracking.
 *
 * Reference: https://standard-native-auth.com/docs/concepts/database
 */
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ── Core Standard Native Auth Tables ───────────────────────────────────────────

export const baUser = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  // Admin plugin fields
  banned: boolean("banned").default(false),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
  // Platform-level admin flag — cross-tenant access.
  // Never set via public API. Only via SQL seed/migration by operators.
  platformAdmin: boolean("platform_admin").notNull().default(false),
  // Account approval gate — new users require platform admin activation before access.
  // Existing users (pre-migration) are marked approved=true by the migration.
  approved: boolean("approved").notNull().default(false),
  // Custom Standard fields
  jobTitle: text("job_title"),
  phone: text("phone"),
  metadata: text("metadata"), // Captured full raw JSON profiles
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
    // Organization context — tracks which org the user is currently operating in.
    // Updated via POST /api/v1/users/me/organizations/:orgId/activate.
    // Read by customSession plugin to enrich session with org context.
    activeOrganizationId: text("active_organization_id"),
    // Admin plugin
    impersonatedBy: text("impersonated_by"),
  },
  (table) => [
    index("ba_session_user_idx").on(table.userId),
    index("ba_session_token_idx").on(table.token),
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
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [index("ba_account_user_idx").on(table.userId)],
);

export const baVerification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
