import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function main() {
  const tables = [
    "appointments", "patients", "system_users", "roles", "branches",
    "services", "vaults", "working_days", "referral_providers",
    "prescription_templates", "service_groups", "system_settings", "tax_settings",
    "products", "product_sales", "session_addons",
  ];

  for (const t of tables) {
    const { data, error } = await supabase.from(t).select("*").limit(1);
    if (error) {
      console.log(`${t}: ERROR ${error.message}`);
    } else if (data?.length) {
      console.log(`${t}: ${Object.keys(data[0]).join(", ")}`);
    } else {
      console.log(`${t}: (empty table)`);
    }
  }
}

main().catch(console.error);
