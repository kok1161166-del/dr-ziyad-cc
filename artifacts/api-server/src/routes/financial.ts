import { Router } from "express";
import { db } from "@workspace/db";
import { appointmentsTable, paymentsTable, expensesTable, expenseCategoriesTable, vaultsTable, vaultTransactionsTable, patientsTable, visitsTable, routineExpensesTable } from "@workspace/db";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

const router = Router();

router.get("/financial/summary", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query as Record<string, string>;
    let apptConds: any[] = [];
    if (dateFrom) apptConds.push(gte(appointmentsTable.appointmentDate, dateFrom));
    if (dateTo) apptConds.push(lte(appointmentsTable.appointmentDate, dateTo));
    const apptWhere = apptConds.length > 0 ? and(...apptConds) : undefined;

    const payments = await db.select({
        total: sql<number>`coalesce(sum(${paymentsTable.amount}),0)::float`,
        cash: sql<number>`coalesce(sum(case when ${paymentsTable.paymentMethod}='cash' then ${paymentsTable.amount}::numeric else 0 end),0)::float`
      })
      .from(paymentsTable)
      .innerJoin(appointmentsTable, eq(paymentsTable.appointmentId, appointmentsTable.id))
      .where(apptWhere);

    const apptStats = await db.select({
      totalFeeSum: sql<number>`coalesce(sum(total_fee),0)::float`,
      paidSum: sql<number>`coalesce(sum(paid_amount),0)::float`,
      count: sql<number>`count(*)::int`,
    }).from(appointmentsTable).where(apptWhere);

    const expConds: any[] = [];
    let expWhere: any = undefined;
    const expenses = await db.select({ total: sql<number>`coalesce(sum(amount),0)::float` }).from(expensesTable).where(expWhere);

    const totalPayments = payments[0]?.total ?? 0;
    const totalFee = apptStats[0]?.totalFeeSum ?? 0;
    const totalPaid = apptStats[0]?.paidSum ?? 0;
    const totalReceivables = totalFee - totalPaid;
    const totalExpenses = expenses[0]?.total ?? 0;
    const patientCount = apptStats[0]?.count ?? 0;

    res.json({
      totalPayments,
      totalReceivables: Math.max(0, totalReceivables),
      totalDiscounts: 0,
      totalServicePrice: totalFee,
      totalPatients: patientCount,
      totalServices: patientCount,
      netProfit: totalPayments - totalExpenses,
      totalExpenses,
      cashPayments: payments[0]?.cash ?? 0,
      otherPayments: totalPayments - (payments[0]?.cash ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "financial summary error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/financial/receivables", async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query as Record<string, string>;
    let conds: any[] = [];
    if (dateFrom) conds.push(gte(appointmentsTable.appointmentDate, dateFrom));
    if (dateTo) conds.push(lte(appointmentsTable.appointmentDate, dateTo));
    conds.push(sql`(${appointmentsTable.totalFee}::float - ${appointmentsTable.paidAmount}::float) > 0`);

    const rows = await db.select({
      id: appointmentsTable.id,
      patientId: appointmentsTable.patientId,
      appointmentDate: appointmentsTable.appointmentDate,
      totalFee: appointmentsTable.totalFee,
      paidAmount: appointmentsTable.paidAmount,
    }).from(appointmentsTable).where(and(...conds)).orderBy(desc(appointmentsTable.appointmentDate));

    const enriched = await Promise.all(rows.map(async (r) => {
      const [p] = await db.select({ nameAr: patientsTable.nameAr, phones: patientsTable.phones }).from(patientsTable).where(eq(patientsTable.id, r.patientId));
      const phones = p?.phones as Array<{ number: string }> ?? [];
      return {
        patientId: r.patientId,
        patientName: p?.nameAr ?? "غير معروف",
        patientPhone: phones[0]?.number ?? null,
        appointmentId: r.id,
        appointmentDate: r.appointmentDate,
        amount: parseFloat(r.totalFee ?? "0") - parseFloat(r.paidAmount ?? "0"),
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
    const vaults = await db.select().from(vaultsTable).orderBy(vaultsTable.id);
    res.json(vaults.map(v => ({ ...v, balance: parseFloat(v.balance ?? "0"), createdAt: v.createdAt?.toISOString?.() ?? v.createdAt })));
  } catch (err) {
    req.log.error({ err }, "list vaults error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/financial/vaults/:id/transactions", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const txns = await db.select().from(vaultTransactionsTable).where(eq(vaultTransactionsTable.vaultId, id)).orderBy(desc(vaultTransactionsTable.createdAt));
    res.json(txns.map(t => ({ ...t, amount: parseFloat(t.amount ?? "0"), createdAt: t.createdAt?.toISOString?.() ?? t.createdAt })));
  } catch (err) {
    req.log.error({ err }, "vault transactions error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/financial/vaults/:id/transactions", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type, amount, targetVaultId, note } = req.body;
    const [txn] = await db.insert(vaultTransactionsTable).values({
      vaultId: id,
      type,
      amount: amount.toString(),
      targetVaultId: targetVaultId ?? null,
      note: note ?? null,
    }).returning();
    const delta = type === "deposit" || type === "transfer_in" ? amount : -amount;
    await db.update(vaultsTable).set({ balance: sql`balance + ${delta}` }).where(eq(vaultsTable.id, id));
    if (type === "transfer_out" && targetVaultId) {
      await db.insert(vaultTransactionsTable).values({ vaultId: targetVaultId, type: "transfer_in", amount: amount.toString(), note });
      await db.update(vaultsTable).set({ balance: sql`balance + ${amount}` }).where(eq(vaultsTable.id, targetVaultId));
    }
    res.status(201).json({ ...txn, amount: parseFloat(txn.amount ?? "0"), createdAt: txn.createdAt?.toISOString?.() ?? txn.createdAt });
  } catch (err) {
    req.log.error({ err }, "vault transaction error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/financial/expenses", async (req, res) => {
  try {
    const rows = await db.select({
      id: expensesTable.id,
      categoryId: expensesTable.categoryId,
      categoryName: expenseCategoriesTable.name,
      amount: expensesTable.amount,
      vaultId: expensesTable.vaultId,
      performedBy: expensesTable.performedBy,
      note: expensesTable.note,
      receiptUrl: expensesTable.receiptUrl,
      createdAt: expensesTable.createdAt,
    }).from(expensesTable).leftJoin(expenseCategoriesTable, eq(expensesTable.categoryId, expenseCategoriesTable.id)).orderBy(desc(expensesTable.createdAt));
    res.json(rows.map(r => ({ ...r, amount: parseFloat(r.amount ?? "0"), vaultName: "الخزينة الأولى", createdAt: r.createdAt?.toISOString?.() ?? r.createdAt })));
  } catch (err) {
    req.log.error({ err }, "list expenses error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/financial/expenses", async (req, res) => {
  try {
    const { categoryId, amount, vaultId, performedBy, note, receiptUrl } = req.body;
    const [exp] = await db.insert(expensesTable).values({ categoryId, amount: amount.toString(), vaultId, performedBy, note, receiptUrl }).returning();
    await db.update(vaultsTable).set({ balance: sql`balance - ${amount}` }).where(eq(vaultsTable.id, vaultId));
    const [cat] = await db.select({ name: expenseCategoriesTable.name }).from(expenseCategoriesTable).where(eq(expenseCategoriesTable.id, categoryId));
    const [vault] = await db.select({ name: vaultsTable.name }).from(vaultsTable).where(eq(vaultsTable.id, vaultId));
    res.status(201).json({ ...exp, amount: parseFloat(exp.amount ?? "0"), categoryName: cat?.name ?? "", vaultName: vault?.name ?? "", createdAt: exp.createdAt?.toISOString?.() ?? exp.createdAt });
  } catch (err) {
    req.log.error({ err }, "create expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/financial/expense-categories", async (req, res) => {
  try {
    const cats = await db.select().from(expenseCategoriesTable).orderBy(expenseCategoriesTable.name);
    res.json(cats.map(c => ({ ...c, createdAt: c.createdAt?.toISOString?.() ?? c.createdAt })));
  } catch (err) {
    req.log.error({ err }, "expense categories error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/financial/expense-categories", async (req, res) => {
  try {
    const { name, description } = req.body;
    const [cat] = await db.insert(expenseCategoriesTable).values({ name, description }).returning();
    res.status(201).json({ ...cat, createdAt: cat.createdAt?.toISOString?.() ?? cat.createdAt });
  } catch (err) {
    req.log.error({ err }, "create expense category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/financial/expense-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, description } = req.body;
    const [cat] = await db.update(expenseCategoriesTable).set({ name, description }).where(eq(expenseCategoriesTable.id, id)).returning();
    if (!cat) { res.status(404).json({ error: "Category not found" }); return; }
    res.json({ ...cat, createdAt: cat.createdAt?.toISOString?.() ?? cat.createdAt });
  } catch (err) {
    req.log.error({ err }, "update expense category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/financial/expense-categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(expenseCategoriesTable).where(eq(expenseCategoriesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "delete expense category error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/financial/routine-expenses", async (req, res) => {
  try {
    const rows = await db.select({
      id: routineExpensesTable.id,
      categoryId: routineExpensesTable.categoryId,
      categoryName: expenseCategoriesTable.name,
      title: routineExpensesTable.title,
      amount: routineExpensesTable.amount,
      frequency: routineExpensesTable.frequency,
      branch: routineExpensesTable.branch,
      note: routineExpensesTable.note,
      isActive: routineExpensesTable.isActive,
      createdAt: routineExpensesTable.createdAt,
    }).from(routineExpensesTable)
      .leftJoin(expenseCategoriesTable, eq(routineExpensesTable.categoryId, expenseCategoriesTable.id))
      .orderBy(desc(routineExpensesTable.createdAt));
    res.json(rows.map(r => ({ ...r, amount: parseFloat(r.amount ?? "0"), createdAt: r.createdAt?.toISOString?.() ?? r.createdAt })));
  } catch (err) {
    req.log.error({ err }, "list routine expenses error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/financial/routine-expenses", async (req, res) => {
  try {
    const { categoryId, title, amount, frequency, branch, note, isActive } = req.body;
    const [row] = await db.insert(routineExpensesTable).values({ categoryId, title, amount: amount.toString(), frequency, branch, note, isActive: isActive ?? true }).returning();
    const [cat] = await db.select({ name: expenseCategoriesTable.name }).from(expenseCategoriesTable).where(eq(expenseCategoriesTable.id, categoryId));
    res.status(201).json({ ...row, amount: parseFloat(row.amount ?? "0"), categoryName: cat?.name ?? "", createdAt: row.createdAt?.toISOString?.() ?? row.createdAt });
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
    if (categoryId !== undefined) updates.categoryId = categoryId;
    if (title !== undefined) updates.title = title;
    if (amount !== undefined) updates.amount = amount.toString();
    if (frequency !== undefined) updates.frequency = frequency;
    if (branch !== undefined) updates.branch = branch;
    if (note !== undefined) updates.note = note;
    if (isActive !== undefined) updates.isActive = isActive;
    const [row] = await db.update(routineExpensesTable).set(updates).where(eq(routineExpensesTable.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    const [cat] = await db.select({ name: expenseCategoriesTable.name }).from(expenseCategoriesTable).where(eq(expenseCategoriesTable.id, row.categoryId));
    res.json({ ...row, amount: parseFloat(row.amount ?? "0"), categoryName: cat?.name ?? "", createdAt: row.createdAt?.toISOString?.() ?? row.createdAt });
  } catch (err) {
    req.log.error({ err }, "update routine expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/financial/routine-expenses/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(routineExpensesTable).where(eq(routineExpensesTable.id, id));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "delete routine expense error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
