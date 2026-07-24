import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const articlesTable = sqliteTable("articles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  summary: text("summary"),
  content: text("content").notNull(),
  coverData: blob("cover_data").$type<Buffer | null>(),          // raw binary BLOB
  coverContentType: text("cover_content_type"),                  // e.g. "image/jpeg"
  published: integer("published", { mode: "boolean" }).notNull().default(false),
  recommendedArticleIds: text("recommended_article_ids", { mode: "json" }).$type<number[]>().notNull().default([]),
  recommendedProductIds: text("recommended_product_ids", { mode: "json" }).$type<number[]>().notNull().default([]),
  translations: text("translations", { mode: "json" }).$type<Record<string, any>>().notNull().default({}),
  createdAt: text("created_at").notNull().$default(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$default(() => new Date().toISOString()).$onUpdate(() => new Date().toISOString()),
});

export const insertArticleSchema = createInsertSchema(articlesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articlesTable.$inferSelect;
