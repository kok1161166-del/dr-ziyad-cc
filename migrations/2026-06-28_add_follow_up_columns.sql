-- Migration: Add follow-up appointment support
-- Date: 2026-06-28
-- Run this file in Supabase SQL Editor

-- Link visits to the next follow-up booking
ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS next_appointment_date DATE,
  ADD COLUMN IF NOT EXISTS next_booking_id INTEGER REFERENCES bookings(id);

-- Link bookings to patients and source visits for follow-ups
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS patient_id INTEGER REFERENCES patients(id),
  ADD COLUMN IF NOT EXISTS source_visit_id INTEGER REFERENCES visits(id),
  ADD COLUMN IF NOT EXISTS follow_up_interval TEXT,   -- "1_week", "2_weeks", "1_month", "2_months", "3_months", "4_months", "custom"
  ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;

-- Optional: index for faster lookups
CREATE INDEX IF NOT EXISTS idx_visits_next_booking_id ON visits(next_booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_patient_id ON bookings(patient_id);
CREATE INDEX IF NOT EXISTS idx_bookings_source_visit_id ON bookings(source_visit_id);
