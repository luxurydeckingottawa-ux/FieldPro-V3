-- ============================================================
-- Field Pro - Auth User Setup
-- Run this ONCE in the Supabase SQL Editor
-- ============================================================

INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'admin@luxurydecking.ca', crypt('LuxAdmin2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin User"}', 'authenticated', 'authenticated', NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'estimator@luxurydecking.ca', crypt('LuxEstimator2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Field Estimator"}', 'authenticated', 'authenticated', NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'field@luxurydecking.ca', crypt('LuxField2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Field Lead"}', 'authenticated', 'authenticated', NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000000', 'sub@external.ca', crypt('LuxSub2026!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Subcontractor A"}', 'authenticated', 'authenticated', NOW(), NOW());

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', '{"sub":"11111111-1111-1111-1111-111111111111","email":"admin@luxurydecking.ca"}', 'email', '11111111-1111-1111-1111-111111111111', NOW(), NOW(), NOW()),
('22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', '{"sub":"22222222-2222-2222-2222-222222222222","email":"estimator@luxurydecking.ca"}', 'email', '22222222-2222-2222-2222-222222222222', NOW(), NOW(), NOW()),
('33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', '{"sub":"33333333-3333-3333-3333-333333333333","email":"field@luxurydecking.ca"}', 'email', '33333333-3333-3333-3333-333333333333', NOW(), NOW(), NOW()),
('44444444-4444-4444-4444-444444444444', '44444444-4444-4444-4444-444444444444', '{"sub":"44444444-4444-4444-4444-444444444444","email":"sub@external.ca"}', 'email', '44444444-4444-4444-4444-444444444444', NOW(), NOW(), NOW());

INSERT INTO profiles (id, org_id, email, name, role) VALUES
('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'admin@luxurydecking.ca', 'Admin User', 'ADMIN'),
('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000001', 'estimator@luxurydecking.ca', 'Field Estimator', 'ESTIMATOR'),
('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000001', 'field@luxurydecking.ca', 'Field Lead', 'FIELD_EMPLOYEE'),
('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'sub@external.ca', 'Subcontractor A', 'SUBCONTRACTOR');
