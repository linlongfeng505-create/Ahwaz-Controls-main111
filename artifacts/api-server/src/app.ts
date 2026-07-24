import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { initDb, db, productsTable, articlesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const app: Express = express();
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ extended: true, limit: "100mb" }));

// Initialize DB (create tables + migrate columns) before handling requests
initDb()
  .then(() => logger.info("Database initialized"))
  .catch((err) => logger.error({ err }, "Database initialization failed"));

// API routes
app.use("/api", router);

// Serve frontend static files (built by ahwaz-website)
// In prod dist: artifacts/api-server/dist/index.mjs → ../../ahwaz-website/dist/public
const _dirname =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

const STATIC_DIR = path.resolve(_dirname, "../../ahwaz-website/dist/public");

if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR));

  let indexHtml = fs.readFileSync(path.join(STATIC_DIR, "index.html"), "utf8");

  // SPA fallback: all non-API routes serve index.html so frontend routing works
  // Supports dynamic SEO injection for /id/, /vi/, /ar/ routes
  app.get("*", async (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    
    try {
      let modifiedHtml = indexHtml;
      const pathParts = req.path.split("/").filter(Boolean);
      let lang = "en";
      let isRtl = false;
      
      // Detect language prefix
      if (["id", "vi", "ar"].includes(pathParts[0])) {
        lang = pathParts[0];
        pathParts.shift(); // remove lang from parts
      }
      
      if (lang === "ar") {
        isRtl = true;
        modifiedHtml = modifiedHtml.replace('<html lang="en">', '<html lang="ar" dir="rtl">');
      } else if (lang !== "en") {
        modifiedHtml = modifiedHtml.replace('<html lang="en">', `<html lang="${lang}">`);
      }

      // Dynamic SEO
      let title = "Ahwaz Controls | Industrial Instrumentation Supplier";
      let description = "B2B wholesale supplier of compatible alternatives and surplus stock for discontinued industrial instruments.";
      
      if (pathParts[0] === "products" && pathParts[1]) {
        const id = parseInt(pathParts[1], 10);
        if (!isNaN(id)) {
          const [prod] = await db.select().from(productsTable).where(eq(productsTable.id, id));
          if (prod) {
            let pName = prod.name;
            let pDesc = prod.description;
            if (lang !== "en" && prod.translations) {
              const t = typeof prod.translations === "string" ? JSON.parse(prod.translations) : prod.translations;
              if (t && t[lang]) {
                pName = t[lang].name || pName;
                pDesc = t[lang].description || pDesc;
              }
            }
            title = `${pName} | Ahwaz Controls`;
            description = pDesc.slice(0, 160).replace(/<[^>]*>?/gm, '');
          }
        }
      } else if (pathParts[0] === "articles" && pathParts[1]) {
        const slug = pathParts[1];
        const [art] = await db.select().from(articlesTable).where(eq(articlesTable.slug, slug));
        if (art) {
          let aTitle = art.title;
          let aSummary = art.summary || art.content;
          if (lang !== "en" && art.translations) {
            const t = typeof art.translations === "string" ? JSON.parse(art.translations) : art.translations;
            if (t && t[lang]) {
              aTitle = t[lang].title || aTitle;
              aSummary = t[lang].summary || t[lang].content || aSummary;
            }
          }
          title = `${aTitle} | Ahwaz Controls`;
          description = aSummary.slice(0, 160).replace(/<[^>]*>?/gm, '');
        }
      }
      
      // Inject Meta Tags
      modifiedHtml = modifiedHtml.replace(
        /<title>.*?<\/title>/,
        `<title>${title.replace(/"/g, '&quot;')}</title>`
      );
      modifiedHtml = modifiedHtml.replace(
        /<meta name="description" content=".*?" \/>/,
        `<meta name="description" content="${description.replace(/"/g, '&quot;')}" />`
      );
      
      // Inject Hreflang
      const host = req.get('host') || 'flonexis.com';
      const proto = req.protocol;
      const baseUri = `${proto}://${host}`;
      const pathNoLang = "/" + pathParts.join("/");
      
      const hreflangs = `
    <link rel="alternate" hreflang="en" href="${baseUri}${pathNoLang}" />
    <link rel="alternate" hreflang="id" href="${baseUri}/id${pathNoLang}" />
    <link rel="alternate" hreflang="vi" href="${baseUri}/vi${pathNoLang}" />
    <link rel="alternate" hreflang="ar" href="${baseUri}/ar${pathNoLang}" />
    <link rel="alternate" hreflang="x-default" href="${baseUri}${pathNoLang}" />`;
      
      modifiedHtml = modifiedHtml.replace("</title>", `</title>${hreflangs}`);

      res.send(modifiedHtml);
    } catch (err) {
      logger.error(err);
      res.sendFile(path.join(STATIC_DIR, "index.html"));
    }
  });

  logger.info({ staticDir: STATIC_DIR }, "Serving frontend static files");
} else {
  logger.warn({ staticDir: STATIC_DIR }, "Frontend static dir not found, skipping static serving");
}

export default app;
