# Quick Fix for Image Loading

## Current Status
✅ File path extraction is working: `f09e1ab8-56c6-4043-9197-1df0b4a96a73/1769221404453_172ysp.jpeg`
✅ `get_current_customer_id()` function is working
❌ Images still not loading

## Most Likely Issue: Storage Policy Not Applied

The storage policy needs to be applied for customers to generate signed URLs.

### Fix: Run Migration 021

Run this in Supabase SQL Editor:
```sql
-- From: supabase/migrations/021_ensure_storage_policy_applied.sql

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

## Verify Setup

Run `VERIFY_CUSTOMER_ACCESS.sql` to check:
1. Storage policy exists
2. Customer is assigned to the project
3. File exists in storage
4. Policy logic would allow access

## Test in Browser Console

After running the migration, test signed URL generation:

```javascript
// In browser console (as customer user)
const { createClient } = require('@/lib/supabase/client')
const supabase = createClient()

const filePath = 'f09e1ab8-56c6-4043-9197-1df0b4a96a73/1769221404453_172ysp.jpeg'

const { data, error } = await supabase.storage
  .from('project-designs')
  .createSignedUrl(filePath, 3600)

console.log('Signed URL result:', { data, error })

if (error) {
  console.error('Error:', error.message, error.statusCode)
} else {
  console.log('Success! Signed URL:', data.signedUrl)
  // Try opening it
  window.open(data.signedUrl, '_blank')
}
```

## Expected Results

**If storage policy is correct:**
- ✅ Signed URL generation succeeds
- ✅ Image loads in browser
- ✅ No 403 errors

**If storage policy is missing/wrong:**
- ❌ Signed URL generation fails with 403
- ❌ Error: "new row violates row-level security policy"
- ❌ Image doesn't load

## Next Steps

1. **Run migration 021** (storage policy)
2. **Run VERIFY_CUSTOMER_ACCESS.sql** to check setup
3. **Test signed URL** in browser console
4. **Check browser console** for `[DesignImage]` logs
5. **Refresh the page** and see if image loads

If it still doesn't work after running the migration, share:
- The error from browser console
- The result of `VERIFY_CUSTOMER_ACCESS.sql`
