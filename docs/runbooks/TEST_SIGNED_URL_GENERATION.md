# Test Signed URL Generation

Since the bucket is **private**, signed URLs are required. Let's test if the signed URL generation works.

## Quick Test in Browser Console

1. Open your app as a **customer** user
2. Open browser DevTools (F12) → Console
3. Find the file path from the error message (should be something like `project_id/nuran.jpeg`)
4. Run this test:

```javascript
// Get Supabase client
const { createClient } = require('@/lib/supabase/client')
// Or if in browser console, use the global supabase if available
// Otherwise, you'll need to import it

// Test signed URL generation
async function testSignedUrl() {
  const supabase = createClient()
  
  // Replace with actual file path from your design
  // Format: project_id/filename.ext
  const filePath = 'YOUR_PROJECT_ID/nuran.jpeg' // Replace with actual path
  
  console.log('Testing signed URL for:', filePath)
  
  const { data, error } = await supabase.storage
    .from('project-designs')
    .createSignedUrl(filePath, 3600)
  
  console.log('Result:', { data, error })
  
  if (error) {
    console.error('Error details:', {
      message: error.message,
      status: error.statusCode,
      error: error
    })
  } else {
    console.log('Signed URL:', data.signedUrl)
    // Try opening it
    window.open(data.signedUrl, '_blank')
  }
}

testSignedUrl()
```

## Check What File Path is Stored

Run this in Supabase SQL Editor to see the actual file URLs:

```sql
SELECT 
  id,
  project_id,
  file_name,
  file_url,
  -- Try to extract path from URL
  SUBSTRING(
    file_url 
    FROM '/project-designs/(.*?)(\?|$)'
  ) as extracted_path
FROM project_designs
WHERE file_name = 'nuran.jpeg'
LIMIT 1;
```

## Common Issues

### Issue 1: File Path Format Mismatch
The stored URL might be:
- `https://[project].supabase.co/storage/v1/object/public/project-designs/project_id/filename.ext`

But for signed URLs, we need just:
- `project_id/filename.ext`

### Issue 2: Storage Policy Not Applied
Run migration `021_ensure_storage_policy_applied.sql` to ensure the policy exists.

### Issue 3: Customer Not Assigned to Project
Verify the customer is assigned:
```sql
SELECT 
  p.id,
  p.name,
  c.id as customer_id,
  c.email,
  public.get_current_customer_id() as current_customer_id
FROM projects p
JOIN customers c ON p.customer_id = c.id
WHERE p.id = 'YOUR_PROJECT_ID';
```

## Debug Steps

1. **Check browser console** for `[DesignImage]` messages
2. **Verify file path extraction** - the console should show the extracted path
3. **Test signed URL manually** using the code above
4. **Check storage policy** exists and allows customer access
5. **Verify project assignment** - customer must be assigned to the project
