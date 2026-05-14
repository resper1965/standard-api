CREATE TABLE "agent_usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"agent_run_id" uuid NOT NULL,
	"model_provider" text NOT NULL,
	"model_name" text NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"embedding_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost" numeric(18, 8),
	"currency" text DEFAULT 'USD' NOT NULL,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"organization_id" uuid,
	"assessment_id" uuid,
	"metric_name" text NOT NULL,
	"metric_type" text NOT NULL,
	"metric_value" numeric(18, 6) NOT NULL,
	"unit" text NOT NULL,
	"dimensions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"trace_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"organization_id" uuid,
	"assessment_id" uuid,
	"actor_id" uuid,
	"event_type" text NOT NULL,
	"severity" text NOT NULL,
	"outcome" text NOT NULL,
	"source" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"message_safe" text NOT NULL,
	"trace_id" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"metadata_safe" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"organization_id" uuid,
	"assessment_id" uuid,
	"service_name" text NOT NULL,
	"operation_name" text NOT NULL,
	"usage_quantity" numeric(18, 6) NOT NULL,
	"usage_unit" text NOT NULL,
	"provider" text,
	"model_name" text,
	"resource_id" text,
	"cost_amount" numeric(18, 8),
	"cost_currency" text DEFAULT 'USD',
	"currency" text DEFAULT 'USD' NOT NULL,
	"trace_id" text NOT NULL,
	"metadata_safe" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_usage_records" ADD CONSTRAINT "agent_usage_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_usage_records" ADD CONSTRAINT "agent_usage_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_usage_records" ADD CONSTRAINT "agent_usage_records_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_usage_records" ADD CONSTRAINT "agent_usage_records_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_metrics" ADD CONSTRAINT "operational_metrics_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_metrics" ADD CONSTRAINT "operational_metrics_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_metrics" ADD CONSTRAINT "operational_metrics_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_events" ADD CONSTRAINT "security_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_usage_records_tenant_idx" ON "agent_usage_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "agent_usage_records_assessment_idx" ON "agent_usage_records" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "agent_usage_records_agent_run_idx" ON "agent_usage_records" USING btree ("agent_run_id");--> statement-breakpoint
CREATE INDEX "agent_usage_records_trace_idx" ON "agent_usage_records" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "agent_usage_records_created_idx" ON "agent_usage_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "operational_metrics_tenant_idx" ON "operational_metrics" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "operational_metrics_name_idx" ON "operational_metrics" USING btree ("metric_name");--> statement-breakpoint
CREATE INDEX "operational_metrics_trace_idx" ON "operational_metrics" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "operational_metrics_created_idx" ON "operational_metrics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "security_events_tenant_idx" ON "security_events" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "security_events_type_idx" ON "security_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "security_events_severity_idx" ON "security_events" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "security_events_trace_idx" ON "security_events" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "security_events_created_idx" ON "security_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "usage_records_tenant_idx" ON "usage_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "usage_records_service_idx" ON "usage_records" USING btree ("service_name");--> statement-breakpoint
CREATE INDEX "usage_records_trace_idx" ON "usage_records" USING btree ("trace_id");--> statement-breakpoint
CREATE INDEX "usage_records_created_idx" ON "usage_records" USING btree ("created_at");