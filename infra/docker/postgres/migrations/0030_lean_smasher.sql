ALTER TABLE "api_keys" ADD COLUMN "scheduled_revoke_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "rotated_to_key_id" uuid;--> statement-breakpoint
ALTER TABLE "session" ADD COLUMN "active_organization_id" text;