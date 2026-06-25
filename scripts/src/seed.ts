import { db } from "@workspace/db";
import {
  patientsTable,
  appointmentsTable,
  visitsTable,
  paymentsTable,
  vaultsTable,
  vaultTransactionsTable,
  expenseCategoriesTable,
  expensesTable,
  servicesTable,
  serviceGroupsTable,
  inventoryItemsTable,
  branchesTable,
  rolesTable,
  systemUsersTable,
  prescriptionTemplatesTable,
  investigationTemplatesTable,
  taxSettingsTable,
  systemSettingsTable,
  referralProvidersTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // Branches
  await db.insert(branchesTable).values([
    { name: "فرع غزة", nameEn: "Gaza Branch" },
    { name: "فرع خان يونس", nameEn: "Khan Younis Branch" },
  ]).onConflictDoNothing();
  console.log("✓ Branches seeded");

  // Roles
  const [adminRole] = await db.insert(rolesTable).values([
    { name: "مدير النظام", permissions: { managePatients: true, manageAppointments: true, manageFinancial: true, manageInventory: true, manageSettings: true, viewAnalytics: true, manageUsers: true } },
    { name: "طبيب", permissions: { managePatients: true, manageAppointments: true, viewAnalytics: true } },
    { name: "موظف استقبال", permissions: { managePatients: true, manageAppointments: true } },
    { name: "محاسب", permissions: { manageFinancial: true, viewAnalytics: true } },
  ]).onConflictDoNothing().returning();
  console.log("✓ Roles seeded");

  const roles = await db.select().from(rolesTable);
  const adminRoleId = roles.find(r => r.name === "مدير النظام")?.id ?? 1;

  // System users
  await db.insert(systemUsersTable).values([
    { name: "د. زياد أبو دقة", username: "dr.ziyad", passwordHash: "hashed_password", email: "dr.ziyad@clinic.ps", roleId: adminRoleId, branch: "غزة", isFrozen: false },
    { name: "أحمد العمري", username: "ahmed", passwordHash: "hashed_password", email: "ahmed@clinic.ps", roleId: adminRoleId, branch: "غزة", isFrozen: false },
  ]).onConflictDoNothing();
  console.log("✓ Users seeded");

  // Service groups
  const groups = await db.insert(serviceGroupsTable).values([
    { name: "خاص", type: "private" },
    { name: "تأمين صحي", type: "insurance" },
    { name: "UNRWA", type: "insurance" },
  ]).onConflictDoNothing().returning();
  const groupList = await db.select().from(serviceGroupsTable);
  const privateGroupId = groupList.find(g => g.name === "خاص")?.id ?? 1;
  console.log("✓ Service groups seeded");

  // Services
  await db.insert(servicesTable).values([
    { name: "كشف طبي عام", branch: "غزة", groupId: privateGroupId, price: "50", patientFee: "50", durationMinutes: 20 },
    { name: "كشف تخصصي", branch: "غزة", groupId: privateGroupId, price: "80", patientFee: "80", durationMinutes: 30 },
    { name: "تنظيف الأسنان", branch: "غزة", groupId: privateGroupId, price: "120", patientFee: "120", durationMinutes: 45 },
    { name: "خلع ضرس", branch: "غزة", groupId: privateGroupId, price: "100", patientFee: "100", durationMinutes: 30 },
    { name: "حشو عصب", branch: "غزة", groupId: privateGroupId, price: "300", patientFee: "300", durationMinutes: 60 },
    { name: "تركيب تاج", branch: "غزة", groupId: privateGroupId, price: "500", patientFee: "500", durationMinutes: 90 },
    { name: "تبييض الأسنان", branch: "غزة", groupId: privateGroupId, price: "400", patientFee: "400", durationMinutes: 60 },
    { name: "زراعة الأسنان", branch: "غزة", groupId: privateGroupId, price: "1500", patientFee: "1500", durationMinutes: 120 },
    { name: "كشف طبي عام", branch: "خان يونس", groupId: privateGroupId, price: "50", patientFee: "50", durationMinutes: 20 },
    { name: "كشف تخصصي", branch: "خان يونس", groupId: privateGroupId, price: "80", patientFee: "80", durationMinutes: 30 },
  ]).onConflictDoNothing();
  console.log("✓ Services seeded");

  // Vaults
  const vaults = await db.insert(vaultsTable).values([
    { name: "الخزينة الرئيسية", balance: "15000" },
    { name: "خزينة المصروفات", balance: "3500" },
    { name: "خزينة خان يونس", balance: "8200" },
  ]).onConflictDoNothing().returning();
  console.log("✓ Vaults seeded");

  // Expense categories
  await db.insert(expenseCategoriesTable).values([
    { name: "رواتب الموظفين" },
    { name: "فواتير الكهرباء والمياه" },
    { name: "مستلزمات طبية" },
    { name: "صيانة وإصلاحات" },
    { name: "إيجار العيادة" },
    { name: "مواصلات" },
    { name: "أخرى" },
  ]).onConflictDoNothing();
  console.log("✓ Expense categories seeded");

  // Patients
  const patientsData = [
    { localCode: 9001, nameAr: "محمد أحمد عبد الله", nameEn: "Mohamed Ahmed Abdullah", gender: "male", dateOfBirth: "1990-05-15", phones: [{ number: "0591234567", owner: "المريض" }], nationality: "فلسطين", governorate: "غزة", maritalStatus: "متزوج", occupation: "مهندس" },
    { localCode: 9002, nameAr: "فاطمة محمود حسن", nameEn: "Fatima Mahmoud Hassan", gender: "female", dateOfBirth: "1985-08-22", phones: [{ number: "0592345678", owner: "المريض" }], nationality: "فلسطين", governorate: "غزة", maritalStatus: "متزوجة", occupation: "معلمة" },
    { localCode: 9003, nameAr: "عمر يوسف الخطيب", nameEn: "Omar Yousef Al-Khatib", gender: "male", dateOfBirth: "1978-03-10", phones: [{ number: "0593456789", owner: "المريض" }], nationality: "فلسطين", governorate: "خان يونس", maritalStatus: "متزوج", occupation: "تاجر" },
    { localCode: 9004, nameAr: "سارة إبراهيم النجار", nameEn: "Sara Ibrahim Al-Najjar", gender: "female", dateOfBirth: "1995-11-30", phones: [{ number: "0594567890", owner: "المريض" }], nationality: "فلسطين", governorate: "غزة", maritalStatus: "أعزب", occupation: "طالبة" },
    { localCode: 9005, nameAr: "خالد رضا الحداد", nameEn: "Khaled Rida Al-Haddad", gender: "male", dateOfBirth: "1972-07-05", phones: [{ number: "0595678901", owner: "المريض" }], nationality: "فلسطين", governorate: "رفح", maritalStatus: "متزوج", occupation: "موظف حكومي" },
    { localCode: 9006, nameAr: "نور الدين سليمان", nameEn: "Nour Eddin Suleiman", gender: "male", dateOfBirth: "1988-01-18", phones: [{ number: "0596789012", owner: "المريض" }], nationality: "فلسطين", governorate: "غزة", maritalStatus: "متزوج", occupation: "طبيب" },
    { localCode: 9007, nameAr: "ريم حسن العمري", nameEn: "Reem Hassan Al-Omari", gender: "female", dateOfBirth: "2000-09-25", phones: [{ number: "0597890123", owner: "الأب" }], nationality: "فلسطين", governorate: "الشمال", maritalStatus: "أعزب", occupation: "طالبة" },
    { localCode: 9008, nameAr: "جمال محمد أبو زيد", nameEn: "Jamal Mohammed Abu Zaid", gender: "male", dateOfBirth: "1965-04-12", phones: [{ number: "0598901234", owner: "المريض" }], nationality: "فلسطين", governorate: "غزة", maritalStatus: "متزوج", occupation: "محاسب" },
    { localCode: 9009, nameAr: "سلمى أحمد البرغوثي", nameEn: "Salma Ahmed Al-Barghouti", gender: "female", dateOfBirth: "1993-06-08", phones: [{ number: "0599012345", owner: "المريض" }], nationality: "فلسطين", governorate: "خان يونس", maritalStatus: "متزوجة", occupation: "ممرضة" },
    { localCode: 9010, nameAr: "طارق عمر الديب", nameEn: "Tarek Omar Al-Dayb", gender: "male", dateOfBirth: "1982-12-03", phones: [{ number: "0591234568", owner: "المريض" }], nationality: "فلسطين", governorate: "الوسطى", maritalStatus: "متزوج", occupation: "مقاول" },
    { localCode: 9011, nameAr: "آمنة صالح الرفاعي", nameEn: "Amena Saleh Al-Rifai", gender: "female", dateOfBirth: "1970-02-28", phones: [{ number: "0592345679", owner: "المريض" }], nationality: "فلسطين", governorate: "غزة", maritalStatus: "أرملة", occupation: "ربة منزل" },
    { localCode: 9012, nameAr: "يوسف كمال الشيخ", nameEn: "Yousef Kamal Al-Sheikh", gender: "male", dateOfBirth: "2010-07-14", phones: [{ number: "0593456780", owner: "الأب" }], nationality: "فلسطين", governorate: "غزة", maritalStatus: null, occupation: "طالب" },
  ];

  const insertedPatients = await db.insert(patientsTable).values(patientsData as any[]).onConflictDoNothing().returning();
  console.log(`✓ ${insertedPatients.length} patients seeded`);

  const allPatients = await db.select().from(patientsTable);
  if (allPatients.length === 0) {
    console.log("No patients to seed appointments for");
    return;
  }

  // Appointments (today)
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const statuses = ["waiting_arrival", "in_reception", "in_examination", "completed", "session_done", "postponed", "no_show", "waiting_arrival", "in_reception", "completed", "waiting_arrival", "in_examination"];
  const times = ["08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00"];
  const svcList = await db.select().from(servicesTable);

  const todayAppts = allPatients.slice(0, Math.min(12, allPatients.length)).map((p, i) => ({
    patientId: p.id,
    branch: "غزة",
    appointmentDate: today,
    appointmentTime: times[i % times.length],
    status: statuses[i % statuses.length],
    source: i % 3 === 0 ? "phone" : "walk_in",
    paymentMethod: i % 4 === 0 ? "card" : "cash",
    serviceIds: svcList.length > 0 ? [svcList[i % Math.min(8, svcList.length)].id] : [],
    totalFee: svcList.length > 0 ? svcList[i % Math.min(8, svcList.length)].price : "50",
    paidAmount: i % 3 === 0 ? "0" : (i % 2 === 0 ? "50" : svcList.length > 0 ? svcList[i % Math.min(8, svcList.length)].price : "50"),
    notes: null,
  }));

  const insertedAppts = await db.insert(appointmentsTable).values(todayAppts as any[]).onConflictDoNothing().returning();
  console.log(`✓ ${insertedAppts.length} appointments seeded`);

  // Visits for completed patients
  const completedAppts = insertedAppts.filter(a => a.status === "completed" || a.status === "session_done");
  if (completedAppts.length > 0) {
    await db.insert(visitsTable).values(completedAppts.map(a => ({
      patientId: a.patientId,
      appointmentId: a.id,
      visitDate: today,
      services: [],
      totalFee: a.totalFee ?? "0",
      paidAmount: a.paidAmount ?? "0",
    }))).onConflictDoNothing();
  }

  // Historical visits
  const historicalVisits = allPatients.slice(0, 6).map((p, i) => ({
    patientId: p.id,
    appointmentId: null,
    visitDate: yesterday,
    services: ["كشف طبي عام"],
    diagnosis: i % 2 === 0 ? "التهاب لوزتين" : "ضغط الدم",
    totalFee: "50",
    paidAmount: "50",
  }));
  await db.insert(visitsTable).values(historicalVisits as any[]).onConflictDoNothing();
  console.log("✓ Visits seeded");

  // Vault transactions
  const vaultList = await db.select().from(vaultsTable);
  if (vaultList.length > 0) {
    await db.insert(vaultTransactionsTable).values([
      { vaultId: vaultList[0].id, type: "deposit", amount: "5000", note: "إيداع مدفوعات المرضى", performedBy: "د. زياد" },
      { vaultId: vaultList[0].id, type: "withdraw", amount: "1500", note: "مصروفات متنوعة", performedBy: "أحمد" },
      { vaultId: vaultList[1].id, type: "deposit", amount: "2000", note: "تحويل للمصروفات", performedBy: "د. زياد" },
    ]).onConflictDoNothing();
  }
  console.log("✓ Vault transactions seeded");

  // Expense records
  const expCats = await db.select().from(expenseCategoriesTable);
  if (expCats.length > 0 && vaultList.length > 0) {
    await db.insert(expensesTable).values([
      { categoryId: expCats[0].id, amount: "3000", vaultId: vaultList[0].id, performedBy: "المحاسب", note: "رواتب شهر يوليو" },
      { categoryId: expCats[2].id, amount: "800", vaultId: vaultList[1].id, performedBy: "أحمد", note: "قفازات وكمامات" },
      { categoryId: expCats[1].id, amount: "450", vaultId: vaultList[0].id, performedBy: "أحمد", note: "فاتورة كهرباء" },
    ]).onConflictDoNothing();
  }
  console.log("✓ Expenses seeded");

  // Inventory items
  await db.insert(inventoryItemsTable).values([
    { branch: "غزة", name: "قفازات طبية", quantity: "200", unit: "علبة", lowStockThreshold: "20", supplierName: "شركة الأمل الطبية" },
    { branch: "غزة", name: "كمامات جراحية", quantity: "150", unit: "علبة", lowStockThreshold: "15", supplierName: "شركة الأمل الطبية" },
    { branch: "غزة", name: "محاقن 5 مل", quantity: "500", unit: "قطعة", lowStockThreshold: "50", supplierName: "شركة النجاح" },
    { branch: "غزة", name: "بنج سنان كارتريدج", quantity: "10", unit: "علبة", lowStockThreshold: "3", expiryDate: "2025-12-31", supplierName: "شركة الدواء" },
    { branch: "غزة", name: "مادة الحشو المؤقت", quantity: "25", unit: "قطعة", lowStockThreshold: "5", expiryDate: "2025-06-30" },
    { branch: "خان يونس", name: "قفازات طبية", quantity: "8", unit: "علبة", lowStockThreshold: "20", supplierName: "شركة الخليج" },
    { branch: "خان يونس", name: "شاش طبي", quantity: "60", unit: "لفة", lowStockThreshold: "10" },
  ]).onConflictDoNothing();
  console.log("✓ Inventory seeded");

  // Medical templates
  await db.insert(prescriptionTemplatesTable).values([
    { name: "التهاب الحلق", category: "التهابات", content: "Amoxicillin 500mg - 3x daily for 7 days\nParacetamol 500mg - as needed\nLozenge tablets - as needed" },
    { name: "ضغط الدم", category: "قلب وأوعية", content: "Amlodipine 5mg - 1x daily morning\nAspirin 75mg - 1x daily\nMonitor BP twice daily" },
    { name: "السكري", category: "غدد صماء", content: "Metformin 500mg - 2x daily with meals\nMonitor blood sugar daily\nLow-sugar diet" },
  ]).onConflictDoNothing();

  await db.insert(investigationTemplatesTable).values([
    { name: "تحاليل دم شاملة", type: "labs", tests: ["CBC", "ESR", "Blood glucose", "HbA1c", "Lipid profile"] },
    { name: "وظائف الكلى", type: "labs", tests: ["Creatinine", "Urea", "Uric acid", "Electrolytes"] },
    { name: "أشعة صدر", type: "radiology", tests: ["Chest X-ray PA view", "Lateral view"] },
    { name: "أشعة مقطعية رأس", type: "radiology", tests: ["CT Brain with contrast", "CT Brain without contrast"] },
  ]).onConflictDoNothing();
  console.log("✓ Medical templates seeded");

  // Referral providers
  await db.insert(referralProvidersTable).values([
    { name: "د. عمر الشافعي", specialty: "باطنة", phone: "0591111111", address: "غزة - الرمال" },
    { name: "مستشفى الشفاء", specialty: "مستشفى عام", phone: "082835800", address: "غزة - الرمال" },
    { name: "د. سمر النجار", specialty: "جراحة أسنان", phone: "0592222222", address: "غزة - الشجاعية" },
  ]).onConflictDoNothing();

  // System settings
  await db.insert(systemSettingsTable).values({ activeBranch: "غزة", appointmentOrder: "by_time", autoRefreshMinutes: 10 }).onConflictDoNothing();
  await db.insert(taxSettingsTable).values({ branch: "all", taxType: "on_request", taxTitle: "ضريبة القيمة المضافة", taxPercentage: "16" }).onConflictDoNothing();
  console.log("✓ Settings seeded");

  console.log("\n✅ Database seeded successfully!");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
