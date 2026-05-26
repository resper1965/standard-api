DROP INDEX IF EXISTS "memberships_org_user_role_uidx";--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ALTER COLUMN "role_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "email" text;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "display_name" text;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "invited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "memberships" ADD COLUMN IF NOT EXISTS "accepted_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_org_user_idx" ON "memberships" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "memberships_org_email_idx" ON "memberships" USING btree ("organization_id","email");