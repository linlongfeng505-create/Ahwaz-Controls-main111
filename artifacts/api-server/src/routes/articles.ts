import { Router } from "express";
import { db } from "@workspace/db";
import { articlesTable, insertArticleSchema, productsTable, productImagesTable } from "@workspace/db";
import { eq, desc, or, inArray } from "drizzle-orm";
import { requireAdmin } from "./auth";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "flonexis-admin-2024";
const DEFAULT_PAGE_SIZE = 10;

/** Strip cover binary from article row — expose a URL instead */
function stripCover<
  T extends {
    coverData?: Buffer | Uint8Array | string | null;
    coverContentType?: string | null;
    id: number;
  }
>(row: T) {
  const { coverData, coverContentType, ...rest } = row;
  return {
    ...rest,
    coverUrl:
      coverData &&
      (typeof coverData === "string"
        ? coverData.length > 0
        : (coverData as Uint8Array).byteLength > 0)
        ? `/api/articles/${row.id}/cover`
        : null,
  };
}

/** GET /api/articles — public list (published only).
 *  Admin: add header x-admin-password to see all (incl. drafts). */
router.get("/articles", async (req, res) => {
  try {
    const isAdmin = req.headers["x-admin-password"] === ADMIN_PASSWORD;
    const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    let rows = await db
      .select()
      .from(articlesTable)
      .orderBy(desc(articlesTable.createdAt));

    if (!isAdmin) {
      rows = rows.filter((r) => r.published);
    }

    const total = rows.length;
    const totalPages = Math.ceil(total / limit);
    const data = rows.slice(offset, offset + limit).map(stripCover);

    res.json({ data, total, page, limit, totalPages });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/articles/:idOrSlug — public detail (published) or admin draft */
router.get("/articles/:idOrSlug", async (req, res) => {
  try {
    const { idOrSlug } = req.params;
    const isAdmin = req.headers["x-admin-password"] === ADMIN_PASSWORD;
    const numId = parseInt(idOrSlug, 10);

    let rows;
    if (!isNaN(numId)) {
      rows = await db
        .select()
        .from(articlesTable)
        .where(eq(articlesTable.id, numId));
    } else {
      rows = await db
        .select()
        .from(articlesTable)
        .where(eq(articlesTable.slug, idOrSlug));
    }

    const row = rows[0];
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (!row.published && !isAdmin) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    let recommendedArticles: any[] = [];
    if (row.recommendedArticleIds && Array.isArray(row.recommendedArticleIds) && row.recommendedArticleIds.length > 0) {
      let recRows = await db
        .select()
        .from(articlesTable)
        .where(inArray(articlesTable.id, row.recommendedArticleIds as number[]));
      
      if (!isAdmin) {
        recRows = recRows.filter((r) => r.published);
      }
      recommendedArticles = recRows.map(stripCover);
    }

    let recommendedProducts: any[] = [];
    if (row.recommendedProductIds && Array.isArray(row.recommendedProductIds) && row.recommendedProductIds.length > 0) {
      const recProdRows = await db
        .select()
        .from(productsTable)
        .where(inArray(productsTable.id, row.recommendedProductIds as number[]));

      // Hydrate image URLs for each product
      for (const p of recProdRows) {
        const imgs = await db
          .select()
          .from(productImagesTable)
          .where(eq(productImagesTable.productId, p.id));
        recommendedProducts.push({
          id: p.id,
          name: p.name,
          brand: p.brand,
          model: p.model,
          category: p.category,
          imageUrl: imgs.length > 0 ? `/api/products/${p.id}/images/${imgs[0].id}` : null,
        });
      }
    }

    res.json({ ...stripCover(row), recommendedArticles, recommendedProducts });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/articles/:id/cover — serve cover image binary */
router.get("/articles/:id/cover", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .select({ coverData: articlesTable.coverData, coverContentType: articlesTable.coverContentType })
      .from(articlesTable)
      .where(eq(articlesTable.id, id));

    if (!row || !row.coverData) {
      res.status(404).json({ error: "No cover image" });
      return;
    }

    let buf: Buffer;
    if (typeof row.coverData === "string") {
      buf = Buffer.from(row.coverData, "base64");
    } else {
      buf = Buffer.from(row.coverData);
    }

    res.setHeader("Content-Type", row.coverContentType ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/articles — create article (admin only) */
router.post("/articles", requireAdmin, async (req, res) => {
  try {
    const { coverDataUrl, ...bodyRest } = req.body as {
      coverDataUrl?: string;
      [key: string]: unknown;
    };

    const parsed = insertArticleSchema.safeParse(bodyRest);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }

    let coverData: Buffer | null = null;
    let coverContentType: string | null = null;
    if (coverDataUrl) {
      const match = coverDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        coverContentType = match[1];
        coverData = Buffer.from(match[2], "base64");
      }
    }

    const [row] = await db
      .insert(articlesTable)
      .values({ ...parsed.data, coverData, coverContentType })
      .returning();

    res.status(201).json(stripCover(row));
  } catch (err: any) {
    req.log.error(err);
    if (err?.code === "SQLITE_CONSTRAINT_UNIQUE" || err?.message?.includes("UNIQUE constraint failed")) {
      res.status(400).json({ error: "An article with this slug already exists. Please modify the title or slug to be unique." });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PUT /api/articles/:id — update article (admin only) */
router.put("/articles/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const { coverDataUrl, removeCover, ...bodyRest } = req.body as {
      coverDataUrl?: string;
      removeCover?: boolean;
      [key: string]: unknown;
    };

    const parsed = insertArticleSchema.safeParse(bodyRest);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }

    let coverUpdate: { coverData?: Buffer | null; coverContentType?: string | null } = {};
    if (removeCover) {
      coverUpdate = { coverData: null, coverContentType: null };
    } else if (coverDataUrl) {
      const match = coverDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        coverUpdate = {
          coverContentType: match[1],
          coverData: Buffer.from(match[2], "base64"),
        };
      }
    }

    const [row] = await db
      .update(articlesTable)
      .set({ ...parsed.data, ...coverUpdate })
      .where(eq(articlesTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    res.json(stripCover(row));
  } catch (err: any) {
    req.log.error(err);
    if (err?.code === "SQLITE_CONSTRAINT_UNIQUE" || err?.message?.includes("UNIQUE constraint failed")) {
      res.status(400).json({ error: "An article with this slug already exists. Please modify the slug to be unique." });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/articles/:id — delete article (admin only) */
router.delete("/articles/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const [row] = await db
      .delete(articlesTable)
      .where(eq(articlesTable.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
