import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, articlesTable, settingsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";

const router = Router();

/** 获取站点 base URL：优先用环境变量，其次用请求头推断 */
function getSiteUrl(req: import("express").Request): string {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] ?? req.protocol ?? "https";
  const host = req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost";
  return `${proto}://${host}`;
}

/** 转义 XML 特殊字符 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** 格式化日期为 W3C Datetime（YYYY-MM-DD） */
function toW3CDate(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * GET /sitemap.xml
 * 动态生成包含静态页面、所有产品、所有已发布文章的 sitemap。
 * 搜索引擎（Google、百度等）通过 robots.txt 发现此文件。
 */
router.get("/sitemap.xml", async (req, res) => {
  try {
    const base = getSiteUrl(req);

    // 静态页面
    const staticPages = [
      { loc: "/",            changefreq: "weekly",  priority: "1.0" },
      { loc: "/products",   changefreq: "weekly",  priority: "0.9" },
      { loc: "/brands",     changefreq: "monthly", priority: "0.7" },
      { loc: "/industries", changefreq: "monthly", priority: "0.7" },
      { loc: "/articles",   changefreq: "weekly",  priority: "0.8" },
      { loc: "/about",      changefreq: "monthly", priority: "0.6" },
      { loc: "/contact",    changefreq: "monthly", priority: "0.6" },
    ];

    // 动态：所有产品
    const products = await db
      .select({ id: productsTable.id, updatedAt: productsTable.updatedAt })
      .from(productsTable)
      .orderBy(asc(productsTable.id));

    // 动态：已发布文章
    const articles = await db
      .select({ slug: articlesTable.slug, updatedAt: articlesTable.updatedAt })
      .from(articlesTable)
      .where(eq(articlesTable.published, true))
      .orderBy(asc(articlesTable.id));

    const urls: string[] = [];

    // 静态页
    for (const page of staticPages) {
      urls.push(`
  <url>
    <loc>${base}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`);
    }

    // 产品页
    for (const p of products) {
      urls.push(`
  <url>
    <loc>${base}/products/${p.id}</loc>
    <lastmod>${toW3CDate(p.updatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
    }

    // 文章页
    for (const a of articles) {
      urls.push(`
  <url>
    <loc>${base}/articles/${escapeXml(a.slug)}</loc>
    <lastmod>${toW3CDate(a.updatedAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`);
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=3600"); // 缓存 1 小时
    res.send(xml);
  } catch (err) {
    req.log.error(err);
    res.status(500).send("<?xml version=\"1.0\"?><error>Internal server error</error>");
  }
});

/**
 * GET /robots.txt
 * 告诉搜索引擎：
 *  - 禁止抓取 /admin、/api（隐私+节省爬取配额）
 *  - 声明 sitemap 地址
 */
router.get("/robots.txt", (req, res) => {
  const base = getSiteUrl(req);
  const content = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin",
    "Disallow: /api/",
    "",
    `Sitemap: ${base}/sitemap.xml`,
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400"); // 缓存 1 天
  res.send(content);
});

export default router;
