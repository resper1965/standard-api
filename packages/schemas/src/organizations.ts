import { z } from "zod";
import { UuidSchema } from "./common";

export const CreateOrganizationRequestSchema = z.object({
  tenant_id: UuidSchema,
  slug: z.string().min(2),
  name: z.string().min(1)
});

export const OrganizationResponseSchema = z.object({
  organization_id: UuidSchema,
  tenant_id: UuidSchema,
  slug: z.string(),
  name: z.string(),
  status: z.string()
});

export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationRequestSchema>;
export type OrganizationResponse = z.infer<typeof OrganizationResponseSchema>;
