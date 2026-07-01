import { createClient } from "@supabase/supabase-js";

const sup = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

const { data, error } = await sup.from("appointments").insert({
  patient_id: 0,
  branch: "test",
  appointment_date: "2026-06-27",
  appointment_time: "00:00",
  status: "waiting_reception",
}).select();

console.log(JSON.stringify({ data, error }, null, 2));
