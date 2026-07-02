import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/staff", async (req, res) => {
  try {
    const [{ data: users, error }, { data: roles }, { data: details }] = await Promise.all([
      supabase.from("system_users").select("*").order("name"),
      supabase.from("roles").select("id, name"),
      supabase.from("staff_details").select("*"),
    ]);
    if (error) throw error;

    const roleMap = Object.fromEntries((roles ?? []).map((r: any) => [r.id, r.name]));
    const detailMap = Object.fromEntries((details ?? []).map((d: any) => [d.user_id, d]));

    const staff = (users ?? []).map((u: any) => {
      const d = detailMap[u.id];
      return {
        id: d?.id ?? u.id,
        userId: u.id,
        name: u.name,
        username: u.username,
        email: u.email ?? null,
        roleId: u.role_id,
        roleName: roleMap[u.role_id] ?? "",
        branch: u.branch ?? null,
        isFrozen: u.is_frozen,
        position: d?.position ?? null,
        specialty: d?.specialty ?? null,
        phone: d?.phone ?? null,
        salary: d?.salary ? parseFloat(d.salary) : null,
        joiningDate: d?.joining_date ?? null,
        workDays: (d?.work_days as string[]) ?? [],
        shiftStart: d?.shift_start ?? null,
        shiftEnd: d?.shift_end ?? null,
        notes: d?.notes ?? null,
        createdAt: u.created_at,
      };
    });
    res.json(staff);
  } catch (err) {
    req.log.error({ err }, "list staff error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff", async (req, res) => {
  try {
    const { userId, position, specialty, phone, salary, joiningDate, workDays, shiftStart, shiftEnd, notes } = req.body;

    const { data: existing } = await supabase.from("staff_details").select("id").eq("user_id", userId).single();
    let detail;
    if (existing) {
      const { data: updated } = await supabase.from("staff_details").update({
        position, specialty, phone, salary: salary?.toString(), joining_date: joiningDate,
        work_days: workDays, shift_start: shiftStart, shift_end: shiftEnd, notes, updated_at: new Date().toISOString(),
      }).eq("user_id", userId).select().single();
      detail = updated;
    } else {
      const { data: created } = await supabase.from("staff_details").insert({
        user_id: userId, position, specialty, phone, salary: salary?.toString(),
        joining_date: joiningDate, work_days: workDays ?? [], shift_start: shiftStart, shift_end: shiftEnd, notes,
      }).select().single();
      detail = created;
    }

    const [{ data: user }, { data: roles }] = await Promise.all([
      supabase.from("system_users").select("*").eq("id", userId).single(),
      supabase.from("roles").select("id, name"),
    ]);
    if (!user) return res.status(404).json({ error: "User not found" });
    const roleMap = Object.fromEntries((roles ?? []).map((r: any) => [r.id, r.name]));

    res.status(201).json({
      id: (detail as any).id, userId: (user as any).id, name: (user as any).name,
      username: (user as any).username, email: (user as any).email ?? null,
      roleId: (user as any).role_id, roleName: roleMap[(user as any).role_id] ?? "",
      branch: (user as any).branch ?? null, isFrozen: (user as any).is_frozen,
      position: (detail as any).position ?? null, specialty: (detail as any).specialty ?? null,
      phone: (detail as any).phone ?? null, salary: (detail as any).salary ? parseFloat((detail as any).salary) : null,
      joiningDate: (detail as any).joining_date ?? null, workDays: ((detail as any).work_days as string[]) ?? [],
      shiftStart: (detail as any).shift_start ?? null, shiftEnd: (detail as any).shift_end ?? null,
      notes: (detail as any).notes ?? null, createdAt: (user as any).created_at,
    });
  } catch (err) {
    req.log.error({ err }, "create staff details error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/staff/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { position, specialty, phone, salary, joiningDate, workDays, shiftStart, shiftEnd, notes } = req.body;

    const updates: any = { updated_at: new Date().toISOString() };
    if (position !== undefined) updates.position = position;
    if (specialty !== undefined) updates.specialty = specialty;
    if (phone !== undefined) updates.phone = phone;
    if (salary !== undefined) updates.salary = salary?.toString() ?? null;
    if (joiningDate !== undefined) updates.joining_date = joiningDate;
    if (workDays !== undefined) updates.work_days = workDays;
    if (shiftStart !== undefined) updates.shift_start = shiftStart;
    if (shiftEnd !== undefined) updates.shift_end = shiftEnd;
    if (notes !== undefined) updates.notes = notes;

    let { data: existing } = await supabase.from("staff_details").select("id").eq("user_id", userId).single();
    let detail;
    if (!existing) {
      const { data: created } = await supabase.from("staff_details").insert({ user_id: userId, work_days: [], ...updates }).select().single();
      detail = created;
    } else {
      const { data: updated } = await supabase.from("staff_details").update(updates).eq("user_id", userId).select().single();
      detail = updated;
    }

    const [{ data: user }, { data: roles }] = await Promise.all([
      supabase.from("system_users").select("*").eq("id", userId).single(),
      supabase.from("roles").select("id, name"),
    ]);
    if (!user) return res.status(404).json({ error: "User not found" });
    const roleMap = Object.fromEntries((roles ?? []).map((r: any) => [r.id, r.name]));

    res.json({
      id: (detail as any).id, userId: (user as any).id, name: (user as any).name,
      username: (user as any).username, email: (user as any).email ?? null,
      roleId: (user as any).role_id, roleName: roleMap[(user as any).role_id] ?? "",
      branch: (user as any).branch ?? null, isFrozen: (user as any).is_frozen,
      position: (detail as any).position ?? null, specialty: (detail as any).specialty ?? null,
      phone: (detail as any).phone ?? null, salary: (detail as any).salary ? parseFloat((detail as any).salary) : null,
      joiningDate: (detail as any).joining_date ?? null, workDays: ((detail as any).work_days as string[]) ?? [],
      shiftStart: (detail as any).shift_start ?? null, shiftEnd: (detail as any).shift_end ?? null,
      notes: (detail as any).notes ?? null, createdAt: (user as any).created_at,
    });
  } catch (err) {
    req.log.error({ err }, "update staff details error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
