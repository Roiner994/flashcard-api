const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey.includes('PASTE_YOUR_SERVICE_ROLE_KEY_HERE')) {
  console.warn('⚠️ Supabase environment variables are missing or incomplete. Some social features may fail.');
}

const supabase = (supabaseUrl && supabaseServiceKey && !supabaseServiceKey.includes('PASTE_YOUR_SERVICE_ROLE_KEY_HERE')) 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

module.exports = { supabase };
