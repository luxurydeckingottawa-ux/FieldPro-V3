-- ============================================================
-- Field Pro - User Setup Script
-- ============================================================
-- Run this ONCE in the Supabase SQL Editor after the schema
-- migration. This creates the 4 default users for Luxury Decking.
--
-- IMPORTANT: After running this script, each user can sign in
-- with their email and the password 'LuxDeck2026!' (change
-- these passwords in production).
-- ============================================================

-- Create auth users using Supabase's built-in auth function.
-- This is the correct way to create users server-side.

-- 1. Admin User
SELECT auth.create_user('{
  "email": "admin@luxurydecking.ca",
  "password": "LuxDeck2026!",
  "email_confirmed": true,
  "user_metadata": {"name": "Admin User", "role": "ADMIN"}
}'::jsonb);

-- 2. Field Estimator  
SELECT auth.create_user('{
  "email": "estimator@luxurydecking.ca",
  "password": "LuxDeck2026!",
  "email_confirmed": true,
  "user_metadata": {"name": "Field Estimator", "role": "ESTIMATOR"}
}'::jsonb);

-- 3. Field Employee
SELECT auth.create_user('{
  "email": "field@luxurydecking.ca",
  "password": "LuxDeck2026!",
  "email_confirmed": true,
  "user_metadata": {"name": "Field Lead", "role": "FIELD_EMPLOYEE"}
}'::jsonb);

-- 4. Subcontractor
SELECT auth.create_user('{
  "email": "sub@external.ca",
  "password": "LuxDeck2026!",
  "email_confirmed": true,
  "user_metadata": {"name": "Subcontractor A", "role": "SUBCONTRACTOR"}
}'::jsonb);

-- Now create profile rows linking each auth user to the Luxury Decking org.
-- We use a subquery to get the auth user IDs by email.

INSERT INTO profiles (id, org_id, email, name, role) VALUES
(
  (SELECT id FROM auth.users WHERE email = 'admin@luxurydecking.ca'),
  '00000000-0000-0000-0000-000000000001',
  'admin@luxurydecking.ca',
  'Admin User',
  'ADMIN'
),
(
  (SELECT id FROM auth.users WHERE email = 'estimator@luxurydecking.ca'),
  '00000000-0000-0000-0000-000000000001',
  'estimator@luxurydecking.ca',
  'Field Estimator',
  'ESTIMATOR'
),
(
  (SELECT id FROM auth.users WHERE email = 'field@luxurydecking.ca'),
  '00000000-0000-0000-0000-000000000001',
  'field@luxurydecking.ca',
  'Field Lead',
  'FIELD_EMPLOYEE'
),
(
  (SELECT id FROM auth.users WHERE email = 'sub@external.ca'),
  '00000000-0000-0000-0000-000000000001',
  'sub@external.ca',
  'Subcontractor A',
  'SUBCONTRACTOR'
);
