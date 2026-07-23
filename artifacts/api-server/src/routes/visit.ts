import { Router } from "express";
import { db } from "@workspace/db";
import { siteVisitsTable } from "@workspace/db";

const router = Router();

// Regex for Google bots
const GOOGLE_BOT_REGEX = /Googlebot|Google-Extended|GoogleOther|Storebot-Google|Google-InspectionTool/i;
// Regex for other common bots
const OTHER_BOT_REGEX = /crawl|spider|slurp|search|Mediapartners|Yandex|Baidu|Bing|DuckDuckGo/i;

router.post("/visit", async (req, res) => {
  try {
    const userAgent = req.headers["user-agent"] || "";
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";

    let isBot = 0;

    // Check if it's a bot
    if (GOOGLE_BOT_REGEX.test(userAgent)) {
      isBot = 1; // Record Google bots as bot
    } else if (OTHER_BOT_REGEX.test(userAgent)) {
      // Ignore non-Google bots
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    // Insert visit
    await db.insert(siteVisitsTable).values({
      ip: typeof ip === "string" ? ip : ip[0] || "unknown",
      userAgent: userAgent,
      isBot: isBot,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
