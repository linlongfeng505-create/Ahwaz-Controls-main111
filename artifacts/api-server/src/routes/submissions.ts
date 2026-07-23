import { Router } from "express";
import { db } from "@workspace/db";
import { submissionsTable, settingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { requireAdmin } from "./auth";

const router = Router();

const submitSchema = z.object({
  name: z.string().min(1).max(200),
  company: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(100).optional(),
  message: z.string().min(1).max(5000),
});

/** 向企业微信群机器人推送 Markdown 通知 */
async function notifyWecom(
  webhookUrl: string,
  data: {
    id: number;
    name: string;
    company: string;
    email: string;
    phone?: string | null;
    message: string;
  }
) {
  const phoneLine = data.phone ? `**电话：** ${data.phone}\n` : "";
  // 超过 200 字截断，防止超出企业微信 4096 字符限制
  const preview =
    data.message.length > 200
      ? data.message.slice(0, 200) + "…"
      : data.message;

  const content =
    `## 📬 新询价表单 #${data.id}\n` +
    `**姓名：** ${data.name}\n` +
    `**公司：** ${data.company}\n` +
    `**邮箱：** ${data.email}\n` +
    phoneLine +
    `**内容：**\n> ${preview.replace(/\n/g, "\n> ")}`;

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ msgtype: "markdown", markdown: { content } }),
  });
}

// ── POST /submissions ────────────────────────────────────────────────────────
router.post("/submissions", async (req, res) => {
  try {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }

    const [row] = await db.insert(submissionsTable).values(parsed.data).returning();
    // 先回包，不阻塞客户端
    res.status(201).json({ ok: true, id: row.id });

    // ── 企业微信通知（fire-and-forget）──────────────────────────────────
    (async () => {
      try {
        const [setting] = await db
          .select()
          .from(settingsTable)
          .where(eq(settingsTable.key, "wecom_webhook"));
        const webhookUrl = setting?.value?.trim();
        if (webhookUrl && webhookUrl.startsWith("https://")) {
          await notifyWecom(webhookUrl, { ...parsed.data, id: row.id });
        }
      } catch {
        // 通知失败静默忽略，不影响主业务
      }
    })();
    // ────────────────────────────────────────────────────────────────────
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /submissions (admin) ─────────────────────────────────────────────────
router.get("/submissions", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(submissionsTable)
      .orderBy(desc(submissionsTable.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── PATCH /submissions/:id/read ──────────────────────────────────────────────
router.patch("/submissions/:id/read", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    const [row] = await db
      .update(submissionsTable)
      .set({ read: true })
      .where(eq(submissionsTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── DELETE /submissions/:id ──────────────────────────────────────────────────
router.delete("/submissions/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.delete(submissionsTable).where(eq(submissionsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
