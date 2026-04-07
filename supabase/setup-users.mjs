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

const SUPABASE_URL = 'https://jcxvkyfmoiwayxfmgnif.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjeHZreWZtb2l3YXl4Zm1nbmlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NjM2OTAsImV4cCI6MjA5MTEzOTY5MH0.9l_YlvldWuf3RZO4KWw6eIxG0Kc9fqMtM1qCONwJuXw';
const ORG_ID = '00000000-0000-0000-0000-000000000001';

const USERS = [
  { email: 'admin@luxurydecking.ca', password: 'LuxDeck2026!', name: 'Admin User', role: 'ADMIN' },
  { email: 'estimator@luxurydecking.ca', password: 'LuxDeck2026!', name: 'Field Estimator', role: 'ESTIMATOR' },
  { email: 'field@luxurydecking.ca', password: 'LuxDeck2026!', name: 'Field Lead', role: 'FIELD_EMPLOYEE' },
  { email: 'sub@external.ca', password: 'LuxDeck2026!', name: 'Subcontractor A', role: 'SUBCONTRACTOR' },
];

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
    console.log('You can now sign in with:');
    USERS.forEach(u => console.log(`  ${u.email} / ${u.password} (${u.role})`));
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
