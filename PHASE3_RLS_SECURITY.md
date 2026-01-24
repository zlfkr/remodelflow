# Phase 3 RLS Security Hardening

## Overview

This migration (`014_phase3_rls_security_hardening.sql`) performs a security-first audit and hardening of all Phase 3 Row Level Security policies for cost estimation tables.

## Security Principles Applied

### 1. Explicit Deny-by-Default
- **No policy = No access**
- Customers have **zero** policies for INSERT/UPDATE/DELETE on estimate tables
- Customers have **zero** access to `cost_items` and `estimate_change_log`

### 2. Multi-Layer Verification
- Every policy checks:
  1. User role (owner/customer via `profiles` table)
  2. Ownership (via `owner_id` or project ownership)
  3. Project assignment (for customers, via email matching)

### 3. Least Privilege
- Owners: Full CRUD on their own data only
- Customers: Read-only, and only when explicitly enabled

## Table-by-Table Security

### `cost_items` (Owner Catalog)
- ✅ **Owners**: Full CRUD on their own items
- ❌ **Customers**: ZERO access (no policies = denied)
- **Security**: Prevents customers from seeing pricing/margin data

### `project_estimate_settings` (Project Settings)
- ✅ **Owners**: Full CRUD for their projects
- ✅ **Customers**: SELECT only if:
  - `show_to_customer = true`
  - Project belongs to customer (email match)
  - User has customer role
- ❌ **Customers**: Cannot INSERT/UPDATE/DELETE (no policies = denied)

### `project_estimates` (Line Items)
- ✅ **Owners**: Full CRUD for their projects
- ✅ **Customers**: SELECT only if ALL are true:
  - `is_customer_visible = true` (item marked visible)
  - `show_to_customer = true` (estimate enabled)
  - Project belongs to customer (email match)
  - User has customer role
- ❌ **Customers**: Cannot INSERT/UPDATE/DELETE (no policies = denied)
- **Security**: Protects margin/internal costs from customer view

### `estimate_change_log` (Audit Trail)
- ✅ **Owners**: Full CRUD for their projects
- ❌ **Customers**: ZERO access (no policies = denied)
- **Security**: Audit trail is owner-only

## Helper Function

### `current_customer_project_ids()`
- Returns project IDs that belong to the current customer
- Uses JWT claims to get customer email
- **SECURITY INVOKER**: Runs with caller's permissions (RLS context)
- Used to simplify customer ownership checks

## Verification

After running this migration:

1. **Verify RLS is enabled:**
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename IN ('cost_items', 'project_estimates', 'project_estimate_settings', 'estimate_change_log');
   ```
   All should show `rowsecurity = true`

2. **Verify policies exist:**
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE tablename IN ('cost_items', 'project_estimates', 'project_estimate_settings', 'estimate_change_log')
   ORDER BY tablename, policyname;
   ```

3. **Test customer access:**
   - Customer should NOT be able to SELECT from `cost_items`
   - Customer should NOT be able to SELECT from `estimate_change_log`
   - Customer should only see estimates when `show_to_customer = true` AND `is_customer_visible = true`

## Security Guarantees

✅ **Cost items are owner-only** - No customer can see pricing catalog  
✅ **Estimate settings are owner-controlled** - Customers can only read if enabled  
✅ **Line items are filtered** - Customers only see visible items  
✅ **Change log is owner-only** - No customer access to audit trail  
✅ **No write access for customers** - Customers cannot modify estimates  
✅ **Project ownership verified** - All policies check project ownership  

## Migration Safety

- Uses `DROP POLICY IF EXISTS` - Safe to run multiple times
- Uses `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` - Idempotent
- No data changes - Only policy changes
- Backward compatible - Existing owner access unchanged

## Running the Migration

1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/014_phase3_rls_security_hardening.sql`
3. Paste and run
4. Verify with the SQL queries above

## Notes

- This migration **replaces** existing Phase 3 RLS policies with hardened versions
- It does **not** modify Phase 1 or Phase 2 policies
- It does **not** change any UI or application code
- It focuses **only** on database-level security
