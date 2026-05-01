require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugAuth() {
  // listUsers with pagination
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 100 });
  
  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log(`Total users: ${users.length}\n`);
  for (const user of users) {
    const meta = user.user_metadata || {};
    console.log(`ID: ${user.id}`);
    console.log(`  email: ${user.email}`);
    console.log(`  full_name: ${meta.full_name}`);
    console.log(`  name: ${meta.name}`);
    console.log(`  avatar_url: ${meta.avatar_url}`);
    console.log(`  picture: ${meta.picture}`);
    console.log(`  All metadata keys: ${JSON.stringify(Object.keys(meta))}`);
    console.log('');
  }
}

debugAuth();
