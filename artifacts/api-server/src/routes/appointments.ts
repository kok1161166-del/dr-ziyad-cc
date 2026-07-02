import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

router.get("/appointments", async (req, res) => {
  try {
    const { date, dateFrom, dateTo, branch, status, page = "1", limit = "50" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(200, parseInt(limit));
    const offset = (pageNum - 1) * limitNum;
    const today = new Date().toISOString().split("T")[0];

    let query = supabase.from("appointments").select("*", { count: "exact" });
    if (date) query = query.eq("appointment_date", date);
    else if (dateFrom || dateTo) {
      if (dateFrom) query = query.gte("appointment_date", dateFrom);
      if (dateTo) query = query.lte("appointment_date", dateTo);
    } else {
      query = query.eq("appointment_date", today);
    }
    if (branch) query = query.eq("branch", branch);
    if (status) query = query.eq("status", status);

    const { data: rows, count, error } = await query.order("appointment_time").range(offset, offset + limitNum - 1);
    if (error) throw error;

    const enriched = await Promise.all((rows ?? []).map(async (a) => {
      const [{ data: patients }, { data: paymentsData }, { data: svcs }] = await Promise.all([
        supabase.from("patients").select("name_ar, local_code").eq("id", a.patient_id).single(),
        supabase.from("payments").select("amount").eq("appointment_id", a.id),
        (a.service_ids as number[] ?? []).length > 0
          ? supabase.from("services").select("name").in("id", a.service_ids as number[])
          : Promise.resolve({ data: [] }),
      ]);
      const paid = (paymentsData ?? []).reduce((s: number, p: any) => s + parseFloat(p.amount ?? "0"), 0);
      const total = parseFloat(a.total_fee ?? "0");
      return {
        id: a.id,
        patientId: a.patient_id,
        patientNameAr: (patients as any)?.name_ar ?? "غير معروف",
        patientCode: (patients as any)?.local_code ?? 0,
        branch: a.branch,
        appointmentDate: a.appointment_date,
        appointmentTime: a.appointment_time,
        status: a.status,
        source: a.source,
        paymentMethod: a.payment_method,
        serviceIds: a.service_ids ?? [],
        serviceNames: (svcs ?? []).map((s: any) => s.name),
        doctorId: a.doctor_id,
        doctorName: null,
        totalFee: total,
        paidAmount: paid,
        remainingAmount: total - paid,
        notes: a.notes,
        createdAt: a.created_at,
      };
    }));

    res.json({ appointments: enriched, total: count ?? 0, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "list appointments error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/appointments", async (req, res) => {
  try {
    const data = req.body;
    if (!data.patientId || !data.branch || !data.appointmentDate || !data.appointmentTime) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const serviceIds: number[] = data.serviceIds ?? [];
    let totalFee = 0;
    if (serviceIds.length > 0) {
      const { data: svcs } = await supabase.from("services").select("patient_fee").in("id", serviceIds);
      totalFee = (svcs ?? []).reduce((s: number, sv: any) => s + parseFloat(sv.patient_fee ?? "0"), 0);
    }

    const { data: appt, error } = await supabase.from("appointments").insert({
      patient_id: data.patientId,
      branch: data.branch,
      appointment_date: data.appointmentDate,
      appointment_time: data.appointmentTime,
      status: "waiting_arrival",
      source: data.source ?? "walk_in",
      payment_method: data.paymentMethod ?? "cash",
      service_ids: serviceIds,
      doctor_id: data.doctorId ?? null,
      total_fee: totalFee.toString(),
      paid_amount: "0",
      notes: data.notes ?? null,
    }).select().single();
    if (error) throw error;

    const { data: patient } = await supabase.from("patients").select("name_ar, local_code").eq("id", appt.patient_id).single();
    res.status(201).json({
      ...appt,
      patientNameAr: (patient as any)?.name_ar ?? "",
      patientCode: (patient as any)?.local_code ?? 0,
      serviceNames: [],
      totalFee,
      paidAmount: 0,
      remainingAmount: totalFee,
    });
  } catch (err) {
    req.log.error({ err }, "create appointment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/appointments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { data: a, error } = await supabase.from("appointments").select("*").eq("id", id).single();
    if (error || !a) return res.status(404).json({ error: "Not found" });
    const { data: patient } = await supabase.from("patients").select("name_ar, local_code").eq("id", a.patient_id).single();
    res.json({
      ...a,
      patientNameAr: (patient as any)?.name_ar ?? "",
      patientCode: (patient as any)?.local_code ?? 0,
      serviceNames: [],
      totalFee: parseFloat(a.total_fee ?? "0"),
      paidAmount: parseFloat(a.paid_amount ?? "0"),
      remainingAmount: parseFloat(a.total_fee ?? "0") - parseFloat(a.paid_amount ?? "0"),
    });
  } catch (err) {
    req.log.error({ err }, "get appointment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/appointments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.appointmentDate !== undefined) updates.appointment_date = data.appointmentDate;
    if (data.appointmentTime !== undefined) updates.appointment_time = data.appointmentTime;
    if (data.source !== undefined) updates.source = data.source;
    if (data.paymentMethod !== undefined) updates.payment_method = data.paymentMethod;
    if (data.serviceIds !== undefined) updates.service_ids = data.serviceIds;
    if (data.doctorId !== undefined) updates.doctor_id = data.doctorId;
    if (data.notes !== undefined) updates.notes = data.notes;
    const { data: updated, error } = await supabase.from("appointments").update(updates).eq("id", id).select().single();
    if (error) throw error;
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "update appointment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/appointments/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabase.from("appointments").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    res.json({ success: true, message: "Appointment cancelled" });
  } catch (err) {
    req.log.error({ err }, "cancel appointment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/appointments/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const { data: updated, error } = await supabase.from("appointments").update({ status, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error || !updated) return res.status(404).json({ error: "Not found" });

    if (status === "completed" || status === "session_done") {
      const { data: existing } = await supabase.from("visits").select("id").eq("appointment_id", id).limit(1);
      if (!existing || existing.length === 0) {
        await supabase.from("visits").insert({
          patient_id: updated.patient_id,
          appointment_id: id,
          visit_date: updated.appointment_date,
          services: [],
          total_fee: updated.total_fee ?? "0",
          paid_amount: updated.paid_amount ?? "0",
        });
      }
    }
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "status update error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/appointments/:id/payment", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { amount, paymentMethod, note } = req.body;
    const { data: payment, error } = await supabase.from("payments").insert({
      appointment_id: id,
      amount: amount.toString(),
      payment_method: paymentMethod ?? "cash",
      note: note ?? null,
    }).select().single();
    if (error) throw error;

    const { data: allPayments } = await supabase.from("payments").select("amount").eq("appointment_id", id);
    const totalPaid = (allPayments ?? []).reduce((s: number, p: any) => s + parseFloat(p.amount ?? "0"), 0);
    await supabase.from("appointments").update({ paid_amount: totalPaid.toString(), updated_at: new Date().toISOString() }).eq("id", id);

    res.status(201).json(payment);
  } catch (err) {
    req.log.error({ err }, "record payment error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
