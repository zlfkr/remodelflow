# Debug Image Loading Issue

## Current Status
- ✅ `get_current_customer_id()` function is working
- ❌ Images still not loading for customers

## Steps to Debug

### 1. Check Browser Console
Open browser DevTools (F12) → Console tab, and look for:
- `[DesignImage] Attempting to generate signed URL for: ...`
- `[DesignImage] Signed URL generation failed: ...`
- Any 403 or other HTTP errors

### 2. Check Storage Policy
Run in Supabase SQL Editor:
```sql
-- Check if policy exists
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname = 'Customers can view design files';

-- If missing, run migration 021
```

### 3. Check Bucket Configuration
Run in Supabase SQL Editor:
```sql
SELECT 
  name,
  id,
  public,
  file_size_limit
FROM storage.buckets
WHERE name = 'project-designs';
```

**If bucket is PUBLIC:**
- Signed URLs aren't needed
- Public URLs should work directly
- The code will fall back to public URL automatically

**If bucket is PRIVATE:**
- Signed URLs are required
- Storage policy must allow access
- Check that `get_current_customer_id()` works (✅ confirmed working)

### 4. Test Signed URL Generation
In browser console (as customer user):
```javascript
const { createClient } = require('@/lib/supabase/client')
const supabase = createClient()

// Get the file path from the error message
const filePath = 'YOUR_PROJECT_ID/nuran.jpeg' // Replace with actual path

const { data, error } = await supabase.storage
  .from('project-designs')
  .createSignedUrl(filePath, 3600)

console.log('Result:', { data, error })
```

### 5. Check File Path Format
The file path should be: `project_id/filename.ext`

Check what's stored in `project_designs.file_url`:
```sql
SELECT 
  id,
  file_name,
  file_url,
  project_id
FROM project_designs
WHERE file_name = 'nuran.jpeg'
LIMIT 1;
```

The `file_url` should be something like:
- `https://[project].supabase.co/storage/v1/object/public/project-designs/[project_id]/nuran.jpeg`

The code extracts: `[project_id]/nuran.jpeg` from this URL.

### 6. Verify Project Assignment
Make sure the customer is assigned to the project:
```sql
SELECT 
  p.id as project_id,
  p.name,
  c.id as customer_id,
  c.email,
  public.get_current_customer_id() as current_customer_id
FROM projects p
JOIN customers c ON p.customer_id = c.id
WHERE p.id = 'YOUR_PROJECT_ID';
```

## Quick Fixes

### Fix 1: Run Storage Policy Migration
```sql
-- Run: supabase/migrations/021_ensure_storage_policy_applied.sql
```

### Fix 2: Make Bucket Public (Temporary)
If you need a quick fix for testing:
```sql
UPDATE storage.buckets 
SET public = true 
WHERE name = 'project-designs';
```
**Note:** This is less secure but allows public URLs to work.

### Fix 3: Check File Path Extraction
The code extracts path after `/project-designs/`. If your URL format is different, the extraction might fail.

Check the actual `file_url` format in the database and verify the extraction logic matches.
