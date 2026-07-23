import { Router } from "express";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "flonexis-admin-2024";

const DEFAULT_SETTINGS: Record<string, string> = {
  email: "sales@flonexis.com",
  phone: "+86 134 0065 5796",
  whatsapp: "8613400655796",
  company_name: "Flonexis",
  company_subtitle: "Industrial Instrumentation",
  address: "China",
  copyright: "Flonexis. All rights reserved.",
  product_categories: JSON.stringify([
    "Pressure Transmitters",
    "Temperature Instruments",
    "Flow Meters",
    "Valve Positioners",
    "Safety / ESD Devices",
    "Actuators",
    "Field Communicators",
  ]),
  wecom_webhook: "",    // 企业微信群机器人 Webhook URL
  enable_visitor_report: "true", // 是否开启访客日报推送
  site_description: "", // <meta name="description"> — 搜索结果摘要，建议 120-160 字符
  og_image: "",         // Open Graph 图片 URL — 微信/社媒分享卡片封面图
  home_description: "Supplying top-tier industrial control systems and precision instruments worldwide. Fast sourcing, competitive pricing, and expert technical support.",
};

function requireAdmin(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  const auth = req.headers["x-admin-password"];
  if (auth !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

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

export default router;
