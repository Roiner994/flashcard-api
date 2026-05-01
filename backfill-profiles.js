require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// We need a client with the SERVICE_ROLE_KEY to access auth.admin
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function backfill() {
  console.log('Starting backfill...');
  
  // 1. Get all users from auth.users
  const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  
  if (usersError) {
    console.error('Error fetching users:', usersError);
    return;
  }

  console.log(`Found ${users.length} users. Updating profiles...`);

  for (const user of users) {
    const metadata = user.user_metadata || {};
    const fullName = metadata.full_name || metadata.name;
    const avatarUrl = metadata.avatar_url || metadata.picture;

    console.log(`Updating user ${user.id} (${fullName || 'No name'})...`);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (updateError) {
      if (updateError.code === '42703') {
        console.error('CRITICAL: The column "full_name" does not exist yet. Please run the SQL migration first!');
        return;
      }
      console.error(`Error updating user ${user.id}:`, updateError.message);
    }
  }

  console.log('Backfill complete!');
}

backfill();
