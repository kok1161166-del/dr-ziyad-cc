import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

router.get("/services", async (req, res) => {
  try {
    const { branch, groupId } = req.query as Record<string, string>;
    let query = supabase.from("services").select("*").order("name");
    if (branch) query = query.eq("branch", branch);
    if (groupId) query = query.eq("group_id", parseInt(groupId));
    const { data: rows, error } = await query;
    if (error) throw error;

    const { data: groups } = await supabase.from("service_groups").select("id, name");
    const groupMap = Object.fromEntries((groups ?? []).map((g: any) => [g.id, g.name]));

    res.json((rows ?? []).map((s: any) => ({
      ...s,
      price: parseFloat(s.price ?? "0"),
      patientFee: parseFloat(s.patient_fee ?? "0"),
      groupName: s.group_id ? groupMap[s.group_id] ?? null : null,
    })));
  } catch (err) {
    req.log.error({ err }, "list services error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/services", async (req, res) => {
  try {
    const data = req.body;
    const { data: svc, error } = await supabase.from("services").insert({
      group_id: data.groupId ?? null,
      branch: data.branch,
      name: data.name,
      is_visible: data.isVisible ?? true,
      price_type: data.priceType ?? "fixed",
      price: data.price?.toString() ?? "0",
      units: data.units ?? 1,
      patient_fee: data.patientFee?.toString() ?? "0",
      duration_minutes: data.durationMinutes ?? null,
      uses_consumables: data.usesConsumables ?? false,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ ...svc, price: parseFloat((svc as any).price ?? "0"), patientFee: parseFloat((svc as any).patient_fee ?? "0") });
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
    if (data.isVisible !== undefined) updates.is_visible = data.isVisible;
    if (data.priceType !== undefined) updates.price_type = data.priceType;
    if (data.price !== undefined) updates.price = data.price.toString();
    if (data.units !== undefined) updates.units = data.units;
    if (data.patientFee !== undefined) updates.patient_fee = data.patientFee.toString();
    if (data.durationMinutes !== undefined) updates.duration_minutes = data.durationMinutes;
    if (data.groupId !== undefined) updates.group_id = data.groupId;
    const { data: updated, error } = await supabase.from("services").update(updates).eq("id", id).select().single();
    if (error) throw error;
    res.json({ ...updated, price: parseFloat((updated as any).price ?? "0"), patientFee: parseFloat((updated as any).patient_fee ?? "0") });
  } catch (err) {
    req.log.error({ err }, "update service error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/services/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true, message: "Service deleted" });
  } catch (err) {
    req.log.error({ err }, "delete service error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/service-groups", async (req, res) => {
  try {
    const { data: rows, error } = await supabase.from("service_groups").select("*").order("name");
    if (error) throw error;
    res.json(rows ?? []);
  } catch (err) {
    req.log.error({ err }, "list service groups error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/service-groups", async (req, res) => {
  try {
    const { name, type, validFrom, validTo } = req.body;
    const { data: group, error } = await supabase.from("service_groups").insert({
      name, type: type ?? "private", valid_from: validFrom, valid_to: validTo,
    }).select().single();
    if (error) throw error;
    res.status(201).json(group);
  } catch (err) {
    req.log.error({ err }, "create service group error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
