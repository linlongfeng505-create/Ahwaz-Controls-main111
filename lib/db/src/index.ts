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
      image_data TEXT,
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

  // Add new image columns to existing products tables (idempotent)
  for (const col of [
    "ALTER TABLE products ADD COLUMN image_data TEXT",
    "ALTER TABLE products ADD COLUMN image_content_type TEXT",
  ]) {
    try {
      await client.execute(col);
    } catch {
      // Column already exists — ignore
    }
  }
}

export * from "./schema";
