-- Diagnostic script to check if customer status progression is working
-- Run this in Supabase SQL Editor to verify the setup

-- 1. Check if the function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'customer_progress_project_status';

-- 2. Check if helper function exists
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_current_customer_id';

-- 3. Check if trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%customer%project%';

-- 4. Check current project statuses (replace with your project IDs)
SELECT 
  id,
  name,
  status,
  customer_id,
  owner_id
FROM projects
ORDER BY created_at DESC
LIMIT 10;

-- 5. Test the helper function (replace with actual customer email)
-- SELECT public.get_current_customer_id();

-- 6. Check if there are any customer UPDATE policies (should be none or safe ones)
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'projects'
  AND cmd = 'UPDATE'
  AND policyname LIKE '%customer%';
