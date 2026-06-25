import { Router } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, patientsTable, servicesTable, paymentsTable, visitsTable } from "@workspace/db";
import { eq, and, desc, sql, gte, lte, inArray } from "drizzle-orm";

const router = Router();

// GET /appointments
router.get("/appointments", async (req, res) => {
  try {
    const { date, dateFrom, dateTo, branch, status, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;

    let conditions: any[] = [];
    const today = new Date().toISOString().split("T")[0];
    if (date) conditions.push(eq(appointmentsTable.appointmentDate, date));
    else if (dateFrom || dateTo) {
      if (dateFrom) conditions.push(gte(appointmentsTable.appointmentDate, dateFrom));
      if (dateTo) conditions.push(lte(appointmentsTable.appointmentDate, dateTo));
    } else {
      conditions.push(eq(appointmentsTable.appointmentDate, today));
    }
    if (branch) conditions.push(eq(appointmentsTable.branch, branch));
    if (status) conditions.push(eq(appointmentsTable.status, status));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(appointmentsTable).where(where);
    const rows = await db.select().from(appointmentsTable).where(where).orderBy(appointmentsTable.appointmentTime).limit(limitNum).offset(offset);

    const enriched = await Promise.all(rows.map(async (a) => {
      const [patient] = await db.select({ nameAr: patientsTable.nameAr, localCode: patientsTable.localCode }).from(patientsTable).where(eq(patientsTable.id, a.patientId));
      const payments = await db.select({ total: sql<number>`sum(amount)::float` }).from(paymentsTable).where(eq((paymentsTable as any).appointmentId, a.id));
      const paid = payments[0]?.total ?? parseFloat(a.paidAmount ?? "0");
      const total = parseFloat(a.totalFee ?? "0");
      const serviceIds = (a.serviceIds as number[]) ?? [];
      let serviceNames: string[] = [];
      if (serviceIds.length > 0) {
        const svcs = await db.select({ name: servicesTable.name }).from(servicesTable).where(inArray(servicesTable.id, serviceIds));
        serviceNames = svcs.map(s => s.name);
      }
      return {
        id: a.id,
        patientId: a.patientId,
        patientNameAr: patient?.nameAr ?? "غير معروف",
        patientCode: patient?.localCode ?? 0,
        branch: a.branch,
        appointmentDate: a.appointmentDate,
        appointmentTime: a.appointmentTime,
        status: a.status,
        source: a.source,
        paymentMethod: a.paymentMethod,
        serviceIds,
        serviceNames,
        doctorId: a.doctorId,
        doctorName: null,
        totalFee: total,
        paidAmount: paid,
        remainingAmount: total - paid,
        notes: a.notes,
        createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
      };
    }));

    res.json({ appointments: enriched, total, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "list appointments error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /appointments
router.post("/appointments", async (req, res) => {
  try {
    const data = req.body;
    if (!data.patientId || !data.branch || !data.appointmentDate || !data.appointmentTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const serviceIds = data.serviceIds ?? [];
    let totalFee = "0";
    if (serviceIds.length > 0) {
      const svcs = await db.select({ fee: servicesTable.patientFee }).from(servicesTable).where(inArray(servicesTable.id, serviceIds));
      totalFee = svcs.reduce((sum, s) => sum + parseFloat(s.fee ?? "0"), 0).toString();
    }
    const [appt] = await db.insert(appointmentsTable).values({
      patientId: data.patientId,
      branch: data.branch,
      appointmentDate: data.appointmentDate,
      appointmentTime: data.appointmentTime,
      status: "waiting_arrival",
      source: data.source ?? "walk_in",
      paymentMethod: data.paymentMethod ?? "cash",
      serviceIds,
      doctorId: data.doctorId ?? null,
      totalFee,
      paidAmount: "0",
      notes: data.notes ?? null,
    }).returning();
    const [patient] = await db.select({ nameAr: patientsTable.nameAr, localCode: patientsTable.localCode }).from(patientsTable).where(eq(patientsTable.id, appt.patientId));
    res.status(201).json({
      ...appt,
      patientNameAr: patient?.nameAr ?? "",
      patientCode: patient?.localCode ?? 0,
      serviceNames: [],
      totalFee: parseFloat(appt.totalFee ?? "0"),
      paidAmount: 0,
      remainingAmount: parseFloat(appt.totalFee ?? "0"),
      createdAt: appt.createdAt?.toISOString?.() ?? appt.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "create appointment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /appointments/:id
router.get("/appointments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [a] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, id));
    if (!a) return res.status(404).json({ error: "Not found" });
    const [patient] = await db.select({ nameAr: patientsTable.nameAr, localCode: patientsTable.localCode }).from(patientsTable).where(eq(patientsTable.id, a.patientId));
    res.json({
      ...a,
      patientNameAr: patient?.nameAr ?? "",
      patientCode: patient?.localCode ?? 0,
      serviceNames: [],
      totalFee: parseFloat(a.totalFee ?? "0"),
      paidAmount: parseFloat(a.paidAmount ?? "0"),
      remainingAmount: parseFloat(a.totalFee ?? "0") - parseFloat(a.paidAmount ?? "0"),
      createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
    });
  } catch (err) {
    req.log.error({ err }, "get appointment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /appointments/:id
router.patch("/appointments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const updates: any = { updatedAt: new Date() };
    if (data.appointmentDate !== undefined) updates.appointmentDate = data.appointmentDate;
    if (data.appointmentTime !== undefined) updates.appointmentTime = data.appointmentTime;
    if (data.source !== undefined) updates.source = data.source;
    if (data.paymentMethod !== undefined) updates.paymentMethod = data.paymentMethod;
    if (data.serviceIds !== undefined) updates.serviceIds = data.serviceIds;
    if (data.doctorId !== undefined) updates.doctorId = data.doctorId;
    if (data.notes !== undefined) updates.notes = data.notes;
    const [updated] = await db.update(appointmentsTable).set(updates).where(eq(appointmentsTable.id, id)).returning();
    res.json({ ...updated, createdAt: updated.createdAt?.toISOString?.() ?? updated.createdAt });
  } catch (err) {
    req.log.error({ err }, "update appointment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /appointments/:id
router.delete("/appointments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(appointmentsTable).set({ status: "cancelled", updatedAt: new Date() }).where(eq(appointmentsTable.id, id));
    res.json({ success: true, message: "Appointment cancelled" });
  } catch (err) {
    req.log.error({ err }, "cancel appointment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /appointments/:id/status
router.patch("/appointments/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const [updated] = await db.update(appointmentsTable).set({ status, updatedAt: new Date() }).where(eq(appointmentsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    if (status === "completed" || status === "session_done") {
      const exists = await db.select({ id: visitsTable.id }).from(visitsTable).where(eq(visitsTable.appointmentId, id));
      if (exists.length === 0) {
        const [p] = await db.select({ nameAr: patientsTable.nameAr }).from(patientsTable).where(eq(patientsTable.id, updated.patientId));
        await db.insert(visitsTable).values({
          patientId: updated.patientId,
          appointmentId: id,
          visitDate: updated.appointmentDate,
          services: [],
          totalFee: updated.totalFee ?? "0",
          paidAmount: updated.paidAmount ?? "0",
        });
      }
    }
    res.json({ ...updated, createdAt: updated.createdAt?.toISOString?.() ?? updated.createdAt });
  } catch (err) {
    req.log.error({ err }, "status update error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /appointments/:id/payment
router.post("/appointments/:id/payment", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { amount, paymentMethod, note } = req.body;
    const [payment] = await db.insert(paymentsTable).values({
      appointmentId: id,
      amount: amount.toString(),
      paymentMethod: paymentMethod ?? "cash",
      note: note ?? null,
    }).returning();
    const paid = await db.select({ total: sql<number>`sum(amount)::float` }).from(paymentsTable).where(eq((paymentsTable as any).appointmentId, id));
    const totalPaid = paid[0]?.total ?? 0;
    await db.update(appointmentsTable).set({ paidAmount: totalPaid.toString(), updatedAt: new Date() }).where(eq(appointmentsTable.id, id));
    res.status(201).json({ ...payment, createdAt: payment.createdAt?.toISOString?.() ?? payment.createdAt });
  } catch (err) {
    req.log.error({ err }, "record payment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
