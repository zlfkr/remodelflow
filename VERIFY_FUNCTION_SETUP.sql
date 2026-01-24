-- Verify that all required functions and triggers are set up correctly
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check if main function exists
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  security_type,
  CASE 
    WHEN routine_name = 'customer_progress_project_status' THEN '✅ Main function exists'
    ELSE '❌ Main function missing'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'customer_progress_project_status';

-- ============================================================================
-- STEP 2: Check if helper function exists (you already confirmed this)
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  security_type,
  '✅ Helper function exists' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_current_customer_id';

-- ============================================================================
-- STEP 3: Check if trigger exists
-- ============================================================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  CASE 
    WHEN trigger_name = 'trg_enforce_customer_project_update' THEN '✅ Trigger exists'
    ELSE '⚠️ Trigger missing or different name'
  END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trg_enforce_customer_project_update';

-- ============================================================================
-- STEP 4: Check trigger function exists
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  security_type,
  CASE 
    WHEN routine_name = 'enforce_customer_project_update' THEN '✅ Trigger function exists'
    ELSE '❌ Trigger function missing'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'enforce_customer_project_update';

-- ============================================================================
-- STEP 5: Check for problematic RLS policies (should be dropped)
-- ============================================================================
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN policyname = 'Customers can progress project status on design approval' THEN '❌ PROBLEMATIC - Should be dropped'
    WHEN policyname LIKE '%customer%' AND cmd = 'UPDATE' THEN '⚠️ Check if safe'
    ELSE '✅ OK'
  END as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'projects'
  AND cmd = 'UPDATE'
  AND (policyname LIKE '%customer%' OR policyname LIKE '%Customer%');

-- ============================================================================
-- STEP 6: Check activity logging trigger
-- ============================================================================
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  CASE 
    WHEN trigger_name = 'trigger_log_customer_status_progression' THEN '✅ Activity trigger exists'
    ELSE '⚠️ Activity trigger missing'
  END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'trigger_log_customer_status_progression';

-- ============================================================================
-- STEP 7: Summary - What's needed
-- ============================================================================
-- ✅ get_current_customer_id - EXISTS (you confirmed)
-- ❓ customer_progress_project_status - CHECK ABOVE
-- ❓ trg_enforce_customer_project_update - CHECK ABOVE
-- ❓ enforce_customer_project_update - CHECK ABOVE
-- ❓ trigger_log_customer_status_progression - CHECK ABOVE
-- ❓ No problematic RLS policies - CHECK ABOVE
