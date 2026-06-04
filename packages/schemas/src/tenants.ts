import { z } from "zod";
import { UuidSchema } from "./common";

export const CreateTenantRequestSchema = z.object({
  slug: z.string().min(2),
  name: z.string().min(1)
});

export const UpdateTenantRequestSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.string().min(1).optional()
});

export const TenantResponseSchema = z.object({
  organization_id: UuidSchema,
  slug: z.string(),
  name: z.string(),
  status: z.string()
});

export type CreateTenantRequest = z.infer<typeof CreateTenantRequestSchema>;
export type UpdateTenantRequest = z.infer<typeof UpdateTenantRequestSchema>;
export type TenantResponse = z.infer<typeof TenantResponseSchema>;
