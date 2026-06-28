import { defineConfig } from "drizzle-kit";
import path from "path";

// __dirname is lib/db/, so ../../data resolves to the project root's data/
const DB_PATH = process.env.SQLITE_PATH ?? path.join(__dirname, "../../data/ahwaz.db");

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "turso",
  dbCredentials: {
    url: `file:${DB_PATH}`,
  },
});
