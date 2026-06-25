import { Router } from "express";
import { db } from "@workspace/db";
import { systemUsersTable, rolesTable, staffDetailsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/staff", async (req, res) => {
  try {
    const users = await db.select().from(systemUsersTable).orderBy(systemUsersTable.name);
    const roles = await db.select().from(rolesTable);
    const details = await db.select().from(staffDetailsTable);

    const roleMap = Object.fromEntries(roles.map(r => [r.id, r.name]));
    const detailMap = Object.fromEntries(details.map(d => [d.userId, d]));

    const staff = users.map(u => {
      const d = detailMap[u.id];
      return {
        id: d?.id ?? u.id,
        userId: u.id,
        name: u.name,
        username: u.username,
        email: u.email ?? null,
        roleId: u.roleId,
        roleName: roleMap[u.roleId] ?? "",
        branch: u.branch ?? null,
        isFrozen: u.isFrozen,
        position: d?.position ?? null,
        specialty: d?.specialty ?? null,
        phone: d?.phone ?? null,
        salary: d?.salary ? parseFloat(d.salary) : null,
        joiningDate: d?.joiningDate ?? null,
        workDays: (d?.workDays as string[]) ?? [],
        shiftStart: d?.shiftStart ?? null,
        shiftEnd: d?.shiftEnd ?? null,
        notes: d?.notes ?? null,
        createdAt: u.createdAt?.toISOString?.() ?? String(u.createdAt),
      };
    });

    res.json(staff);
  } catch (err) {
    req.log.error({ err }, "list staff error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/staff", async (req, res) => {
  try {
    const { userId, position, specialty, phone, salary, joiningDate, workDays, shiftStart, shiftEnd, notes } = req.body;

    const [existing] = await db.select().from(staffDetailsTable).where(eq(staffDetailsTable.userId, userId));
    let detail;
    if (existing) {
      [detail] = await db.update(staffDetailsTable)
        .set({ position, specialty, phone, salary: salary?.toString(), joiningDate, workDays, shiftStart, shiftEnd, notes, updatedAt: new Date() })
        .where(eq(staffDetailsTable.userId, userId))
        .returning();
    } else {
      [detail] = await db.insert(staffDetailsTable)
        .values({ userId, position, specialty, phone, salary: salary?.toString(), joiningDate, workDays: workDays ?? [], shiftStart, shiftEnd, notes })
        .returning();
    }

    const [user] = await db.select().from(systemUsersTable).where(eq(systemUsersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, user.roleId));

    res.status(201).json({
      id: detail.id,
      userId: user.id,
      name: user.name,
      username: user.username,
      email: user.email ?? null,
      roleId: user.roleId,
      roleName: role?.name ?? "",
      branch: user.branch ?? null,
      isFrozen: user.isFrozen,
      position: detail.position ?? null,
      specialty: detail.specialty ?? null,
      phone: detail.phone ?? null,
      salary: detail.salary ? parseFloat(detail.salary) : null,
      joiningDate: detail.joiningDate ?? null,
      workDays: (detail.workDays as string[]) ?? [],
      shiftStart: detail.shiftStart ?? null,
      shiftEnd: detail.shiftEnd ?? null,
      notes: detail.notes ?? null,
      createdAt: user.createdAt?.toISOString?.() ?? String(user.createdAt),
    });
  } catch (err) {
    req.log.error({ err }, "create staff details error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/staff/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { position, specialty, phone, salary, joiningDate, workDays, shiftStart, shiftEnd, notes } = req.body;

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (position !== undefined) updates.position = position;
    if (specialty !== undefined) updates.specialty = specialty;
    if (phone !== undefined) updates.phone = phone;
    if (salary !== undefined) updates.salary = salary?.toString() ?? null;
    if (joiningDate !== undefined) updates.joiningDate = joiningDate;
    if (workDays !== undefined) updates.workDays = workDays;
    if (shiftStart !== undefined) updates.shiftStart = shiftStart;
    if (shiftEnd !== undefined) updates.shiftEnd = shiftEnd;
    if (notes !== undefined) updates.notes = notes;

    let [detail] = await db.select().from(staffDetailsTable).where(eq(staffDetailsTable.userId, userId));
    if (!detail) {
      [detail] = await db.insert(staffDetailsTable).values({ userId, workDays: [], ...updates }).returning();
    } else {
      [detail] = await db.update(staffDetailsTable).set(updates).where(eq(staffDetailsTable.userId, userId)).returning();
    }

    const [user] = await db.select().from(systemUsersTable).where(eq(systemUsersTable.id, userId));
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const [role] = await db.select().from(rolesTable).where(eq(rolesTable.id, user.roleId));

    res.json({
      id: detail.id,
      userId: user.id,
      name: user.name,
      username: user.username,
      email: user.email ?? null,
      roleId: user.roleId,
      roleName: role?.name ?? "",
      branch: user.branch ?? null,
      isFrozen: user.isFrozen,
      position: detail.position ?? null,
      specialty: detail.specialty ?? null,
      phone: detail.phone ?? null,
      salary: detail.salary ? parseFloat(detail.salary) : null,
      joiningDate: detail.joiningDate ?? null,
      workDays: (detail.workDays as string[]) ?? [],
      shiftStart: detail.shiftStart ?? null,
      shiftEnd: detail.shiftEnd ?? null,
      notes: detail.notes ?? null,
      createdAt: user.createdAt?.toISOString?.() ?? String(user.createdAt),
    });
  } catch (err) {
    req.log.error({ err }, "update staff details error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
