import { z } from "zod";
import { json, parseJson } from "../http";
import type { RouteDefinition } from "../http";
import { ApiError } from "../errors/api-error";
import { hashPassword } from "@better-auth/utils/password";

import { sql } from "drizzle-orm";
import { createDisposableDb } from "../adapters/db";

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
        throw new ApiError(
          "NOT_IMPLEMENTED",
          "Recovery not configured on this environment",
          501,
        );
      }

      const secretBuffer = new TextEncoder().encode(body.recoverySecret.trim());
      const validBuffer = new TextEncoder().encode(validSecret);
      if (secretBuffer.byteLength !== validBuffer.byteLength) {
        throw new ApiError("FORBIDDEN", "Invalid recovery secret", 403);
      }
      // Constant-time XOR comparison to prevent timing attacks
      let diff = 0;
      for (let i = 0; i < secretBuffer.byteLength; i++) {
        diff |= secretBuffer[i]! ^ validBuffer[i]!;
      }
      if (diff !== 0) {
        throw new ApiError("FORBIDDEN", "Invalid recovery secret", 403);
      }

      const auth = context.betterAuth;
      if (!auth) {
        throw new ApiError(
          "INTERNAL_ERROR",
          "Auth instance not available",
          500,
        );
      }

      let closeAuthDb: (() => Promise<void>) | undefined;
      try {
        const authDbUrlRaw =
          (context.env as any).AUTH_DATABASE_URL || context.env?.DATABASE_URL;
        if (!authDbUrlRaw) {
          throw new ApiError(
            "INTERNAL_ERROR",
            "Auth DB URL not available",
            500,
          );
        }

        // Strip ZERO-WIDTH SPACE (BOM) if it exists, which corrupts the URL!
        const authDbUrl = authDbUrlRaw.replace(/^\uFEFF/, "").trim();

        // Disposable: a fresh Pool per request must be released, otherwise this
        // unauthenticated endpoint leaks a Neon connection on every call (M-07).
        const authDbHandle = (context.env as any).HYPERDRIVE_AUTH
          ? createDisposableDb(authDbUrl, (context.env as any).HYPERDRIVE_AUTH)
          : createDisposableDb(authDbUrl, undefined);
        closeAuthDb = authDbHandle.close;
        const authDb = authDbHandle.db;

        // Find the user first
        const users = await authDb.execute(
          sql`SELECT * FROM public."user" WHERE email = ${body.email}`,
        );
        if (!users.rows.length) {
          throw new ApiError("NOT_FOUND", "User not found", 404);
        }
        const user = users.rows[0];

        // Hash the password
        const hashed = await hashPassword(body.newPassword);

        // UPDATE
        await authDb.execute(
          sql`UPDATE public."account" SET password = ${hashed}, updated_at = NOW() WHERE user_id = ${(user as any).id}`,
        );

        return json({
          success: true,
          message: `Password reset for ${body.email}`,
        });
      } catch (err: unknown) {
        console.error(
          "[recovery] Reset failed:",
          err instanceof Error ? err.message : "unknown error",
        );
        throw new ApiError("INTERNAL_ERROR", "Password reset failed.", 500);
      } finally {
        await closeAuthDb?.();
      }
    },
  },
  {
    method: "POST",
    path: "/api/v1/admin/recovery/bootstrap-admin",
    protected: false,
    tenantRequired: false,
    handler: async (context) => {
      const body = await parseJson(
        context.request,
        z.object({
          email: z.string().email(),
          name: z.string().min(1),
          password: z.string().min(12),
          recoverySecret: z.string(),
        }),
      );

      const validSecret = context.env?.ADMIN_RECOVERY_SECRET?.trim();
      if (!validSecret || validSecret.length < 16) {
        throw new ApiError(
          "NOT_IMPLEMENTED",
          "Recovery not configured on this environment",
          501,
        );
      }

      const secretBuffer = new TextEncoder().encode(body.recoverySecret.trim());
      const validBuffer = new TextEncoder().encode(validSecret);
      if (secretBuffer.byteLength !== validBuffer.byteLength) {
        throw new ApiError("FORBIDDEN", "Invalid recovery secret", 403);
      }
      let diff = 0;
      for (let i = 0; i < secretBuffer.byteLength; i++) {
        diff |= secretBuffer[i]! ^ validBuffer[i]!;
      }
      if (diff !== 0) {
        throw new ApiError("FORBIDDEN", "Invalid recovery secret", 403);
      }

      let closeAuthDb: (() => Promise<void>) | undefined;
      try {
        const authDbUrlRaw =
          (context.env as any).AUTH_DATABASE_URL || context.env?.DATABASE_URL;
        if (!authDbUrlRaw) {
          throw new ApiError(
            "INTERNAL_ERROR",
            "Auth DB URL not available",
            500,
          );
        }
        const authDbUrl = authDbUrlRaw.replace(/^\uFEFF/, "").trim();
        // Disposable: a fresh Pool per request must be released, otherwise this
        // unauthenticated endpoint leaks a Neon connection on every call (M-07).
        const authDbHandle = (context.env as any).HYPERDRIVE_AUTH
          ? createDisposableDb(authDbUrl, (context.env as any).HYPERDRIVE_AUTH)
          : createDisposableDb(authDbUrl, undefined);
        closeAuthDb = authDbHandle.close;
        const authDb = authDbHandle.db;

        // Only works when no platform_admin exists yet
        const existingAdmins = await authDb.execute(
          sql`SELECT id FROM public."user" WHERE platform_admin = true LIMIT 1`,
        );
        if (existingAdmins.rows.length > 0) {
          throw new ApiError(
            "FORBIDDEN",
            "Bootstrap already done — a platform admin already exists",
            403,
          );
        }

        const existingUsers = await authDb.execute(
          sql`SELECT id FROM public."user" WHERE email = ${body.email} LIMIT 1`,
        );

        const hashed = await hashPassword(body.password);
        const now = new Date().toISOString();

        let userId: string;
        if (existingUsers.rows.length > 0) {
          const existing = existingUsers.rows[0] as { id: string };
          userId = existing.id;
          await authDb.execute(
            sql`UPDATE public."user" SET name = ${body.name}, email_verified = true, platform_admin = true, updated_at = ${now} WHERE id = ${userId}`,
          );
          await authDb.execute(
            sql`UPDATE public."account" SET password = ${hashed}, updated_at = ${now} WHERE user_id = ${userId}`,
          );
        } else {
          userId = crypto.randomUUID();
          await authDb.execute(
            sql`INSERT INTO public."user" (id, name, email, email_verified, platform_admin, created_at, updated_at)
                VALUES (${userId}, ${body.name}, ${body.email}, true, true, ${now}, ${now})`,
          );
          await authDb.execute(
            sql`INSERT INTO public."account" (id, user_id, provider_id, account_id, password, created_at, updated_at)
                VALUES (${crypto.randomUUID()}, ${userId}, 'credential', ${body.email}, ${hashed}, ${now}, ${now})`,
          );
        }

        return json({
          success: true,
          message: `Bootstrap complete — ${body.email} is now platform_admin`,
          user_id: userId,
        });
      } catch (err: unknown) {
        if (err instanceof ApiError) throw err;
        console.error(
          "[recovery] Bootstrap failed:",
          err instanceof Error ? err.message : "unknown error",
        );
        throw new ApiError("INTERNAL_ERROR", "Bootstrap failed", 500);
      } finally {
        await closeAuthDb?.();
      }
    },
  },
];
