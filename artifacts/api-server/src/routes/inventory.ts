import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/inventory/items", async (req, res) => {
  try {
    const { branch, lowStock } = req.query as Record<string, string>;
    let query = supabase.from("inventory_items").select("*").order("name");
    if (branch) query = query.eq("branch", branch);
    const { data: rows, error } = await query;
    if (error) throw error;

    let result = rows ?? [];
    if (lowStock === "true") {
      result = result.filter((r: any) => {
        const qty = parseFloat(r.quantity ?? "0");
        const threshold = r.low_stock_threshold ? parseFloat(r.low_stock_threshold) : 0;
        return qty <= threshold;
      });
    }

    res.json(result.map((r: any) => ({
      ...r,
      quantity: parseFloat(r.quantity ?? "0"),
      lowStockThreshold: r.low_stock_threshold ? parseFloat(r.low_stock_threshold) : null,
    })));
  } catch (err) {
    req.log.error({ err }, "list inventory error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory/items", async (req, res) => {
  try {
    const data = req.body;
    const { data: item, error } = await supabase.from("inventory_items").insert({
      barcode: data.barcode ?? null,
      branch: data.branch,
      name: data.name,
      quantity: data.quantity?.toString() ?? "0",
      unit: data.unit ?? "وحدة",
      low_stock_threshold: data.lowStockThreshold?.toString() ?? null,
      expiry_date: data.expiryDate ?? null,
      supplier_name: data.supplierName ?? null,
      supplier_contact: data.supplierContact ?? null,
      supplier_address: data.supplierAddress ?? null,
      notify_low_stock: data.notifyLowStock ?? false,
      notify_expiry: data.notifyExpiry ?? false,
    }).select().single();
    if (error) throw error;
    res.status(201).json({ ...item, quantity: parseFloat((item as any).quantity ?? "0") });
  } catch (err) {
    req.log.error({ err }, "create inventory item error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory/items/:id/transaction", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type, quantity, note, cost } = req.body;
    const { data: txn, error } = await supabase.from("inventory_transactions").insert({
      item_id: id,
      type,
      quantity: quantity.toString(),
      note: note ?? null,
      cost: cost?.toString() ?? null,
    }).select().single();
    if (error) throw error;

    const { data: item } = await supabase.from("inventory_items").select("quantity").eq("id", id).single();
    const currentQty = parseFloat((item as any)?.quantity ?? "0");
    const delta = type === "add" ? quantity : -quantity;
    await supabase.from("inventory_items").update({ quantity: (currentQty + delta).toString() }).eq("id", id);

    res.status(201).json({ ...txn, quantity: parseFloat((txn as any).quantity ?? "0"), cost: (txn as any).cost ? parseFloat((txn as any).cost) : null });
  } catch (err) {
    req.log.error({ err }, "inventory transaction error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inventory/supplier-debts", async (req, res) => {
  try {
    const { data: rows, error } = await supabase.from("supplier_debts").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    res.json((rows ?? []).map((r: any) => ({ ...r, amount: parseFloat(r.amount ?? "0") })));
  } catch (err) {
    req.log.error({ err }, "supplier debts error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
