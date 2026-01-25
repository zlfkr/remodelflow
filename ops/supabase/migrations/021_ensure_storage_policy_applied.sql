-- Migration: Ensure customer storage policy is correctly applied
-- This migration ensures the storage policy uses the fixed get_current_customer_id() function

-- ============================================================================
-- STEP 1: Drop existing customer storage policy (if exists)
-- ============================================================================
DROP POLICY IF EXISTS "Customers can view design files" ON storage.objects;

-- ============================================================================
-- STEP 2: Create/Recreate customer storage policy with fixed function
-- ============================================================================
-- This policy uses get_current_customer_id() which now works correctly
-- (it uses auth.users.email as fallback when JWT email is missing)

CREATE POLICY "Customers can view design files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-designs' AND
  -- Extract project_id from file path (format: project_id/filename)
  -- storage.foldername(name) returns array: [project_id, filename]
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM projects 
    WHERE customer_id = public.get_current_customer_id()
  )
);

-- ============================================================================
-- STEP 3: Verify the policy exists
-- ============================================================================
SELECT 
  policyname,
  cmd,
  schemaname,
  tablename
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname = 'Customers can view design files';

-- ============================================================================
-- NOTES
-- ============================================================================
-- This policy allows customers to:
-- 1. View files in the 'project-designs' bucket
-- 2. Only for projects where customer_id matches their customer record
-- 3. Uses get_current_customer_id() which now works with auth.users.email fallback
--
-- For this to work:
-- 1. Bucket must exist: 'project-designs'
-- 2. Bucket should be PRIVATE (not public) for security
-- 3. Frontend must generate signed URLs for customers
-- 4. get_current_customer_id() function must exist and work correctly
