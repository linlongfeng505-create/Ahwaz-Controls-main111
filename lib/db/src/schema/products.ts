import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  specs: text("specs", { mode: "json" }).$type<string[]>().notNull().default([]),
  imageObjectPath: text("image_object_path"),
  imageData: blob("image_data").$type<Buffer | null>(),        // raw binary BLOB
  imageContentType: text("image_content_type"), // e.g. "image/jpeg"
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$default(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
