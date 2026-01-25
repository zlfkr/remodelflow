-- Check storage bucket configuration and policies
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Check if bucket exists and is public/private
-- ============================================================================
-- Note: This might require admin access
SELECT 
  name,
  id,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'project-designs';

-- ============================================================================
-- STEP 2: Check storage policies
-- ============================================================================
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%design%';

-- ============================================================================
-- STEP 3: Test if customer can access files
-- ============================================================================
-- This will show what the storage policy allows
SELECT 
  name,
  bucket_id,
  created_at
FROM storage.objects
WHERE bucket_id = 'project-designs'
LIMIT 5;

-- ============================================================================
-- STEP 4: Check if bucket is public
-- ============================================================================
-- If bucket is public, customers can use public URLs directly
-- If bucket is private, they need signed URLs (which requires correct storage policy)

-- ============================================================================
-- QUICK FIX OPTIONS
-- ============================================================================

-- Option 1: Make bucket public (less secure, but simpler)
-- UPDATE storage.buckets SET public = true WHERE name = 'project-designs';
-- Note: This allows anyone with the URL to access files

-- Option 2: Fix storage policy (more secure, recommended)
-- Run: supabase/migrations/019_fix_customer_design_view.sql

-- Option 3: Use public URLs for now (if bucket is public)
-- The frontend code already falls back to public URL if signed URL fails
