import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/templates/prescriptions", async (req, res) => {
  try {
    const { data, error } = await supabase.from("prescription_templates").select("*").order("name");
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    req.log.error({ err }, "list prescription templates error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/templates/prescriptions", async (req, res) => {
  try {
    const { name, content, category } = req.body;
    const { data: t, error } = await supabase.from("prescription_templates").insert({ name, content, category }).select().single();
    if (error) throw error;
    res.status(201).json(t);
  } catch (err) {
    req.log.error({ err }, "create prescription template error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/templates/prescriptions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.content !== undefined) updates.content = data.content;
    if (data.category !== undefined) updates.category = data.category;
    const { data: updated, error } = await supabase.from("prescription_templates").update(updates).eq("id", id).select().single();
    if (error) throw error;
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "update prescription template error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/templates/prescriptions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabase.from("prescription_templates").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true, message: "Template deleted" });
  } catch (err) {
    req.log.error({ err }, "delete prescription template error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/templates/investigations", async (req, res) => {
  try {
    const { data, error } = await supabase.from("investigation_templates").select("*").order("type").order("name");
    if (error) throw error;
    res.json((data ?? []).map((r: any) => ({ ...r, tests: r.tests ?? [] })));
  } catch (err) {
    req.log.error({ err }, "list investigation templates error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/templates/investigations", async (req, res) => {
  try {
    const { name, type, tests } = req.body;
    const { data: t, error } = await supabase.from("investigation_templates").insert({ name, type, tests }).select().single();
    if (error) throw error;
    res.status(201).json({ ...t, tests: (t as any).tests ?? [] });
  } catch (err) {
    req.log.error({ err }, "create investigation template error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
