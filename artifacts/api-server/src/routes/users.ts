import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const [{ data: rows, error }, { data: roles }] = await Promise.all([
      supabase.from("system_users").select("*").order("name"),
      supabase.from("roles").select("id, name"),
    ]);
    if (error) throw error;
    const roleMap = Object.fromEntries((roles ?? []).map((r: any) => [r.id, r.name]));
    res.json((rows ?? []).map((u: any) => ({
      id: u.id, name: u.name, username: u.username, email: u.email,
      roleId: u.role_id, roleName: roleMap[u.role_id] ?? "",
      branch: u.branch, isFrozen: u.is_frozen, createdAt: u.created_at,
    })));
  } catch (err) {
    req.log.error({ err }, "list users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { name, username, password, email, roleId, branch } = req.body;
    const { data: user, error } = await supabase.from("system_users").insert({
      name, username, password_hash: password, email, role_id: roleId, branch,
    }).select().single();
    if (error) throw error;
    const { data: role } = await supabase.from("roles").select("name").eq("id", roleId).single();
    res.status(201).json({
      id: (user as any).id, name: (user as any).name, username: (user as any).username,
      email: (user as any).email, roleId: (user as any).role_id, roleName: (role as any)?.name ?? "",
      branch: (user as any).branch, isFrozen: (user as any).is_frozen, createdAt: (user as any).created_at,
    });
  } catch (err) {
    req.log.error({ err }, "create user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.roleId !== undefined) updates.role_id = data.roleId;
    if (data.branch !== undefined) updates.branch = data.branch;
    if (data.isFrozen !== undefined) updates.is_frozen = data.isFrozen;
    if (data.password !== undefined) updates.password_hash = data.password;
    const { data: updated, error } = await supabase.from("system_users").update(updates).eq("id", id).select().single();
    if (error) throw error;
    const { data: roles } = await supabase.from("roles").select("id, name");
    const roleMap = Object.fromEntries((roles ?? []).map((r: any) => [r.id, r.name]));
    res.json({
      id: (updated as any).id, name: (updated as any).name, username: (updated as any).username,
      email: (updated as any).email, roleId: (updated as any).role_id, roleName: roleMap[(updated as any).role_id] ?? "",
      branch: (updated as any).branch, isFrozen: (updated as any).is_frozen, createdAt: (updated as any).created_at,
    });
  } catch (err) {
    req.log.error({ err }, "update user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/roles", async (req, res) => {
  try {
    const { data, error } = await supabase.from("roles").select("*").order("name");
    if (error) throw error;
    res.json((data ?? []).map((r: any) => ({ ...r, permissions: r.permissions ?? {} })));
  } catch (err) {
    req.log.error({ err }, "list roles error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/roles", async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const { data: role, error } = await supabase.from("roles").insert({ name, permissions }).select().single();
    if (error) throw error;
    res.status(201).json(role);
  } catch (err) {
    req.log.error({ err }, "create role error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/roles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const updates: any = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.permissions !== undefined) updates.permissions = data.permissions;
    const { data: updated, error } = await supabase.from("roles").update(updates).eq("id", id).select().single();
    if (error) throw error;
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "update role error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
