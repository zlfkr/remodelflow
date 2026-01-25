-- Diagnose why get_current_customer_id() returns null
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check current user context
-- ============================================================================
SELECT 
  auth.uid() as current_user_id,
  (current_setting('request.jwt.claims', true)::json->>'email') as current_user_email,
  (current_setting('request.jwt.claims', true)::json->>'role') as jwt_role;

-- ============================================================================
-- STEP 2: Check user's profile
-- ============================================================================
SELECT 
  id,
  role,
  full_name,
  email
FROM profiles
WHERE id = auth.uid();

-- ============================================================================
-- STEP 3: Check if customer record exists for this email
-- ============================================================================
SELECT 
  c.id as customer_id,
  c.email as customer_email,
  c.full_name,
  c.owner_id,
  p.email as profile_email,
  p.role as profile_role
FROM customers c
LEFT JOIN auth.users au ON c.email = au.email
LEFT JOIN profiles p ON au.id = p.id
WHERE c.email = (current_setting('request.jwt.claims', true)::json->>'email');

-- ============================================================================
-- STEP 4: Check all customers (if you're an owner, you can see this)
-- ============================================================================
SELECT 
  id,
  email,
  full_name,
  owner_id,
  created_at
FROM customers
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 5: Test the function directly
-- ============================================================================
SELECT 
  public.get_current_customer_id() as customer_id,
  (current_setting('request.jwt.claims', true)::json->>'email') as user_email;

-- ============================================================================
-- COMMON ISSUES AND FIXES
-- ============================================================================

-- Issue 1: User is logged in as owner, not customer
-- Fix: Log in as a customer user, or check if you need to be a customer

-- Issue 2: Customer record doesn't exist for this email
-- Fix: Create customer record or accept invite to create one

-- Issue 3: Email mismatch
-- Fix: Check if the email in auth.users matches the email in customers table

-- Issue 4: Customer record exists but for different owner
-- Fix: Make sure you're the customer for the project you're viewing
