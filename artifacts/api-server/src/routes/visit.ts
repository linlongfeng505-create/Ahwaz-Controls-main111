import { Router } from "express";
import { logger } from "../lib/logger";
import {
  notifyRealVisit,
  getWecomWebhookUrl,
  type VisitInfo,
} from "../lib/notify-visit";

const router = Router();

// Regex for Google bots
const GOOGLE_BOT_REGEX = /Googlebot|Google-Extended|GoogleOther|Storebot-Google|Google-InspectionTool/i;
// Regex for other common bots
const OTHER_BOT_REGEX = /crawl|spider|slurp|search|Mediapartners|Yandex|Baidu|Bing|DuckDuckGo|bot\b|HeadlessChrome|PhantomJS|Lighthouse|PageSpeed|GTmetrix/i;

router.post("/visit", async (req, res) => {
  try {
    const userAgent = req.headers["user-agent"] || "";
    const forwarded = req.headers["x-forwarded-for"];
    const ip = typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : Array.isArray(forwarded)
        ? forwarded[0]
        : req.socket.remoteAddress || "unknown";

    // ── Google bots won't trigger frontend JS, but just in case ──
    if (GOOGLE_BOT_REGEX.test(userAgent)) {
      // Ignore here — Google crawler notifications are handled in app.ts SPA fallback
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    // ── Ignore all non-Google bots ───────────────────────────────
    if (OTHER_BOT_REGEX.test(userAgent)) {
      res.status(200).json({ ok: true, ignored: true });
      return;
    }

    // ── Real customer: respond immediately, then notify async ────
    res.status(200).json({ ok: true });

    // Fire-and-forget notification
    (async () => {
      try {
        const webhookUrl = await getWecomWebhookUrl();
        if (!webhookUrl) return;

        const body = req.body || {};
        const visitInfo: VisitInfo = {
          ip,
          userAgent,
          page: body.page || "/",
          referrer: body.referrer || "",
          isMobile: body.isMobile ?? undefined,
          language: body.language || "",
          timezone: body.timezone || "",
          screenWidth: body.screenWidth || 0,
          screenHeight: body.screenHeight || 0,
        };

        await notifyRealVisit(webhookUrl, visitInfo);
      } catch (e) {
        logger.warn({ err: e }, "Failed to send visit notification");
      }
    })();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
