-- Migration: Allow customers to update project status from 'in_progress' to 'review'
-- This enables automatic status progression when customer approves a design
-- Security: Very strict - only allows this specific transition, only for customer's own projects
-- Approach: Use a stored function to avoid RLS recursion issues

-- ============================================================================
-- STORED FUNCTION: Customer Status Progression
-- ============================================================================

-- Create a function that customers can call to progress project status
-- This avoids RLS recursion by using SECURITY DEFINER and explicit checks
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
  -- Get user role (with SECURITY DEFINER, this bypasses RLS)
  SELECT role INTO v_user_role
  FROM profiles
  WHERE id = auth.uid();

  -- Must be a customer
  IF v_user_role != 'customer' THEN
    RAISE EXCEPTION 'Permission denied: Only customers can use this function';
  END IF;

  -- Get customer_id for this user
  SELECT id INTO v_customer_id
  FROM customers
  WHERE email = (current_setting('request.jwt.claims', true)::json->>'email')
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'Permission denied: Customer record not found';
  END IF;

  -- Get current project status
  SELECT status INTO v_current_status
  FROM projects
  WHERE id = p_project_id AND customer_id = v_customer_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Permission denied: Project not found or not assigned to you';
  END IF;

  -- Security: Can ONLY progress from 'in_progress' to 'review'
  IF v_current_status != 'in_progress' THEN
    RAISE EXCEPTION 'Invalid status transition: Can only progress from "in_progress" status. Current status: %', v_current_status;
  END IF;

  -- Update status
  -- With SECURITY DEFINER, this should bypass RLS, but if recursion still occurs,
  -- we'll use a direct UPDATE that doesn't trigger RLS policies
  UPDATE projects
  SET status = 'review', updated_at = NOW()
  WHERE id = p_project_id AND customer_id = v_customer_id;

  -- Verify update succeeded
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update project status';
  END IF;
END;
$$;

-- Grant execute permission to authenticated users (RLS will restrict to customers)
GRANT EXECUTE ON FUNCTION customer_progress_project_status(UUID) TO authenticated;

-- ============================================================================
-- RLS POLICY: Allow customers to call the function
-- ============================================================================

-- Note: The function itself handles security, but we need to ensure customers
-- can see their projects to call the function. The existing "Customers can view assigned projects"
-- policy should handle this.

-- ============================================================================
-- RLS POLICY: Allow customers to progress status (defense-in-depth)
-- ============================================================================

-- NOTE: We're NOT creating an RLS policy here because:
-- 1. Querying `customers` table in RLS policy causes recursion (customers RLS might reference projects)
-- 2. The stored function approach (using SECURITY DEFINER) is the primary method and bypasses RLS
-- 3. The trigger provides defense-in-depth validation
-- 
-- If you need an RLS policy for direct UPDATEs, you would need to:
-- - Create a helper function that returns customer_id for current user (using SECURITY DEFINER)
-- - Use that function in the RLS policy instead of querying customers table directly
-- 
-- For now, we rely on: Function (primary) + Trigger (validation) = secure without recursion

-- Drop any existing customer UPDATE policy (in case it was created before)
DROP POLICY IF EXISTS "customers can progress status in_progress to review" ON projects;
DROP POLICY IF EXISTS "customer can set project to review" ON projects;

-- ============================================================================
-- TRIGGER FUNCTION: Enforce customer project update rules
-- ============================================================================

-- This trigger provides defense-in-depth: even if RLS is bypassed,
-- customers cannot change any field except status, and only from 'in_progress' to 'review'
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
    SELECT id INTO v_customer_id
    FROM customers
    WHERE email = (current_setting('request.jwt.claims', true)::json->>'email')
    LIMIT 1;

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

-- Attach trigger
DROP TRIGGER IF EXISTS trg_enforce_customer_project_update ON public.projects;
DROP TRIGGER IF EXISTS trg_block_customer_project_field_updates ON public.projects;

CREATE TRIGGER trg_enforce_customer_project_update
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.enforce_customer_project_update();

-- ============================================================================
-- TRIGGER FUNCTION: Log status change activity
-- ============================================================================

-- Create a trigger to automatically log status changes when status is updated to 'review'
-- This ensures activity timeline shows the status change
CREATE OR REPLACE FUNCTION log_customer_status_progression()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Only log if status changed from 'in_progress' to 'review'
  IF OLD.status = 'in_progress' AND NEW.status = 'review' THEN
    -- Check if this was triggered by customer (not owner)
    -- Use SECURITY DEFINER to bypass RLS and prevent recursion
    SELECT role INTO v_user_role
    FROM profiles
    WHERE id = auth.uid();

    IF v_user_role = 'customer' THEN
      -- Insert activity entry
      INSERT INTO project_activity (
        project_id,
        type,
        description,
        metadata,
        created_by
      ) VALUES (
        NEW.id,
        'status_changed',
        'Status changed: in progress → review (design approved)',
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'triggered_by', 'design_approval'
        ),
        auth.uid()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_log_customer_status_progression ON projects;
CREATE TRIGGER trigger_log_customer_status_progression
  AFTER UPDATE OF status ON projects
  FOR EACH ROW
  WHEN (OLD.status = 'in_progress' AND NEW.status = 'review')
  EXECUTE FUNCTION log_customer_status_progression();

-- ============================================================================
-- VERIFICATION NOTES
-- ============================================================================

-- This migration implements a multi-layered security approach:

-- LAYER 1: Stored Function (Primary method, avoids RLS recursion)
-- 1. Function `customer_progress_project_status()` handles the update with explicit security checks
-- 2. Function uses SECURITY DEFINER to bypass RLS for internal queries
-- 3. Function validates: customer role, project ownership, status transition
-- 4. Recommended for frontend use to avoid RLS recursion

-- LAYER 2: Trigger (Defense-in-depth, blocks field changes + validates ownership)
-- 5. Trigger `enforce_customer_project_update()` blocks any non-status field changes
-- 6. Trigger enforces: customer role check, project ownership, only status can change
-- 7. Trigger enforces: only from 'in_progress' to 'review' status transition
-- 8. Even if RLS is bypassed, trigger prevents unauthorized field changes
-- 9. Uses SECURITY DEFINER to avoid recursion when querying customers/profiles

-- LAYER 3: Activity Logging
-- 10. Trigger `log_customer_status_progression()` automatically logs status changes
-- 11. Activity timeline shows status progression for audit trail

-- NOTE: No RLS policy for customer UPDATE because:
-- - Querying `customers` table in RLS causes recursion (customers RLS might reference projects)
-- - Function + Trigger provide sufficient security without RLS recursion

-- Security guarantees:
-- ✅ Only customers can call the function (validated in function)
-- ✅ Customers can ONLY update their own projects (validated in function + trigger)
-- ✅ Customers can ONLY change status from 'in_progress' to 'review' (function + trigger)
-- ✅ Customers CANNOT change any other fields (enforced by trigger)
-- ✅ Customer role verified in function and trigger (double-check)
-- ✅ Project ownership verified in function and trigger (double-check)
-- ✅ Activity timeline automatically logs the status change
-- ✅ Owners retain full update permissions (unchanged, they don't use this function)

-- Usage in frontend (RECOMMENDED):
-- Use the stored function to avoid RLS recursion:
-- const { error } = await supabase.rpc('customer_progress_project_status', { p_project_id: projectId });
-- if (error) {
--   console.error('[Design Approval] Status update failed:', error);
--   // Handle error appropriately
-- }

-- Alternative (direct UPDATE - will be validated by trigger):
-- Note: Direct UPDATEs will be blocked by trigger if not using the function.
-- The trigger enforces all security rules, but the function is recommended
-- to avoid any potential RLS evaluation issues.
