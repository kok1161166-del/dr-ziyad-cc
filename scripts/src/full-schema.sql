-- ============================================================
-- COMPLETE DATABASE SCHEMA - Dr. Ziyad Abu Daqqa Clinic
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'waiting_reception', 'exam_fee_pending', 'waiting_doctor_approval',
    'doctor_approved', 'in_examination', 'exam_completed',
    'checkout_pending', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. ADD COLUMNS TO EXISTING TABLES (safe IF NOT EXISTS)
-- ============================================================

-- Appointments - add workflow columns
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status appointment_status NOT NULL DEFAULT 'waiting_reception';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_id integer;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS exam_fee_paid boolean DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS exam_fee_amount numeric(10,2) DEFAULT '0';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_approved_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checkout_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS queue_number integer;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS final_amount_due numeric(10,2) DEFAULT '0';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2) DEFAULT '0';

-- Add patient additional fields
ALTER TABLE patients ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone_owner text DEFAULT 'المريض';
ALTER TABLE patients ADD COLUMN IF NOT EXISTS phone2 text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS id_number text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS total_visits integer DEFAULT 0;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS last_visit_date timestamptz;

-- Drop tables from previous failed runs (empty anyway) to recreate fresh
DROP TABLE IF EXISTS laser_logs;
DROP TABLE IF EXISTS injection_logs;
DROP TABLE IF EXISTS invoice_items;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS invoices;
DROP TABLE IF EXISTS product_sales;
DROP TABLE IF EXISTS session_addons;
DROP TABLE IF EXISTS visits;

-- ============================================================
-- 3. NEW TABLES
-- ============================================================

-- 3a. Products (POS)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  barcode text UNIQUE,
  purchase_price numeric(10,2) NOT NULL DEFAULT '0',
  sale_price numeric(10,2) NOT NULL DEFAULT '0',
  stock_quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'piece',
  category text,
  description text,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3b. Visits
CREATE TABLE IF NOT EXISTS visits (
  id SERIAL PRIMARY KEY,
  patient_id integer NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  appointment_id integer REFERENCES appointments(id) ON DELETE SET NULL,
  doctor_id integer REFERENCES system_users(id),
  branch text,
  status text NOT NULL DEFAULT 'pending',
  diagnosis text,
  treatment_plan text,
  notes text,
  prescription text,
  start_time timestamptz,
  end_time timestamptz,
  total_amount numeric(10,2) DEFAULT '0',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3c. Product Sales
CREATE TABLE IF NOT EXISTS product_sales (
  id SERIAL PRIMARY KEY,
  visit_id integer REFERENCES visits(id) ON DELETE CASCADE,
  appointment_id integer REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id integer REFERENCES patients(id) ON DELETE SET NULL,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  sold_by integer REFERENCES system_users(id),
  sale_type text NOT NULL DEFAULT 'walk_in' CHECK (sale_type IN ('walk_in', 'prescription', 'post_procedure')),
  payment_method text NOT NULL DEFAULT 'cash',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3d. Session Addons (added by doctor during exam)
CREATE TABLE IF NOT EXISTS session_addons (
  id SERIAL PRIMARY KEY,
  visit_id integer NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  appointment_id integer REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id integer REFERENCES patients(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('service', 'product')),
  service_id integer REFERENCES services(id) ON DELETE SET NULL,
  product_id integer REFERENCES products(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  added_by integer REFERENCES system_users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3e. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number text NOT NULL UNIQUE,
  patient_id integer REFERENCES patients(id) ON DELETE SET NULL,
  appointment_id integer REFERENCES appointments(id) ON DELETE SET NULL,
  visit_id integer REFERENCES visits(id) ON DELETE SET NULL,
  subtotal numeric(10,2) NOT NULL DEFAULT '0',
  discount numeric(10,2) NOT NULL DEFAULT '0',
  tax numeric(10,2) NOT NULL DEFAULT '0',
  total numeric(10,2) NOT NULL DEFAULT '0',
  paid numeric(10,2) NOT NULL DEFAULT '0',
  due numeric(10,2) NOT NULL DEFAULT '0',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
  payment_method text NOT NULL DEFAULT 'cash',
  issued_by integer REFERENCES system_users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3f. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id integer NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('service', 'product', 'exam_fee', 'other')),
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3g. Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id integer REFERENCES invoices(id) ON DELETE SET NULL,
  appointment_id integer REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id integer REFERENCES patients(id) ON DELETE SET NULL,
  amount numeric(10,2) NOT NULL,
  method text NOT NULL DEFAULT 'cash',
  reference text,
  received_by integer REFERENCES system_users(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3h. Laser Logs
CREATE TABLE IF NOT EXISTS laser_logs (
  id SERIAL PRIMARY KEY,
  visit_id integer NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id integer REFERENCES patients(id) ON DELETE SET NULL,
  doctor_id integer REFERENCES system_users(id),
  device text NOT NULL,
  spot_size numeric(5,2),
  fluence numeric(6,2),
  pulse_width numeric(6,2),
  passes integer,
  area text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3i. Injection Logs
CREATE TABLE IF NOT EXISTS injection_logs (
  id SERIAL PRIMARY KEY,
  visit_id integer NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  patient_id integer REFERENCES patients(id) ON DELETE SET NULL,
  doctor_id integer REFERENCES system_users(id),
  zone text NOT NULL,
  product_name text NOT NULL,
  brand text,
  units numeric(6,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3j. Bookings (secretary booking system)
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  phone text,
  booking_date date NOT NULL,
  booking_time text,
  service text,
  notes text,
  status text NOT NULL DEFAULT 'confirmed',
  created_by integer REFERENCES system_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3l. Visit Photos (before/after with Cloudinary)
CREATE TABLE IF NOT EXISTS visit_photos (
  id SERIAL PRIMARY KEY,
  visit_id INTEGER REFERENCES visits(id) ON DELETE CASCADE,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'after')),
  cloudinary_url TEXT NOT NULL,
  cloudinary_public_id TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3k. Follow-ups (doctor recommended next appointment)
CREATE TABLE IF NOT EXISTS follow_ups (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id INTEGER REFERENCES visits(id) ON DELETE SET NULL,
  booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
  recommended_date DATE NOT NULL,
  interval_label TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by INTEGER REFERENCES system_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_doctor ON visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visits_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_patient ON follow_ups(patient_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_date ON follow_ups(recommended_date);
CREATE INDEX IF NOT EXISTS idx_visit_photos_visit ON visit_photos(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_patient ON visit_photos(patient_id);

-- ============================================================
-- 5. ENABLE REALTIME (safe add - catches if already member)
-- ============================================================
DO $$
DECLARE
  tbl text;
  _tables text[] := ARRAY['appointments','visits','patients','products','product_sales','session_addons','invoices','payments','bookings','follow_ups','visit_photos'];
BEGIN
  FOREACH tbl IN ARRAY _tables
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    EXCEPTION WHEN SQLSTATE '42710' THEN
      NULL; -- already member, skip
    END;
  END LOOP;
END $$;

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================
DO $$ DECLARE
  tbl text;
  _tables text[] := ARRAY['patients','appointments','visits','services','products','product_sales','session_addons','invoices','invoice_items','payments','laser_logs','injection_logs','bookings','follow_ups','visit_photos'];
BEGIN
  FOREACH tbl IN ARRAY _tables
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('CREATE POLICY "service_role_all_%s" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true);', tbl, tbl);
  END LOOP;
END $$;

-- ============================================================
-- 7. SEED DATA
-- ============================================================

-- 7a. Branches (if not exists)
INSERT INTO branches (name, name_en, is_active)
SELECT 'مركز د. زياد أبو دقة التجميلي - غزة', 'Dr. Ziyad Clinic - Gaza', true
WHERE NOT EXISTS (SELECT 1 FROM branches WHERE name LIKE '%زياد أبو دقة%');

-- 7b. Roles (if not exists)
INSERT INTO roles (name, permissions)
SELECT 'doctor', '{"appointments": "full", "visits": "full", "patients": "read", "products": "read"}'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'doctor');

INSERT INTO roles (name, permissions)
SELECT 'receptionist', '{"appointments": "full", "patients": "full", "products": "full", "sales": "full", "invoices": "full"}'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'receptionist');

INSERT INTO roles (name, permissions)
SELECT 'admin', '{"all": "full"}'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

INSERT INTO roles (name, permissions)
SELECT 'cashier', '{"invoices": "full", "payments": "full", "sales": "full"}'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'cashier');

-- 7c. Users (if not exists)
INSERT INTO system_users (username, password_hash, name, role_id, branch, is_frozen)
SELECT 'drziyad', 'clinic123', 'د. زياد أبو دقة', r.id, 'فرع غزة', false
FROM roles r WHERE r.name = 'doctor'
AND NOT EXISTS (SELECT 1 FROM system_users WHERE username = 'drziyad');

INSERT INTO system_users (username, password_hash, name, role_id, branch, is_frozen)
SELECT 'secretary', 'clinic123', 'سكرتير الاستقبال', r.id, 'فرع غزة', false
FROM roles r WHERE r.name = 'receptionist'
AND NOT EXISTS (SELECT 1 FROM system_users WHERE username = 'secretary');

INSERT INTO system_users (username, password_hash, name, role_id, branch, is_frozen)
SELECT 'cashier', 'clinic123', 'المحاسب', r.id, 'فرع غزة', false
FROM roles r WHERE r.name = 'cashier'
AND NOT EXISTS (SELECT 1 FROM system_users WHERE username = 'cashier');

-- 7d. Service Groups
INSERT INTO service_groups (name, type)
SELECT 'استشارات', 'private'
WHERE NOT EXISTS (SELECT 1 FROM service_groups WHERE name = 'استشارات');

INSERT INTO service_groups (name, type)
SELECT 'ليزر', 'private'
WHERE NOT EXISTS (SELECT 1 FROM service_groups WHERE name = 'ليزر');

INSERT INTO service_groups (name, type)
SELECT 'حقن تجميلية', 'private'
WHERE NOT EXISTS (SELECT 1 FROM service_groups WHERE name = 'حقن تجميلية');

INSERT INTO service_groups (name, type)
SELECT 'عناية بالبشرة', 'private'
WHERE NOT EXISTS (SELECT 1 FROM service_groups WHERE name = 'عناية بالبشرة');

INSERT INTO service_groups (name, type)
SELECT 'بلازما', 'private'
WHERE NOT EXISTS (SELECT 1 FROM service_groups WHERE name = 'بلازما');

-- 7e. Services
INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'استشارة تجميلية', g.id, 'فرع غزة', '100', 30, 'fixed'
FROM service_groups g WHERE g.name = 'استشارات'
AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'استشارة تجميلية');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'جلسة ليزر إزالة شعر (منطقة)', g.id, 'فرع غزة', '200', 30, 'fixed'
FROM service_groups g WHERE g.name = 'ليزر'
AND NOT EXISTS (SELECT 1 FROM services WHERE name LIKE '%جلسة ليزر%منطقة%');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'جلسة ليزر إزالة شعر (جسم كامل)', g.id, 'فرع غزة', '1200', 90, 'fixed'
FROM service_groups g WHERE g.name = 'ليزر'
AND NOT EXISTS (SELECT 1 FROM services WHERE name LIKE '%جسم كامل%');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'حقن فيلر', g.id, 'فرع غزة', '500', 30, 'fixed'
FROM service_groups g WHERE g.name = 'حقن تجميلية'
AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'حقن فيلر');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'حقن بوتوكس', g.id, 'فرع غزة', '400', 20, 'fixed'
FROM service_groups g WHERE g.name = 'حقن تجميلية'
AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'حقن بوتوكس');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'تنظيف بشرة عميق', g.id, 'فرع غزة', '200', 45, 'fixed'
FROM service_groups g WHERE g.name = 'عناية بالبشرة'
AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'تنظيف بشرة عميق');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'ميزوثيرابي للوجه', g.id, 'فرع غزة', '500', 30, 'fixed'
FROM service_groups g WHERE g.name = 'حقن تجميلية'
AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'ميزوثيرابي');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'تقشير كيميائي', g.id, 'فرع غزة', '300', 30, 'fixed'
FROM service_groups g WHERE g.name = 'عناية بالبشرة'
AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'تقشير كيميائي');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'هيدرا فيشل', g.id, 'فرع غزة', '450', 45, 'fixed'
FROM service_groups g WHERE g.name = 'عناية بالبشرة'
AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'هيدرا فيشل');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'بلازما للشعر (PRP)', g.id, 'فرع غزة', '700', 60, 'fixed'
FROM service_groups g WHERE g.name = 'بلازما'
AND NOT EXISTS (SELECT 1 FROM services WHERE name LIKE '%بلازما للشعر%');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'بلازما للوجه', g.id, 'فرع غزة', '600', 45, 'fixed'
FROM service_groups g WHERE g.name = 'بلازما'
AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'بلازما للوجه');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'نضارة بشرة (جلوتاثيون)', g.id, 'فرع غزة', '550', 30, 'fixed'
FROM service_groups g WHERE g.name = 'حقن تجميلية'
AND NOT EXISTS (SELECT 1 FROM services WHERE name LIKE '%جلوتاثيون%');

INSERT INTO services (name, group_id, branch, price, duration_minutes, price_type)
SELECT 'ميكرونيدلنغ', g.id, 'فرع غزة', '400', 45, 'fixed'
FROM service_groups g WHERE g.name = 'عناية بالبشرة'
AND NOT EXISTS (SELECT 1 FROM services WHERE name = 'ميكرونيدلنغ');

-- 7f. Products
INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'واقي شمس SPF50+', '6241001234560', 35, 70, 50, 'piece', 'واقيات شمس', 'واقي شمس طبي مناسب للبشرة الحساسة بعامل حماية 50+'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234560');

INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'كريم ترميم بعد الليزر', '6241001234577', 45, 90, 30, 'tube', 'عناية بعد الليزر', 'كريم مهدئ ومجدد للبشرة بعد جلسات الليزر'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234577');

INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'مقشر حمض الجليكوليك 15%', '6241001234584', 55, 110, 25, 'bottle', 'مقشرات', 'مقشر كيميائي 15% لتجديد خلايا البشرة'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234584');

INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'سيروم فيتامين C 20%', '6241001234591', 40, 85, 40, 'bottle', 'سيرومات', 'سيروم فيتامين C 20% مضاد للأكسدة ومفتح للبشرة'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234591');

INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'مرهم فيوسيدين كريم', '6241001234607', 8, 18, 100, 'tube', 'مراهم طبية', 'مضاد حيوي موضعي للالتهابات الجلدية'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234607');

INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'قناع ترطيب عميق', '6241001234614', 25, 50, 35, 'piece', 'أقنعة', 'قناع مرطب بالهيالورونيك أسيد'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234614');

INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'كريم ليلي ترميمي', '6241001234621', 60, 120, 20, 'jar', 'كريمات', 'كريم ليلي لتجديد البشرة أثناء النوم'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234621');

INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'تونر للبشرة الدهنية', '6241001234638', 25, 45, 45, 'bottle', 'تونر', 'تونر منظم لإفرازات البشرة الدهنية'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234638');

INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'مصل هيالورونيك أسيد', '6241001234645', 75, 150, 15, 'bottle', 'سيرومات', 'مصل حمض الهيالورونيك المركز للترطيب العميق'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234645');

INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'قفازات ليزر (عبوة)', '6241001234652', 10, 25, 200, 'box', 'مستلزمات', 'قفازات واقية لجلسات الليزر - عبوة 100 حبة'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234652');

INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'غسول يومي للبشرة', '6241001234669', 20, 40, 60, 'bottle', 'منظفات', 'غسول يومي لطيف لجميع أنواع البشرة'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234669');

INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description)
SELECT 'كريم أساس طبي', '6241001234676', 45, 90, 25, 'tube', 'مكياج طبي', 'كريم أساس طبي تغطية كاملة مع واقي شمس'
WHERE NOT EXISTS (SELECT 1 FROM products WHERE barcode = '6241001234676');

-- 7g. Vaults
INSERT INTO vaults (name, balance, is_locked)
SELECT 'الخزينة الرئيسية - غزة', '5000', false
WHERE NOT EXISTS (SELECT 1 FROM vaults WHERE name LIKE '%الخزينة الرئيسية%');

INSERT INTO vaults (name, balance, is_locked)
SELECT 'خزينة الدفع الإلكتروني', '0', false
WHERE NOT EXISTS (SELECT 1 FROM vaults WHERE name LIKE '%الإلكتروني%');

-- 7h. Referral Providers
INSERT INTO referral_providers (name, specialty, phone)
SELECT 'د. محمد الجعبري', 'طب عام', '0599111111'
WHERE NOT EXISTS (SELECT 1 FROM referral_providers WHERE name = 'د. محمد الجعبري');

INSERT INTO referral_providers (name, specialty, phone)
SELECT 'د. سامي المصري', 'جلدية', '0599222222'
WHERE NOT EXISTS (SELECT 1 FROM referral_providers WHERE name = 'د. سامي المصري');

INSERT INTO referral_providers (name, specialty, phone)
SELECT 'د. ليلى شريف', 'تجميل أسنان', '0599333333'
WHERE NOT EXISTS (SELECT 1 FROM referral_providers WHERE name = 'د. ليلى شريف');

-- 7i. Prescription Templates
INSERT INTO prescription_templates (name, content, category)
SELECT 'روتين عناية يومي', '1. غسول يومي صباح ومساء\n2. تونر منظم\n3. مرطب هيالورونيك أسيد\n4. واقي شمس SPF50+ صباحاً', 'عناية بشرة'
WHERE NOT EXISTS (SELECT 1 FROM prescription_templates WHERE name = 'روتين عناية يومي');

INSERT INTO prescription_templates (name, content, category)
SELECT 'ما بعد الليزر', '1. كريم ترميم بعد الليزر مرتين يومياً\n2. تجنب التعرض للشمس مباشرة\n3. واقي شمس SPF50+ باستمرار\n4. مرهم فيوسيدين عند الاحمرار', 'ليزر'
WHERE NOT EXISTS (SELECT 1 FROM prescription_templates WHERE name = 'ما بعد الليزر');

INSERT INTO prescription_templates (name, content, category)
SELECT 'ما بعد التقشير', '1. غسول لطيف فقط\n2. مرطب غني هيالورونيك أسيد\n3. واقي شمس SPF50+ ضروري\n4. تجنب التقشير لمدة أسبوع', 'تقشير'
WHERE NOT EXISTS (SELECT 1 FROM prescription_templates WHERE name = 'ما بعد التقشير');

-- 7j. Sample Patients
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

-- 7k. Appointments (use doctor_id from system_users)
DO $$
DECLARE
  doc_id integer;
  rec record;
BEGIN
  SELECT id INTO doc_id FROM system_users WHERE username = 'drziyad' LIMIT 1;

  IF doc_id IS NOT NULL THEN
    -- 101 - waiting_reception
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 101) THEN
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number)
      SELECT p.id, doc_id, 'فرع غزة', CURRENT_DATE, '10:00', 'waiting_reception', 'walk_in', '["تنظيف بشرة عميق"]'::jsonb, 101
      FROM patients p WHERE p.local_code = 1001;
    END IF;

    -- 102 - exam_fee_pending
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 102) THEN
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number)
      SELECT p.id, doc_id, 'فرع غزة', CURRENT_DATE, '10:30', 'exam_fee_pending', 'walk_in', '["جلسة ليزر إزالة شعر (منطقة)"]', 102
      FROM patients p WHERE p.local_code = 1002;
    END IF;

    -- 103 - waiting_doctor_approval (exam fee paid)
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 103) THEN
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, paid_amount)
      SELECT p.id, doc_id, 'فرع غزة', CURRENT_DATE, '11:00', 'waiting_doctor_approval', 'walk_in', '["ميزوثيرابي للوجه"]', 103, true, 150, 150
      FROM patients p WHERE p.local_code = 1004;
    END IF;

    -- 104 - waiting_doctor_approval
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 104) THEN
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, paid_amount)
      SELECT p.id, doc_id, 'فرع غزة', CURRENT_DATE, '11:30', 'waiting_doctor_approval', 'walk_in', '["حقن فيلر"]', 104, true, 150, 150
      FROM patients p WHERE p.local_code = 1005;
    END IF;

    -- 105 - doctor_approved
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 105) THEN
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, paid_amount, doctor_approved_at)
      SELECT p.id, doc_id, 'فرع غزة', CURRENT_DATE, '12:00', 'doctor_approved', 'walk_in', '["حقن بوتوكس"]', 105, true, 150, 150, now()
      FROM patients p WHERE p.local_code = 1006;
    END IF;

    -- 106 - in_examination
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 106) THEN
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, paid_amount, doctor_approved_at)
      SELECT p.id, doc_id, 'فرع غزة', CURRENT_DATE, '12:30', 'in_examination', 'walk_in', '["تقشير كيميائي"]', 106, true, 150, 150, now()
      FROM patients p WHERE p.local_code = 1007;
    END IF;

    -- 107 - exam_completed
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 107) THEN
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, paid_amount, final_amount_due)
      SELECT p.id, doc_id, 'فرع غزة', CURRENT_DATE, '13:00', 'exam_completed', 'walk_in', '["هيدرا فيشل"]', 107, true, 150, 150, 500
      FROM patients p WHERE p.local_code = 1008;
    END IF;

    -- 108 - checkout_pending
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 108) THEN
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, paid_amount, final_amount_due)
      SELECT p.id, doc_id, 'فرع غزة', CURRENT_DATE, '13:30', 'checkout_pending', 'walk_in', '["بلازما للشعر (PRP)"]', 108, true, 150, 150, 700
      FROM patients p WHERE p.local_code = 1003;
    END IF;

    -- 109 - completed
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 109) THEN
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number, exam_fee_paid, exam_fee_amount, paid_amount, final_amount_due, checkout_at)
      SELECT p.id, doc_id, 'فرع غزة', CURRENT_DATE, '14:00', 'completed', 'walk_in', '["نضارة بشرة (جلوتاثيون)"]', 109, true, 150, 750, 0, now()
      FROM patients p WHERE p.local_code = 1009;
    END IF;

    -- 110 - cancelled
    IF NOT EXISTS (SELECT 1 FROM appointments WHERE queue_number = 110) THEN
      INSERT INTO appointments (patient_id, doctor_id, branch, appointment_date, appointment_time, status, source, service_ids, queue_number)
      SELECT p.id, doc_id, 'فرع غزة', CURRENT_DATE, '14:30', 'cancelled', 'walk_in', '["تقشير كيميائي"]', 110
      FROM patients p WHERE p.local_code = 1010;
    END IF;
  END IF;
END $$;

-- 7l. Visits
DO $$
DECLARE
  doc_id integer;
BEGIN
  SELECT id INTO doc_id FROM system_users WHERE username = 'drziyad' LIMIT 1;

  IF doc_id IS NOT NULL THEN
    -- Completed visit for appointment 109
    IF NOT EXISTS (SELECT 1 FROM visits v JOIN appointments a ON v.appointment_id = a.id WHERE a.queue_number = 109) THEN
      INSERT INTO visits (patient_id, appointment_id, doctor_id, branch, status, diagnosis, treatment_plan, start_time, end_time, total_amount)
      SELECT a.patient_id, a.id, doc_id, 'فرع غزة', 'completed',
        'بشرة دهنية مع مسام واسعة وحب شباب خفيف',
        '1. تنظيف بشرة عميق\n2. تقشير كيميائي سطح كل 3 أسابيع\n3. روتين عناية بمنتجات خالية من الزيوت',
        CURRENT_TIMESTAMP - INTERVAL '2 hours', CURRENT_TIMESTAMP - INTERVAL '1 hour', 550
      FROM appointments a WHERE a.queue_number = 109;
    END IF;

    -- In-progress visit for appointment 106
    IF NOT EXISTS (SELECT 1 FROM visits v JOIN appointments a ON v.appointment_id = a.id WHERE a.queue_number = 106) THEN
      INSERT INTO visits (patient_id, appointment_id, doctor_id, branch, status, diagnosis, start_time, total_amount)
      SELECT a.patient_id, a.id, doc_id, 'فرع غزة', 'in_progress',
        'جفاف البشرة مع خطوط دقيقة في منطقة الجبهة',
        CURRENT_TIMESTAMP - INTERVAL '15 minutes', 450
      FROM appointments a WHERE a.queue_number = 106;
    END IF;
  END IF;
END $$;

-- 7m. Invoices & Payments for completed visit
DO $$
DECLARE
  v_id integer;
  apt_id integer;
  pat_id integer;
  inv_id integer;
BEGIN
  SELECT v.id, v.appointment_id, v.patient_id INTO v_id, apt_id, pat_id
  FROM visits v JOIN appointments a ON v.appointment_id = a.id WHERE a.queue_number = 109 LIMIT 1;

  IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM invoices WHERE visit_id = v_id) THEN
    INSERT INTO invoices (invoice_number, patient_id, appointment_id, visit_id, subtotal, total, paid, due, status, payment_method)
    SELECT 'INV-2026-0001', pat_id, apt_id, v_id, 700, 700, 750, 0, 'paid', 'cash'
    WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = 'INV-2026-0001')
    RETURNING id INTO inv_id;

    IF inv_id IS NOT NULL THEN
      INSERT INTO invoice_items (invoice_id, item_type, item_name, quantity, unit_price, total_price)
      VALUES (inv_id, 'service', 'نضارة بشرة (جلوتاثيون)', 1, 550, 550);

      INSERT INTO invoice_items (invoice_id, item_type, item_name, quantity, unit_price, total_price)
      VALUES (inv_id, 'exam_fee', 'رسوم الكشفية', 1, 150, 150);

      INSERT INTO payments (invoice_id, appointment_id, patient_id, amount, method, notes)
      VALUES (inv_id, apt_id, pat_id, 750, 'cash', 'دفع كامل');
    END IF;
  END IF;
END $$;

-- ============================================================
-- 8. RESET SEQUENCES
-- ============================================================
SELECT setval('patients_id_seq', COALESCE((SELECT MAX(id) FROM patients), 0) + 1);
SELECT setval('appointments_id_seq', COALESCE((SELECT MAX(id) FROM appointments), 0) + 1);
SELECT setval('visits_id_seq', COALESCE((SELECT MAX(id) FROM visits), 0) + 1);
SELECT setval('invoices_id_seq', COALESCE((SELECT MAX(id) FROM invoices), 0) + 1);
