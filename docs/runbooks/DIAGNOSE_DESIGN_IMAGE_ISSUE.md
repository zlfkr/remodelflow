# Diagnose Customer Design Image Viewing Issue

## Problem
Customers see "Error loading image. Please contact support." when trying to view design images.

## Possible Causes

### 1. Storage Policy Not Applied
The storage policy might not be set up correctly. Run:
- `supabase/migrations/019_fix_customer_design_view.sql`

### 2. File Path Extraction Issue
Check browser console for:
- `[DesignImage] Extracted file path: ...`
- `[DesignImage] Error creating signed URL: ...`

The file path should be in format: `project_id/filename.ext`

### 3. Storage Bucket Configuration
- Check if bucket `project-designs` exists
- Check if bucket is **private** (should be private for security)
- Check if RLS is enabled on storage.objects

### 4. Helper Function Missing
The storage policy uses `get_current_customer_id()` - make sure this function exists:
```sql
SELECT routine_name 
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_current_customer_id';
```

## Quick Fixes

### Fix 1: Run Storage Policy Migration
Run in Supabase SQL Editor:
```sql
-- From: supabase/migrations/019_fix_customer_design_view.sql
DROP POLICY IF EXISTS "Customers can view design files" ON storage.objects;

CREATE POLICY "Customers can view design files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-designs' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM projects 
    WHERE customer_id = public.get_current_customer_id()
  )
);
```

### Fix 2: Check Browser Console
1. Open browser console (F12)
2. Look for `[DesignImage]` log messages
3. Check for any 403 errors in Network tab
4. Share the error message

### Fix 3: Test Signed URL Generation
Test in browser console (as customer):
```javascript
const supabase = createClient()
const filePath = 'YOUR_PROJECT_ID/filename.ext' // Replace with actual path
const { data, error } = await supabase.storage
  .from('project-designs')
  .createSignedUrl(filePath, 3600)
console.log('Signed URL:', data, 'Error:', error)
```

## Current Code Behavior
- For customers: Tries to generate signed URL, falls back to public URL if it fails
- For owners: Uses public URL directly
- Error handling: Shows retry button and link to open image

## Next Steps
1. Check browser console for specific error
2. Run migration 019 to fix storage policy
3. Verify `get_current_customer_id()` function exists
4. Test signed URL generation manually
