-- Verify storage setup for customer design viewing
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Verify bucket exists and is private
-- ============================================================================
SELECT 
  name,
  id,
  public,
  file_size_limit
FROM storage.buckets
WHERE name = 'project-designs';

-- ============================================================================
-- STEP 2: Check storage policies
-- ============================================================================
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%design%'
ORDER BY policyname;

-- ============================================================================
-- STEP 3: Check if get_current_customer_id() function exists
-- ============================================================================
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_current_customer_id';

-- ============================================================================
-- STEP 4: Check sample file paths in storage
-- ============================================================================
SELECT 
  name as file_path,
  bucket_id,
  created_at,
  (storage.foldername(name))[1] as project_id_from_path
FROM storage.objects
WHERE bucket_id = 'project-designs'
ORDER BY created_at DESC
LIMIT 5;

-- ============================================================================
-- STEP 5: Verify project assignments match file paths
-- ============================================================================
-- This shows if projects exist for the file paths
SELECT DISTINCT
  (storage.foldername(name))[1] as project_id_from_path,
  p.id as project_id_in_db,
  p.name as project_name,
  c.id as customer_id,
  c.email as customer_email
FROM storage.objects so
LEFT JOIN projects p ON p.id::text = (storage.foldername(so.name))[1]
LEFT JOIN customers c ON p.customer_id = c.id
WHERE so.bucket_id = 'project-designs'
LIMIT 10;
