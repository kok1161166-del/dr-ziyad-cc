import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/dashboard/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [
      { count: todayAppts },
      { count: newPatients },
      { count: totalPatients },
      { count: totalVisits },
      { count: totalAppointments },
      { data: todayPaymentsData },
    ] = await Promise.all([
      supabase.from("appointments").select("*", { count: "exact", head: true }).eq("appointment_date", today),
      supabase.from("patients").select("*", { count: "exact", head: true }).eq("is_deleted", false).gte("created_at", today),
      supabase.from("patients").select("*", { count: "exact", head: true }).eq("is_deleted", false),
      supabase.from("visits").select("*", { count: "exact", head: true }),
      supabase.from("appointments").select("*", { count: "exact", head: true }),
      supabase.from("payments").select("amount, appointment_id, appointments!inner(appointment_date)").eq("appointments.appointment_date", today),
    ]);

    const todayRevenue = (todayPaymentsData ?? []).reduce((s: number, p: any) => s + parseFloat(p.amount ?? "0"), 0);

    res.json({
      todayAppointments: todayAppts ?? 0,
      newPatientsToday: newPatients ?? 0,
      totalPatients: totalPatients ?? 0,
      todayRevenue,
      totalVisits: totalVisits ?? 0,
      totalAppointments: totalAppointments ?? 0,
    });
  } catch (err) {
    req.log.error({ err }, "dashboard stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/dashboard/funnel", async (req, res) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().split("T")[0];
    const { data: rows, error } = await supabase.from("appointments").select("status").eq("appointment_date", date);
    if (error) throw error;

    const map: Record<string, number> = {};
    for (const r of rows ?? []) {
      map[r.status] = (map[r.status] ?? 0) + 1;
    }

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
