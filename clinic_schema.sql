-- ============================================================
-- العيادة - Clinic Management System
-- Full PostgreSQL Schema for Supabase
-- ============================================================

-- ==================== PATIENTS ====================
CREATE TABLE IF NOT EXISTS patients (
  id            SERIAL PRIMARY KEY,
  local_code    INTEGER NOT NULL UNIQUE,
  name_ar       TEXT NOT NULL,
  name_en       TEXT,
  gender        TEXT NOT NULL,
  date_of_birth DATE,
  phones        JSONB NOT NULL DEFAULT '[]',      -- [{number, owner?}]
  home_phone    TEXT,
  marital_status TEXT,
  nationality   TEXT DEFAULT 'فلسطين',
  address       TEXT,
  governorate   TEXT,
  birth_place   TEXT,
  occupation    TEXT,
  email         TEXT,
  insurance_status TEXT,
  referred_by   TEXT,
  notes         TEXT,
  photo_url     TEXT,
  is_deleted    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== APPOINTMENTS ====================
CREATE TABLE IF NOT EXISTS appointments (
  id                SERIAL PRIMARY KEY,
  patient_id        INTEGER NOT NULL REFERENCES patients(id),
  branch            TEXT NOT NULL,
  appointment_date  DATE NOT NULL,
  appointment_time  TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'waiting_arrival',
  source            TEXT NOT NULL DEFAULT 'walk_in',
  payment_method    TEXT NOT NULL DEFAULT 'cash',
  service_ids       JSONB DEFAULT '[]',           -- int[]
  doctor_id         INTEGER,
  total_fee         NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount       NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes             TEXT,
  created_by        INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL PRIMARY KEY,
  appointment_id  INTEGER NOT NULL REFERENCES appointments(id),
  amount          NUMERIC(10,2) NOT NULL,
  payment_method  TEXT NOT NULL DEFAULT 'cash',
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS visits (
  id              SERIAL PRIMARY KEY,
  patient_id      INTEGER NOT NULL REFERENCES patients(id),
  appointment_id  INTEGER REFERENCES appointments(id),
  visit_date      DATE NOT NULL,
  services        JSONB DEFAULT '[]',             -- string[]
  diagnosis       TEXT,
  total_fee       NUMERIC(10,2) NOT NULL DEFAULT 0,
  paid_amount     NUMERIC(10,2) NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== FINANCIAL ====================
CREATE TABLE IF NOT EXISTS vaults (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  balance     NUMERIC(14,2) NOT NULL DEFAULT 0,
  is_locked   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vault_transactions (
  id               SERIAL PRIMARY KEY,
  vault_id         INTEGER NOT NULL REFERENCES vaults(id),
  type             TEXT NOT NULL,                -- deposit | withdraw | transfer
  amount           NUMERIC(14,2) NOT NULL,
  target_vault_id  INTEGER REFERENCES vaults(id),
  note             TEXT,
  performed_by     TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expense_categories (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id           SERIAL PRIMARY KEY,
  category_id  INTEGER NOT NULL REFERENCES expense_categories(id),
  amount       NUMERIC(14,2) NOT NULL,
  vault_id     INTEGER NOT NULL REFERENCES vaults(id),
  performed_by TEXT,
  note         TEXT,
  receipt_url  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routine_expenses (
  id           SERIAL PRIMARY KEY,
  category_id  INTEGER NOT NULL REFERENCES expense_categories(id),
  title        TEXT NOT NULL,
  amount       NUMERIC(14,2) NOT NULL,
  frequency    TEXT NOT NULL DEFAULT 'monthly',  -- daily | weekly | monthly
  branch       TEXT,
  note         TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== SERVICES ====================
CREATE TABLE IF NOT EXISTS service_groups (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'private',
  valid_from  DATE,
  valid_to    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
  id               SERIAL PRIMARY KEY,
  group_id         INTEGER REFERENCES service_groups(id),
  branch           TEXT NOT NULL,
  name             TEXT NOT NULL,
  is_visible       BOOLEAN NOT NULL DEFAULT TRUE,
  price_type       TEXT NOT NULL DEFAULT 'fixed',
  price            NUMERIC(10,2) NOT NULL DEFAULT 0,
  units            INTEGER NOT NULL DEFAULT 1,
  patient_fee      NUMERIC(10,2) NOT NULL DEFAULT 0,
  duration_minutes INTEGER,
  uses_consumables BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== INVENTORY ====================
CREATE TABLE IF NOT EXISTS inventory_items (
  id                  SERIAL PRIMARY KEY,
  barcode             TEXT,
  branch              TEXT NOT NULL,
  name                TEXT NOT NULL,
  category_id         INTEGER,
  quantity            NUMERIC(10,3) NOT NULL DEFAULT 0,
  unit                TEXT NOT NULL DEFAULT 'وحدة',
  low_stock_threshold NUMERIC(10,3),
  expiry_date         DATE,
  supplier_name       TEXT,
  supplier_contact    TEXT,
  supplier_address    TEXT,
  notify_low_stock    BOOLEAN NOT NULL DEFAULT FALSE,
  notify_expiry       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
  id          SERIAL PRIMARY KEY,
  item_id     INTEGER NOT NULL REFERENCES inventory_items(id),
  type        TEXT NOT NULL,                     -- in | out | adjustment
  quantity    NUMERIC(10,3) NOT NULL,
  note        TEXT,
  cost        NUMERIC(10,2),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supplier_debts (
  id            SERIAL PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  item_name     TEXT NOT NULL,
  amount        NUMERIC(10,2) NOT NULL,
  due_date      DATE,
  is_paid       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== USERS & ROLES ====================
CREATE TABLE IF NOT EXISTS roles (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  permissions JSONB NOT NULL DEFAULT '{}',       -- Record<string, boolean>
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email         TEXT,
  role_id       INTEGER NOT NULL REFERENCES roles(id),
  branch        TEXT,
  is_frozen     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_details (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES system_users(id) ON DELETE CASCADE,
  position     TEXT,
  specialty    TEXT,
  phone        TEXT,
  salary       NUMERIC(12,2),
  joining_date DATE,
  work_days    JSONB DEFAULT '[]',               -- string[]
  shift_start  TEXT,
  shift_end    TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== SETTINGS ====================
CREATE TABLE IF NOT EXISTS branches (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  name_en    TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_providers (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  specialty  TEXT,
  phone      TEXT,
  address    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tax_settings (
  id             SERIAL PRIMARY KEY,
  branch         TEXT NOT NULL DEFAULT 'all',
  tax_type       TEXT NOT NULL DEFAULT 'on_request',
  tax_title      TEXT NOT NULL DEFAULT 'ضريبة القيمة المضافة',
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_settings (
  id                   SERIAL PRIMARY KEY,
  active_branch        TEXT NOT NULL DEFAULT 'غزة',
  appointment_order    TEXT NOT NULL DEFAULT 'by_time',
  auto_refresh_minutes INTEGER NOT NULL DEFAULT 10,
  display_branch       TEXT,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS working_days (
  id           SERIAL PRIMARY KEY,
  branch       TEXT NOT NULL,
  day_of_week  INTEGER NOT NULL,  -- 0=Sun .. 6=Sat
  is_working   BOOLEAN NOT NULL DEFAULT TRUE,
  open_time    TEXT DEFAULT '09:00',
  close_time   TEXT DEFAULT '17:00'
);

CREATE TABLE IF NOT EXISTS holidays (
  id         SERIAL PRIMARY KEY,
  branch     TEXT,                -- NULL = all branches
  date       TEXT NOT NULL,       -- YYYY-MM-DD
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== TEMPLATES ====================
CREATE TABLE IF NOT EXISTS prescription_templates (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investigation_templates (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'labs',
  tests      JSONB DEFAULT '[]',                 -- string[]
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== TASKS ====================
CREATE TABLE IF NOT EXISTS tasks (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  content      TEXT,
  assigned_to  TEXT,
  priority     TEXT NOT NULL DEFAULT 'normal',   -- low | normal | high | urgent
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  due_date     DATE,
  branch       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== INDEXES ====================
CREATE INDEX IF NOT EXISTS idx_patients_local_code  ON patients(local_code);
CREATE INDEX IF NOT EXISTS idx_patients_name_ar     ON patients(name_ar);
CREATE INDEX IF NOT EXISTS idx_patients_is_deleted  ON patients(is_deleted);
CREATE INDEX IF NOT EXISTS idx_appointments_date    ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status  ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_visits_patient       ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_date          ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_payments_appointment ON payments(appointment_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created     ON expenses(created_at);
CREATE INDEX IF NOT EXISTS idx_vault_tx_vault       ON vault_transactions(vault_id);
CREATE INDEX IF NOT EXISTS idx_inventory_branch     ON inventory_items(branch);
CREATE INDEX IF NOT EXISTS idx_tasks_due            ON tasks(due_date);

-- ==================== DEFAULT SEED DATA ====================
INSERT INTO branches (name, name_en) VALUES
  ('فرع غزة',       'Gaza Branch'),
  ('فرع خان يونس',  'Khan Yunis Branch')
ON CONFLICT DO NOTHING;

INSERT INTO system_settings (active_branch, appointment_order, auto_refresh_minutes)
VALUES ('غزة', 'by_time', 10)
ON CONFLICT DO NOTHING;

INSERT INTO tax_settings (branch, tax_type, tax_title, tax_percentage)
VALUES ('all', 'on_request', 'ضريبة القيمة المضافة', 0)
ON CONFLICT DO NOTHING;

INSERT INTO roles (name, permissions) VALUES
  ('admin',       '{"all": true}'),
  ('doctor',      '{"appointments": true, "patients": true, "visits": true}'),
  ('receptionist','{"appointments": true, "patients": true}')
ON CONFLICT (name) DO NOTHING;

INSERT INTO expense_categories (name) VALUES
  ('رواتب'), ('مستلزمات'), ('إيجار'), ('فواتير'), ('صيانة'), ('أخرى')
ON CONFLICT DO NOTHING;

