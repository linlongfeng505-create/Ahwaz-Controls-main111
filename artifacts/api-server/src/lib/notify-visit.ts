import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

// ── IP Geolocation via ip-api.com ────────────────────────────────────────────
interface GeoResult {
  country: string;
  countryCode: string;
  city: string;
  regionName: string;
  isp: string;
  proxy: boolean;   // true if VPN / proxy / hosting
  hosting: boolean;  // true if datacenter IP
  query: string;     // the IP queried
}

const GEO_CACHE = new Map<string, { data: GeoResult; ts: number }>();
const GEO_CACHE_TTL = 3600_000; // 1 hour

export async function lookupGeoByIp(ip: string): Promise<GeoResult | null> {
  // Normalize: strip port, take first IP from x-forwarded-for
  const cleanIp = ip.split(",")[0].trim().replace(/:\d+$/, "");

  // Skip private / localhost IPs
  if (/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|localhost)/i.test(cleanIp)) {
    return null;
  }

  // Check cache
  const cached = GEO_CACHE.get(cleanIp);
  if (cached && Date.now() - cached.ts < GEO_CACHE_TTL) {
    return cached.data;
  }

  try {
    // ip-api.com free tier: fields param to get proxy/hosting flags
    const res = await fetch(
      `http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode,regionName,city,isp,proxy,hosting,query`,
      { signal: AbortSignal.timeout(5000) }
    );
    const json = await res.json();
    if (json.status !== "success") {
      logger.warn({ ip: cleanIp, apiResponse: json }, "ip-api lookup failed");
      return null;
    }
    const result: GeoResult = {
      country: json.country,
      countryCode: json.countryCode,
      city: json.city,
      regionName: json.regionName,
      isp: json.isp,
      proxy: json.proxy ?? false,
      hosting: json.hosting ?? false,
      query: json.query,
    };
    GEO_CACHE.set(cleanIp, { data: result, ts: Date.now() });
    return result;
  } catch (e: any) {
    logger.warn({ err: e.message, ip: cleanIp }, "ip-api lookup error");
    return null;
  }
}

// ── Country code to flag emoji ───────────────────────────────────────────────
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return "🌍";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}

// ── Device type detection ────────────────────────────────────────────────────
function detectDevice(ua: string, isMobileHint?: boolean): { icon: string; label: string } {
  if (isMobileHint || /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(ua)) {
    if (/iPad|Tablet/i.test(ua)) return { icon: "📱", label: "平板 (Tablet)" };
    return { icon: "📱", label: "手机 (Mobile)" };
  }
  return { icon: "💻", label: "电脑 (Desktop)" };
}

// ── Format Beijing time ──────────────────────────────────────────────────────
function formatBeijingTime(date: Date): string {
  return date.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// ── Parse browser/OS from UA ─────────────────────────────────────────────────
function parseBrowserOS(ua: string): string {
  let browser = "Unknown";
  let os = "Unknown";

  // OS detection
  if (/Windows NT/i.test(ua)) os = "Windows";
  else if (/Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";
  else if (/CrOS/i.test(ua)) os = "ChromeOS";

  // Browser detection
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";

  return `${browser} / ${os}`;
}

// ── Send WeCom notification for a real customer visit ────────────────────────
export interface VisitInfo {
  ip: string;
  userAgent: string;
  page?: string;
  referrer?: string;
  isMobile?: boolean;
  language?: string;
  timezone?: string;
  screenWidth?: number;
  screenHeight?: number;
}

export async function notifyRealVisit(webhookUrl: string, info: VisitInfo): Promise<void> {
  const now = new Date();
  const geo = await lookupGeoByIp(info.ip);
  const device = detectDevice(info.userAgent, info.isMobile);
  const browserOS = parseBrowserOS(info.userAgent);

  const geoLine = geo
    ? `**国家：** ${countryFlag(geo.countryCode)} ${geo.country}, ${geo.city || geo.regionName}\n`
    : "**国家：** 🌍 未知\n";

  const ispLine = geo ? `**ISP：** ${geo.isp}\n` : "";

  const proxyLine = geo
    ? `**VPN/代理：** ${geo.proxy || geo.hosting ? "⚠️ 是 (可能是代理/VPN/数据中心)" : "✅ 否"}\n`
    : "";

  const refLine = info.referrer
    ? `**来源：** ${info.referrer.length > 120 ? info.referrer.slice(0, 120) + "…" : info.referrer}\n`
    : "";

  const content =
    `## 🌐 新客户访问\n` +
    `**时间：** ${formatBeijingTime(now)}\n` +
    `**设备：** ${device.icon} ${device.label} (${browserOS})\n` +
    geoLine +
    ispLine +
    proxyLine +
    `**页面：** ${info.page || "/"}\n` +
    refLine +
    (info.language ? `**语言：** ${info.language}\n` : "") +
    (info.timezone ? `**时区：** ${info.timezone}\n` : "") +
    (info.screenWidth ? `**屏幕：** ${info.screenWidth}×${info.screenHeight}\n` : "") +
    `**IP：** ${info.ip}`;

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msgtype: "markdown", markdown: { content } }),
  });
}

// ── Send WeCom notification for a Google crawler visit ───────────────────────
export interface CrawlerInfo {
  ip: string;
  userAgent: string;
  page: string;
}

export async function notifyGoogleCrawler(webhookUrl: string, info: CrawlerInfo): Promise<void> {
  const now = new Date();
  const geo = await lookupGeoByIp(info.ip);

  // Extract crawler type from UA
  const crawlerMatch = info.userAgent.match(/(Googlebot[^\s;)]*|Google-Extended|GoogleOther|Storebot-Google|Google-InspectionTool)/i);
  const crawlerType = crawlerMatch ? crawlerMatch[1] : "Googlebot";

  const geoLine = geo
    ? `**来源地：** ${countryFlag(geo.countryCode)} ${geo.country}, ${geo.city || geo.regionName}\n`
    : "";

  const content =
    `## 🤖 Google 爬虫访问\n` +
    `**时间：** ${formatBeijingTime(now)}\n` +
    `**页面：** ${info.page}\n` +
    `**爬虫类型：** ${crawlerType}\n` +
    geoLine +
    `**IP：** ${info.ip}`;

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msgtype: "markdown", markdown: { content } }),
  });
}

// ── Helper: get webhook URL from settings ────────────────────────────────────
let cachedWebhook: { url: string; ts: number } | null = null;
const WEBHOOK_CACHE_TTL = 60_000; // 1 minute

export async function getWecomWebhookUrl(): Promise<string | null> {
  if (cachedWebhook && Date.now() - cachedWebhook.ts < WEBHOOK_CACHE_TTL) {
    return cachedWebhook.url || null;
  }
  try {
    const [setting] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "wecom_webhook"));
    const url = setting?.value?.trim() || "";
    cachedWebhook = { url, ts: Date.now() };
    return url && url.startsWith("https://") ? url : null;
  } catch {
    return null;
  }
}
