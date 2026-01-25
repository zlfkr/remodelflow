-- Test script for customer_progress_project_status function
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
  AND routine_name = 'customer_progress_project_status';

-- ============================================================================
-- STEP 2: Check if helper function exists
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_current_customer_id';

-- ============================================================================
-- STEP 3: Find a project with status 'in_progress' for testing
-- ============================================================================
-- Replace with your actual customer email or project ID
SELECT 
  p.id,
  p.name,
  p.status,
  p.customer_id,
  c.email as customer_email,
  pr.role as customer_role
FROM projects p
JOIN customers c ON p.customer_id = c.id
JOIN profiles pr ON c.email = (SELECT email FROM auth.users WHERE id = pr.id)
WHERE p.status = 'in_progress'
LIMIT 5;

-- ============================================================================
-- STEP 4: Test the function (REPLACE PROJECT_ID with actual UUID)
-- ============================================================================
-- IMPORTANT: You must be logged in as a customer user to test this
-- 
-- SELECT customer_progress_project_status('YOUR_PROJECT_ID_HERE'::uuid);
--
-- Expected result:
-- - If successful: No error, project status changes to 'review'
-- - If fails: Error message explaining why

-- ============================================================================
-- STEP 5: Verify the update worked
-- ============================================================================
-- After running the function, check if status changed:
-- SELECT id, name, status, updated_at 
-- FROM projects 
-- WHERE id = 'YOUR_PROJECT_ID_HERE'::uuid;

-- ============================================================================
-- STEP 6: Check activity log
-- ============================================================================
-- The trigger should have created an activity entry:
-- SELECT * 
-- FROM project_activity 
-- WHERE project_id = 'YOUR_PROJECT_ID_HERE'::uuid
-- ORDER BY created_at DESC 
-- LIMIT 5;
