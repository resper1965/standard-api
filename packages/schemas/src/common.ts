import { z } from "zod";

export const UuidSchema = z.string().uuid();
export const TraceIdSchema = z.string().min(8);

export const SupportedLocaleSchema = z.enum(["pt-BR", "en"]).default("pt-BR");

export const TenantContextSchema = z.object({
  organizationId: UuidSchema,
});

export const ActorContextSchema = z.object({
  actorId: UuidSchema.optional(),
  systemActor: z.string().min(1).optional(),
});

export const ApiTraceContextSchema = z.object({
  traceId: TraceIdSchema,
});

export const PaginationParamsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().optional(),
  fields: z.string().optional(),
});

export const AuditMetadataSchema = z
  .record(z.string(), z.unknown())
  .default({});

export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    trace_id: TraceIdSchema,
  });

export type OrganizationContext = z.infer<typeof TenantContextSchema>;
export type ActorContext = z.infer<typeof ActorContextSchema>;
export type ApiTraceContext = z.infer<typeof ApiTraceContextSchema>;
export type PaginationParams = z.infer<typeof PaginationParamsSchema>;
export type AuditMetadata = z.infer<typeof AuditMetadataSchema>;
export type SupportedLocale = z.infer<typeof SupportedLocaleSchema>;
