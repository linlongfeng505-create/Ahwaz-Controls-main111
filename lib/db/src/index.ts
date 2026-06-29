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

const client = createClient({ url: DB_URL });

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

  // Add missing columns to existing DBs (idempotent — errors on duplicate column are ignored)
  const alterCols = [
    "ALTER TABLE products ADD COLUMN image_data BLOB",
    "ALTER TABLE products ADD COLUMN image_content_type TEXT",
  ];
  for (const sql of alterCols) {
    try { await client.execute(sql); } catch { /* already exists */ }
  }

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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Lazy migration: if any row still has a TEXT base64 string in image_data (from old schema),
  // convert it to a proper BLOB binary in-place.
  // SQLite stores BLOB vs TEXT differently, but libsql returns BLOB columns as Uint8Array.
  // Old TEXT rows: SQLite type affinity means we can detect them by attempting a cast.
  // Simplest safe approach: read rows where image_data IS NOT NULL, check if it looks like
  // a base64 string (Uint8Array from BLOB would not match), and rewrite.
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
          args: [buf, row["id"] as number],
        });
      }
    }
  } catch {
    // Non-critical — migration will retry next startup
  }
}

export * from "./schema";
