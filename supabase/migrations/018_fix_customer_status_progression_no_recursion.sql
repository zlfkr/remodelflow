-- Migration: Fix customer status progression - eliminate RLS recursion
-- This migration replaces 017_allow_customer_status_progression.sql approach
-- Problem: RLS policies querying customers/projects cause infinite recursion
-- Solution: Use helper function + simple RLS policy that doesn't query tables

-- ============================================================================
-- STEP 1: Drop any existing problematic policies
-- ============================================================================

-- Drop any existing customer UPDATE policies that might cause recursion
-- CRITICAL: Drop the problematic policy that queries projects table recursively
DROP POLICY IF EXISTS "Customers can progress project status on design approval" ON projects;
DROP POLICY IF EXISTS "customers can progress status in_progress to review" ON projects;
DROP POLICY IF EXISTS "customer can set project to review" ON projects;

-- ============================================================================
-- STEP 2: Create helper function to get customer_id (avoids RLS recursion)
-- ============================================================================

-- This function uses SECURITY DEFINER to bypass RLS when looking up customer_id
-- We'll use this in the RLS policy instead of querying customers table directly
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_customer_id() TO authenticated;

-- ============================================================================
-- STEP 3: Skip RLS policy (use function + trigger only)
-- ============================================================================

-- NOTE: We're NOT creating an RLS policy because:
-- 1. Even with helper function, RLS policies can still cause recursion in some cases
-- 2. The stored function (with RLS disabled) + trigger provide sufficient security
-- 3. This is the safest approach to avoid recursion
-- 
-- The function uses `set_config('row_security', 'off')` to bypass RLS for the UPDATE
-- The trigger validates ownership and field changes as defense-in-depth

-- Drop any existing customer UPDATE policies
DROP POLICY IF EXISTS "customer can set project to review" ON projects;

-- ============================================================================
-- STEP 4: Update stored function to be simpler (still primary method)
-- ============================================================================

-- Keep the function as primary method, but simplify it
CREATE OR REPLACE FUNCTION customer_progress_project_status(p_project_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_customer_id UUID;
  v_current_status TEXT;
BEGIN
  -- CRITICAL: Disable RLS for all queries in this function to prevent recursion
  PERFORM set_config('row_security', 'off', true);

  -- Get user role (with SECURITY DEFINER + RLS disabled, this bypasses RLS)
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Must be a customer
  IF v_user_role != 'customer' THEN
    PERFORM set_config('row_security', 'on', true);
    RAISE EXCEPTION 'Permission denied: Only customers can use this function';
  END IF;

  -- Get customer_id for this user (using helper function)
  v_customer_id := public.get_current_customer_id();

  IF v_customer_id IS NULL THEN
    PERFORM set_config('row_security', 'on', true);
    RAISE EXCEPTION 'Permission denied: Customer record not found';
  END IF;

  -- Get current project status (RLS already disabled)
  SELECT status INTO v_current_status
  FROM projects
  WHERE id = p_project_id AND customer_id = v_customer_id;

  IF v_current_status IS NULL THEN
    PERFORM set_config('row_security', 'on', true);
    RAISE EXCEPTION 'Permission denied: Project not found or not assigned to you';
  END IF;

  -- Security: Can ONLY progress from 'in_progress' to 'review'
  IF v_current_status != 'in_progress' THEN
    PERFORM set_config('row_security', 'on', true);
    RAISE EXCEPTION 'Invalid status transition: Can only progress from "in_progress" status. Current status: %', v_current_status;
  END IF;

  -- Update status (RLS already disabled above)
  UPDATE projects
  SET status = 'review', updated_at = NOW()
  WHERE id = p_project_id AND customer_id = v_customer_id;
  
  -- Re-enable RLS
  PERFORM set_config('row_security', 'on', true);

  -- Verify update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update project status';
  END IF;
END;
$$;

-- ============================================================================
-- STEP 5: Ensure trigger exists (defense-in-depth)
-- ============================================================================

-- The trigger from 017 should already exist, but let's make sure it's correct
-- This trigger validates ownership and blocks non-status field changes
CREATE OR REPLACE FUNCTION public.enforce_customer_project_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
  v_customer_id UUID;
BEGIN
  -- Check if current user is a customer
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Only enforce for customers
  IF v_user_role = 'customer' THEN
    -- Verify project ownership: get customer_id for current user
    v_customer_id := public.get_current_customer_id();

    -- Must be the project's customer
    IF v_customer_id IS NULL OR NEW.customer_id != v_customer_id THEN
      RAISE EXCEPTION 'Permission denied: You can only update your own projects';
    END IF;

    -- Block changes to any field except status and updated_at
    IF (
      NEW.name IS DISTINCT FROM OLD.name OR
      NEW.owner_id IS DISTINCT FROM OLD.owner_id OR
      NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
      NEW.created_at IS DISTINCT FROM OLD.created_at
      -- Note: updated_at is allowed to change (auto-updated)
    ) THEN
      RAISE EXCEPTION 'Customers may only update project status, not other fields';
    END IF;

    -- Only allow in_progress -> review transition
    IF NOT (OLD.status = 'in_progress' AND NEW.status = 'review') THEN
      RAISE EXCEPTION 'Customers may only progress status from in_progress to review';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger (drop and recreate to ensure it's correct)
DROP TRIGGER IF EXISTS trg_enforce_customer_project_update ON public.projects;

CREATE TRIGGER trg_enforce_customer_project_update
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_customer_project_update();

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================

-- This migration fixes RLS recursion by:
-- 1. Dropping the problematic policy "Customers can progress project status on design approval"
--    which has a with_check clause that queries projects table recursively
-- 2. Creating helper function `get_current_customer_id()` that uses SECURITY DEFINER
-- 3. NOT creating an RLS policy (rely on function + trigger only to avoid any recursion)
-- 4. Stored function disables RLS explicitly to bypass all policies
-- 5. Trigger validates security as defense-in-depth

-- Security layers:
-- ✅ Stored Function: Primary method, uses SECURITY DEFINER + disables RLS for UPDATE
-- ✅ Trigger: Defense-in-depth, validates ownership and field changes
-- ✅ No RLS Policy: Avoids recursion entirely (function + trigger are sufficient)

-- To diagnose existing policies causing recursion, run:
-- SELECT policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname='public' AND tablename='projects';
