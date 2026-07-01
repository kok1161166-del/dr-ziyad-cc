import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/patients/next-code", async (req, res) => {
  try {
    const { data } = await supabase.from("patients").select("local_code").order("local_code", { ascending: false }).limit(1);
    const lastCode = data?.[0]?.local_code ?? 9000;
    res.json({ nextCode: lastCode + 1, lastCode });
  } catch (err) {
    req.log.error({ err }, "next-code error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/patients/deleted", async (req, res) => {
  try {
    const { data, error } = await supabase.from("patients").select("*").eq("is_deleted", true).order("updated_at", { ascending: false });
    if (error) throw error;
    res.json((data ?? []).map(formatPatient));
  } catch (err) {
    req.log.error({ err }, "deleted patients error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/patients", async (req, res) => {
  try {
    const { search, gender, maritalStatus, nationality, address, page = "1", limit = "20" } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let query = supabase.from("patients").select("*", { count: "exact" }).eq("is_deleted", false);
    if (search) {
      const filters = [`name_ar.ilike.%${search}%`, `name_en.ilike.%${search}%`];
      const codeNum = parseInt(search);
      if (!isNaN(codeNum)) {
        filters.push(`local_code.eq.${codeNum}`);
      }
      query = query.or(filters.join(','));
    }
    if (gender) {
      const genders = new Set([gender]);
      if (gender === "ذكر") genders.add("male");
      else if (gender === "أنثى") genders.add("female");
      else if (gender === "male") genders.add("ذكر");
      else if (gender === "female") genders.add("أنثى");
      query = query.in("gender", [...genders]);
    }
    if (maritalStatus) {
      const statuses = new Set([maritalStatus]);
      const msMap: Record<string, string> = { "أعزب": "Single", "متزوج": "Married", "مطلقة": "Divorced", "أرمل": "Widowed", "Single": "أعزب", "Married": "متزوج", "Divorced": "مطلقة", "Widowed": "أرمل" };
      const pair = msMap[maritalStatus];
      if (pair) statuses.add(pair);
      query = query.in("marital_status", [...statuses]);
    }
    if (nationality) query = query.ilike("nationality", `%${nationality}%`);
    if (address) query = query.ilike("address", `%${address}%`);

    const { data: rows, count, error } = await query.order("created_at", { ascending: false }).range(offset, offset + limitNum - 1);
    if (error) throw error;

      const enriched = await Promise.all((rows ?? []).map(async (p) => {
        const { data: visits } = await supabase.from("visits").select("visit_date").eq("patient_id", p.id);
        const totalVisits = visits?.length ?? 0;
        const lastVisitDate = visits?.sort((a, b) => b.visit_date.localeCompare(a.visit_date))[0]?.visit_date ?? p.created_at ?? null;
        return { ...formatPatient(p), totalVisits, lastVisitDate };
      }));

    res.json({ patients: enriched, total: count ?? 0, page: pageNum, limit: limitNum });
  } catch (err) {
    req.log.error({ err }, "list patients error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/patients", async (req, res) => {
  try {
    const data = req.body;
    if (!data.nameAr || !data.gender) return res.status(400).json({ error: "nameAr and gender are required" });

    let localCode = data.localCode;
    if (!localCode) {
      const { data: last } = await supabase.from("patients").select("local_code").order("local_code", { ascending: false }).limit(1);
      localCode = (last?.[0]?.local_code ?? 9000) + 1;
    }

    const { data: patient, error } = await supabase.from("patients").insert({
      local_code: localCode,
      name_ar: data.nameAr,
      name_en: data.nameEn || null,
      gender: data.gender,
      date_of_birth: data.dateOfBirth || null,
      phones: data.phones || [],
      home_phone: data.homePhone || null,
      marital_status: data.maritalStatus || null,
      nationality: data.nationality || "فلسطين",
      address: data.address || null,
      governorate: data.governorate || null,
      birth_place: data.birthPlace || null,
      occupation: data.occupation || null,
      email: data.email || null,
      insurance_status: data.insuranceStatus || null,
      referred_by: data.referredBy || null,
      notes: data.notes || null,
      photo_url: data.photoUrl || null,
    }).select().single();

    if (error) throw error;
    res.status(201).json(formatPatient(patient));
  } catch (err) {
    req.log.error({ err }, "create patient error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { data: patient, error } = await supabase.from("patients").select("*").eq("id", id).single();
    if (error || !patient) return res.status(404).json({ error: "Not found" });
    const { data: visits } = await supabase.from("visits").select("visit_date").eq("patient_id", id);
    const totalVisits = visits?.length ?? 0;
    const lastVisitDate = visits?.sort((a, b) => b.visit_date.localeCompare(a.visit_date))[0]?.visit_date ?? null;
    res.json({ ...formatPatient(patient), totalVisits, lastVisitDate });
  } catch (err) {
    req.log.error({ err }, "get patient error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const updates: any = { updated_at: new Date().toISOString() };
    if (data.nameAr !== undefined) updates.name_ar = data.nameAr;
    if (data.nameEn !== undefined) updates.name_en = data.nameEn;
    if (data.gender !== undefined) updates.gender = data.gender;
    if (data.dateOfBirth !== undefined) updates.date_of_birth = data.dateOfBirth;
    if (data.phones !== undefined) updates.phones = data.phones;
    if (data.homePhone !== undefined) updates.home_phone = data.homePhone;
    if (data.maritalStatus !== undefined) updates.marital_status = data.maritalStatus;
    if (data.nationality !== undefined) updates.nationality = data.nationality;
    if (data.address !== undefined) updates.address = data.address;
    if (data.governorate !== undefined) updates.governorate = data.governorate;
    if (data.birthPlace !== undefined) updates.birth_place = data.birthPlace;
    if (data.occupation !== undefined) updates.occupation = data.occupation;
    if (data.email !== undefined) updates.email = data.email;
    if (data.insuranceStatus !== undefined) updates.insurance_status = data.insuranceStatus;
    if (data.referredBy !== undefined) updates.referred_by = data.referredBy;
    if (data.notes !== undefined) updates.notes = data.notes;
    if (data.photoUrl !== undefined) updates.photo_url = data.photoUrl;

    const { data: updated, error } = await supabase.from("patients").update(updates).eq("id", id).select().single();
    if (error || !updated) return res.status(404).json({ error: "Not found" });
    const { data: visits } = await supabase.from("visits").select("visit_date").eq("patient_id", id);
    const totalVisits = visits?.length ?? 0;
    const lastVisitDate = visits?.sort((a, b) => b.visit_date.localeCompare(a.visit_date))[0]?.visit_date ?? null;
    res.json({ ...formatPatient(updated), totalVisits, lastVisitDate });
  } catch (err) {
    req.log.error({ err }, "update patient error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/patients/all", async (req, res) => {
  try {
    const { data, error } = await supabase.from("patients").update({ is_deleted: true, updated_at: new Date().toISOString() }).neq("id", 0).select("id");
    if (error) throw error;
    res.json({ success: true, message: "تم حذف جميع المرضى", count: data?.length ?? 0 });
  } catch (err) {
    req.log.error({ err }, "delete all patients error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabase.from("patients").update({ is_deleted: true, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    res.json({ success: true, message: "Patient deleted" });
  } catch (err) {
    req.log.error({ err }, "delete patient error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/patients/:id/restore", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { data: p, error } = await supabase.from("patients").update({ is_deleted: false, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) throw error;
    res.json(formatPatient(p));
  } catch (err) {
    req.log.error({ err }, "restore patient error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/patients/:id/permanent-delete", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true, message: "Patient permanently deleted" });
  } catch (err) {
    req.log.error({ err }, "permanent delete error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/patients/:id/visits", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { data: visits, error } = await supabase.from("visits").select("*").eq("patient_id", id).order("visit_date", { ascending: false });
    if (error) throw error;

    const enriched = await Promise.all((visits ?? []).map(async (v) => {
      const [addons, injections, laser] = await Promise.all([
        supabase.from("session_addons").select("*").eq("visit_id", v.id),
        supabase.from("injection_logs").select("*").eq("visit_id", v.id),
        supabase.from("laser_logs").select("*").eq("visit_id", v.id),
      ]);
      const duration = (v.start_time && v.end_time)
        ? Math.floor((new Date(v.end_time).getTime() - new Date(v.start_time).getTime()) / 1000)
        : null;
      return {
        id: v.id,
        patientId: v.patient_id,
        appointmentId: v.appointment_id,
        doctorId: v.doctor_id,
        date: v.visit_date,
        services: v.services ?? [],
        diagnosis: v.diagnosis,
        treatmentPlan: v.treatment_plan,
        prescription: v.prescription,
        notes: v.notes,
        startTime: v.start_time,
        endTime: v.end_time,
        duration,
        totalFee: parseFloat(v.total_fee ?? "0"),
        paidAmount: parseFloat(v.paid_amount ?? "0"),
        remainingAmount: parseFloat(v.total_fee ?? "0") - parseFloat(v.paid_amount ?? "0"),
        sessionAddons: (addons.data ?? []).map(a => ({
          id: a.id,
          itemType: a.item_type,
          name: a.name,
          quantity: a.quantity,
          unitPrice: parseFloat(a.unit_price ?? "0"),
          totalPrice: parseFloat(a.total_price ?? "0"),
        })),
        injectionLogs: (injections.data ?? []).map(i => ({
          id: i.id,
          zone: i.zone,
          productName: i.product_name,
          brand: i.brand,
          units: i.units,
        })),
        laserLogs: (laser.data ?? []).map(l => ({
          id: l.id,
          device: l.device,
          spotSize: l.spot_size,
          fluence: l.fluence,
          pulseWidth: l.pulse_width,
          passes: l.passes,
          area: l.area,
          notes: l.notes,
        })),
      };
    }));
    res.json(enriched);
  } catch (err) {
    req.log.error({ err }, "patient visits error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/patients/bulk-import", async (req, res) => {
  try {
    const { patients, batchSize = 500 } = req.body;
    if (!Array.isArray(patients) || patients.length === 0) {
      return res.status(400).json({ error: "patients array is required" });
    }

    const total = patients.length;
    let imported = 0;
    let errors: { row: number; error: string }[] = [];

    for (let i = 0; i < total; i += batchSize) {
      const batch = patients.slice(i, i + batchSize);
      const batchRows: any[] = [];

      for (let j = 0; j < batch.length; j++) {
        const idx = i + j;
        const p = batch[j];
        try {
          let localCode = p.localCode;
          if (!localCode || localCode === "لا يوجد") {
            const { data: last } = await supabase.from("patients").select("local_code").order("local_code", { ascending: false }).limit(1);
            localCode = (last?.[0]?.local_code ?? 9000) + 1;
          }

          let dateOfBirth = p.dateOfBirth || null;
          if (!dateOfBirth && p.age) {
            dateOfBirth = parseAgeToDateOfBirth(p.age);
          }

          let phones: { number: string; owner?: string }[] = [];
          if (p.mobile) phones.push({ number: p.mobile, owner: "patient" });
          if (p.relativeMobile) phones.push({ number: p.relativeMobile, owner: p.relativeName || "relative" });
          if (p.relativePhone) phones.push({ number: p.relativePhone, owner: p.relativeName || "relative" });

          let notesParts: string[] = [];
          if (p.bio) notesParts.push(`السيرة: ${p.bio}`);
          if (p.noChilds) notesParts.push(`عدد الأطفال: ${p.noChilds}`);
          if (p.husbandName) notesParts.push(`اسم الزوج: ${p.husbandName}`);
          if (p.husbandJob) notesParts.push(`عمل الزوج: ${p.husbandJob}`);
          if (p.dateOfFirstVisit) notesParts.push(`تاريخ أول زيارة: ${p.dateOfFirstVisit}`);
          if (p.createdBy) notesParts.push(`تم بواسطة: ${p.createdBy}`);
          if (p.city) notesParts.push(`المدينة: ${p.city}`);
          const notes = notesParts.length > 0 ? notesParts.join(" | ") : (p.notes || null);

          const row: Record<string, any> = {
            local_code: parseInt(localCode) || Math.floor(Math.random() * 9000) + 1000,
            name_ar: p.nameAr || "غير محدد",
            name_en: p.nameEn || null,
            gender: p.gender || "ذكر",
            date_of_birth: dateOfBirth,
            phones: phones,
            home_phone: p.phone || p.homePhone || null,
            marital_status: p.maritalStatus || null,
            nationality: p.nationality || "فلسطين",
            address: p.address || null,
            governorate: p.governorate || null,
            birth_place: p.birthPlace || null,
            occupation: p.occupation || null,
            email: p.email || null,
            insurance_status: p.insuranceStatus || null,
            referred_by: p.referredBy || null,
            notes: notes,
            is_deleted: false,
            updated_at: new Date().toISOString(),
          };
          if (p.createdAt) {
            row.created_at = p.createdAt;
          }
          batchRows.push(row);
        } catch (err: any) {
          errors.push({ row: idx + 1, error: err.message });
        }
      }

      if (batchRows.length > 0) {
        const deduped = Array.from(new Map(batchRows.map(r => [r.local_code, r])).values());
        const { data, error } = await supabase.from("patients").upsert(deduped, { onConflict: "local_code", ignoreDuplicates: false }).select("local_code");
        if (error) {
          errors.push({ row: i + 1, error: error.message });
        } else {
          imported += (data ?? deduped).length;
        }
      }

      if (i + batchSize < total) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    res.json({ imported, total, errors: errors.length, errorDetails: errors });
  } catch (err) {
    req.log.error({ err }, "bulk import error");
    res.status(500).json({ error: "Internal server error" });
  }
});

function parseAgeToDateOfBirth(ageStr: string): string | null {
  if (!ageStr) return null;
  const str = ageStr.trim();
  const yearsMatch = str.match(/(\d+)\s*سنة/);
  const monthsMatch = str.match(/(\d+)\s*شهر/);
  const daysMatch = str.match(/(\d+)\s*يوم/);
  const years = yearsMatch ? parseInt(yearsMatch[1]) : 0;
  const months = monthsMatch ? parseInt(monthsMatch[1]) : 0;
  const days = daysMatch ? parseInt(daysMatch[1]) : 0;
  if (years === 0 && months === 0 && days === 0) return null;
  const now = new Date();
  const birth = new Date(now.getFullYear() - years, now.getMonth() - months, now.getDate() - days);
  return birth.toISOString().split("T")[0];
}

function formatPatient(p: any) {
  const dob = p.date_of_birth;
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
    localCode: p.local_code,
    nameAr: p.name_ar,
    nameEn: p.name_en,
    gender: p.gender,
    dateOfBirth: p.date_of_birth,
    ageYears, ageMonths, ageDays,
    phones: p.phones ?? [],
    homePhone: p.home_phone,
    maritalStatus: p.marital_status,
    nationality: p.nationality,
    address: p.address,
    governorate: p.governorate,
    birthPlace: p.birth_place,
    occupation: p.occupation,
    email: p.email,
    insuranceStatus: p.insurance_status,
    referredBy: p.referred_by,
    notes: p.notes,
    photoUrl: p.photo_url,
    isDeleted: p.is_deleted,
    createdAt: p.created_at,
  };
}

export default router;
