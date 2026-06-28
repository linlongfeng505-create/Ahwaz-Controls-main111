import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const settingsTable = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().$default(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
});

export type Setting = typeof settingsTable.$inferSelect;
