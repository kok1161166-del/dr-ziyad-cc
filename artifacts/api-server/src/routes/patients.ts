import { Router } from "express";
import { db } from "@workspace/db";
import { patientsTable, appointmentsTable, visitsTable } from "@workspace/db";
import { eq, and, ilike, or, sql, desc, gte, lte, ne } from "drizzle-orm";

const router = Router();

// GET /patients/next-code
router.get("/patients/next-code", async (req, res) => {
  try {
    const [last] = await db.select({ code: sql<number>`max(local_code)::int` }).from(patientsTable);
    const lastCode = last?.code ?? 9000;
    res.json({ nextCode: lastCode + 1, lastCode });
  } catch (err) {
    req.log.error({ err }, "next-code error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /patients/deleted
router.get("/patients/deleted", async (req, res) => {
  try {
    const patients = await db.select().from(patientsTable).where(eq(patientsTable.isDeleted, true)).orderBy(desc(patientsTable.updatedAt));
    res.json(patients.map(formatPatient));
  } catch (err) {
    req.log.error({ err }, "deleted patients error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /patients
router.get("/patients", async (req, res) => {
  try {
    const { search, gender, ageFrom, ageTo, maritalStatus, nationality, address, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let conditions: any[] = [eq(patientsTable.isDeleted, false)];
    if (search) {
      conditions.push(or(
        ilike(patientsTable.nameAr, `%${search}%`),
        ilike(patientsTable.nameEn, `%${search}%`),
        sql`${patientsTable.localCode}::text ilike ${'%' + search + '%'}`,
        sql`${patientsTable.phones}::text ilike ${'%' + search + '%'}`,
      ));
    }
    if (gender) conditions.push(eq(patientsTable.gender, gender));
    if (maritalStatus) conditions.push(eq(patientsTable.maritalStatus, maritalStatus));
    if (nationality) conditions.push(ilike(patientsTable.nationality, `%${nationality}%`));
    if (address) conditions.push(ilike(patientsTable.address, `%${address}%`));

    const where = and(...conditions);
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(patientsTable).where(where);
    const rows = await db.select().from(patientsTable).where(where).orderBy(desc(patientsTable.createdAt)).limit(limitNum).offset(offset);

    const enriched = await Promise.all(rows.map(async (p) => {
      const [visits] = await db.select({ count: sql<number>`count(*)::int`, last: sql<string>`max(visit_date)::text` }).from(visitsTable).where(eq(visitsTable.patientId, p.id));
      return { ...formatPatient(p), totalVisits: visits?.count ?? 0, lastVisitDate: visits?.last ?? null };
    }));

    res.json({ patients: enriched, total, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "list patients error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /patients
router.post("/patients", async (req, res) => {
  try {
    const data = req.body;
    if (!data.nameAr || !data.gender) return res.status(400).json({ error: "nameAr and gender are required" });

    let localCode = data.localCode;
    if (!localCode) {
      const [last] = await db.select({ code: sql<number>`max(local_code)::int` }).from(patientsTable);
      localCode = (last?.code ?? 9000) + 1;
    }

    const [patient] = await db.insert(patientsTable).values({
      localCode,
      nameAr: data.nameAr,
      nameEn: data.nameEn || null,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth || null,
      phones: data.phones || [],
      homePhone: data.homePhone || null,
      maritalStatus: data.maritalStatus || null,
      nationality: data.nationality || "فلسطين",
      address: data.address || null,
      governorate: data.governorate || null,
      birthPlace: data.birthPlace || null,
      occupation: data.occupation || null,
      email: data.email || null,
      insuranceStatus: data.insuranceStatus || null,
      referredBy: data.referredBy || null,
      notes: data.notes || null,
      photoUrl: data.photoUrl || null,
    }).returning();

    res.status(201).json(formatPatient(patient));
  } catch (err) {
    req.log.error({ err }, "create patient error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /patients/:id
router.get("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [patient] = await db.select().from(patientsTable).where(eq(patientsTable.id, id));
    if (!patient) return res.status(404).json({ error: "Not found" });
    const [visits] = await db.select({ count: sql<number>`count(*)::int`, last: sql<string>`max(visit_date)::text` }).from(visitsTable).where(eq(visitsTable.patientId, id));
    res.json({ ...formatPatient(patient), totalVisits: visits?.count ?? 0, lastVisitDate: visits?.last ?? null });
  } catch (err) {
    req.log.error({ err }, "get patient error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /patients/:id
router.patch("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const updates: any = { updatedAt: new Date() };
    if (data.nameAr !== undefined) updates.nameAr = data.nameAr;
    if (data.nameEn !== undefined) updates.nameEn = data.nameEn;
    if (data.gender !== undefined) updates.gender = data.gender;
    if (data.dateOfBirth !== undefined) updates.dateOfBirth = data.dateOfBirth;
    if (data.phones !== undefined) updates.phones = data.phones;
    if (data.homePhone !== undefined) updates.homePhone = data.homePhone;
    if (data.maritalStatus !== undefined) updates.maritalStatus = data.maritalStatus;
    if (data.nationality !== undefined) updates.nationality = data.nationality;
    if (data.address !== undefined) updates.address = data.address;
    if (data.governorate !== undefined) updates.governorate = data.governorate;
    if (data.birthPlace !== undefined) updates.birthPlace = data.birthPlace;
    if (data.occupation !== undefined) updates.occupation = data.occupation;
    if (data.email !== undefined) updates.email = data.email;
    if (data.insuranceStatus !== undefined) updates.insuranceStatus = data.insuranceStatus;
    if (data.referredBy !== undefined) updates.referredBy = data.referredBy;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.photoUrl !== undefined) updates.photoUrl = data.photoUrl;
    const [updated] = await db.update(patientsTable).set(updates).where(eq(patientsTable.id, id)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    const [visits] = await db.select({ count: sql<number>`count(*)::int`, last: sql<string>`max(visit_date)::text` }).from(visitsTable).where(eq(visitsTable.patientId, id));
    res.json({ ...formatPatient(updated), totalVisits: visits?.count ?? 0, lastVisitDate: visits?.last ?? null });
  } catch (err) {
    req.log.error({ err }, "update patient error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /patients/:id (soft delete)
router.delete("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(patientsTable).set({ isDeleted: true, updatedAt: new Date() }).where(eq(patientsTable.id, id));
    res.json({ success: true, message: "Patient deleted" });
  } catch (err) {
    req.log.error({ err }, "delete patient error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /patients/:id/restore
router.post("/patients/:id/restore", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [p] = await db.update(patientsTable).set({ isDeleted: false, updatedAt: new Date() }).where(eq(patientsTable.id, id)).returning();
    res.json(formatPatient(p));
  } catch (err) {
    req.log.error({ err }, "restore patient error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /patients/:id/permanent-delete
router.delete("/patients/:id/permanent-delete", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(patientsTable).where(eq(patientsTable.id, id));
    res.json({ success: true, message: "Patient permanently deleted" });
  } catch (err) {
    req.log.error({ err }, "permanent delete error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /patients/:id/visits
router.get("/patients/:id/visits", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const visits = await db.select().from(visitsTable).where(eq(visitsTable.patientId, id)).orderBy(desc(visitsTable.visitDate));
    res.json(visits.map(v => ({
      id: v.id,
      patientId: v.patientId,
      appointmentId: v.appointmentId,
      date: v.visitDate,
      services: v.services ?? [],
      diagnosis: v.diagnosis,
      totalFee: parseFloat(v.totalFee ?? "0"),
      paidAmount: parseFloat(v.paidAmount ?? "0"),
      remainingAmount: parseFloat(v.totalFee ?? "0") - parseFloat(v.paidAmount ?? "0"),
      notes: v.notes,
    })));
  } catch (err) {
    req.log.error({ err }, "patient visits error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function formatPatient(p: any) {
  const dob = p.dateOfBirth;
  let ageYears = null, ageMonths = null, ageDays = null;
  if (dob) {
    const birth = new Date(dob);
    const now = new Date();
    ageYears = now.getFullYear() - birth.getFullYear();
    ageMonths = now.getMonth() - birth.getMonth();
    ageDays = now.getDate() - birth.getDate();
    if (ageDays < 0) { ageMonths--; ageDays += 30; }
    if (ageMonths < 0) { ageYears--; ageMonths += 12; }
  }
  return {
    id: p.id,
    localCode: p.localCode,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    gender: p.gender,
    dateOfBirth: p.dateOfBirth,
    ageYears,
    ageMonths,
    ageDays,
    phones: p.phones ?? [],
    homePhone: p.homePhone,
    maritalStatus: p.maritalStatus,
    nationality: p.nationality,
    address: p.address,
    governorate: p.governorate,
    birthPlace: p.birthPlace,
    occupation: p.occupation,
    email: p.email,
    insuranceStatus: p.insuranceStatus,
    referredBy: p.referredBy,
    notes: p.notes,
    photoUrl: p.photoUrl,
    isDeleted: p.isDeleted,
    totalVisits: p.totalVisits ?? 0,
    lastVisitDate: p.lastVisitDate ?? null,
    createdAt: p.createdAt?.toISOString?.() ?? p.createdAt,
  };
}

export default router;
