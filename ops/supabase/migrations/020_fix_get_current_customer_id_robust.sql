-- Migration: Fix get_current_customer_id() to handle missing JWT email
-- Problem: JWT claims don't always include email, causing function to return null
-- Solution: Try multiple methods to get email (JWT -> auth.users -> profiles)

-- ============================================================================
-- STEP 1: Drop and recreate the function with robust email lookup
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
  -- Get current user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Method 1: Try JWT claims email (most common in Supabase)
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
  
  -- Method 2: Get email directly from auth.users (more reliable)
  -- This works even if JWT doesn't have email claim
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
  
  -- Method 3: Try profiles.email if it exists (some setups store email there)
  -- Note: Based on schema, profiles doesn't have email, but checking anyway
  BEGIN
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
  EXCEPTION
    WHEN undefined_column THEN
      -- profiles.email doesn't exist, skip
      NULL;
  END;
  
  -- All methods failed - no customer found
  RETURN NULL;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_current_customer_id() TO authenticated;

-- ============================================================================
-- STEP 2: Add comment explaining the function
-- ============================================================================
COMMENT ON FUNCTION public.get_current_customer_id() IS 
'Returns the customer_id for the currently authenticated user. 
Tries multiple methods to get email: JWT claims -> auth.users.email -> profiles.email.
Returns NULL if no matching customer record is found.';
