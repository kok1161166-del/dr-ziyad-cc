import { pool } from "@workspace/db";

const SQL = `
-- 1. Create appointment_status enum
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

-- 2. Add new columns to appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status appointment_status NOT NULL DEFAULT 'waiting_reception';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS doctor_approved_at timestamptz;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS final_amount_due numeric(10,2) DEFAULT '0';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS amount_paid numeric(10,2) DEFAULT '0';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS exam_fee_paid boolean DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS exam_fee_amount numeric(10,2) DEFAULT '0';
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS checkout_at timestamptz;

-- 3. Products table
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

-- 5. Session addons table
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

-- 6. Enable realtime replication
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE appointments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE visits;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE products;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE product_sales;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE session_addons;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Enable row-level security
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_addons ENABLE ROW LEVEL SECURITY;

-- 8. Create policies for service_role (full access)
DO $$ BEGIN
  CREATE POLICY "service_role_all_products" ON products FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_all_product_sales" ON product_sales FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE POLICY "service_role_all_session_addons" ON session_addons FOR ALL TO service_role USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
`;

async function migrate() {
  console.log("🚀 Running schema migration...");
  console.log("Using pooler to connect...");
  try {
    const statements = SQL.split(";").filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      try {
        await pool.query(stmt + ";");
        console.log(`  ✓ ${stmt.trim().slice(0, 70)}...`);
      } catch (err: any) {
        console.log(`  ⚠ ${err.message.slice(0, 120)}`);
      }
    }
    console.log("✅ Migration complete!");
  } catch (err) {
    console.error("❌ Migration failed:", err);
  }
  await pool.end();
}

migrate();
