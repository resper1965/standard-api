import { z } from "zod";
import { sql, ilike, or, desc } from "drizzle-orm";
import { organizations } from "@standard/schemas";
import { ApiError } from "../errors/api-error";
import type { RouteDefinition, RequestContext } from "../http";
import { json } from "../http";
import { requirePlatformAdmin } from "../middleware/rbac.middleware";
import { sanitizeLikeInput } from "@standard/security";
import type { DbClient } from "../adapters/db";

const getDb = (context: RequestContext): DbClient => {
  const db = context.deps._db;
  if (!db) {
    throw new ApiError(
      "INTERNAL_ERROR",
      "Database client not available for admin operations.",
      500,
    );
  }
  return db as DbClient;
};

const ListOrgsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().optional(),
});

export const adminOrgsRoutes: RouteDefinition[] = [
  {
    method: "GET",
    path: "/api/v1/admin/organizations",
    protected: true,
    permissions: ["admin:read"],
    requireActor: true,
    tenantRequired: false,
    handler: async (context) => {
      await requirePlatformAdmin(context);

      const db = getDb(context);
      const url = new URL(context.request.url);
      const query = ListOrgsQuerySchema.parse({
        limit: url.searchParams.has("limit")
          ? Math.min(Number(url.searchParams.get("limit")), 100)
          : undefined,
        offset: url.searchParams.get("offset") ?? undefined,
        search: url.searchParams.get("search") ?? undefined,
      });

      const conditions = query.search
        ? or(
            ilike(organizations.name, `%${sanitizeLikeInput(query.search)}%`),
            ilike(organizations.slug, `%${sanitizeLikeInput(query.search)}%`),
          )
        : undefined;

      const [orgsList, countResult] = await Promise.all([
        db
          .select()
          .from(organizations)
          .where(conditions)
          .orderBy(desc(organizations.createdAt))
          .limit(query.limit)
          .offset(query.offset),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(organizations)
          .where(conditions),
      ]);

      return json({
        data: orgsList,
        total: countResult[0]?.count ?? 0,
        limit: query.limit,
        offset: query.offset,
        trace_id: context.traceId,
      });
    },
  },
];
