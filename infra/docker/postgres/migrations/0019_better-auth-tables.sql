-- Better Auth tables migration
-- Adds user, session, account, verification, organization, member, invitation, apikey tables
-- These tables are managed by Better Auth at runtime

-- ── Core: user ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "email_verified" boolean NOT NULL DEFAULT false,
  "image" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  -- Admin plugin fields
  "role" text DEFAULT 'user',
  "banned" boolean DEFAULT false,
  "ban_reason" text,
  "ban_expires" timestamp
);

-- ── Core: session ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL UNIQUE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "ip_address" text,
  "user_agent" text,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  -- Admin plugin
  "impersonated_by" text,
  -- Organization plugin
  "active_organization_id" text
);

CREATE INDEX IF NOT EXISTS "ba_session_user_idx" ON "session" ("user_id");
CREATE INDEX IF NOT EXISTS "ba_session_token_idx" ON "session" ("token");

-- ── Core: account ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "account" (
  "id" text PRIMARY KEY NOT NULL,
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "access_token" text,
  "refresh_token" text,
  "id_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "password" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ba_account_user_idx" ON "account" ("user_id");

-- ── Core: verification ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

-- ── Organization Plugin: organization ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS "organization" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "slug" text UNIQUE,
  "logo" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "metadata" text
);

-- ── Organization Plugin: member ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "member" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "role" text NOT NULL DEFAULT 'member',
  "team_id" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ba_member_org_idx" ON "member" ("organization_id");
CREATE INDEX IF NOT EXISTS "ba_member_user_idx" ON "member" ("user_id");

-- ── Organization Plugin: invitation ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS "invitation" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
  "email" text NOT NULL,
  "role" text,
  "status" text NOT NULL DEFAULT 'pending',
  "expires_at" timestamp NOT NULL,
  "inviter_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ba_invitation_org_idx" ON "invitation" ("organization_id");

-- ── API Key Plugin: apikey ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "apikey" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text,
  "start" text,
  "prefix" text,
  "key" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "refill_interval" integer,
  "refill_amount" integer,
  "last_refill_at" timestamp,
  "enabled" boolean DEFAULT true,
  "rate_limit_enabled" boolean DEFAULT true,
  "rate_limit_time_window" integer,
  "rate_limit_max" integer,
  "request_count" integer DEFAULT 0,
  "remaining" integer,
  "last_request" timestamp,
  "expires_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "permissions" text,
  "metadata" text
);

CREATE INDEX IF NOT EXISTS "ba_apikey_user_idx" ON "apikey" ("user_id");
