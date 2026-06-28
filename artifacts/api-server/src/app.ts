import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

  // SPA fallback: all non-API routes serve index.html so frontend routing works
  app.get("*", (_req, res) => {
    res.sendFile(path.join(STATIC_DIR, "index.html"));
  });

  logger.info({ staticDir: STATIC_DIR }, "Serving frontend static files");
} else {
  logger.warn({ staticDir: STATIC_DIR }, "Frontend static dir not found, skipping static serving");
}

export default app;
