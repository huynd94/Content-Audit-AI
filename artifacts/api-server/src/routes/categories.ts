import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import { DEFAULT_CATEGORIES } from "../lib/default-categories";
import { ensureAuditStorage } from "../lib/storage";

const router: IRouter = Router();

router.get("/categories", async (req, res): Promise<void> => {
  try {
    await ensureAuditStorage();
    const existing = await db.select().from(categoriesTable);
    res.json(existing);
  } catch (err) {
    req.log.error({ err }, "Không thể lấy danh sách danh mục");
    res.status(500).json({ error: "Không thể lấy danh sách danh mục." });
  }
});

export default router;
