import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// In the bundled dist file, __dirname is artifacts/api-server/dist/
// Go 3 levels up → workspace root, then into data/
// In dev/ts mode, __dirname would be lib/db/src/ — go 3 up → workspace root as well
const _dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

// Walk up until we find the workspace root (contains pnpm-workspace.yaml)
function findWorkspaceRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback: go 3 levels up from wherever we are
  return path.resolve(start, "../../..");
}

const WORKSPACE_ROOT = findWorkspaceRoot(_dirname);
const DB_DIR = path.join(WORKSPACE_ROOT, "data");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = process.env.SQLITE_PATH ?? path.join(DB_DIR, "ahwaz.db");
const DB_URL = `file:${DB_PATH}`;

export const client = createClient({ url: DB_URL });
export { DB_PATH };

export const db = drizzle(client, { schema });

/**
 * Initialize the database: create tables and add any missing columns.
 * Safe to call on every startup — uses IF NOT EXISTS and ignores duplicate-column errors.
 */
export async function initDb(): Promise<void> {
  // WAL mode: better concurrent read/write performance
  await client.execute("PRAGMA journal_mode=WAL");

  // Create tables
  await client.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      specs TEXT NOT NULL DEFAULT '[]',
      image_object_path TEXT,
      image_data BLOB,
      image_content_type TEXT,
      recommended_product_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      summary TEXT,
      content TEXT NOT NULL,
      cover_data BLOB,
      cover_content_type TEXT,
      published INTEGER NOT NULL DEFAULT 0,
      recommended_article_ids TEXT NOT NULL DEFAULT '[]',
      recommended_product_ids TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS site_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ip TEXT NOT NULL,
      user_agent TEXT NOT NULL,
      is_bot INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // ── product_images: multi-image gallery table ──────────────────────────────
  await client.execute(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      image_data BLOB,
      image_content_type TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
  `);

  // Add missing columns to existing DBs (idempotent — errors on duplicate column are ignored)
  const alterCols = [
    "ALTER TABLE products ADD COLUMN image_data BLOB",
    "ALTER TABLE products ADD COLUMN image_content_type TEXT",
    "ALTER TABLE site_visits ADD COLUMN is_bot INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE articles ADD COLUMN recommended_article_ids TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE articles ADD COLUMN recommended_product_ids TEXT NOT NULL DEFAULT '[]'",
    "ALTER TABLE products ADD COLUMN recommended_product_ids TEXT NOT NULL DEFAULT '[]'"
  ];
  for (const sql of alterCols) {
    try { await client.execute(sql); } catch { /* already exists */ }
  }

  // ── Migrate legacy single images from products.image_data → product_images ─
  // Only migrate rows that have image_data but have NO entry yet in product_images
  try {
    const rows = await client.execute(
      `SELECT p.id, p.image_data, p.image_content_type
       FROM products p
       WHERE p.image_data IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM product_images pi WHERE pi.product_id = p.id
         )`
    );
    for (const row of rows.rows) {
      let imgData = row["image_data"];
      // Handle legacy base64 TEXT storage
      if (typeof imgData === "string") {
        imgData = Buffer.from(imgData as string, "base64") as any;
      }
      if (imgData) {
        await client.execute({
          sql: `INSERT INTO product_images (product_id, image_data, image_content_type, sort_order)
                VALUES (?, ?, ?, 0)`,
          args: [row["id"] as number, imgData as any, row["image_content_type"] as string ?? "image/jpeg"],
        });
      }
    }
  } catch {
    // Non-critical — migration will retry next startup
  }
  // ──────────────────────────────────────────────────────────────────────────

  // Lazy migration: if any row still has a TEXT base64 string in image_data (from old schema),
  // convert it to a proper BLOB binary in-place.
  try {
    const rows = await client.execute(
      "SELECT id, image_data, image_content_type FROM products WHERE image_data IS NOT NULL"
    );
    for (const row of rows.rows) {
      const raw = row["image_data"];
      // If it's a string (old TEXT base64), convert to BLOB
      if (typeof raw === "string") {
        const buf = Buffer.from(raw, "base64");
        await client.execute({
          sql: "UPDATE products SET image_data = ? WHERE id = ?",
          args: [buf as any, row["id"] as number],
        });
      }
    }
  } catch {
    // Non-critical — migration will retry next startup
  }
}


export * from "./schema";
