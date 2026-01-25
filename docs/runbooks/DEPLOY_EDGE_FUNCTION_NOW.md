# Deploy Edge Function - Quick Steps

## The Error
You're getting a network error because the Edge Function `cabinet-bulk-upload` is not deployed yet.

## Quick Deployment (3 Steps)

### Step 1: Set Secrets

```bash
# Get these from: Supabase Dashboard → Settings → API
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
supabase secrets set SUPABASE_ANON_KEY=your_anon_key_here
supabase secrets set SUPABASE_URL=https://yxmtxdwrppzlfalvyjsj.supabase.co
```

**Where to find:**
- Go to https://app.supabase.com
- Select your project
- Settings → API
- Copy:
  - **Service role key** (secret, under "Project API keys")
  - **Anon key** (public, under "Project API keys")
  - **Project URL** (at the top)

### Step 2: Deploy Function

```bash
supabase functions deploy cabinet-bulk-upload
```

**Expected output:**
```
Deploying function cabinet-bulk-upload...
Function cabinet-bulk-upload deployed successfully
```

### Step 3: Verify

```bash
# List deployed functions
supabase functions list

# Should show: cabinet-bulk-upload
```

## Test After Deployment

1. Refresh your browser
2. Try uploading the Excel file again
3. Check browser console (F12) for any errors
4. Check function logs:
   ```bash
   supabase functions logs cabinet-bulk-upload
   ```

## If You Get "Not linked to a project"

If `supabase functions deploy` says you're not linked:

```bash
# Link to your project
supabase link --project-ref yxmtxdwrppzlfalvyjsj

# Then deploy
supabase functions deploy cabinet-bulk-upload
```

## Alternative: Deploy via Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Edge Functions** in the sidebar
4. Click **Create a new function**
5. Name it: `cabinet-bulk-upload`
6. Copy the code from `supabase/functions/cabinet-bulk-upload/index.ts`
7. Paste and deploy

## Still Getting Network Error?

After deploying, if you still get network errors:

1. **Check browser console (F12)** - Look for:
   - CORS errors
   - 404 errors (function not found)
   - 500 errors (function error)

2. **Check function logs:**
   ```bash
   supabase functions logs cabinet-bulk-upload --follow
   ```

3. **Test with curl:**
   ```bash
   # Replace JWT_TOKEN with your actual token
   curl -X POST \
     "https://yxmtxdwrppzlfalvyjsj.supabase.co/functions/v1/cabinet-bulk-upload?projectId=f09e1ab8-56c6-4043-9197-1df0b4a96a73" \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "apikey: YOUR_ANON_KEY" \
     -F "file=@test.xlsx"
   ```

## Quick Test

After deployment, the URL should work:
- ✅ **200 OK**: Function is working
- ❌ **404**: Function not deployed
- ❌ **500**: Function error (check logs)
- ❌ **CORS**: Check function CORS headers
