require('dotenv').config();
const { supabase } = require('./api/lib/supabase');
async function test() {
  if (!supabase) {
    console.error('Supabase is null. Ensure .env is set.');
    return;
  }
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log('Data:', data);
  console.log('Error:', error);
}
test();
