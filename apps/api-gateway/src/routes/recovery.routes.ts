import { z } from "zod";
import { json, parseJson } from "../http";
import type { RouteDefinition } from "../http";
import { ApiError } from "../errors/api-error";
import { hashPassword } from "@better-auth/utils/password";
import { sql } from "drizzle-orm";
import { createDb } from "../adapters/db";

const RecoveryBodySchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(12),
  recoverySecret: z.string(),
});

export const recoveryRoutes: RouteDefinition[] = [
  {
    method: "POST",
    path: "/api/v1/admin/recovery/reset-password",
    protected: false, // This is unauthenticated, protected by a static secret
    tenantRequired: false,
    handler: async (context) => {
      const body = await parseJson(context.request, RecoveryBodySchema);
      
      const validSecret = context.env?.ADMIN_RECOVERY_SECRET?.trim();
      if (!validSecret || validSecret.length < 16) {
        throw new ApiError("NOT_IMPLEMENTED", "Recovery not configured on this environment", 501);
      }
      
      if (body.recoverySecret.trim() !== validSecret) {
        throw new ApiError("FORBIDDEN", "Invalid recovery secret", 403);
      }

      const auth = context.betterAuth;
      if (!auth) {
        throw new ApiError("INTERNAL_ERROR", "Auth instance not available", 500);
      }

      try {
        const authDbUrlRaw = (context.env as any).AUTH_DATABASE_URL || context.env?.DATABASE_URL;
        if (!authDbUrlRaw) {
           throw new ApiError("INTERNAL_ERROR", "Auth DB URL not available", 500);
        }
        
        // Strip ZERO-WIDTH SPACE (BOM) if it exists, which corrupts the URL!
        const authDbUrl = authDbUrlRaw.replace(/^\uFEFF/, '').trim();
        
        const authDb = (context.env as any).HYPERDRIVE_AUTH
          ? createDb(authDbUrl, (context.env as any).HYPERDRIVE_AUTH)
          : createDb(authDbUrl, undefined);

        // Find the user first
        const users = await authDb.execute(sql`SELECT * FROM public."user" WHERE email = ${body.email}`);
        if (!users.rows.length) {
          throw new ApiError("NOT_FOUND", "User not found", 404);
        }
        const user = users.rows[0];

        // Hash the password
        const hashed = await hashPassword(body.newPassword);

        // UPDATE
        await authDb.execute(
            sql`UPDATE public."account" SET password = ${hashed}, updated_at = NOW() WHERE user_id = ${(user as any).id}`
        );

        return json({ success: true, message: `Password reset for ${body.email}` });
      } catch (err: any) {
        console.error("[recovery] Reset failed:", err);
        throw new ApiError("INTERNAL_ERROR", "Error: " + String(err.stack || err.message || err), 500);
      }
    },
  },
];
