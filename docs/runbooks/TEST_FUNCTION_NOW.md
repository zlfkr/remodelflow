# Test the Cabinet Bulk Upload Function

## ✅ Secrets Set - Good!

Your secrets are configured:
- ✅ SUPABASE_URL
- ✅ SUPABASE_ANON_KEY
- ✅ SUPABASE_SERVICE_ROLE_KEY

## Next Steps

### 1. Verify Function is Deployed

**Option A: Check in Dashboard**
1. Go to Supabase Dashboard → Edge Functions
2. Look for `cabinet-bulk-upload` in the list
3. If it's there → ✅ Deployed
4. If it's NOT there → You need to create/deploy it (see below)

**Option B: Test the URL**
Open this URL in your browser (replace with your JWT token):
```
https://yxmtxdwrppzlfalvyjsj.supabase.co/functions/v1/cabinet-bulk-upload?projectId=test
```

- **404 Not Found** → Function not deployed yet
- **400 Bad Request** (with error message) → Function is deployed! ✅

### 2. If Function is NOT Deployed

**Quick Deploy via Dashboard:**
1. Dashboard → Edge Functions → "Create a new function"
2. Name: `cabinet-bulk-upload`
3. Copy code from: `supabase/functions/cabinet-bulk-upload/index.ts`
4. Paste and click "Deploy"

### 3. Test the Upload

1. **Go to your app**: http://localhost:3001 (or your dev server)
2. **Navigate to**: A project → Cabinets tab
3. **Click**: "Bulk Upload (.xlsx)"
4. **Select**: An Excel file with "Cabinet_Requirements" sheet
5. **Click**: "Upload"

### 4. Check Results

**Success indicators:**
- ✅ Green success banner appears
- ✅ Shows "Successfully imported X of Y cabinets"
- ✅ Cabinets appear in the table below

**If you get errors:**
- Check browser console (F12) for details
- Check function logs in Dashboard → Edge Functions → cabinet-bulk-upload → Logs

## Quick Test with Browser Console

Open browser console (F12) and run:

```javascript
// Test if function endpoint is accessible
fetch('https://yxmtxdwrppzlfalvyjsj.supabase.co/functions/v1/cabinet-bulk-upload?projectId=test', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer test',
    'apikey': 'sb_publishable_wDJjHLNQHwlW_HlUjOA-IQ_0hiqqgj_'
  }
}).then(r => r.text()).then(console.log).catch(console.error)
```

**Expected responses:**
- **404**: Function not deployed
- **400 with "Missing or invalid Authorization header"**: Function is deployed! ✅ (This is expected without a real token)
- **500 with "Supabase keys not configured"**: Secrets issue (but you've set them, so this shouldn't happen)

## Common Issues

**"Function not found" (404)**
→ Function not deployed. Deploy it via Dashboard.

**"Supabase keys not configured" (500)**
→ Secrets not set correctly. Double-check in Dashboard → Edge Functions → cabinet-bulk-upload → Settings → Secrets

**"Missing or invalid Authorization header" (400)**
→ This is GOOD! It means the function is deployed and working. The error is expected without a real JWT token.

**CORS error**
→ Function CORS headers should handle this. If you see CORS errors, check function code has CORS headers (it does).

## Ready to Test!

Your secrets are set. Now:
1. Make sure function is deployed
2. Try uploading from the UI
3. Check browser console for any errors

Let me know what happens!
