import { Router } from "express";
import { db } from "@workspace/db";
import { servicesTable, serviceGroupsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";

const router = Router();

router.get("/services", async (req, res) => {
  try {
    const { branch, groupId } = req.query as Record<string, string>;
    let conds: any[] = [];
    if (branch) conds.push(eq(servicesTable.branch, branch));
    if (groupId) conds.push(eq(servicesTable.groupId, parseInt(groupId)));
    const rows = await db.select().from(servicesTable).where(conds.length > 0 ? and(...conds) : undefined).orderBy(servicesTable.name);
    const groups = await db.select().from(serviceGroupsTable);
    const groupMap = Object.fromEntries(groups.map(g => [g.id, g.name]));
    res.json(rows.map(s => ({
      ...s,
      price: parseFloat(s.price ?? "0"),
      patientFee: parseFloat(s.patientFee ?? "0"),
      groupName: s.groupId ? groupMap[s.groupId] ?? null : null,
      createdAt: s.createdAt?.toISOString?.() ?? s.createdAt,
    })));
  } catch (err) {
    req.log.error({ err }, "list services error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/services", async (req, res) => {
  try {
    const data = req.body;
    const [svc] = await db.insert(servicesTable).values({
      groupId: data.groupId ?? null,
      branch: data.branch,
      name: data.name,
      isVisible: data.isVisible ?? true,
      priceType: data.priceType ?? "fixed",
      price: data.price?.toString() ?? "0",
      units: data.units ?? 1,
      patientFee: data.patientFee?.toString() ?? "0",
      durationMinutes: data.durationMinutes ?? null,
      usesConsumables: data.usesConsumables ?? false,
    }).returning();
    res.status(201).json({ ...svc, price: parseFloat(svc.price ?? "0"), patientFee: parseFloat(svc.patientFee ?? "0"), createdAt: svc.createdAt?.toISOString?.() ?? svc.createdAt });
  } catch (err) {
    req.log.error({ err }, "create service error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.isVisible !== undefined) updates.isVisible = data.isVisible;
    if (data.priceType !== undefined) updates.priceType = data.priceType;
    if (data.price !== undefined) updates.price = data.price.toString();
    if (data.units !== undefined) updates.units = data.units;
    if (data.patientFee !== undefined) updates.patientFee = data.patientFee.toString();
    if (data.durationMinutes !== undefined) updates.durationMinutes = data.durationMinutes;
    if (data.groupId !== undefined) updates.groupId = data.groupId;
    const [updated] = await db.update(servicesTable).set(updates).where(eq(servicesTable.id, id)).returning();
    res.json({ ...updated, price: parseFloat(updated.price ?? "0"), patientFee: parseFloat(updated.patientFee ?? "0") });
  } catch (err) {
    req.log.error({ err }, "update service error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(servicesTable).where(eq(servicesTable.id, id));
    res.json({ success: true, message: "Service deleted" });
  } catch (err) {
    req.log.error({ err }, "delete service error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/service-groups", async (req, res) => {
  try {
    const rows = await db.select().from(serviceGroupsTable).orderBy(serviceGroupsTable.name);
    res.json(rows.map(g => ({ ...g, createdAt: g.createdAt?.toISOString?.() ?? g.createdAt })));
  } catch (err) {
    req.log.error({ err }, "list service groups error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/service-groups", async (req, res) => {
  try {
    const { name, type, validFrom, validTo } = req.body;
    const [group] = await db.insert(serviceGroupsTable).values({ name, type: type ?? "private", validFrom, validTo }).returning();
    res.status(201).json({ ...group, createdAt: group.createdAt?.toISOString?.() ?? group.createdAt });
  } catch (err) {
    req.log.error({ err }, "create service group error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
