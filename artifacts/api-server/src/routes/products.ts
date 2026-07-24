import { Router } from "express";
import { db } from "@workspace/db";
import { productsTable, productImagesTable, insertProductSchema, settingsTable } from "@workspace/db";
import { eq, asc, inArray } from "drizzle-orm";
import { requireAdmin } from "./auth";

const router = Router();

const DEFAULT_PAGE_SIZE = 12;

/** Convert a raw productImagesTable row to a serving URL */
function imgUrl(productId: number, imgId: number) {
  return `/api/products/${productId}/images/${imgId}`;
}

/** Apply translation to a row based on lang parameter */
function applyTranslation<T extends { translations?: any }>(row: T, lang?: string): T {
  if (!lang || lang === "en" || !row.translations) return row;
  const t = typeof row.translations === "string" ? JSON.parse(row.translations) : row.translations;
  if (t && t[lang]) {
    return { ...row, ...t[lang], translations: row.translations };
  }
  return row;
}

/** Strip binary image fields from a product row; attach imageUrls array */
async function enrichProduct<T extends {
  imageData?: Buffer | Uint8Array | string | null;
  imageContentType?: string | null;
  imageObjectPath?: string | null;
  id: number;
}>(row: T): Promise<Omit<T, "imageData" | "imageContentType"> & { imageUrls: string[]; imageObjectPath: string | null }> {
  const { imageData, imageContentType, ...rest } = row;

  // Fetch gallery images from product_images table
  const galleryImages = await db
    .select({ id: productImagesTable.id })
    .from(productImagesTable)
    .where(eq(productImagesTable.productId, row.id))
    .orderBy(asc(productImagesTable.sortOrder), asc(productImagesTable.createdAt));

  const imageUrls = galleryImages.map(img => imgUrl(row.id, img.id));

  // Fallback: if product_images is empty but old image_data exists, expose legacy URL
  const legacyHasImage = imageData && (
    typeof imageData === "string" ? imageData.length > 0 : imageData.byteLength > 0
  );
  if (imageUrls.length === 0 && legacyHasImage) {
    imageUrls.push(`/api/products/${row.id}/image`);
  }

  return {
    ...rest,
    imageObjectPath: imageUrls[0] ?? null, // backward compat: first image as "cover"
    imageUrls,
  };
}

// ── GET /api/products/categories ─────────────────────────────────────────────
// Returns the official category list from the settings table.
router.get("/products/categories", async (req, res) => {
  try {
    const [row] = await db
      .select({ value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, "product_categories"));

    let categories: string[] = [
      "Pressure Transmitters",
      "Temperature Instruments",
      "Flow Meters",
      "Valve Positioners",
      "Safety / ESD Devices",
      "Actuators",
      "Field Communicators",
    ];

    if (row && row.value) {
      try {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          categories = parsed;
        }
      } catch (e) {
        // use default
      }
    }

    res.json({ categories });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/products ────────────────────────────────────────────────────────
router.get("/products", async (req, res) => {
  try {
    const { category, brand, q, lang } = req.query as { category?: string; brand?: string; q?: string; lang?: string };
    const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE));
    const offset = (page - 1) * limit;

    let rows = await db.select().from(productsTable).orderBy(asc(productsTable.createdAt));
    if (category) rows = rows.filter(r => r.category === category);
    if (brand) rows = rows.filter(r => r.brand.toLowerCase() === brand.toLowerCase());
    if (q) {
      const query = q.toLowerCase();
      rows = rows.filter(r => 
        r.name.toLowerCase().includes(query) || 
        r.brand.toLowerCase().includes(query) || 
        r.model.toLowerCase().includes(query)
      );
    }

    const total = rows.length;
    const totalPages = Math.ceil(total / limit);
    const data = await Promise.all(rows.slice(offset, offset + limit).map(r => enrichProduct(applyTranslation(r, lang))));

    res.json({ data, total, page, limit, totalPages });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/products/:id ────────────────────────────────────────────────────
router.get("/products/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const lang = req.query.lang as string | undefined;
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    
    let recommendedProducts: any[] = [];
    if (row.recommendedProductIds && Array.isArray(row.recommendedProductIds) && row.recommendedProductIds.length > 0) {
      const recRows = await db
        .select()
        .from(productsTable)
        .where(inArray(productsTable.id, row.recommendedProductIds as number[]));
      recommendedProducts = await Promise.all(recRows.map(r => enrichProduct(applyTranslation(r, lang))));
    }

    const enrichedRow = await enrichProduct(applyTranslation(row, lang));
    res.json({ ...enrichedRow, recommendedProducts });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/products/:id/image — legacy single-image endpoint ───────────────
router.get("/products/:id/image", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db.select({
      imageData: productsTable.imageData,
      imageContentType: productsTable.imageContentType,
    }).from(productsTable).where(eq(productsTable.id, id));
    if (!row || !row.imageData) { res.status(404).json({ error: "No image" }); return; }

    let buf: Buffer;
    if (typeof row.imageData === "string") {
      buf = Buffer.from(row.imageData, "base64");
    } else {
      buf = Buffer.from(row.imageData);
    }
    res.setHeader("Content-Type", row.imageContentType ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/products/:id/images/:imgId — gallery image ─────────────────────
router.get("/products/:id/images/:imgId", async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const imgId = parseInt(req.params.imgId, 10);
    if (isNaN(productId) || isNaN(imgId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [img] = await db
      .select()
      .from(productImagesTable)
      .where(eq(productImagesTable.id, imgId));
    if (!img || img.productId !== productId || !img.imageData) {
      res.status(404).json({ error: "No image" }); return;
    }

    const buf = Buffer.from(img.imageData);
    res.setHeader("Content-Type", img.imageContentType ?? "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(buf);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/products/:id/images — upload a new gallery image (admin) ───────
router.post("/products/:id/images", requireAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    if (isNaN(productId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { imageDataUrl } = req.body as { imageDataUrl?: string };
    if (!imageDataUrl) { res.status(400).json({ error: "imageDataUrl required" }); return; }

    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) { res.status(400).json({ error: "Invalid imageDataUrl format" }); return; }

    const imageContentType = match[1];
    const imageData = Buffer.from(match[2], "base64");

    // Sort order = current max + 1
    const existing = await db
      .select({ sortOrder: productImagesTable.sortOrder })
      .from(productImagesTable)
      .where(eq(productImagesTable.productId, productId))
      .orderBy(asc(productImagesTable.sortOrder));
    const nextOrder = existing.length > 0 ? (existing[existing.length - 1].sortOrder + 1) : 0;

    const [newImg] = await db.insert(productImagesTable).values({
      productId,
      imageData,
      imageContentType,
      sortOrder: nextOrder,
    }).returning();

    res.status(201).json({ id: newImg.id, url: imgUrl(productId, newImg.id) });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/products/:id/images/:imgId — remove gallery image (admin) ────
router.delete("/products/:id/images/:imgId", requireAdmin, async (req, res) => {
  try {
    const productId = parseInt(req.params.id, 10);
    const imgId = parseInt(req.params.imgId, 10);
    if (isNaN(productId) || isNaN(imgId)) { res.status(400).json({ error: "Invalid id" }); return; }

    const [img] = await db
      .select({ id: productImagesTable.id, productId: productImagesTable.productId })
      .from(productImagesTable)
      .where(eq(productImagesTable.id, imgId));
    if (!img || img.productId !== productId) { res.status(404).json({ error: "Not found" }); return; }

    await db.delete(productImagesTable).where(eq(productImagesTable.id, imgId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/products ────────────────────────────────────────────────────────
router.post("/products", requireAdmin, async (req, res) => {
  try {
    const { imageDataUrl, extraImageDataUrls, translations, ...bodyRest } = req.body as {
      imageDataUrl?: string;
      extraImageDataUrls?: string[];
      translations?: any;
      [key: string]: unknown;
    };

    const parsed = insertProductSchema.safeParse(bodyRest);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }

    // Parse primary image
    let imageData: Buffer | null = null;
    let imageContentType: string | null = null;
    if (imageDataUrl) {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        imageContentType = match[1];
        imageData = Buffer.from(match[2], "base64");
      }
    }

    const [row] = await db.insert(productsTable).values({
      ...parsed.data,
      translations: translations ?? {},
      imageData,
      imageContentType,
      imageObjectPath: null,
    }).returning();

    // Save all images (primary first, then extras) to product_images
    const allImageUrls: string[] = [];
    const allDataUrls = [
      ...(imageDataUrl ? [imageDataUrl] : []),
      ...(extraImageDataUrls ?? []),
    ];
    for (let i = 0; i < allDataUrls.length; i++) {
      const match = allDataUrls[i].match(/^data:([^;]+);base64,(.+)$/);
      if (!match) continue;
      const [newImg] = await db.insert(productImagesTable).values({
        productId: row.id,
        imageData: Buffer.from(match[2], "base64"),
        imageContentType: match[1],
        sortOrder: i,
      }).returning();
      allImageUrls.push(imgUrl(row.id, newImg.id));
    }

    res.status(201).json({
      ...row,
      imageData: undefined,
      imageContentType: undefined,
      imageObjectPath: allImageUrls[0] ?? null,
      imageUrls: allImageUrls,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /api/products/:id ─────────────────────────────────────────────────────
router.put("/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

    const { imageDataUrl, extraImageDataUrls, removeImage, deleteImageIds, translations, ...bodyRest } = req.body as {
      imageDataUrl?: string;
      extraImageDataUrls?: string[];
      removeImage?: boolean;
      deleteImageIds?: number[];
      translations?: any;
      [key: string]: unknown;
    };

    const parsed = insertProductSchema.safeParse(bodyRest);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }

    // Handle legacy single image field
    let imageUpdate: { imageData?: Buffer | null; imageContentType?: string | null } = {};
    if (removeImage) {
      imageUpdate = { imageData: null, imageContentType: null };
    } else if (imageDataUrl) {
      const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        imageUpdate = {
          imageContentType: match[1],
          imageData: Buffer.from(match[2], "base64"),
        };
      }
    }

    const [row] = await db.update(productsTable)
      .set({ ...parsed.data, ...(translations ? { translations } : {}), imageObjectPath: null, ...imageUpdate })
      .where(eq(productsTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }

    // Delete specific gallery images if requested
    if (deleteImageIds && deleteImageIds.length > 0) {
      for (const imgId of deleteImageIds) {
        await db.delete(productImagesTable)
          .where(eq(productImagesTable.id, imgId));
      }
    }

    // Add new images from extraImageDataUrls
    const newUrls: string[] = [];
    if (extraImageDataUrls && extraImageDataUrls.length > 0) {
      const existing = await db
        .select({ sortOrder: productImagesTable.sortOrder })
        .from(productImagesTable)
        .where(eq(productImagesTable.productId, id))
        .orderBy(asc(productImagesTable.sortOrder));
      let nextOrder = existing.length > 0 ? (existing[existing.length - 1].sortOrder + 1) : 0;

      for (const dataUrl of extraImageDataUrls) {
        const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
        if (!match) continue;
        const [newImg] = await db.insert(productImagesTable).values({
          productId: id,
          imageData: Buffer.from(match[2], "base64"),
          imageContentType: match[1],
          sortOrder: nextOrder++,
        }).returning();
        newUrls.push(imgUrl(id, newImg.id));
      }
    }

    res.json(await enrichProduct(row));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /api/products/:id ──────────────────────────────────────────────────
router.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    // product_images rows are deleted via CASCADE
    const [row] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
