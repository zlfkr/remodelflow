-- DIAGNOSTIC QUERY: Find policies causing recursion
-- Run this in Supabase SQL Editor to see all policies on projects table

SELECT 
  policyname, 
  cmd, 
  qual, 
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'projects'
ORDER BY policyname;

-- Look for policies that have:
-- - SELECT ... FROM projects (in qual or with_check)
-- - SELECT ... FROM customers (if customers RLS references projects)
-- - Any subquery that might reference projects table
