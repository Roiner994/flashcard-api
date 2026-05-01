require('dotenv').config();
const { supabase } = require('./api/lib/supabase');
async function test() {
  const { data, error } = await supabase.from('profiles').select('*').limit(3);
  console.log('Profiles data:', data);
}
test();
