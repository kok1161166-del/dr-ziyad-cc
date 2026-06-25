import { Router } from "express";
import { db } from "@workspace/db";
import { tasksTable } from "@workspace/db";
import { eq, desc, and, isNull, isNotNull } from "drizzle-orm";

const router = Router();

router.get("/tasks", async (req, res) => {
  try {
    const { branch, isCompleted } = req.query;

    const conditions = [];
    if (branch) conditions.push(eq(tasksTable.branch, branch as string));
    if (isCompleted === "true") conditions.push(eq(tasksTable.isCompleted, true));
    else if (isCompleted === "false") conditions.push(eq(tasksTable.isCompleted, false));

    const rows = await db
      .select()
      .from(tasksTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(tasksTable.createdAt));

    res.json(rows.map(r => ({
      ...r,
      createdAt: r.createdAt?.toISOString?.() ?? String(r.createdAt),
      updatedAt: r.updatedAt?.toISOString?.() ?? String(r.updatedAt),
    })));
  } catch (err) {
    req.log.error({ err }, "list tasks error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const { title, content, assignedTo, priority, dueDate, branch } = req.body;
    const [task] = await db.insert(tasksTable).values({
      title,
      content,
      assignedTo,
      priority: priority ?? "normal",
      dueDate,
      branch,
    }).returning();
    res.status(201).json({
      ...task,
      createdAt: task.createdAt?.toISOString?.() ?? String(task.createdAt),
      updatedAt: task.updatedAt?.toISOString?.() ?? String(task.updatedAt),
    });
  } catch (err) {
    req.log.error({ err }, "create task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.content !== undefined) updates.content = data.content;
    if (data.assignedTo !== undefined) updates.assignedTo = data.assignedTo;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.isCompleted !== undefined) updates.isCompleted = data.isCompleted;
    if (data.dueDate !== undefined) updates.dueDate = data.dueDate;
    if (data.branch !== undefined) updates.branch = data.branch;

    const [task] = await db.update(tasksTable).set(updates).where(eq(tasksTable.id, id)).returning();
    if (!task) { res.status(404).json({ error: "Task not found" }); return; }
    res.json({
      ...task,
      createdAt: task.createdAt?.toISOString?.() ?? String(task.createdAt),
      updatedAt: task.updatedAt?.toISOString?.() ?? String(task.updatedAt),
    });
  } catch (err) {
    req.log.error({ err }, "update task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "delete task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
