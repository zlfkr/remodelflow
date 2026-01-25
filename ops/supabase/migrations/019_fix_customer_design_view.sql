-- Migration: Fix customer design file viewing
-- This migration updates the storage policy to use helper function and ensures customers can view design files

-- ============================================================================
-- STEP 1: Drop existing customer storage policy
-- ============================================================================
DROP POLICY IF EXISTS "Customers can view design files" ON storage.objects;

-- ============================================================================
-- STEP 2: Create improved customer storage policy using helper function
-- ============================================================================
-- This policy uses get_current_customer_id() helper function to avoid RLS recursion
-- Customers can view files for projects assigned to them

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
-- VERIFICATION NOTES
-- ============================================================================
-- After running this migration:
-- 1. Customers should be able to view design images/files
-- 2. Frontend code generates signed URLs for customers (private bucket)
-- 3. Storage policy allows customers to access files for their projects
-- 
-- If customers still can't see images:
-- 1. Check browser console for 403 errors
-- 2. Verify get_current_customer_id() function exists
-- 3. Verify storage bucket 'project-designs' exists and is private
-- 4. Check that file paths in database match storage structure
