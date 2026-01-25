# How to Test Signed URL Generation in Browser Console

## Step-by-Step Instructions

### Step 1: Open Your App
1. Make sure your dev server is running: `npm run dev`
2. Open your app in the browser: `http://localhost:3001` (or your port)
3. **Log in as a CUSTOMER user** (not owner)

### Step 2: Open Browser DevTools
1. Press **F12** (or right-click → Inspect)
2. Click on the **Console** tab
3. You should see a blank console or some log messages

### Step 3: Get the Supabase Client
In the console, you need to access the Supabase client. Since you're using Next.js, you have a few options:

#### Option A: Use the Global Window Object (Easiest)
If your app exposes Supabase globally (unlikely), you could use it. But we'll use a different approach.

#### Option B: Import from Your Code (Recommended)
Since you're in the browser console, you can't directly import. Instead, we'll use the Supabase client that's already loaded in your app.

### Step 4: Access Supabase from the Page Context
The easiest way is to use the Supabase client that's already being used by your React components. However, since we're in the console, we need to create a new client.

**Paste this code in the browser console:**

```javascript
// Create Supabase client (you'll need your project URL and anon key)
// Get these from: Supabase Dashboard → Settings → API

const SUPABASE_URL = 'https://yxmtxdwrppzlfalvyjsj.supabase.co' // Your project URL
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE' // Get from Supabase Dashboard

// Create client using fetch (works in browser console)
const supabaseClient = {
  storage: {
    from: (bucket) => ({
      createSignedUrl: async (path, expiresIn) => {
        const response = await fetch(
          `${SUPABASE_URL}/storage/v1/object/sign/${bucket}/${path}?expiresIn=${expiresIn}`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
          }
        )
        const data = await response.json()
        if (!response.ok) {
          return { data: null, error: { message: data.message || 'Failed', statusCode: response.status } }
        }
        return { 
          data: { signedUrl: `${SUPABASE_URL}${data.signedURL}` }, 
          error: null 
        }
      }
    })
  }
}

// Test signed URL generation
async function testSignedUrl() {
  const filePath = 'f09e1ab8-56c6-4043-9197-1df0b4a96a73/1769221404453_172ysp.jpeg'
  
  console.log('Testing signed URL for:', filePath)
  
  const result = await supabaseClient.storage
    .from('project-designs')
    .createSignedUrl(filePath, 3600)
  
  console.log('Result:', result)
  
  if (result.error) {
    console.error('❌ Error:', result.error.message, 'Status:', result.error.statusCode)
  } else {
    console.log('✅ Success! Signed URL:', result.data.signedUrl)
    console.log('Opening in new tab...')
    window.open(result.data.signedUrl, '_blank')
  }
}

testSignedUrl()
```

### Step 5: Get Your Anon Key
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy the **anon/public** key
5. Replace `YOUR_ANON_KEY_HERE` in the code above

### Step 6: Run the Test
1. Paste the complete code (with your anon key) into the browser console
2. Press **Enter**
3. Check the console output

## Alternative: Simpler Test Using Network Tab

If the above is too complex, you can also:

1. **Open DevTools** (F12)
2. Go to **Network** tab
3. **Refresh the page** with the design image
4. Look for requests to `storage/v1/object/sign/`
5. Check if they return **200 OK** or **403 Forbidden**

## What to Look For

### ✅ Success (200 OK)
- Console shows: `✅ Success! Signed URL: ...`
- A new tab opens with the image
- Network tab shows 200 status

### ❌ Failure (403 Forbidden)
- Console shows: `❌ Error: new row violates row-level security policy`
- This means the storage policy isn't working
- **Solution:** Run migration `021_ensure_storage_policy_applied.sql`

### ❌ Other Errors
- **404 Not Found**: File doesn't exist in storage
- **401 Unauthorized**: Authentication issue
- **500 Server Error**: Server-side problem

## Quick Test Script (Copy-Paste Ready)

Replace `YOUR_ANON_KEY` with your actual key:

```javascript
(async () => {
  const SUPABASE_URL = 'https://yxmtxdwrppzlfalvyjsj.supabase.co'
  const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY' // Replace this!
  const filePath = 'f09e1ab8-56c6-4043-9197-1df0b4a96a73/1769221404453_172ysp.jpeg'
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/sign/project-designs/${filePath}?expiresIn=3600`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      }
    )
    
    const data = await response.json()
    
    if (!response.ok) {
      console.error('❌ Error:', data.message || 'Failed', 'Status:', response.status)
      console.error('Full error:', data)
    } else {
      const signedUrl = `${SUPABASE_URL}${data.signedURL}`
      console.log('✅ Success! Signed URL:', signedUrl)
      window.open(signedUrl, '_blank')
    }
  } catch (err) {
    console.error('❌ Exception:', err)
  }
})()
```

## Even Simpler: Check the App's Console Logs

Actually, the easiest way is to just check what your app is already logging:

1. **Open DevTools** (F12) → **Console** tab
2. **Refresh the page** with the design image
3. Look for `[DesignImage]` log messages
4. You should see:
   - `[DesignImage] Attempting to generate signed URL for: ...`
   - Either success or error message

This tells you exactly what's happening without needing to write any code!
