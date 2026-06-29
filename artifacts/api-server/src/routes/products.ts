import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, insertProductSchema } from "@workspace/db";
import { eq, count, asc } from "drizzle-orm";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "ahwaz-admin-2024";
const DEFAULT_PAGE_SIZE = 12;

function requireAdmin(req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) {
  const auth = req.headers["x-admin-password"];
  if (auth !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

/** Strip imageData from a product row so it's never sent in list/detail JSON */
function stripImage<T extends { imageData?: string | null; imageContentType?: string | null; imageObjectPath?: string | null; id: number }>(row: T) {
  const { imageData, imageContentType, ...rest } = row;
  return {
    ...rest,
    // If image data exists, replace imageObjectPath with the serving URL
    imageObjectPath: imageData ? `/api/products/${row.id}/image` : null,
  };
}

router.get("/products", async (req, res) => {
  try {
    const { category, brand } = req.query as { category?: string; brand?: string; page?: string; limit?: string };
    const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    let rows = await db.select().from(productsTable).orderBy(asc(productsTable.createdAt));

    if (category) rows = rows.filter(r => r.category === category);
    if (brand) rows = rows.filter(r => r.brand.toLowerCase() === brand.toLowerCase());

    const total = rows.length;
    const totalPages = Math.ceil(total / limit);
    const data = rows.slice(offset, offset + limit).map(stripImage);

    res.json({ data, total, page, limit, totalPages });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(stripImage(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/products/:id/image — serve the stored image binary */
router.get("/products/:id/image", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.select({
      imageData: productsTable.imageData,
      imageContentType: productsTable.imageContentType,
    }).from(productsTable).where(eq(productsTable.id, id));
    if (!row || !row.imageData) { res.status(404).json({ error: "No image" }); return; }

    const buf = Buffer.from(row.imageData, "base64");
    res.setHeader("Content-Type", row.imageContentType ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/products", requireAdmin, async (req, res) => {
  try {
    // Extract imageDataUrl before schema validation (it's not part of product schema)
    const { imageDataUrl, ...bodyRest } = req.body as { imageDataUrl?: string; [key: string]: unknown };

    const parsed = insertProductSchema.safeParse(bodyRest);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }

    // Parse base64 data URL if provided
    let imageData: string | null = null;
    let imageContentType: string | null = null;
    if (imageDataUrl) {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        imageContentType = match[1];
        imageData = match[2];
      }
    }

    const [row] = await db.insert(productsTable).values({
      ...parsed.data,
      imageData,
      imageContentType,
      imageObjectPath: null, // always null — URL is derived on read
    }).returning();
    res.status(201).json(stripImage(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { imageDataUrl, removeImage, ...bodyRest } = req.body as {
      imageDataUrl?: string;
      removeImage?: boolean;
      [key: string]: unknown;
    };

    const parsed = insertProductSchema.safeParse(bodyRest);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }

    // Determine image update
    let imageUpdate: { imageData?: string | null; imageContentType?: string | null } = {};
    if (removeImage) {
      imageUpdate = { imageData: null, imageContentType: null };
    } else if (imageDataUrl) {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        imageUpdate = { imageContentType: match[1], imageData: match[2] };
      }
    }

    const [row] = await db.update(productsTable)
      .set({ ...parsed.data, imageObjectPath: null, ...imageUpdate })
      .where(eq(productsTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(stripImage(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
