import { Router } from "express";
import { db } from "@workspace/db";
import { branchesTable, referralProvidersTable, taxSettingsTable, systemSettingsTable, appointmentsTable, visitsTable, workingDaysTable, holidaysTable } from "@workspace/db";
import { eq, desc, sql, asc } from "drizzle-orm";

const router = Router();

router.get("/settings/branches", async (req, res) => {
  try {
    const rows = await db.select().from(branchesTable).orderBy(branchesTable.name);
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "list branches error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/settings/referral-providers", async (req, res) => {
  try {
    const rows = await db.select().from(referralProvidersTable).orderBy(referralProvidersTable.name);
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt })));
  } catch (err) {
    req.log.error({ err }, "list referral providers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/settings/referral-providers", async (req, res) => {
  try {
    const { name, specialty, phone, address } = req.body;
    const [prov] = await db.insert(referralProvidersTable).values({ name, specialty, phone, address }).returning();
    res.status(201).json({ ...prov, createdAt: prov.createdAt?.toISOString?.() ?? prov.createdAt });
  } catch (err) {
    req.log.error({ err }, "create referral provider error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/settings/tax", async (req, res) => {
  try {
    let [settings] = await db.select().from(taxSettingsTable).limit(1);
    if (!settings) {
      [settings] = await db.insert(taxSettingsTable).values({}).returning();
    }
    res.json({ branch: settings.branch, taxType: settings.taxType, taxTitle: settings.taxTitle, taxPercentage: parseFloat(settings.taxPercentage ?? "0") });
  } catch (err) {
    req.log.error({ err }, "get tax settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/settings/tax", async (req, res) => {
  try {
    const data = req.body;
    const updates: any = { updatedAt: new Date() };
    if (data.taxType !== undefined) updates.taxType = data.taxType;
    if (data.taxTitle !== undefined) updates.taxTitle = data.taxTitle;
    if (data.taxPercentage !== undefined) updates.taxPercentage = data.taxPercentage.toString();
    let [existing] = await db.select().from(taxSettingsTable).limit(1);
    if (!existing) {
      [existing] = await db.insert(taxSettingsTable).values({}).returning();
    }
    const [updated] = await db.update(taxSettingsTable).set(updates).where(eq(taxSettingsTable.id, existing.id)).returning();
    res.json({ branch: updated.branch, taxType: updated.taxType, taxTitle: updated.taxTitle, taxPercentage: parseFloat(updated.taxPercentage ?? "0") });
  } catch (err) {
    req.log.error({ err }, "update tax settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/settings/system", async (req, res) => {
  try {
    let [settings] = await db.select().from(systemSettingsTable).limit(1);
    if (!settings) {
      [settings] = await db.insert(systemSettingsTable).values({}).returning();
    }
    res.json({ activeBranch: settings.activeBranch, appointmentOrder: settings.appointmentOrder, autoRefreshMinutes: settings.autoRefreshMinutes, displayBranch: settings.displayBranch });
  } catch (err) {
    req.log.error({ err }, "get system settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/settings/system", async (req, res) => {
  try {
    const data = req.body;
    const updates: any = { updatedAt: new Date() };
    if (data.activeBranch !== undefined) updates.activeBranch = data.activeBranch;
    if (data.appointmentOrder !== undefined) updates.appointmentOrder = data.appointmentOrder;
    if (data.autoRefreshMinutes !== undefined) updates.autoRefreshMinutes = data.autoRefreshMinutes;
    if (data.displayBranch !== undefined) updates.displayBranch = data.displayBranch;
    let [existing] = await db.select().from(systemSettingsTable).limit(1);
    if (!existing) {
      [existing] = await db.insert(systemSettingsTable).values({}).returning();
    }
    const [updated] = await db.update(systemSettingsTable).set(updates).where(eq(systemSettingsTable.id, existing.id)).returning();
    res.json({ activeBranch: updated.activeBranch, appointmentOrder: updated.appointmentOrder, autoRefreshMinutes: updated.autoRefreshMinutes, displayBranch: updated.displayBranch });
  } catch (err) {
    req.log.error({ err }, "update system settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/settings/working-days", async (req, res) => {
  try {
    const rows = await db.select().from(workingDaysTable).orderBy(asc(workingDaysTable.branch), asc(workingDaysTable.dayOfWeek));
    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "list working days error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings/working-days", async (req, res) => {
  try {
    const days: Array<{ branch: string; dayOfWeek: number; isWorking: boolean; openTime?: string; closeTime?: string }> = req.body;
    const results = await Promise.all(days.map(async (d) => {
      const existing = await db.select().from(workingDaysTable).where(eq(workingDaysTable.branch, d.branch)).then(rs => rs.find(r => r.dayOfWeek === d.dayOfWeek));
      if (existing) {
        const [updated] = await db.update(workingDaysTable).set({ isWorking: d.isWorking, openTime: d.openTime ?? null, closeTime: d.closeTime ?? null }).where(eq(workingDaysTable.id, existing.id)).returning();
        return updated;
      } else {
        const [created] = await db.insert(workingDaysTable).values({ branch: d.branch, dayOfWeek: d.dayOfWeek, isWorking: d.isWorking, openTime: d.openTime ?? null, closeTime: d.closeTime ?? null }).returning();
        return created;
      }
    }));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "upsert working days error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/settings/holidays", async (req, res) => {
  try {
    const rows = await db.select().from(holidaysTable).orderBy(asc(holidaysTable.date));
    res.json(rows.map(r => ({ ...r, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt })));
  } catch (err) {
    req.log.error({ err }, "list holidays error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/settings/holidays", async (req, res) => {
  try {
    const { branch, date, title } = req.body;
    const [row] = await db.insert(holidaysTable).values({ branch: branch ?? null, date, title }).returning();
    res.status(201).json({ ...row, createdAt: row.createdAt?.toISOString?.() ?? row.createdAt });
  } catch (err) {
    req.log.error({ err }, "create holiday error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/settings/holidays/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(holidaysTable).where(eq(holidaysTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "delete holiday error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/danger/clear-appointments", async (req, res) => {
  try {
    await db.delete(appointmentsTable);
    res.json({ success: true, message: "All appointments cleared" });
  } catch (err) {
    req.log.error({ err }, "clear appointments error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/danger/clear-visits", async (req, res) => {
  try {
    await db.delete(visitsTable);
    res.json({ success: true, message: "All visits cleared" });
  } catch (err) {
    req.log.error({ err }, "clear visits error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
