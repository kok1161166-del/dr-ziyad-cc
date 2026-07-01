-- ============================================================
-- Migration: Advanced Clinic Workflow Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Appointment status enum
DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'waiting_reception',
    'exam_fee_pending',
    'waiting_doctor_approval',
    'doctor_approved',
    'in_examination',
    'exam_completed',
    'checkout_pending',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Update appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status appointment_status NOT NULL DEFAULT 'waiting_reception';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_approved_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS final_amount_due numeric(10,2) DEFAULT '0';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) DEFAULT '0';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS exam_fee_paid boolean DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS exam_fee_amount numeric(10,2) DEFAULT '0';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checkout_at timestamptz;

-- 2b. Add missing visits columns
ALTER TABLE visits ADD COLUMN IF NOT EXISTS treatment_plan text;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS prescription text;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS doctor_id integer REFERENCES system_users(id);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS branch text;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE visits ADD COLUMN IF NOT EXISTS start_time timestamptz;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS end_time timestamptz;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS total_amount numeric(10,2) DEFAULT '0';
ALTER TABLE visits ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- 3. Products table (cosmetic & therapeutic products for sale)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name text NOT NULL,
  barcode text,
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

-- 4. Product sales table
CREATE TABLE IF NOT EXISTS product_sales (
  id SERIAL PRIMARY KEY,
  visit_id integer REFERENCES visits(id) ON DELETE CASCADE,
  appointment_id integer REFERENCES appointments(id) ON DELETE SET NULL,
  product_id integer NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  sold_by integer REFERENCES system_users(id),
  sale_type text NOT NULL DEFAULT 'walk_in' CHECK (sale_type IN ('walk_in', 'prescription', 'post_procedure')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Session addons (services/products added by doctor during exam)
CREATE TABLE IF NOT EXISTS session_addons (
  id SERIAL PRIMARY KEY,
  visit_id integer NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  appointment_id integer REFERENCES appointments(id) ON DELETE SET NULL,
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

-- 5b. Laser logs
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

-- 5d. Bookings (secretary simple booking system)
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

-- 5c. Injection logs
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

-- 5e. Follow-ups (doctor recommended next appointment)
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

-- 6. Enable realtime replication
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE visits;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE product_sales;
ALTER PUBLICATION supabase_realtime ADD TABLE session_addons;
ALTER PUBLICATION supabase_realtime ADD TABLE laser_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE injection_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE follow_ups;

-- 7. RLS policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE laser_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE injection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_product_sales" ON product_sales FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_session_addons" ON session_addons FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_laser_logs" ON laser_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_injection_logs" ON injection_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_bookings" ON bookings FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_follow_ups" ON follow_ups FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. Seed some sample products
INSERT INTO products (name, barcode, purchase_price, sale_price, stock_quantity, unit, category, description) VALUES
  ('واقي شمس SPF50+', 'SUN001', 35, 70, 50, 'piece', 'واقيات شمس', 'واقي شمس طبي مناسب للبشرة الحساسة'),
  ('كريم ترميم بعد الليزر', 'REC001', 45, 90, 30, 'piece', 'عناية بعد الليزر', 'كريم مهدئ ومجدد للبشرة بعد جلسات الليزر'),
  ('مقشر حمض الجليكوليك 15%', 'GLY001', 55, 110, 25, 'bottle', 'مقشرات', 'مقشر كيميائي لتجديد خلايا البشرة'),
  ('سيروم فيتامين C 20%', 'VITC01', 40, 85, 40, 'bottle', 'سيرومات', 'سيروم مضاد للأكسدة لتفتيح وتوحيد لون البشرة'),
  ('مرهم فيوسيدين كريم', 'FUS001', 8, 18, 100, 'tube', 'مراهم طبية', 'مضاد حيوي موضعي للالتهابات الجلدية'),
  ('قناع ترطيب عميق', 'MAS001', 25, 50, 35, 'piece', 'أقنعة', 'قناع مرطب بالهيالورونيك أسيد')
ON CONFLICT DO NOTHING;

-- 9. Update existing appointments with new status
UPDATE appointments SET status = 'waiting_reception' WHERE status IS NULL;
