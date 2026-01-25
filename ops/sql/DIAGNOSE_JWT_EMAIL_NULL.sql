-- Comprehensive diagnostic: Why is JWT email null?
-- Run this in Supabase SQL Editor while logged in as a customer

-- ============================================================================
-- STEP 1: Check what's in the JWT claims (all possible fields)
-- ============================================================================
SELECT 
  current_setting('request.jwt.claims', true)::json as all_jwt_claims,
  current_setting('request.jwt.claims', true)::json->>'email' as jwt_email,
  current_setting('request.jwt.claims', true)::json->>'sub' as jwt_sub,
  current_setting('request.jwt.claims', true)::json->>'user_id' as jwt_user_id,
  current_setting('request.jwt.claims', true)::json->>'role' as jwt_role;

-- ============================================================================
-- STEP 2: Check auth.uid() and auth.users table
-- ============================================================================
SELECT 
  auth.uid() as current_auth_uid,
  au.id as auth_users_id,
  au.email as auth_users_email,
  au.raw_user_meta_data->>'email' as meta_email,
  au.raw_user_meta_data as all_meta
FROM auth.users au
WHERE au.id = auth.uid();

-- ============================================================================
-- STEP 3: Check profiles table
-- ============================================================================
SELECT 
  id,
  role,
  full_name,
  email as profile_email
FROM profiles
WHERE id = auth.uid();

-- ============================================================================
-- STEP 4: Check customers table (all customers)
-- ============================================================================
SELECT 
  id,
  email,
  full_name,
  owner_id,
  auth_user_id,
  created_at
FROM customers
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 5: Try to match customer by auth_user_id (if that field exists)
-- ============================================================================
-- Check if customers table has auth_user_id column
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
  AND column_name IN ('auth_user_id', 'email', 'owner_id');

-- If auth_user_id exists, try this:
SELECT 
  c.id as customer_id,
  c.email,
  c.full_name,
  c.auth_user_id,
  auth.uid() as current_uid
FROM customers c
WHERE c.auth_user_id = auth.uid();

-- ============================================================================
-- STEP 6: Check if customer exists by profile email
-- ============================================================================
SELECT 
  c.id as customer_id,
  c.email as customer_email,
  p.email as profile_email,
  p.id as profile_id,
  auth.uid() as current_uid
FROM profiles p
LEFT JOIN customers c ON LOWER(c.email) = LOWER(p.email)
WHERE p.id = auth.uid();

-- ============================================================================
-- STEP 7: Alternative - get email from auth.users directly
-- ============================================================================
-- This might work if JWT doesn't have email but auth.users does
SELECT 
  au.email as auth_email,
  au.id as auth_id,
  auth.uid() as current_uid
FROM auth.users au
WHERE au.id = auth.uid();
