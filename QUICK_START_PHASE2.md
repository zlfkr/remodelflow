# Quick Start: Viewing Phase 2 Features

## Step 1: Set Up Database (Required)

### Run Migrations in Supabase

1. Go to your **Supabase Dashboard** → **SQL Editor**
2. Run these migrations **in order**:

**Migration 1: Schema**
- Copy contents of `supabase/migrations/008_phase2_schema.sql`
- Paste into SQL Editor
- Click "Run"

**Migration 2: RLS Policies**
- Copy contents of `supabase/migrations/009_phase2_rls_policies.sql`
- Paste into SQL Editor
- Click "Run"

### Create Storage Bucket

1. Go to **Supabase Dashboard** → **Storage**
2. Click **"New bucket"**
3. Settings:
   - **Name:** `project-designs`
   - **Public:** ❌ **Unchecked** (private bucket)
4. Click **"Create bucket"**
5. Go back to **SQL Editor**
6. Run `supabase/storage/policies/010_storage_policies.sql`

## Step 2: Access Phase 2 Features

### For Owners:

1. **Log in as Owner**
   - Go to `http://localhost:3001/login`
   - Sign in with your owner account

2. **Navigate to a Project**
   - Go to Owner Dashboard
   - Click on any project name in the Projects table
   - OR go directly to: `http://localhost:3001/owner/projects/[project-id]`

3. **You'll See:**
   - ✅ **Activity Timeline** - Shows all project activities
   - ✅ **Designs Section** - Upload design files (images/PDFs)
   - ✅ **Messages Section** - Send messages to customers

### For Customers:

1. **Log in as Customer**
   - Go to `http://localhost:3001/login`
   - Sign in with your customer account

2. **Navigate to Your Project**
   - Go to Customer Portal
   - Click on any project card
   - OR go directly to: `http://localhost:3001/customer/projects/[project-id]`

3. **You'll See:**
   - ✅ **Activity Timeline** - View project history
   - ✅ **Designs Section** - View and approve designs
   - ✅ **Messages Section** - Chat with owner
   - ✅ **Notifications** - Bell icon in navbar (top right)

## Step 3: Test the Features

### Test Messaging:
1. As **Owner**: Go to project → Messages section → Type a message → Click "Send"
2. As **Customer**: Go to same project → See the message → Reply

### Test Design Upload:
1. As **Owner**: Go to project → Designs section → Click "Upload Design"
2. Select an image or PDF file
3. Add description (optional)
4. Click "Upload"
5. Design appears in the list

### Test Design Approval:
1. As **Customer**: Go to project → Designs section
2. Find a design with status "in_review"
3. Click "Approve Design"
4. Add a comment
5. Click "Approve"
6. Design status changes to "approved"

### Test Activity Timeline:
- Automatically shows:
  - Design uploads
  - Design approvals
  - Messages sent
  - Status changes

### Test Notifications:
1. As **Customer**: Look for 🔔 icon in navbar
2. Click the bell to see notifications
3. Unread count shows as red badge
4. Click notification to go to project

## Troubleshooting

### If you don't see Phase 2 features:

1. **Check migrations ran:**
   ```sql
   -- In Supabase SQL Editor, check if tables exist:
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('project_messages', 'project_designs', 'design_approvals', 'project_activity', 'notifications');
   ```

2. **Check storage bucket exists:**
   - Go to Storage → Should see `project-designs` bucket

3. **Refresh browser:**
   - Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)

4. **Check console for errors:**
   - Open browser DevTools (F12) → Console tab
   - Look for any error messages

### Common Issues:

**"Table doesn't exist" error:**
- Run migrations 008 and 009 in Supabase SQL Editor

**"Permission denied" error:**
- Make sure RLS policies migration (009) ran successfully
- Check that you're logged in with correct role

**"Storage bucket not found" error:**
- Create the `project-designs` bucket in Storage
- Run storage policies migration (010)

**Designs not uploading:**
- Check storage bucket exists and is private
- Check storage policies are applied
- Check browser console for errors

## What You Should See

### Project Detail Page Layout:

```
┌─────────────────────────────────────┐
│ Project Name                        │
│ ← Back to Projects                  │
├─────────────────────────────────────┤
│ Project Status Timeline             │
├─────────────────────────────────────┤
│ Project Information                 │
├─────────────────────────────────────┤
│ Activity Timeline                   │ ← NEW
├─────────────────────────────────────┤
│ Designs                             │ ← NEW
│   [Upload Design] (Owner only)      │
│   - Design 1 (in_review)            │
│   - Design 2 (approved)              │
├─────────────────────────────────────┤
│ Messages                            │ ← NEW
│   [Message input]                   │
│   - Previous messages...             │
└─────────────────────────────────────┘
```

### Navbar:
```
┌─────────────────────────────────────┐
│ RemodelFlow    [🔔 2] [Sign out]   │ ← NEW: Notification bell
└─────────────────────────────────────┘
```

## Next Steps

Once Phase 2 is set up:
1. Test all features as both owner and customer
2. Upload some design files
3. Send messages back and forth
4. Approve a design
5. Check activity timeline updates
6. Verify notifications appear

If everything works, you're ready to use Phase 2! 🎉
