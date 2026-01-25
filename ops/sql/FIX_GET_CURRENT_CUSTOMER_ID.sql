-- Fix: Improve get_current_customer_id() function to handle edge cases
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check current situation
-- ============================================================================
-- Check what email the function is looking for
SELECT 
  (current_setting('request.jwt.claims', true)::json->>'email') as jwt_email,
  auth.uid() as user_id;

-- Check if customer exists (case-insensitive)
SELECT 
  id,
  email,
  LOWER(email) as email_lower,
  full_name,
  owner_id
FROM customers
WHERE LOWER(email) = LOWER((current_setting('request.jwt.claims', true)::json->>'email'));

-- ============================================================================
-- STEP 2: Update function to be case-insensitive and more robust
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_current_customer_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_customer_id UUID;
  v_user_email TEXT;
BEGIN
  -- Get email from JWT claims
  v_user_email := current_setting('request.jwt.claims', true)::json->>'email';
  
  -- If no email in JWT, return null
  IF v_user_email IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Look up customer by email (case-insensitive)
  SELECT id INTO v_customer_id
  FROM customers
  WHERE LOWER(email) = LOWER(v_user_email)
  LIMIT 1;
  
  RETURN v_customer_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_current_customer_id() TO authenticated;

-- ============================================================================
-- STEP 3: Test the updated function
-- ============================================================================
SELECT 
  public.get_current_customer_id() as customer_id,
  (current_setting('request.jwt.claims', true)::json->>'email') as user_email;

-- ============================================================================
-- STEP 4: If still null, check if customer record needs to be created
-- ============================================================================
-- If you're a customer user but no customer record exists, you might need to:
-- 1. Accept an invite (which should link you to existing customer record)
-- 2. Or have the owner create a customer record with your email first

-- Check all customers to see if your email exists (case variations)
SELECT 
  id,
  email,
  LOWER(email) as email_lower,
  full_name
FROM customers
WHERE LOWER(email) LIKE LOWER('%' || (current_setting('request.jwt.claims', true)::json->>'email') || '%');
