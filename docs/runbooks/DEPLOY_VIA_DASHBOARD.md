# Deploy Edge Function via Supabase Dashboard (Easiest Method)

## Step-by-Step Instructions

### Step 1: Open Supabase Dashboard
1. Go to https://app.supabase.com
2. Sign in
3. Select your project: **yxmtxdwrppzlfalvyjsj**

### Step 2: Navigate to Edge Functions
1. In the left sidebar, click **Edge Functions**
2. You should see your existing functions (like `swift-processor`)

### Step 3: Create New Function
1. Click **Create a new function** button (or **New Function**)
2. Function name: `cabinet-bulk-upload`
3. Click **Create function**

### Step 4: Copy Function Code
1. Open the file: `supabase/functions/cabinet-bulk-upload/index.ts` in your editor
2. Select ALL the code (Cmd+A / Ctrl+A)
3. Copy it (Cmd+C / Ctrl+C)

### Step 5: Paste and Deploy
1. In the Supabase Dashboard editor, delete any default code
2. Paste the copied code
3. Click **Deploy** button

### Step 6: Set Secrets (IMPORTANT)
After deploying, you need to set secrets:

1. In the Edge Functions page, find `cabinet-bulk-upload`
2. Click on it to open details
3. Go to **Settings** or **Secrets** tab
4. Add these secrets:

   **Secret 1:**
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (Get from Settings → API → Service role key)

   **Secret 2:**
   - Name: `SUPABASE_ANON_KEY`
   - Value: (Get from Settings → API → anon/public key)

   **Secret 3:**
   - Name: `SUPABASE_URL`
   - Value: `https://yxmtxdwrppzlfalvyjsj.supabase.co`

### Step 7: Test
1. Go back to your app
2. Refresh the page
3. Try uploading an Excel file
4. Check browser console (F12) for any errors

## Alternative: Install Supabase CLI

If you prefer using CLI:

### Install Supabase CLI (macOS)
```bash
brew install supabase/tap/supabase
```

### Install Supabase CLI (Other methods)
```bash
# Using npm
npm install -g supabase

# Or download from: https://github.com/supabase/cli/releases
```

### Then link and deploy
```bash
# Link to project
supabase link --project-ref yxmtxdwrppzlfalvyjsj

# Set secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
supabase secrets set SUPABASE_ANON_KEY=your_key
supabase secrets set SUPABASE_URL=https://yxmtxdwrppzlfalvyjsj.supabase.co

# Deploy
supabase functions deploy cabinet-bulk-upload
```
