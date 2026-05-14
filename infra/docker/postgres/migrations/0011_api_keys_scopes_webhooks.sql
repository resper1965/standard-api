-- Add scopes column to api_keys table
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "scopes" jsonb NOT NULL DEFAULT '[]';

-- Create webhook endpoint delivery status enum
DO $$ BEGIN
  CREATE TYPE "public"."webhook_delivery_status" AS ENUM('pending', 'delivered', 'failed', 'retrying');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create webhook_endpoints table
CREATE TABLE IF NOT EXISTS "webhook_endpoints" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id"),
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "url" text NOT NULL,
  "events" jsonb NOT NULL DEFAULT '[]',
  "description" text,
  "enabled" boolean NOT NULL DEFAULT true,
  "signing_secret_hash" text NOT NULL,
  "signing_secret_masked" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "webhook_endpoints_tenant_org_idx" ON "webhook_endpoints" USING btree ("tenant_id", "organization_id");
CREATE INDEX IF NOT EXISTS "webhook_endpoints_tenant_idx" ON "webhook_endpoints" USING btree ("tenant_id");

-- Create webhook_deliveries table
CREATE TABLE IF NOT EXISTS "webhook_deliveries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "endpoint_id" uuid NOT NULL REFERENCES "webhook_endpoints"("id"),
  "event_id" text NOT NULL,
  "event_type" text NOT NULL,
  "status" "public"."webhook_delivery_status" NOT NULL DEFAULT 'pending',
  "http_status" integer,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "max_attempts" integer NOT NULL DEFAULT 3,
  "last_attempted_at" timestamp with time zone,
  "next_retry_at" timestamp with time zone,
  "response_body" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "webhook_deliveries_endpoint_idx" ON "webhook_deliveries" USING btree ("endpoint_id");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_event_id_idx" ON "webhook_deliveries" USING btree ("event_id");
CREATE INDEX IF NOT EXISTS "webhook_deliveries_status_idx" ON "webhook_deliveries" USING btree ("status");
