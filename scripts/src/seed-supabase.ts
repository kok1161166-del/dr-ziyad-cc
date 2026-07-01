import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function seed() {
  console.log("🌱 Seeding database via Supabase API...");

  // Branches
  const { data: branches } = await supabase.from("branches").select("id, name").limit(2);
  if (!branches?.length) {
    await supabase.from("branches").insert([
      { name: "فرع غزة", name_en: "Gaza Branch" },
      { name: "فرع خان يونس", name_en: "Khan Younis Branch" },
    ]);
    console.log("✓ Branches seeded");
  } else {
    console.log("→ Branches already exist:", branches.map(b => b.name).join(", "));
  }

  // Roles
  const { data: roles } = await supabase.from("roles").select("id, name");
  if (!roles?.length) {
    await supabase.from("roles").insert([
      { name: "مدير النظام", permissions: { managePatients: true, manageAppointments: true, manageFinancial: true, manageInventory: true, manageSettings: true, viewAnalytics: true, manageUsers: true } },
      { name: "طبيب", permissions: { managePatients: true, manageAppointments: true, viewAnalytics: true } },
      { name: "موظف استقبال", permissions: { managePatients: true, manageAppointments: true } },
      { name: "محاسب", permissions: { manageFinancial: true, viewAnalytics: true } },
    ]);
    console.log("✓ Roles seeded");
  } else {
    console.log("→ Roles already exist:", roles.map(r => r.name).join(", "));
  }

  // Users
  const { data: users } = await supabase.from("system_users").select("username");
  if (!users?.length) {
    const { data: roles } = await supabase.from("roles").select("id, name");
    const roleMap = Object.fromEntries((roles || []).map((r: any) => [r.name, r.id]));
    const { data: branches } = await supabase.from("branches").select("id").limit(1);

    await supabase.from("system_users").insert([
      { username: "admin", password_hash: "admin123", role_id: roleMap["مدير النظام"], name: "مدير النظام", branch_id: branches?.[0]?.id || null, is_frozen: false },
      { username: "doctor", password_hash: "doctor123", role_id: roleMap["طبيب"], name: "د. زياد أبو دقة", branch_id: branches?.[0]?.id || null, is_frozen: false },
      { username: "secretary", password_hash: "secretary123", role_id: roleMap["موظف استقبال"], name: "موظف الاستقبال", branch_id: branches?.[0]?.id || null, is_frozen: false },
    ]);
    console.log("✓ Users seeded");
  } else {
    console.log("→ Users already exist:", users.map((u: any) => u.username).join(", "));
  }

  // Service Groups
  const { data: groups } = await supabase.from("service_groups").select("id, name");
  if (!groups?.length) {
    await supabase.from("service_groups").insert([
      { name: "استشارات", type: "private" },
      { name: "ليزر", type: "private" },
      { name: "حقن تجميلية", type: "private" },
      { name: "عناية بالبشرة", type: "private" },
    ]);
    console.log("✓ Service groups seeded");
  } else {
    console.log("→ Service groups already exist:", groups.map((g: any) => g.name).join(", "));
  }

  // Services (matching exact DB schema)
  const { data: svcs } = await supabase.from("services").select("id").limit(1);
  if (!svcs?.length) {
    const { data: groups } = await supabase.from("service_groups").select("id, name");
    const gMap = Object.fromEntries((groups || []).map((g: any) => [g.name, g.id]));

    await supabase.from("services").insert([
      { name: "استشارة تجميلية", group_id: gMap["استشارات"], branch: "فرع غزة", price: "100", duration_minutes: 30, price_type: "fixed" },
      { name: "جلسة ليزر إزالة شعر", group_id: gMap["ليزر"], branch: "فرع غزة", price: "200", duration_minutes: 45, price_type: "fixed" },
      { name: "حقن فيلر", group_id: gMap["حقن تجميلية"], branch: "فرع غزة", price: "500", duration_minutes: 60, price_type: "fixed" },
      { name: "حقن بوتوكس", group_id: gMap["حقن تجميلية"], branch: "فرع غزة", price: "400", duration_minutes: 30, price_type: "fixed" },
      { name: "تنظيف بشرة", group_id: gMap["عناية بالبشرة"], branch: "فرع غزة", price: "150", duration_minutes: 60, price_type: "fixed" },
    ]);
    console.log("✓ Services seeded");
  } else {
    console.log("→ Services already exist");
  }

  // Vaults
  const { data: vaults } = await supabase.from("vaults").select("id").limit(1);
  if (!vaults?.length) {
    await supabase.from("vaults").insert([
      { name: "الخزنة الرئيسية - غزة", balance: "0", branch: "فرع غزة" },
      { name: "الخزنة الرئيسية - خان يونس", balance: "0", branch: "فرع خان يونس" },
    ]);
    console.log("✓ Vaults seeded");
  } else {
    console.log("→ Vaults already exist");
  }

  // Expense Categories
  const { data: cats } = await supabase.from("expense_categories").select("id").limit(1);
  if (!cats?.length) {
    await supabase.from("expense_categories").insert([
      { name: "فواتير كهرباء ومياه" },
      { name: "رواتب" },
      { name: "صيانة" },
      { name: "مستلزمات طبية" },
      { name: "إيجار" },
    ]);
    console.log("✓ Expense categories seeded");
  } else {
    console.log("→ Expense categories already exist");
  }

  // System Settings
  const { data: settings } = await supabase.from("system_settings").select("id").limit(1);
  if (!settings?.length) {
    await supabase.from("system_settings").insert([
      { key: "clinic_name_ar", value: "عيادة د. زياد أبو دقة للتجميل والليزر" },
      { key: "clinic_name_en", value: "Dr. Ziyad Abu Daqqa Clinic" },
      { key: "default_currency", value: "ILS" },
    ]);
    console.log("✓ System settings seeded");
  } else {
    console.log("→ System settings already exist");
  }

  // Tax Settings
  const { data: tax } = await supabase.from("tax_settings").select("id").limit(1);
  if (!tax?.length) {
    await supabase.from("tax_settings").insert([
      { name: "ضريبة القيمة المضافة", rate: 17, is_default: true },
    ]);
    console.log("✓ Tax settings seeded");
  } else {
    console.log("→ Tax settings already exist");
  }

  // Working Days
  const { data: wd } = await supabase.from("working_days").select("id").limit(1);
  if (!wd?.length) {
    const { data: branches } = await supabase.from("branches").select("id");
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "السبت"];
    for (const branch of branches || []) {
      for (const day of days) {
        await supabase.from("working_days").insert({
          branch_id: (branch as any).id,
          day_name: day,
          is_working: true,
          start_time: "09:00",
          end_time: "21:00",
        });
      }
    }
    console.log("✓ Working days seeded");
  } else {
    console.log("→ Working days already exist");
  }

  // Referral Providers
  const { data: refs } = await supabase.from("referral_providers").select("id").limit(1);
  if (!refs?.length) {
    await supabase.from("referral_providers").insert([
      { name: "د. أحمد شبير", specialty: "جراحة تجميل", phone: "0599123456", branch: "فرع غزة" },
      { name: "د. مريم الحاج", specialty: "جلدية", phone: "0599654321", branch: "فرع خان يونس" },
    ]);
    console.log("✓ Referral providers seeded");
  } else {
    console.log("→ Referral providers already exist");
  }

  // Prescription Templates
  const { data: rx } = await supabase.from("prescription_templates").select("id").limit(1);
  if (!rx?.length) {
    await supabase.from("prescription_templates").insert([
      { name: "بروتوكول ما بعد الليزر", content: "مرهم فيوسيدين كريم مرتين يومياً\nواقي شمس SPF50+\nكريم مرطب", category: "ليزر" },
      { name: "بروتوكول ما بعد الفيلر", content: "كمادات باردة لمدة 48 ساعة\nتجنب الضغط على المنطقة\nممنوع الرياضة لمدة 24 ساعة", category: "حقن" },
    ]);
    console.log("✓ Prescription templates seeded");
  } else {
    console.log("→ Prescription templates already exist");
  }

  console.log("✅ Seeding complete!");
}

seed().catch(console.error);
