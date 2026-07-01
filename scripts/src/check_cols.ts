import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://eoezxxbrpsbyfaivnmem.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvZXp4eGJycHNieWZhaXZubWVtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MTI3Njc0OSwiZXhwIjoyMDU2ODUyNzQ5fQ.3Lmqfq3CZj2tRYevczi3mJpW4vLKJ34b6Kq_fS7UGVc'
);

async function main() {
  // Use the SQL REST API 
  const { data, error } = await supabase.from('appointments').select('*').limit(1);
  if (error) {
    console.log('Error:', JSON.stringify(error));
    return;
  }
  console.log('Columns:', Object.keys(data[0] || {}).join(', '));
  console.log('Sample:', JSON.stringify(data[0], null, 2));
}
main().catch(console.error);
