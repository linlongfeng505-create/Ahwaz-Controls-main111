import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const submissionsTable = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  company: text("company").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  read: integer("read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
});

export type Submission = typeof submissionsTable.$inferSelect;
