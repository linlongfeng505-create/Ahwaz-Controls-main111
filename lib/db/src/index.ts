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

export * from "./schema";
