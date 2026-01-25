-- Verify customer can access this specific design file
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check if storage policy exists
-- ============================================================================
SELECT 
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname = 'Customers can view design files';

-- ============================================================================
-- STEP 2: Check project assignment
-- ============================================================================
-- Replace with your actual project_id
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.status,
  c.id as customer_id,
  c.email as customer_email,
  c.full_name as customer_name,
  public.get_current_customer_id() as current_customer_id_from_function,
  CASE 
    WHEN c.id = public.get_current_customer_id() THEN '✅ Customer is assigned'
    ELSE '❌ Customer NOT assigned'
  END as assignment_status
FROM projects p
JOIN customers c ON p.customer_id = c.id
WHERE p.id = 'f09e1ab8-56c6-4043-9197-1df0b4a96a73';

-- ============================================================================
-- STEP 3: Check if file exists in storage
-- ============================================================================
SELECT 
  name as file_path,
  bucket_id,
  created_at,
  (storage.foldername(name))[1] as project_id_from_path,
  CASE 
    WHEN (storage.foldername(name))[1] = 'f09e1ab8-56c6-4043-9197-1df0b4a96a73' THEN '✅ Path matches project'
    ELSE '❌ Path mismatch'
  END as path_match
FROM storage.objects
WHERE bucket_id = 'project-designs'
  AND name LIKE '%1769221404453_172ysp.jpeg%'
LIMIT 1;

-- ============================================================================
-- STEP 4: Test storage policy logic manually
-- ============================================================================
-- This simulates what the storage policy checks
SELECT 
  'f09e1ab8-56c6-4043-9197-1df0b4a96a73'::text IN (
    SELECT id::text 
    FROM projects 
    WHERE customer_id = public.get_current_customer_id()
  ) as policy_would_allow_access;

-- ============================================================================
-- STEP 5: Check current user context
-- ============================================================================
SELECT 
  auth.uid() as current_user_id,
  (current_setting('request.jwt.claims', true)::json->>'email') as jwt_email,
  public.get_current_customer_id() as customer_id,
  (SELECT email FROM auth.users WHERE id = auth.uid()) as auth_email;
