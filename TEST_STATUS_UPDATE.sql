-- Complete test script to verify status update is working
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Verify all components exist
-- ============================================================================
SELECT 'Functions' as component_type, routine_name as name, '✅' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('customer_progress_project_status', 'get_current_customer_id', 'enforce_customer_project_update')
UNION ALL
SELECT 'Triggers' as component_type, trigger_name as name, '✅' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN ('trg_enforce_customer_project_update', 'trigger_log_customer_status_progression');

-- ============================================================================
-- STEP 2: Find projects with 'in_progress' status for testing
-- ============================================================================
SELECT 
  p.id,
  p.name,
  p.status,
  p.customer_id,
  c.email as customer_email,
  p.updated_at
FROM projects p
JOIN customers c ON p.customer_id = c.id
WHERE p.status = 'in_progress'
ORDER BY p.created_at DESC
LIMIT 10;

-- ============================================================================
-- STEP 3: Check current user context (for testing)
-- ============================================================================
-- This shows who you're logged in as
SELECT 
  auth.uid() as current_user_id,
  (current_setting('request.jwt.claims', true)::json->>'email') as current_user_email;

-- ============================================================================
-- STEP 4: Check if current user is a customer
-- ============================================================================
SELECT 
  p.id,
  p.role,
  CASE 
    WHEN p.role = 'customer' THEN '✅ User is a customer'
    ELSE '❌ User is not a customer'
  END as status
FROM profiles p
WHERE p.id = auth.uid();

-- ============================================================================
-- STEP 5: Check if current user has a customer record
-- ============================================================================
SELECT 
  c.id as customer_id,
  c.email,
  CASE 
    WHEN c.id IS NOT NULL THEN '✅ Customer record exists'
    ELSE '❌ Customer record not found'
  END as status
FROM customers c
WHERE c.email = (current_setting('request.jwt.claims', true)::json->>'email')
LIMIT 1;

-- ============================================================================
-- STEP 6: Test the function (REPLACE WITH ACTUAL PROJECT ID)
-- ============================================================================
-- IMPORTANT: 
-- 1. You must be logged in as a CUSTOMER user
-- 2. Replace 'YOUR_PROJECT_ID' with an actual project UUID
-- 3. The project must have status 'in_progress'
-- 4. The project must belong to the logged-in customer
--
-- SELECT customer_progress_project_status('YOUR_PROJECT_ID'::uuid);
--
-- Expected results:
-- - Success: No output, status changes to 'review'
-- - Error: Error message explaining the issue

-- ============================================================================
-- STEP 7: After testing, verify the update
-- ============================================================================
-- Run this after calling the function to see if status changed:
-- SELECT 
--   id,
--   name,
--   status,
--   updated_at,
--   CASE 
--     WHEN status = 'review' THEN '✅ Status updated successfully'
--     ELSE '❌ Status not updated'
--   END as result
-- FROM projects 
-- WHERE id = 'YOUR_PROJECT_ID'::uuid;

-- ============================================================================
-- STEP 8: Check activity log
-- ============================================================================
-- After successful update, check if activity was logged:
-- SELECT 
--   type,
--   description,
--   metadata,
--   created_at
-- FROM project_activity 
-- WHERE project_id = 'YOUR_PROJECT_ID'::uuid
-- ORDER BY created_at DESC 
-- LIMIT 5;
