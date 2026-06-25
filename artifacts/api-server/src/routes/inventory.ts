import { Router } from "express";
import { db } from "@workspace/db";
import { inventoryItemsTable, inventoryTransactionsTable, supplierDebtsTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/inventory/items", async (req, res) => {
  try {
    const { branch, lowStock } = req.query as Record<string, string>;
    let conds: any[] = [];
    if (branch) conds.push(eq(inventoryItemsTable.branch, branch));
    if (lowStock === "true") conds.push(sql`${inventoryItemsTable.quantity}::float <= coalesce(${inventoryItemsTable.lowStockThreshold}::float, 0)`);
    const rows = await db.select().from(inventoryItemsTable).where(conds.length > 0 ? and(...conds) : undefined).orderBy(inventoryItemsTable.name);
    res.json(rows.map(r => ({ ...r, quantity: parseFloat(r.quantity ?? "0"), lowStockThreshold: r.lowStockThreshold ? parseFloat(r.lowStockThreshold) : null, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt })));
  } catch (err) {
    req.log.error({ err }, "list inventory error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory/items", async (req, res) => {
  try {
    const data = req.body;
    const [item] = await db.insert(inventoryItemsTable).values({
      barcode: data.barcode ?? null,
      branch: data.branch,
      name: data.name,
      quantity: data.quantity?.toString() ?? "0",
      unit: data.unit ?? "وحدة",
      lowStockThreshold: data.lowStockThreshold?.toString() ?? null,
      expiryDate: data.expiryDate ?? null,
      supplierName: data.supplierName ?? null,
      supplierContact: data.supplierContact ?? null,
      supplierAddress: data.supplierAddress ?? null,
      notifyLowStock: data.notifyLowStock ?? false,
      notifyExpiry: data.notifyExpiry ?? false,
    }).returning();
    res.status(201).json({ ...item, quantity: parseFloat(item.quantity ?? "0"), createdAt: item.createdAt?.toISOString?.() ?? item.createdAt });
  } catch (err) {
    req.log.error({ err }, "create inventory item error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inventory/items/:id/transaction", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type, quantity, note, cost } = req.body;
    const [txn] = await db.insert(inventoryTransactionsTable).values({
      itemId: id,
      type,
      quantity: quantity.toString(),
      note: note ?? null,
      cost: cost?.toString() ?? null,
    }).returning();
    const delta = type === "add" ? quantity : -quantity;
    await db.update(inventoryItemsTable).set({ quantity: sql`quantity + ${delta}` }).where(eq(inventoryItemsTable.id, id));
    res.status(201).json({ ...txn, quantity: parseFloat(txn.quantity ?? "0"), cost: txn.cost ? parseFloat(txn.cost) : null, createdAt: txn.createdAt?.toISOString?.() ?? txn.createdAt });
  } catch (err) {
    req.log.error({ err }, "inventory transaction error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inventory/supplier-debts", async (req, res) => {
  try {
    const rows = await db.select().from(supplierDebtsTable).orderBy(desc(supplierDebtsTable.createdAt));
    res.json(rows.map(r => ({ ...r, amount: parseFloat(r.amount ?? "0"), createdAt: r.createdAt?.toISOString?.() ?? r.createdAt })));
  } catch (err) {
    req.log.error({ err }, "supplier debts error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
