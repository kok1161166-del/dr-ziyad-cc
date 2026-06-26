import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/settings/branches", async (req, res) => {
  try {
    const { data, error } = await supabase.from("branches").select("*").order("name");
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    req.log.error({ err }, "list branches error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/settings/referral-providers", async (req, res) => {
  try {
    const { data, error } = await supabase.from("referral_providers").select("*").order("name");
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    req.log.error({ err }, "list referral providers error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/settings/referral-providers", async (req, res) => {
  try {
    const { name, specialty, phone, address } = req.body;
    const { data: prov, error } = await supabase.from("referral_providers").insert({ name, specialty, phone, address }).select().single();
    if (error) throw error;
    res.status(201).json(prov);
  } catch (err) {
    req.log.error({ err }, "create referral provider error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/settings/tax", async (req, res) => {
  try {
    let { data: settings } = await supabase.from("tax_settings").select("*").limit(1).single();
    if (!settings) {
      const { data: created } = await supabase.from("tax_settings").insert({}).select().single();
      settings = created;
    }
    res.json({
      branch: (settings as any)?.branch,
      taxType: (settings as any)?.tax_type,
      taxTitle: (settings as any)?.tax_title,
      taxPercentage: parseFloat((settings as any)?.tax_percentage ?? "0"),
    });
  } catch (err) {
    req.log.error({ err }, "get tax settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/settings/tax", async (req, res) => {
  try {
    const data = req.body;
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.taxType !== undefined) updates.tax_type = data.taxType;
    if (data.taxTitle !== undefined) updates.tax_title = data.taxTitle;
    if (data.taxPercentage !== undefined) updates.tax_percentage = data.taxPercentage.toString();

    let { data: existing } = await supabase.from("tax_settings").select("id").limit(1).single();
    if (!existing) {
      const { data: created } = await supabase.from("tax_settings").insert({}).select().single();
      existing = created;
    }
    const { data: updated, error } = await supabase.from("tax_settings").update(updates).eq("id", (existing as any).id).select().single();
    if (error) throw error;
    res.json({
      branch: (updated as any)?.branch,
      taxType: (updated as any)?.tax_type,
      taxTitle: (updated as any)?.tax_title,
      taxPercentage: parseFloat((updated as any)?.tax_percentage ?? "0"),
    });
  } catch (err) {
    req.log.error({ err }, "update tax settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/settings/system", async (req, res) => {
  try {
    let { data: settings } = await supabase.from("system_settings").select("*").limit(1).single();
    if (!settings) {
      const { data: created } = await supabase.from("system_settings").insert({}).select().single();
      settings = created;
    }
    res.json({
      activeBranch: (settings as any)?.active_branch,
      appointmentOrder: (settings as any)?.appointment_order,
      autoRefreshMinutes: (settings as any)?.auto_refresh_minutes,
      displayBranch: (settings as any)?.display_branch,
    });
  } catch (err) {
    req.log.error({ err }, "get system settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/settings/system", async (req, res) => {
  try {
    const data = req.body;
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.activeBranch !== undefined) updates.active_branch = data.activeBranch;
    if (data.appointmentOrder !== undefined) updates.appointment_order = data.appointmentOrder;
    if (data.autoRefreshMinutes !== undefined) updates.auto_refresh_minutes = data.autoRefreshMinutes;
    if (data.displayBranch !== undefined) updates.display_branch = data.displayBranch;

    let { data: existing } = await supabase.from("system_settings").select("id").limit(1).single();
    if (!existing) {
      const { data: created } = await supabase.from("system_settings").insert({}).select().single();
      existing = created;
    }
    const { data: updated, error } = await supabase.from("system_settings").update(updates).eq("id", (existing as any).id).select().single();
    if (error) throw error;
    res.json({
      activeBranch: (updated as any)?.active_branch,
      appointmentOrder: (updated as any)?.appointment_order,
      autoRefreshMinutes: (updated as any)?.auto_refresh_minutes,
      displayBranch: (updated as any)?.display_branch,
    });
  } catch (err) {
    req.log.error({ err }, "update system settings error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/settings/working-days", async (req, res) => {
  try {
    const { data, error } = await supabase.from("working_days").select("*").order("branch").order("day_of_week");
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    req.log.error({ err }, "list working days error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings/working-days", async (req, res) => {
  try {
    const days: Array<{ branch: string; dayOfWeek: number; isWorking: boolean; openTime?: string; closeTime?: string }> = req.body;
    const { data: existing } = await supabase.from("working_days").select("*");
    const results = await Promise.all(days.map(async (d) => {
      const found = (existing ?? []).find((r: any) => r.branch === d.branch && r.day_of_week === d.dayOfWeek);
      if (found) {
        const { data: updated } = await supabase.from("working_days").update({ is_working: d.isWorking, open_time: d.openTime ?? null, close_time: d.closeTime ?? null }).eq("id", (found as any).id).select().single();
        return updated;
      } else {
        const { data: created } = await supabase.from("working_days").insert({ branch: d.branch, day_of_week: d.dayOfWeek, is_working: d.isWorking, open_time: d.openTime ?? null, close_time: d.closeTime ?? null }).select().single();
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
    const { data, error } = await supabase.from("holidays").select("*").order("date");
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    req.log.error({ err }, "list holidays error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/settings/holidays", async (req, res) => {
  try {
    const { branch, date, title } = req.body;
    const { data: row, error } = await supabase.from("holidays").insert({ branch: branch ?? null, date, title }).select().single();
    if (error) throw error;
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "create holiday error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/settings/holidays/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabase.from("holidays").delete().eq("id", id);
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "delete holiday error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/danger/clear-appointments", async (req, res) => {
  try {
    const { error } = await supabase.from("appointments").delete().neq("id", 0);
    if (error) throw error;
    res.json({ success: true, message: "All appointments cleared" });
  } catch (err) {
    req.log.error({ err }, "clear appointments error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/danger/clear-visits", async (req, res) => {
  try {
    const { error } = await supabase.from("visits").delete().neq("id", 0);
    if (error) throw error;
    res.json({ success: true, message: "All visits cleared" });
  } catch (err) {
    req.log.error({ err }, "clear visits error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
