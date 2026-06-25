import { Router } from "express";
import { db } from "@workspace/db";
import { prescriptionTemplatesTable, investigationTemplatesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/templates/prescriptions", async (req, res) => {
  try {
    const rows = await db.select().from(prescriptionTemplatesTable).orderBy(prescriptionTemplatesTable.name);
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt })));
  } catch (err) {
    req.log.error({ err }, "list prescription templates error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/templates/prescriptions", async (req, res) => {
  try {
    const { name, content, category } = req.body;
    const [t] = await db.insert(prescriptionTemplatesTable).values({ name, content, category }).returning();
    res.status(201).json({ ...t, createdAt: t.createdAt?.toISOString?.() ?? t.createdAt });
  } catch (err) {
    req.log.error({ err }, "create prescription template error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/templates/prescriptions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const updates: any = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.content !== undefined) updates.content = data.content;
    if (data.category !== undefined) updates.category = data.category;
    const [updated] = await db.update(prescriptionTemplatesTable).set(updates).where(eq(prescriptionTemplatesTable.id, id)).returning();
    res.json({ ...updated, createdAt: updated.createdAt?.toISOString?.() ?? updated.createdAt });
  } catch (err) {
    req.log.error({ err }, "update prescription template error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/templates/prescriptions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(prescriptionTemplatesTable).where(eq(prescriptionTemplatesTable.id, id));
    res.json({ success: true, message: "Template deleted" });
  } catch (err) {
    req.log.error({ err }, "delete prescription template error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/templates/investigations", async (req, res) => {
  try {
    const rows = await db.select().from(investigationTemplatesTable).orderBy(investigationTemplatesTable.type, investigationTemplatesTable.name);
    res.json(rows.map(r => ({ ...r, tests: r.tests ?? [], createdAt: r.createdAt?.toISOString?.() ?? r.createdAt })));
  } catch (err) {
    req.log.error({ err }, "list investigation templates error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/templates/investigations", async (req, res) => {
  try {
    const { name, type, tests } = req.body;
    const [t] = await db.insert(investigationTemplatesTable).values({ name, type, tests }).returning();
    res.status(201).json({ ...t, tests: t.tests ?? [], createdAt: t.createdAt?.toISOString?.() ?? t.createdAt });
  } catch (err) {
    req.log.error({ err }, "create investigation template error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
