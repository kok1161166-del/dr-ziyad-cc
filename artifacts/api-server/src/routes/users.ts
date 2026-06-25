import { Router } from "express";
import { db } from "@workspace/db";
import { systemUsersTable, rolesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/users", async (req, res) => {
  try {
    const rows = await db.select().from(systemUsersTable).orderBy(systemUsersTable.name);
    const roles = await db.select().from(rolesTable);
    const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));
    res.json(rows.map(u => ({ id: u.id, name: u.name, username: u.username, email: u.email, roleId: u.roleId, roleName: roleMap[u.roleId] ?? "", branch: u.branch, isFrozen: u.isFrozen, createdAt: u.createdAt?.toISOString?.() ?? u.createdAt })));
  } catch (err) {
    req.log.error({ err }, "list users error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { name, username, password, email, roleId, branch } = req.body;
    const [user] = await db.insert(systemUsersTable).values({ name, username, passwordHash: password, email, roleId, branch }).returning();
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, roleId));
    res.status(201).json({ id: user.id, name: user.name, username: user.username, email: user.email, roleId: user.roleId, roleName: role?.name ?? "", branch: user.branch, isFrozen: user.isFrozen, createdAt: user.createdAt?.toISOString?.() ?? user.createdAt });
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
    if (data.roleId !== undefined) updates.roleId = data.roleId;
    if (data.branch !== undefined) updates.branch = data.branch;
    if (data.isFrozen !== undefined) updates.isFrozen = data.isFrozen;
    if (data.password !== undefined) updates.passwordHash = data.password;
    const [updated] = await db.update(systemUsersTable).set(updates).where(eq(systemUsersTable.id, id)).returning();
    const roles = await db.select().from(rolesTable);
    const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));
    res.json({ id: updated.id, name: updated.name, username: updated.username, email: updated.email, roleId: updated.roleId, roleName: roleMap[updated.roleId] ?? "", branch: updated.branch, isFrozen: updated.isFrozen, createdAt: updated.createdAt?.toISOString?.() ?? updated.createdAt });
  } catch (err) {
    req.log.error({ err }, "update user error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/roles", async (req, res) => {
  try {
    const rows = await db.select().from(rolesTable).orderBy(rolesTable.name);
    res.json(rows.map(r => ({ ...r, permissions: r.permissions ?? {}, createdAt: r.createdAt?.toISOString?.() ?? r.createdAt })));
  } catch (err) {
    req.log.error({ err }, "list roles error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/roles", async (req, res) => {
  try {
    const { name, permissions } = req.body;
    const [role] = await db.insert(rolesTable).values({ name, permissions }).returning();
    res.status(201).json({ ...role, createdAt: role.createdAt?.toISOString?.() ?? role.createdAt });
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
    const [updated] = await db.update(rolesTable).set(updates).where(eq(rolesTable.id, id)).returning();
    res.json({ ...updated, createdAt: updated.createdAt?.toISOString?.() ?? updated.createdAt });
  } catch (err) {
    req.log.error({ err }, "update role error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
