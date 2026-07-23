import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const siteVisitsTable = sqliteTable("site_visits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ip: text("ip").notNull(),
  userAgent: text("user_agent").notNull(),
  isBot: integer("is_bot").notNull().default(0),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),

});

export type SiteVisit = typeof siteVisitsTable.$inferSelect;
export type NewSiteVisit = typeof siteVisitsTable.$inferInsert;
