import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/tasks", async (req, res) => {
  try {
    const { branch, isCompleted } = req.query;
    let query = supabase.from("tasks").select("*").order("created_at", { ascending: false });
    if (branch) query = query.eq("branch", branch as string);
    if (isCompleted === "true") query = query.eq("is_completed", true);
    else if (isCompleted === "false") query = query.eq("is_completed", false);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    req.log.error({ err }, "list tasks error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/tasks", async (req, res) => {
  try {
    const { title, content, assignedTo, priority, dueDate, branch } = req.body;
    const { data: task, error } = await supabase.from("tasks").insert({
      title, content, assigned_to: assignedTo,
      priority: priority ?? "normal", due_date: dueDate, branch,
    }).select().single();
    if (error) throw error;
    res.status(201).json(task);
  } catch (err) {
    req.log.error({ err }, "create task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.title !== undefined) updates.title = data.title;
    if (data.content !== undefined) updates.content = data.content;
    if (data.assignedTo !== undefined) updates.assigned_to = data.assignedTo;
    if (data.priority !== undefined) updates.priority = data.priority;
    if (data.isCompleted !== undefined) updates.is_completed = data.isCompleted;
    if (data.dueDate !== undefined) updates.due_date = data.dueDate;
    if (data.branch !== undefined) updates.branch = data.branch;
    const { data: task, error } = await supabase.from("tasks").update(updates).eq("id", id).select().single();
    if (error || !task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  } catch (err) {
    req.log.error({ err }, "update task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/tasks/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "delete task error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
