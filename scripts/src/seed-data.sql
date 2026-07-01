-- ============================================================
-- SEED DATA ONLY - Dr. Ziyad Abu Daqqa Clinic
-- Run this AFTER the schema SQLs have been applied
-- Safe to run multiple times (all use IF NOT EXISTS / ON CONFLICT)
-- ============================================================

-- ============================================================
-- 1. ADD MISSING COLUMNS (if not already present)
-- ============================================================
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone2 text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_owner text DEFAULT 'المريض';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS total_visits integer DEFAULT 0;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_visit_date timestamptz;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS id_number text;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS queue_number integer;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS exam_fee_amount numeric(10,2) DEFAULT '0';

-- ============================================================
-- 2. SEED PRODUCTS (if not already seeded)
-- ============================================================
INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description) VALUES
  ('واقي شمس SPF50+', 'SUN001', 35, 70, 50, 'piece', 'واقيات شمس', 'واقي شمس طبي مناسب للبشرة الحساسة'),
  ('كريم ترميم بعد الليزر', 'REC001', 45, 90, 30, 'piece', 'عناية بعد الليزر', 'كريم مهدئ ومجدد للبشرة بعد جلسات الليزر'),
  ('مقشر حمض الجليكوليك 15%', 'GLY001', 55, 110, 25, 'bottle', 'مقشرات', 'مقشر كيميائي لتجديد خلايا البشرة'),
  ('سيروم فيتامين C 20%', 'VITC01', 40, 85, 40, 'bottle', 'سيرومات', 'سيروم مضاد للأكسدة لتفتيح وتوحيد لون البشرة'),
  ('مرهم فيوسيدين كريم', 'FUS001', 8, 18, 100, 'tube', 'مراهم طبية', 'مضاد حيوي موضعي للالتهابات الجلدية'),
  ('قناع ترطيب عميق', 'MAS001', 25, 50, 35, 'piece', 'أقنعة', 'قناع مرطب بالهيالورونيك أسيد'),
  ('كريم ليلي ترميمي', 'NIG001', 60, 120, 20, 'jar', 'كريمات', 'كريم ليلي لتجديد البشرة أثناء النوم'),
  ('تونر للبشرة الدهنية', 'TON001', 25, 45, 45, 'bottle', 'تونر', 'تونر منظم لإفرازات البشرة الدهنية'),
  ('مصل هيالورونيك أسيد', 'HYA001', 75, 150, 15, 'bottle', 'سيرومات', 'مصل حمض الهيالورونيك المركز للترطيب العميق'),
  ('قفازات ليزر (عبوة)', 'GLV001', 10, 25, 200, 'box', 'مستلزمات', 'قفازات واقية لجلسات الليزر - عبوة 100 حبة')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. SEED USERS (if not already seeded)
-- ============================================================
INSERT INTO system_users (username, password_hash, name, role_id, branch, is_frozen)
SELECT 'drziyad', 'clinic123', 'د. زياد أبو دقة', r.id, 'فرع غزة', false
FROM roles r WHERE r.name = 'doctor'
AND NOT EXISTS (SELECT 1 FROM system_users WHERE username = 'drziyad');

INSERT INTO system_users (username, password_hash, name, role_id, branch, is_frozen)
SELECT 'secretary', 'clinic123', 'سكرتير الاستقبال', r.id, 'فرع غزة', false
FROM roles r WHERE r.name = 'receptionist'
AND NOT EXISTS (SELECT 1 FROM system_users WHERE username = 'secretary');

-- ============================================================
-- 4. SEED REFERRAL PROVIDERS
-- ============================================================
INSERT INTO referral_providers (name, specialty, phone) VALUES
  ('د. محمد الجعبري', 'طب عام', '0599111111'),
  ('د. سامي المصري', 'جلدية', '0599222222'),
  ('د. ليلى شريف', 'تجميل أسنان', '0599333333')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 5. SEED PRESCRIPTION TEMPLATES
-- ============================================================
INSERT INTO prescription_templates (name, content, category) VALUES
  ('روتين عناية يومي', '1. غسول يومي صباح ومساء\n2. تونر منظم\n3. مرطب هيالورونيك أسيد\n4. واقي شمس SPF50+ صباحاً', 'عناية بشرة'),
  ('ما بعد الليزر', '1. كريم ترميم بعد الليزر مرتين يومياً\n2. تجنب التعرض للشمس مباشرة\n3. واقي شمس SPF50+ باستمرار\n4. مرهم فيوسيدين عند الاحمرار', 'ليزر'),
  ('ما بعد التقشير', '1. غسول لطيف فقط\n2. مرطب غني هيالورونيك أسيد\n3. واقي شمس SPF50+ ضروري\n4. تجنب التقشير لمدة أسبوع', 'تقشير')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. SEED PATIENTS
-- ============================================================
INSERT INTO patients (local_code, name_ar, gender, phones, governorate, city, neighborhood, address, marital_status, nationality, occupation, source, notes, total_visits)
SELECT 1001, 'نورا أحمد', 'female', '[{"number": "0599123456", "owner": "المريض"}, {"number": "0561111111"}]', 'غزة', 'مدينة غزة', 'حي الرمال (الشمالي والجنوبي)', 'الرمال الجنوبي، شارع الوحدة، عمارة 5', 'متزوج/متزوجة', 'فلسطيني', 'مهندسة', 'إنستغرام', 'حساسية من الليزر', 5
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE local_code = 1001);

INSERT INTO patients (local_code, name_ar, gender, phones, governorate, city, marital_status, nationality, occupation, source, total_visits)
SELECT 1002, 'سارة خالد', 'female', '[{"number": "0567890123", "owner": "الأب"}]', 'خان يونس', 'خان يونس', 'أعزب/عزباء', 'فلسطيني', 'طالبة', 'فيسبوك', 2
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE local_code = 1002);

INSERT INTO patients (local_code, name_ar, gender, phones, governorate, city, address, marital_status, nationality, occupation, source, total_visits)
SELECT 1003, 'مريم عمر', 'female', '[{"number": "0598765432", "owner": "الزوج"}]', 'دير البلح (المنطقة الوسطى)', 'النصيرات', 'مخيم النصيرات، شارع السوق', 'متزوج/متزوجة', 'فلسطيني', 'ربة منزل', 'توصية من مريض', 3
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE local_code = 1003);

INSERT INTO patients (local_code, name_ar, gender, phones, governorate, city, neighborhood, address, marital_status, nationality, occupation, source, notes, total_visits)
SELECT 1004, 'ندى سمير', 'female', '[{"number": "0561234567", "owner": "المريض"}]', 'غزة', 'مدينة غزة', 'حي الشجاعية', 'الشجاعية، شارع صلاح الدين', 'أعزب/عزباء', 'فلسطيني', 'صيدلانية', 'جوجل', 'استشارة سابقة', 1
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE local_code = 1004);

INSERT INTO patients (local_code, name_ar, gender, phones, governorate, city, address, marital_status, nationality, occupation, source, total_visits)
SELECT 1005, 'رنا حسن', 'female', '[{"number": "0592345678", "owner": "المريض"}]', 'رفح', 'رفح', 'رفح، بجانب مسجد النور', 'متزوج/متزوجة', 'فلسطيني', 'معلمة', 'إنستغرام', 4
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE local_code = 1005);

INSERT INTO patients (local_code, name_ar, gender, phones, governorate, city, address, marital_status, nationality, occupation, source, notes, total_visits)
SELECT 1006, 'هند يوسف', 'female', '[{"number": "0563456789", "owner": "الأخت"}]', 'شمال غزة', 'بيت لاهيا', 'بيت لاهيا، شارع المدرسة', 'مطلق/مطلقة', 'فلسطيني', 'موظفة', 'توصية من مريض', 'تطلب دكتور محمد', 2
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE local_code = 1006);

INSERT INTO patients (local_code, name_ar, gender, phones, governorate, city, marital_status, nationality, occupation, source, total_visits)
SELECT 1007, 'ليلى عادل', 'female', '[{"number": "0594567890", "owner": "الأم"}]', 'غزة', 'الزهراء', 'أعزب/عزباء', 'فلسطيني', 'طبيبة', 'طبيب عام', 1
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE local_code = 1007);

INSERT INTO patients (local_code, name_ar, gender, phones, governorate, city, neighborhood, address, marital_status, nationality, occupation, source, total_visits)
SELECT 1008, 'أمل جمال', 'female', '[{"number": "0565678901", "owner": "الزوج"}]', 'غزة', 'مدينة غزة', 'حي الصبرة', 'الصبرة، شارع النفق', 'متزوج/متزوجة', 'فلسطيني', 'موظفة', 'إعلان', 6
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE local_code = 1008);

INSERT INTO patients (local_code, name_ar, gender, phones, governorate, city, address, marital_status, nationality, occupation, source, total_visits)
SELECT 1009, 'وفاء سامي', 'female', '[{"number": "0596789012", "owner": "المريض"}]', 'خان يونس', 'عبسان الكبيرة', 'عبسان الكبيرة، شارع المحطة', 'أرمل/أرملة', 'فلسطيني', 'متقاعدة', 'موقع العيادة', 2
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE local_code = 1009);

INSERT INTO patients (local_code, name_ar, gender, phones, governorate, city, marital_status, nationality, occupation, source)
SELECT 1010, 'دينا محمد', 'female', '[{"number": "0567890123", "owner": "الأب"}]', 'دير البلح (المنطقة الوسطى)', 'دير البلح', 'أعزب/عزباء', 'فلسطيني', 'طالبة', 'تيك توك'
WHERE NOT EXISTS (SELECT 1 FROM patients WHERE local_code = 1010);

-- ============================================================
-- 7. SEED APPOINTMENTS (one per patient with all statuses)
-- ============================================================
DO $$
DECLARE
  doc_id integer;
  pat record;
BEGIN
  SELECT id INTO doc_id FROM system_users WHERE username = 'drziyad' LIMIT 1;

  IF doc_id IS NOT NULL THEN
    -- 101 - waiting_reception
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 101) THEN
      SELECT id INTO pat FROM patients WHERE local_code = 1001;
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number)
      VALUES (pat.id, doc_id, 'فرع غزة', CURRENT_DATE, '10:00', 'waiting_reception', 'walk_in', '["تنظيف بشرة عميق"]'::jsonb, 101);
    END IF;

    -- 102 - exam_fee_pending
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 102) THEN
      SELECT id INTO pat FROM patients WHERE local_code = 1002;
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number)
      VALUES (pat.id, doc_id, 'فرع غزة', CURRENT_DATE, '10:30', 'exam_fee_pending', 'walk_in', '["جلسة ليزر إزالة شعر"]'::jsonb, 102);
    END IF;

    -- 103 - waiting_doctor_approval (exam fee paid)
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 103) THEN
      SELECT id INTO pat FROM patients WHERE local_code = 1004;
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount)
      VALUES (pat.id, doc_id, 'فرع غزة', CURRENT_DATE, '11:00', 'waiting_doctor_approval', 'walk_in', '["ميزوثيرابي"]'::jsonb, 103, true, 150);
    END IF;

    -- 104 - waiting_doctor_approval
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 104) THEN
      SELECT id INTO pat FROM patients WHERE local_code = 1005;
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount)
      VALUES (pat.id, doc_id, 'فرع غزة', CURRENT_DATE, '11:30', 'waiting_doctor_approval', 'walk_in', '["حقن فيلر"]'::jsonb, 104, true, 150);
    END IF;

    -- 105 - doctor_approved
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 105) THEN
      SELECT id INTO pat FROM patients WHERE local_code = 1006;
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, doctor_approved_at)
      VALUES (pat.id, doc_id, 'فرع غزة', CURRENT_DATE, '12:00', 'doctor_approved', 'walk_in', '["حقن بوتوكس"]'::jsonb, 105, true, 150, now());
    END IF;

    -- 106 - in_examination
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 106) THEN
      SELECT id INTO pat FROM patients WHERE local_code = 1007;
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, doctor_approved_at)
      VALUES (pat.id, doc_id, 'فرع غزة', CURRENT_DATE, '12:30', 'in_examination', 'walk_in', '["تقشير كيميائي"]'::jsonb, 106, true, 150, now());
    END IF;

    -- 107 - exam_completed (paid exam fee, total_fee set)
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 107) THEN
      SELECT id INTO pat FROM patients WHERE local_code = 1008;
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, total_fee, paid_amount)
      VALUES (pat.id, doc_id, 'فرع غزة', CURRENT_DATE, '13:00', 'exam_completed', 'walk_in', '["هيدرا فيشل"]'::jsonb, 107, true, 150, 650, 150);
    END IF;

    -- 108 - checkout_pending
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 108) THEN
      SELECT id INTO pat FROM patients WHERE local_code = 1003;
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, total_fee, paid_amount)
      VALUES (pat.id, doc_id, 'فرع غزة', CURRENT_DATE, '13:30', 'checkout_pending', 'walk_in', '["بلازما للشعر"]'::jsonb, 108, true, 150, 850, 150);
    END IF;

    -- 109 - completed (fully paid)
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 109) THEN
      SELECT id INTO pat FROM patients WHERE local_code = 1009;
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, total_fee, paid_amount, checkout_at)
      VALUES (pat.id, doc_id, 'فرع غزة', CURRENT_DATE, '14:00', 'completed', 'walk_in', '["نضارة بشرة"]'::jsonb, 109, true, 150, 700, 700, now());
    END IF;

    -- 110 - cancelled
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 110) THEN
      SELECT id INTO pat FROM patients WHERE local_code = 1010;
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number)
      VALUES (pat.id, doc_id, 'فرع غزة', CURRENT_DATE, '14:30', 'cancelled', 'walk_in', '["تقشير كيميائي"]'::jsonb, 110);
    END IF;
  END IF;
END $$;

-- ============================================================
-- 8. SEED VISITS (for completed + in-progress appointments)
-- ============================================================
DO $$
DECLARE
  doc_id integer;
  apt record;
  pat_id integer;
BEGIN
  SELECT id INTO doc_id FROM system_users WHERE username = 'drziyad' LIMIT 1;

  IF doc_id IS NOT NULL THEN
    -- Completed visit for appointment 109
    IF NOT EXISTS (SELECT 1 FROM visits v JOIN appointments a ON v.appointment_id = a.id WHERE a.queue_number = 109) THEN
      SELECT a.id, a.patient_id INTO apt FROM appointments a WHERE a.queue_number = 109;
      INSERT INTO visits (patient_id, appointment_id, visit_date, services, diagnosis, total_fee, paid_amount)
      VALUES (apt.patient_id, apt.id, CURRENT_DATE, '["نضارة بشرة"]'::jsonb, 'بشرة دهنية مع مسام واسعة وحب شباب خفيف', 550, 550);
    END IF;

    -- In-progress visit for appointment 106
    IF NOT EXISTS (SELECT 1 FROM visits v JOIN appointments a ON v.appointment_id = a.id WHERE a.queue_number = 106) THEN
      SELECT a.id, a.patient_id INTO apt FROM appointments a WHERE a.queue_number = 106;
      INSERT INTO visits (patient_id, appointment_id, visit_date, services, diagnosis, total_fee, paid_amount)
      VALUES (apt.patient_id, apt.id, CURRENT_DATE, '["تقشير كيميائي"]'::jsonb, 'جفاف البشرة مع خطوط دقيقة في منطقة الجبهة', 300, 300);
    END IF;
  END IF;
END $$;

-- ============================================================
-- 9. SEED PAYMENT for completed appointment 109
-- ============================================================
DO $$
DECLARE
  apt_id integer;
  pat_id integer;
BEGIN
  SELECT a.id, a.patient_id INTO apt_id, pat_id FROM appointments a WHERE a.queue_number = 109;
  IF apt_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM payments WHERE appointment_id = apt_id) THEN
    INSERT INTO payments (appointment_id, amount, payment_method, note)
    VALUES (apt_id, 700, 'cash', 'دفع كامل قيمة الجلسة');
  END IF;
END $$;

-- ============================================================
-- 10. RESET SEQUENCES
-- ============================================================
SELECT setval('patients_id_seq', COALESCE((SELECT MAX(id) FROM patients), 0) + 1);
SELECT setval('appointments_id_seq', COALESCE((SELECT MAX(id) FROM appointments), 0) + 1);
SELECT setval('visits_id_seq', COALESCE((SELECT MAX(id) FROM visits), 0) + 1);
