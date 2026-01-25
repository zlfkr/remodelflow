# Quick Start: Phase 3 Cost Estimation

## ⚠️ IMPORTANT: Run Migrations First!

The error "Could not find the table 'public.cost_items'" means you need to run the database migrations.

## Step 1: Run Migrations in Supabase SQL Editor

1. **Go to your **Supabase Dashboard** → **SQL Editor**

2. **Run Migration 1: Schema**
   - Open a new query
   - Copy the **entire contents** of `supabase/migrations/012_phase3_cost_estimation_schema.sql`
   - Paste into SQL Editor
   - Click **"Run"** (or press `Ctrl/Cmd + Enter`)
   - Wait for "Success" confirmation

3. **Run Migration 2: RLS Policies**
   - Open a new query (or clear the previous one)
   - Copy the **entire contents** of `supabase/migrations/013_phase3_cost_estimation_rls.sql`
   - Paste into SQL Editor
   - Click **"Run"**
   - Wait for "Success" confirmation

## Step 2: Verify Tables Were Created

Run this query in SQL Editor to verify:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cost_items', 'project_estimates', 'project_estimate_settings', 'estimate_change_log')
ORDER BY table_name;
```

You should see all 4 tables listed.

## Step 3: Access Phase 3 Features

### For Owners:

1. **Cost Catalog** (`/owner/catalog`)
   - Click "Cost Catalog" tab in Owner Dashboard
   - Create reusable cost items (cabinets, labor, materials, etc.)

2. **Project Estimates** (Project detail page)
   - Go to any project detail page
   - Scroll to "Estimate" section
   - Add line items from catalog or create custom items
   - Configure settings (tax, discount, markup, customer visibility)

### For Customers:

- View estimate on project detail page (if owner enabled it)
- Read-only view of visible line items
- See subtotal, tax, and total

## Troubleshooting

**Error: "Could not find the table 'public.cost_items'"**
- ✅ Solution: Run migration `012_phase3_cost_estimation_schema.sql` first

**Error: "permission denied"**
- ✅ Solution: Run migration `013_phase3_cost_estimation_rls.sql` to set up RLS policies

**Tables exist but can't access data**
- ✅ Check that you're logged in as the correct role (owner/customer)
- ✅ Verify RLS policies were applied correctly
