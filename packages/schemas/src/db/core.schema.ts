import {
  index,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./_helpers";

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    status: text("status").default("active").notNull(),
    billingTier: text("billing_tier").default("free").notNull(),
    userId: text("user_id").notNull(),
    ...timestamps(),
  },
  (table) => [
    uniqueIndex("organizations_slug_uidx").on(table.slug),
    index("organizations_user_idx").on(table.userId),
  ],
);
