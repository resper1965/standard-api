ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'member';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "platform_admin" boolean DEFAULT false NOT NULL;