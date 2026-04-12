/**
 * Field Pro - User Setup Script
 * 
 * Run this ONCE to create the initial users in Supabase Auth.
 * 
 * Usage:
 *   node supabase/setup-users.mjs
 * 
 * This uses the Supabase signup endpoint (no service_role key needed).
 * After running, check the Supabase dashboard > Authentication > Users
 * to verify all 4 users were created.
 */

// Load credentials from environment variables — NEVER hardcode credentials in source files
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const ORG_ID = process.env.ORG_ID || '00000000-0000-0000-0000-000000000001';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('ERROR: Set SUPABASE_URL and SUPABASE_ANON_KEY environment variables before running this script.');
  console.error('  SUPABASE_URL=https://your-project.supabase.co SUPABASE_ANON_KEY=eyJ... node supabase/setup-users.mjs');
  process.exit(1);
}

// Update these emails/passwords before running. Do NOT commit real passwords to git.
const USERS = [
  { email: process.env.ADMIN_EMAIL || 'admin@yourdomain.com', password: process.env.ADMIN_PASSWORD || '', name: 'Admin User', role: 'ADMIN' },
  { email: process.env.ESTIMATOR_EMAIL || 'estimator@yourdomain.com', password: process.env.ESTIMATOR_PASSWORD || '', name: 'Field Estimator', role: 'ESTIMATOR' },
  { email: process.env.FIELD_EMAIL || 'field@yourdomain.com', password: process.env.FIELD_PASSWORD || '', name: 'Field Lead', role: 'FIELD_EMPLOYEE' },
  { email: process.env.SUB_EMAIL || 'sub@yourdomain.com', password: process.env.SUB_PASSWORD || '', name: 'Subcontractor A', role: 'SUBCONTRACTOR' },
].filter(u => u.password); // Skip any users whose password env var wasn't set

async function createUser(user) {
  console.log(`Creating user: ${user.email}...`);

  // Step 1: Sign up the user via the auth API
  const signupRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      data: { name: user.name, role: user.role }
    }),
  });

  const signupData = await signupRes.json();

  if (signupData.error || !signupData.id) {
    if (signupData.msg?.includes('already been registered') || signupData.error?.includes('already')) {
      console.log(`  -> Already exists, skipping signup.`);
      // Try to sign in to get the ID
      const loginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ email: user.email, password: user.password }),
      });
      const loginData = await loginRes.json();
      if (loginData.user?.id) {
        return await createProfile(loginData.user.id, loginData.access_token, user);
      }
      console.log(`  -> Could not get user ID. May need manual profile creation.`);
      return false;
    }
    console.error(`  -> Signup failed:`, signupData.error || signupData.msg || signupData);
    return false;
  }

  const userId = signupData.id || signupData.user?.id;
  const accessToken = signupData.access_token || signupData.session?.access_token;
  console.log(`  -> Created with ID: ${userId}`);

  // Step 2: Create the profile row
  return await createProfile(userId, accessToken, user);
}

async function createProfile(userId, accessToken, user) {
  console.log(`  -> Creating profile for ${user.email}...`);

  // Use the user's own access token to insert their profile
  // (RLS policy allows users to insert their own profile)
  const token = accessToken || SUPABASE_ANON_KEY;

  const profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      id: userId,
      org_id: ORG_ID,
      email: user.email,
      name: user.name,
      role: user.role,
    }),
  });

  if (profileRes.ok || profileRes.status === 201) {
    console.log(`  -> Profile created successfully.`);
    return true;
  }

  const profileErr = await profileRes.text();
  if (profileErr.includes('duplicate') || profileErr.includes('already exists')) {
    console.log(`  -> Profile already exists, skipping.`);
    return true;
  }

  console.error(`  -> Profile creation failed (${profileRes.status}):`, profileErr);
  console.log(`  -> You may need to insert the profile manually via SQL Editor.`);
  return false;
}

async function main() {
  console.log('=== Field Pro User Setup ===');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Org ID: ${ORG_ID}`);
  console.log('');

  let allSuccess = true;
  for (const user of USERS) {
    const success = await createUser(user);
    if (!success) allSuccess = false;
    console.log('');
  }

  if (allSuccess) {
    console.log('=== All users created successfully! ===');
    console.log('');
    console.log('You can now sign in with the emails and passwords you provided.');
    console.log('');
    console.log('If email confirmation is required, go to:');
    console.log(`  ${SUPABASE_URL.replace('.supabase.co', '')}/dashboard/project/jcxvkyfmoiwayxfmgnif/auth/users`);
    console.log('  and click "Confirm" next to each user.');
  } else {
    console.log('=== Some users may need manual setup. See errors above. ===');
    console.log('');
    console.log('Alternative: Go to the Supabase Auth dashboard and click "Add user" > "Create new user"');
    console.log('for each user manually, then run the profile SQL in the SQL Editor.');
  }
}

main().catch(console.error);
