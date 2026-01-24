# TODO: Status Update Issue - Customer Design Approval

## Issue
Project status is not automatically updating from `'in_progress'` to `'review'` when customer approves a design.

## Current Status
- ✅ Functions exist: `customer_progress_project_status` and `get_current_customer_id`
- ✅ Frontend code calls the function when design is approved
- ❓ Status update not working (needs debugging)

## Files Involved
- `src/components/ProjectDesigns.tsx` - Calls `customer_progress_project_status()` on design approval
- `supabase/migrations/018_fix_customer_status_progression_no_recursion.sql` - Function definition
- `supabase/migrations/017_allow_customer_status_progression.sql` - Previous attempt (may have issues)

## Debugging Steps (To Do Later)

### 1. Check Browser Console
When approving a design, check for:
- `[Design Approval] Current project status: ...`
- `[Design Approval] Auto-progressing project to "review" status`
- `[Design Approval] Status update failed: ...` (if error)
- `[Design Approval] Project status updated to "review" via function` (if success)

### 2. Verify Project Status
The auto-progression only works if project status is `'in_progress'`.
- Check current project status before approving
- If status is not `'in_progress'`, it won't auto-progress

### 3. Test Function Directly
Run in Supabase SQL Editor:
```sql
-- Check project status
SELECT id, name, status, customer_id 
FROM projects 
WHERE id = 'PROJECT_ID'::uuid;

-- Test function (must be logged in as customer)
SELECT customer_progress_project_status('PROJECT_ID'::uuid);

-- Verify update
SELECT id, name, status, updated_at 
FROM projects 
WHERE id = 'PROJECT_ID'::uuid;
```

### 4. Check for RLS Issues
- Verify no problematic RLS policies exist
- Run `QUICK_FIX_DROP_RECURSIVE_POLICY.sql` if needed
- Check if `set_config('row_security', 'off')` is working

### 5. Verify Triggers
Check if triggers exist:
- `trg_enforce_customer_project_update`
- `trigger_log_customer_status_progression`

## Diagnostic Scripts Created
- `TEST_CUSTOMER_STATUS_FUNCTION.sql` - Test the function
- `TEST_STATUS_UPDATE.sql` - Complete test script
- `VERIFY_FUNCTION_SETUP.sql` - Verify all components
- `DIAGNOSE_STATUS_UPDATE.sql` - Diagnostic queries

## Possible Causes
1. **Project status not 'in_progress'** - Most likely
2. **Function error not being shown** - Check console logs
3. **RLS recursion still happening** - Need to drop problematic policies
4. **Trigger blocking the update** - Check trigger logic
5. **UI not refreshing** - `onProjectUpdate()` callback might not be working

## Next Steps
1. Open browser console when approving design
2. Check what status the project has
3. Look for any error messages
4. Test function directly in SQL Editor
5. Verify triggers exist and are working

## Related Files
- Migration: `018_fix_customer_status_progression_no_recursion.sql`
- Quick Fix: `QUICK_FIX_DROP_RECURSIVE_POLICY.sql`
- Frontend: `src/components/ProjectDesigns.tsx` (lines 256-297)
