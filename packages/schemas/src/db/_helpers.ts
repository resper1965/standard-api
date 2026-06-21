import { jsonb, timestamp } from "drizzle-orm/pg-core";

export const auditMetadata = () =>
  jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull();
export const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
