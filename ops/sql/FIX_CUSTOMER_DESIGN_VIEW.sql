-- Fix: Allow customers to view design files
-- This migration fixes the storage policy to ensure customers can see design images

-- ============================================================================
-- STEP 1: Drop existing customer storage policy (if exists)
-- ============================================================================
DROP POLICY IF EXISTS "Customers can view design files" ON storage.objects;

-- ============================================================================
-- STEP 2: Create improved customer storage policy
-- ============================================================================
-- This policy uses the helper function to avoid RLS recursion
-- Customers can view files for projects assigned to them

CREATE POLICY "Customers can view design files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-designs' AND
  -- Extract project_id from file path (format: project_id/filename)
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM projects 
    WHERE customer_id = public.get_current_customer_id()
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After running this, test by:
-- 1. Log in as a customer
-- 2. Navigate to a project with designs
-- 3. Check if images load
-- 4. Check browser console for any 403 errors

-- If images still don't load, the issue might be:
-- 1. File URLs need to be signed URLs (not public URLs)
-- 2. Storage bucket needs to be configured correctly
-- 3. File paths in database don't match storage structure
