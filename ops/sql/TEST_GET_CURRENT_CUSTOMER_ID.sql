-- Test script for get_current_customer_id function
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check if function exists
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_current_customer_id';

-- ============================================================================
-- STEP 2: Test the function (must be logged in as a customer)
-- ============================================================================
-- This will return the customer_id for the currently logged-in user
SELECT public.get_current_customer_id() as customer_id;

-- ============================================================================
-- STEP 3: Verify it returns the correct customer
-- ============================================================================
-- Compare with direct query
SELECT 
  c.id as customer_id_from_function,
  c.id as customer_id_direct,
  c.email,
  c.full_name
FROM customers c
WHERE c.email = (current_setting('request.jwt.claims', true)::json->>'email')
  AND c.id = public.get_current_customer_id();

-- ============================================================================
-- STEP 4: Check current user context
-- ============================================================================
SELECT 
  auth.uid() as current_user_id,
  (current_setting('request.jwt.claims', true)::json->>'email') as current_user_email,
  public.get_current_customer_id() as customer_id;

-- ============================================================================
-- STEP 5: If function doesn't exist, create it
-- ============================================================================
-- Run this if the function is missing:
/*
CREATE OR REPLACE FUNCTION public.get_current_customer_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_customer_id UUID;
BEGIN
  SELECT id INTO v_customer_id
  FROM customers
  WHERE email = (current_setting('request.jwt.claims', true)::json->>'email')
  LIMIT 1;
  
  RETURN v_customer_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_current_customer_id() TO authenticated;
*/
