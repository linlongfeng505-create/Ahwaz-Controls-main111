import { Router } from "express";
import fs from "fs";
import path from "path";
import { db, client, DB_PATH } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "./auth";

const router = Router();

const DEFAULT_SETTINGS: Record<string, string> = {
  company_name: "Flonexis",
  company_subtitle: "EHUADE Automation",
  email: "sales@flonexis.com",
  phone: "+86 131 9339 8860",
  whatsapp: "8613193398860", // only digits for WhatsApp API link
  address: "China",
  copyright: "Flonexis. All rights reserved.",
  product_categories: "",
  wecom_webhook: "", // 企业微信机器人 webhook
  enable_visitor_report: "true", // 是否开启访客日报推送
  site_description: "", // <meta name="description"> — 搜索结果摘要，建议 120-160 字符
  og_image: "",         // Open Graph 图片 URL — 微信/社媒分享卡片封面图
  home_description: "Supplying top-tier industrial control systems and precision instruments worldwide. Fast sourcing, competitive pricing, and expert technical support.",
  enabled_languages: "en,id,vi,ar",
};

router.get("/settings", async (req, res) => {
  try {
    const rows = await db.select().from(settingsTable);
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings", requireAdmin, async (req, res) => {
  try {
    const updates = req.body as Record<string, string>;
    for (const [key, value] of Object.entries(updates)) {
      if (typeof value !== "string") continue;
      await db
        .insert(settingsTable)
        .values({ key, value })
        .onConflictDoUpdate({ target: settingsTable.key, set: { value, updatedAt: new Date() } });
    }
    const rows = await db.select().from(settingsTable);
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      result[row.key] = row.value;
    }
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/admin/db-download ───────────────────────────────────────────────
// Force WAL checkpoint → merge all pending writes into main .db → send as download
router.get("/admin/db-download", requireAdmin, async (req, res) => {
  try {
    // 1. Force a full WAL checkpoint so ahwaz.db contains 100% of the data
    await client.execute("PRAGMA wal_checkpoint(TRUNCATE)");

    // 2. Read the main DB file from disk
    if (!fs.existsSync(DB_PATH)) {
      res.status(404).json({ error: "Database file not found" });
      return;
    }
    const fileBuffer = fs.readFileSync(DB_PATH);

    // 3. Build a date-stamped filename and stream it to the browser
    const dateStr = new Date().toISOString().slice(0, 10); // e.g. 2025-07-23
    const filename = `ahwaz-backup-${dateStr}.db`;
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", String(fileBuffer.length));
    res.setHeader("Cache-Control", "no-store");
    res.send(fileBuffer);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to export database" });
  }
});

// ── POST /api/admin/db-restore ───────────────────────────────────────────────
// Restore database from a uploaded file buffer
router.post("/admin/db-restore", requireAdmin, async (req, res) => {
  try {
    const { dbFileBase64 } = req.body;
    if (!dbFileBase64) {
      res.status(400).json({ error: "No database file provided" });
      return;
    }

    const buffer = Buffer.from(dbFileBase64, "base64");
    
    // 1. Force close the existing DB connections if possible, or just overwrite
    // SQLite might be locked, but in WAL mode, overwriting the main file while 
    // the server is running might cause corruption. The safest way is to clear 
    // WAL and overwrite.
    await client.execute("PRAGMA wal_checkpoint(TRUNCATE)");
    
    // Overwrite main DB file
    fs.writeFileSync(DB_PATH, buffer);
    
    // Clean up WAL and SHM files to prevent corruption with the new DB
    if (fs.existsSync(`${DB_PATH}-wal`)) fs.unlinkSync(`${DB_PATH}-wal`);
    if (fs.existsSync(`${DB_PATH}-shm`)) fs.unlinkSync(`${DB_PATH}-shm`);

    res.json({ success: true });
    
    // Optional: Restart the process if using PM2/Nodemon to ensure fresh DB connection
    setTimeout(() => {
      process.exit(0); // Let the process manager restart it
    }, 1000);

  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to restore database" });
  }
});

export default router;
