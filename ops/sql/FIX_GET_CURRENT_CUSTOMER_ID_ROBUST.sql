-- Robust fix for get_current_customer_id() - tries multiple methods
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check customers table structure
-- ============================================================================
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'customers'
ORDER BY ordinal_position;

-- ============================================================================
-- STEP 2: Create improved function that tries multiple methods
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
  v_user_id UUID;
BEGIN
  -- Method 1: Try JWT claims email (most common)
  v_user_email := current_setting('request.jwt.claims', true)::json->>'email';
  
  IF v_user_email IS NOT NULL THEN
    SELECT id INTO v_customer_id
    FROM customers
    WHERE LOWER(email) = LOWER(v_user_email)
    LIMIT 1;
    
    IF v_customer_id IS NOT NULL THEN
      RETURN v_customer_id;
    END IF;
  END IF;
  
  -- Method 2: Try auth.users email (if JWT doesn't have it)
  v_user_id := auth.uid();
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email
    FROM auth.users
    WHERE id = v_user_id;
    
    IF v_user_email IS NOT NULL THEN
      SELECT id INTO v_customer_id
      FROM customers
      WHERE LOWER(email) = LOWER(v_user_email)
      LIMIT 1;
      
      IF v_customer_id IS NOT NULL THEN
        RETURN v_customer_id;
      END IF;
    END IF;
  END IF;
  
  -- Method 3: Try profiles.email (if it exists)
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email
    FROM profiles
    WHERE id = v_user_id;
    
    IF v_user_email IS NOT NULL THEN
      SELECT id INTO v_customer_id
      FROM customers
      WHERE LOWER(email) = LOWER(v_user_email)
      LIMIT 1;
      
      IF v_customer_id IS NOT NULL THEN
        RETURN v_customer_id;
      END IF;
    END IF;
  END IF;
  
  -- Method 4: Try auth_user_id column (if it exists in customers table)
  -- Note: This requires checking if column exists first, but we'll try it
  -- If column doesn't exist, this will just return null
  IF v_user_id IS NOT NULL THEN
    BEGIN
      SELECT id INTO v_customer_id
      FROM customers
      WHERE auth_user_id = v_user_id
      LIMIT 1;
      
      IF v_customer_id IS NOT NULL THEN
        RETURN v_customer_id;
      END IF;
    EXCEPTION
      WHEN undefined_column THEN
        -- Column doesn't exist, skip this method
        NULL;
    END;
  END IF;
  
  -- All methods failed
  RETURN NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_current_customer_id() TO authenticated;

-- ============================================================================
-- STEP 3: Test the improved function
-- ============================================================================
SELECT 
  public.get_current_customer_id() as customer_id,
  (current_setting('request.jwt.claims', true)::json->>'email') as jwt_email,
  auth.uid() as user_id;

-- ============================================================================
-- STEP 4: Verify it works with actual customer lookup
-- ============================================================================
SELECT 
  c.id as customer_id,
  c.email,
  c.full_name,
  public.get_current_customer_id() as function_result
FROM customers c
WHERE c.id = public.get_current_customer_id();
