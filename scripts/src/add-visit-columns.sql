ALTER TABLE visits ADD COLUMN IF NOT EXISTS treatment_plan text;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS prescription text;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS doctor_id integer REFERENCES system_users(id);
ALTER TABLE visits ADD COLUMN IF NOT EXISTS branch text;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE visits ADD COLUMN IF NOT EXISTS start_time timestamptz;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS end_time timestamptz;
ALTER TABLE visits ADD COLUMN IF NOT EXISTS total_amount numeric(10,2) DEFAULT '0';
ALTER TABLE visits ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
