// @ts-nocheck -- Zod v4 CI type compat
import { z } from "zod";
import { UuidSchema } from "./common";

export const CreateOrganizationRequestSchema = z.strictObject({
  organization_id: UuidSchema,
  slug: z.string().min(2),
  name: z.string().min(1),
  user_id: z.string()
});

export const OrganizationResponseSchema = z.object({
  organization_id: UuidSchema,
  slug: z.string(),
  name: z.string(),
  status: z.string(),
  billing_tier: z.string(),
  user_id: z.string()
});

export type CreateOrganizationRequest = z.infer<typeof CreateOrganizationRequestSchema>;
export type OrganizationResponse = z.infer<typeof OrganizationResponseSchema>;

