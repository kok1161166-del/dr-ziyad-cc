import { Router } from "express";
import { supabase } from "../lib/supabase.js";

const router = Router();

router.get("/financial/summary", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query as Record<string, string>;

    let apptQuery = supabase.from("appointments").select("total_fee, paid_amount, appointment_date");
    if (dateFrom) apptQuery = apptQuery.gte("appointment_date", dateFrom);
    if (dateTo) apptQuery = apptQuery.lte("appointment_date", dateTo);
    const { data: appts } = await apptQuery;

    let payQuery = supabase.from("payments").select("amount, payment_method, appointment_id");
    const { data: allPayments } = await payQuery;

    const apptIds = new Set((appts ?? []).map((a: any) => a.id));
    const filteredPayments = dateFrom || dateTo
      ? (allPayments ?? []).filter((p: any) => apptIds.has(p.appointment_id))
      : (allPayments ?? []);

    const { data: expenses } = await supabase.from("expenses").select("amount");

    const totalPayments = filteredPayments.reduce((s: number, p: any) => s + parseFloat(p.amount ?? "0"), 0);
    const cashPayments = filteredPayments.filter((p: any) => p.payment_method === "cash").reduce((s: number, p: any) => s + parseFloat(p.amount ?? "0"), 0);
    const totalFee = (appts ?? []).reduce((s: number, a: any) => s + parseFloat(a.total_fee ?? "0"), 0);
    const totalPaid = (appts ?? []).reduce((s: number, a: any) => s + parseFloat(a.paid_amount ?? "0"), 0);
    const totalExpenses = (expenses ?? []).reduce((s: number, e: any) => s + parseFloat(e.amount ?? "0"), 0);

    res.json({
      totalPayments,
      totalReceivables: Math.max(0, totalFee - totalPaid),
      totalDiscounts: 0,
      totalServicePrice: totalFee,
      totalPatients: (appts ?? []).length,
      totalServices: (appts ?? []).length,
      netProfit: totalPayments - totalExpenses,
      totalExpenses,
      cashPayments,
      otherPayments: totalPayments - cashPayments,
    });
  } catch (err) {
    req.log.error({ err }, "financial summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/financial/receivables", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query as Record<string, string>;
    let query = supabase.from("appointments").select("id, patient_id, appointment_date, total_fee, paid_amount");
    if (dateFrom) query = query.gte("appointment_date", dateFrom);
    if (dateTo) query = query.lte("appointment_date", dateTo);
    query = query.order("appointment_date", { ascending: false });
    const { data: rows, error } = await query;
    if (error) throw error;

    const withDebt = (rows ?? []).filter((r: any) => parseFloat(r.total_fee ?? "0") - parseFloat(r.paid_amount ?? "0") > 0);

    const enriched = await Promise.all(withDebt.map(async (r: any) => {
      const { data: p } = await supabase.from("patients").select("name_ar, phones").eq("id", r.patient_id).single();
      const phones = ((p as any)?.phones ?? []) as Array<{ number: string }>;
      return {
        patientId: r.patient_id,
        patientName: (p as any)?.name_ar ?? "غير معروف",
        patientPhone: phones[0]?.number ?? null,
        appointmentId: r.id,
        appointmentDate: r.appointment_date,
        amount: parseFloat(r.total_fee ?? "0") - parseFloat(r.paid_amount ?? "0"),
      };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "receivables error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/financial/vaults", async (req, res) => {
  try {
    const { data, error } = await supabase.from("vaults").select("*").order("id");
    if (error) throw error;
    res.json((data ?? []).map((v: any) => ({ ...v, balance: parseFloat(v.balance ?? "0") })));
  } catch (err) {
    req.log.error({ err }, "list vaults error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/financial/vaults/:id/transactions", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { data, error } = await supabase.from("vault_transactions").select("*").eq("vault_id", id).order("created_at", { ascending: false });
    if (error) throw error;
    res.json((data ?? []).map((t: any) => ({ ...t, amount: parseFloat(t.amount ?? "0") })));
  } catch (err) {
    req.log.error({ err }, "vault transactions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/financial/vaults/:id/transactions", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type, amount, targetVaultId, note } = req.body;

    const { data: txn, error } = await supabase.from("vault_transactions").insert({
      vault_id: id,
      type,
      amount: amount.toString(),
      target_vault_id: targetVaultId ?? null,
      note: note ?? null,
    }).select().single();
    if (error) throw error;

    const { data: vault } = await supabase.from("vaults").select("balance").eq("id", id).single();
    const currentBalance = parseFloat((vault as any)?.balance ?? "0");
    const delta = type === "deposit" || type === "transfer_in" ? amount : -amount;
    await supabase.from("vaults").update({ balance: (currentBalance + delta).toString() }).eq("id", id);

    if (type === "transfer_out" && targetVaultId) {
      await supabase.from("vault_transactions").insert({ vault_id: targetVaultId, type: "transfer_in", amount: amount.toString(), note });
      const { data: targetVault } = await supabase.from("vaults").select("balance").eq("id", targetVaultId).single();
      const targetBalance = parseFloat((targetVault as any)?.balance ?? "0");
      await supabase.from("vaults").update({ balance: (targetBalance + amount).toString() }).eq("id", targetVaultId);
    }

    res.status(201).json({ ...txn, amount: parseFloat((txn as any).amount ?? "0") });
  } catch (err) {
    req.log.error({ err }, "vault transaction error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/financial/expenses", async (req, res) => {
  try {
    const { data: rows, error } = await supabase.from("expenses").select("*, expense_categories(name), vaults(name)").order("created_at", { ascending: false });
    if (error) throw error;
    res.json((rows ?? []).map((r: any) => ({
      id: r.id,
      categoryId: r.category_id,
      categoryName: r.expense_categories?.name ?? "",
      amount: parseFloat(r.amount ?? "0"),
      vaultId: r.vault_id,
      vaultName: r.vaults?.name ?? "",
      performedBy: r.performed_by,
      note: r.note,
      receiptUrl: r.receipt_url,
      createdAt: r.created_at,
    })));
  } catch (err) {
    req.log.error({ err }, "list expenses error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/financial/expenses", async (req, res) => {
  try {
    const { categoryId, amount, vaultId, performedBy, note, receiptUrl } = req.body;
    const { data: exp, error } = await supabase.from("expenses").insert({
      category_id: categoryId, amount: amount.toString(), vault_id: vaultId, performed_by: performedBy, note, receipt_url: receiptUrl,
    }).select().single();
    if (error) throw error;

    const { data: vault } = await supabase.from("vaults").select("balance").eq("id", vaultId).single();
    const newBalance = parseFloat((vault as any)?.balance ?? "0") - amount;
    await supabase.from("vaults").update({ balance: newBalance.toString() }).eq("id", vaultId);

    const [{ data: cat }, { data: v }] = await Promise.all([
      supabase.from("expense_categories").select("name").eq("id", categoryId).single(),
      supabase.from("vaults").select("name").eq("id", vaultId).single(),
    ]);
    res.status(201).json({ ...exp, amount: parseFloat((exp as any).amount ?? "0"), categoryName: (cat as any)?.name ?? "", vaultName: (v as any)?.name ?? "" });
  } catch (err) {
    req.log.error({ err }, "create expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/financial/expense-categories", async (req, res) => {
  try {
    const { data, error } = await supabase.from("expense_categories").select("*").order("name");
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    req.log.error({ err }, "expense categories error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/financial/expense-categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    const { data: cat, error } = await supabase.from("expense_categories").insert({ name, description }).select().single();
    if (error) throw error;
    res.status(201).json(cat);
  } catch (err) {
    req.log.error({ err }, "create expense category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/financial/expense-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    const { data: cat, error } = await supabase.from("expense_categories").update({ name, description }).eq("id", id).select().single();
    if (error || !cat) return res.status(404).json({ error: "Category not found" });
    res.json(cat);
  } catch (err) {
    req.log.error({ err }, "update expense category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/financial/expense-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabase.from("expense_categories").delete().eq("id", id);
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "delete expense category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/financial/routine-expenses", async (req, res) => {
  try {
    const { data: rows, error } = await supabase.from("routine_expenses").select("*, expense_categories(name)").order("created_at", { ascending: false });
    if (error) throw error;
    res.json((rows ?? []).map((r: any) => ({
      id: r.id, categoryId: r.category_id, categoryName: r.expense_categories?.name ?? "",
      title: r.title, amount: parseFloat(r.amount ?? "0"), frequency: r.frequency,
      branch: r.branch, note: r.note, isActive: r.is_active, createdAt: r.created_at,
    })));
  } catch (err) {
    req.log.error({ err }, "list routine expenses error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/financial/routine-expenses", async (req, res) => {
  try {
    const { categoryId, title, amount, frequency, branch, note, isActive } = req.body;
    const { data: row, error } = await supabase.from("routine_expenses").insert({
      category_id: categoryId, title, amount: amount.toString(), frequency, branch, note, is_active: isActive ?? true,
    }).select().single();
    if (error) throw error;
    const { data: cat } = await supabase.from("expense_categories").select("name").eq("id", categoryId).single();
    res.status(201).json({ ...row, amount: parseFloat((row as any).amount ?? "0"), categoryName: (cat as any)?.name ?? "" });
  } catch (err) {
    req.log.error({ err }, "create routine expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/financial/routine-expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { categoryId, title, amount, frequency, branch, note, isActive } = req.body;
    const updates: any = {};
    if (categoryId !== undefined) updates.category_id = categoryId;
    if (title !== undefined) updates.title = title;
    if (amount !== undefined) updates.amount = amount.toString();
    if (frequency !== undefined) updates.frequency = frequency;
    if (branch !== undefined) updates.branch = branch;
    if (note !== undefined) updates.note = note;
    if (isActive !== undefined) updates.is_active = isActive;
    const { data: row, error } = await supabase.from("routine_expenses").update(updates).eq("id", id).select().single();
    if (error || !row) return res.status(404).json({ error: "Not found" });
    const { data: cat } = await supabase.from("expense_categories").select("name").eq("id", (row as any).category_id).single();
    res.json({ ...row, amount: parseFloat((row as any).amount ?? "0"), categoryName: (cat as any)?.name ?? "" });
  } catch (err) {
    req.log.error({ err }, "update routine expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/financial/routine-expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabase.from("routine_expenses").delete().eq("id", id);
    if (error) throw error;
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "delete routine expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
