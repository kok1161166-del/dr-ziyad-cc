import { Router } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

router.get("/analytics/patients", async (req, res) => {
  try {
    const { data: patients, error } = await supabase.from("patients").select("date_of_birth, gender, nationality, governorate").eq("is_deleted", false);
    if (error) throw error;

    const total = (patients ?? []).length;
    let male = 0, female = 0;
    const ageGroups: Record<string, number> = { "0-10": 0, "11-20": 0, "21-30": 0, "31-40": 0, "41-50": 0, "51-60": 0, "60+": 0 };
    const nationalities: Record<string, number> = {};
    const governorates: Record<string, number> = {};

    for (const p of patients ?? []) {
      if (p.gender === "male") male++; else female++;
      if (p.nationality) nationalities[p.nationality] = (nationalities[p.nationality] ?? 0) + 1;
      if (p.governorate) governorates[p.governorate] = (governorates[p.governorate] ?? 0) + 1;
      if (p.date_of_birth) {
        const age = new Date().getFullYear() - new Date(p.date_of_birth).getFullYear();
        if (age <= 10) ageGroups["0-10"]++;
        else if (age <= 20) ageGroups["11-20"]++;
        else if (age <= 30) ageGroups["21-30"]++;
        else if (age <= 40) ageGroups["31-40"]++;
        else if (age <= 50) ageGroups["41-50"]++;
        else if (age <= 60) ageGroups["51-60"]++;
        else ageGroups["60+"]++;
      }
    }

    res.json({
      ageDistribution: Object.entries(ageGroups).map(([label, count]) => ({ label, count })),
      genderMale: male,
      genderFemale: female,
      nationalityStats: Object.entries(nationalities).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([label, count]) => ({ label, count, percentage: total > 0 ? Math.round(count / total * 1000) / 10 : 0 })),
      governorateStats: Object.entries(governorates).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count, percentage: total > 0 ? Math.round(count / total * 1000) / 10 : 0 })),
    });
  } catch (err) {
    req.log.error({ err }, "patient analytics error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/appointments", async (req, res) => {
  try {
    const { data: rows, error } = await supabase.from("appointments").select("status");
    if (error) throw error;
    const statusMap: Record<string, number> = {};
    for (const r of rows ?? []) statusMap[r.status] = (statusMap[r.status] ?? 0) + 1;
    const total = (rows ?? []).length;
    res.json({
      statusBreakdown: Object.entries(statusMap).map(([status, count]) => ({ status, count, percentage: total > 0 ? Math.round(count / total * 1000) / 10 : 0 })),
      topServices: [],
      byStaff: [],
    });
  } catch (err) {
    req.log.error({ err }, "appointment analytics error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/clinical", async (req, res) => {
  try {
    const { data: visits, error } = await supabase.from("visits").select("diagnosis").not("diagnosis", "is", null);
    if (error) throw error;
    const diagMap: Record<string, number> = {};
    for (const v of visits ?? []) {
      if (v.diagnosis) diagMap[v.diagnosis] = (diagMap[v.diagnosis] ?? 0) + 1;
    }
    const total = Object.values(diagMap).reduce((s, c) => s + c, 0);
    const topDiagnoses = Object.entries(diagMap).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([diagnosis, count]) => ({ diagnosis, count, percentage: total > 0 ? Math.round(count / total * 1000) / 10 : 0 }));
    res.json({
      topDiagnoses,
      topMedications: [],
      referralStats: [],
    });
  } catch (err) {
    req.log.error({ err }, "clinical analytics error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
