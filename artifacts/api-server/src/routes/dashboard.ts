import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, appointmentsTable, visitsTable, paymentsTable } from "@workspace/db";
import { sql, eq, and, gte, lt } from "drizzle-orm";

const router = Router();

router.get("/dashboard/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const [todayAppts] = await db.select({ count: sql<number>`count(*)::int` }).from(appointmentsTable).where(eq(appointmentsTable.appointmentDate, today));
    const [newPatients] = await db.select({ count: sql<number>`count(*)::int` }).from(patientsTable).where(and(eq(patientsTable.isDeleted, false), gte(patientsTable.createdAt, sql`${today}::date`)));
    const [totalPatients] = await db.select({ count: sql<number>`count(*)::int` }).from(patientsTable).where(eq(patientsTable.isDeleted, false));
    const [totalVisits] = await db.select({ count: sql<number>`count(*)::int` }).from(visitsTable);
    const [totalAppointments] = await db.select({ count: sql<number>`count(*)::int` }).from(appointmentsTable);

    const todayPayments = await db.select({ total: sql<number>`coalesce(sum(${paymentsTable.amount}), 0)::float` })
      .from(paymentsTable)
      .innerJoin(appointmentsTable, eq(paymentsTable.appointmentId, appointmentsTable.id))
      .where(eq(appointmentsTable.appointmentDate, today));

    res.json({
      todayAppointments: todayAppts?.count ?? 0,
      newPatientsToday: newPatients?.count ?? 0,
      totalPatients: totalPatients?.count ?? 0,
      todayRevenue: todayPayments[0]?.total ?? 0,
      totalVisits: totalVisits?.count ?? 0,
      totalAppointments: totalAppointments?.count ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "dashboard stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/funnel", async (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const rows = await db.select({
      status: appointmentsTable.status,
      count: sql<number>`count(*)::int`,
    }).from(appointmentsTable).where(eq(appointmentsTable.appointmentDate, date)).groupBy(appointmentsTable.status);

    const map: Record<string, number> = {};
    for (const r of rows) map[r.status] = r.count;

    res.json({
      waitingArrival: map["waiting_arrival"] ?? 0,
      inReception: map["in_reception"] ?? 0,
      inExamination: map["in_examination"] ?? 0,
      completed: map["completed"] ?? 0,
      sessionDone: map["session_done"] ?? 0,
      postponed: map["postponed"] ?? 0,
      noShow: map["no_show"] ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "funnel error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
