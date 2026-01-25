# Quick Deploy Instructions - Cabinet Bulk Upload Edge Function

## 🚀 Method 1: Deploy via Dashboard (Easiest - No CLI Needed)

### Step 1: Open Supabase Dashboard
1. Go to: https://app.supabase.com
2. Sign in
3. Select your project

### Step 2: Go to Edge Functions
1. In the left sidebar, click **"Edge Functions"**
2. You should see your existing functions (like `swift-processor`)

### Step 3: Create New Function
1. Click **"Create a new function"** or **"New Function"** button
2. Function name: `cabinet-bulk-upload`
3. Click **"Create function"** or **"Create"**

### Step 4: Copy the Code
1. Open this file in your editor: `supabase/functions/cabinet-bulk-upload/index.ts`
2. Select ALL code (Cmd+A / Ctrl+A)
3. Copy (Cmd+C / Ctrl+C)

### Step 5: Paste in Dashboard
1. In the Supabase Dashboard code editor, delete any default/template code
2. Paste your copied code (Cmd+V / Ctrl+V)
3. Click **"Deploy"** button

### Step 6: Set Secrets (CRITICAL - Do This!)
After deploying, you MUST set secrets:

1. In the Edge Functions page, find `cabinet-bulk-upload`
2. Click on the function name to open it
3. Look for **"Settings"** or **"Secrets"** tab (usually at the top)
4. Click **"Add secret"** or **"Manage secrets"**

Add these 3 secrets:

**Secret 1:**
- Key: `SUPABASE_SERVICE_ROLE_KEY`
- Value: (Get from: Dashboard → Settings → API → Service role key - the SECRET one)

**Secret 2:**
- Key: `SUPABASE_ANON_KEY`  
- Value: (Get from: Dashboard → Settings → API → anon/public key)

**Secret 3:**
- Key: `SUPABASE_URL`
- Value: `https://yxmtxdwrppzlfalvyjsj.supabase.co`

### Step 7: Test It!
1. Go back to your app (refresh the page)
2. Go to a project → Cabinets tab
3. Try uploading an Excel file
4. Check browser console (F12) if there are errors

---

## 🛠️ Method 2: Install CLI and Deploy (If You Prefer CLI)

### Install Supabase CLI (macOS)
```bash
brew install supabase/tap/supabase
```

### Install Supabase CLI (Other)
```bash
# Using npm
npm install -g supabase

# Or download from GitHub
# https://github.com/supabase/cli/releases
```

### Link and Deploy
```bash
# 1. Link to your project
supabase link --project-ref yxmtxdwrppzlfalvyjsj

# 2. Get your keys from Dashboard → Settings → API, then set secrets:
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
supabase secrets set SUPABASE_ANON_KEY=your_anon_key_here
supabase secrets set SUPABASE_URL=https://yxmtxdwrppzlfalvyjsj.supabase.co

# 3. Deploy
supabase functions deploy cabinet-bulk-upload

# 4. Verify
supabase functions list
```

---

## ✅ Verification Checklist

After deploying (either method), verify:

- [ ] Function appears in Edge Functions list
- [ ] All 3 secrets are set (check in Dashboard)
- [ ] Can access function URL: `https://yxmtxdwrppzlfalvyjsj.supabase.co/functions/v1/cabinet-bulk-upload`
- [ ] Browser console shows no 404 errors when uploading
- [ ] Function logs show activity (Dashboard → Edge Functions → cabinet-bulk-upload → Logs)

---

## 🐛 Troubleshooting

**"Function not found" (404)**
- Function not deployed yet → Deploy it

**"Supabase keys not configured" (500)**
- Secrets not set → Set all 3 secrets in Dashboard

**"Project not found" (400)**
- Wrong projectId → Check the projectId in the URL

**"Only owners can upload" (403)**
- User is not an owner → Check user role in profiles table

**CORS error**
- Function CORS headers should be fine, but check browser console for exact error

---

## 📝 Quick Reference

**Function Code Location:**
- `supabase/functions/cabinet-bulk-upload/index.ts`

**Function URL Pattern:**
- `https://yxmtxdwrppzlfalvyjsj.supabase.co/functions/v1/cabinet-bulk-upload?projectId={uuid}`

**Required Secrets:**
1. `SUPABASE_SERVICE_ROLE_KEY`
2. `SUPABASE_ANON_KEY`
3. `SUPABASE_URL`

**Where to Find Keys:**
- Dashboard → Settings → API
