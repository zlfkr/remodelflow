# Design Approval Testing Checklist

## Database Constraints Testing

### Test 1: Prevent Duplicate Approvals
```sql
-- As customer, try to approve the same design twice
-- Expected: Second insert should fail with unique constraint violation
INSERT INTO design_approvals (design_id, approved_by, comment)
VALUES ('<design_id>', '<customer_user_id>', 'First approval');

-- This should fail:
INSERT INTO design_approvals (design_id, approved_by, comment)
VALUES ('<same_design_id>', '<customer_user_id>', 'Second approval');
-- Error: duplicate key value violates unique constraint "design_approvals_design_id_key"
```

## RLS Policies Testing

### Test 2: Customer Can Only Approve Own Project Designs
**Setup:**
- Create project with customer A
- Create design for that project
- Log in as customer B (different customer)

**Test:**
- Try to approve design from customer A's project
- **Expected:** INSERT should fail with RLS policy violation

### Test 3: Customer Can Only Set Status to 'approved'
**Setup:**
- Log in as customer
- Try to update design status to 'draft' or 'in_review'

**Test:**
```sql
-- This should fail:
UPDATE project_designs 
SET status = 'draft' 
WHERE id = '<design_id>';
-- Expected: RLS policy blocks this (WITH CHECK constraint)
```

### Test 4: Customer Cannot Change Other Design Fields
**Setup:**
- Log in as customer
- Try to update file_name or version

**Test:**
```sql
-- This should fail:
UPDATE project_designs 
SET file_name = 'hacked.txt'
WHERE id = '<design_id>';
-- Expected: RLS WITH CHECK prevents changing non-status fields
```

### Test 5: Owner Can See All Approvals
**Setup:**
- Customer approves a design
- Log in as owner

**Test:**
- View project designs
- **Expected:** Should see approval details (approved_at, comment)

## Frontend Testing

### Test 6: Approve Button Visibility
**As Customer:**
- ✅ Design with status 'in_review' → Shows "Approve Design" button
- ✅ Design with status 'approved' → No approve button, shows approval info
- ✅ Design with status 'draft' → No approve button

**As Owner:**
- ✅ All designs → No approve button (only customers can approve)

### Test 7: Approval Flow
**Steps:**
1. As Customer, click "Approve Design" on an in_review design
2. Optional: Add a comment
3. Click "✓ Approve Design"
4. **Expected:**
   - Button shows "Approving..." during process
   - Design status changes to 'approved'
   - Approval info appears (timestamp + comment)
   - Activity timeline shows "Customer approved design: <filename>"
   - Approve button disappears

### Test 8: Duplicate Approval Prevention
**Steps:**
1. Approve a design
2. Refresh page
3. Try to approve the same design again
4. **Expected:**
   - No approve button visible (status is 'approved')
   - If somehow button appears, clicking should show error: "This design has already been approved"

### Test 9: Error Handling
**Test Scenarios:**
- Network error during approval → Shows error message, doesn't break UI
- RLS policy violation → Shows clear error message
- Duplicate approval attempt → Shows friendly message, refreshes data

### Test 10: Cross-Project Access Prevention
**Setup:**
- Customer A has project 1 with design 1
- Customer B has project 2 with design 2

**Test:**
- As Customer A, try to approve design 2 (from Customer B's project)
- **Expected:** RLS blocks this, approval fails

## Activity Timeline Testing

### Test 11: Approval Activity Entry
**After approving a design:**
- Check activity timeline
- **Expected:** Entry shows:
  - Type: 'design_approved'
  - Description: "Customer approved design: <filename> (v<version>)"
  - Metadata includes design_id, file_name, version
  - Timestamp is recent

## UI/UX Testing

### Test 12: Approval Display
**For approved designs:**
- ✅ Shows green background
- ✅ Shows lock icon 🔒
- ✅ Shows "Approved" badge
- ✅ Shows approval timestamp
- ✅ Shows approval comment (if provided)
- ✅ Owner sees approval info
- ✅ Customer sees approval info

### Test 13: Loading States
- During approval: Button shows "Approving..." and is disabled
- After approval: UI updates immediately without page refresh

## Manual Testing Steps

1. **As Owner:**
   - Upload a design
   - Set status to 'in_review'
   - Verify customer can see it

2. **As Customer:**
   - View the in_review design
   - Click "Approve Design"
   - Add optional comment
   - Click "✓ Approve Design"
   - Verify approval appears immediately

3. **As Owner:**
   - Refresh page
   - Verify design shows as 'approved'
   - Verify approval details are visible
   - Verify activity timeline shows approval event

4. **As Customer:**
   - Try to approve the same design again
   - Verify no approve button (already approved)
   - Verify approval info is displayed

## SQL Verification Queries

```sql
-- Check if constraint exists
SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'design_approvals'::regclass 
AND conname = 'design_approvals_design_id_key';

-- Check RLS policies
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('design_approvals', 'project_designs', 'project_activity')
ORDER BY tablename, policyname;

-- Test customer approval access
SELECT * FROM design_approvals 
WHERE design_id IN (
  SELECT id FROM project_designs WHERE project_id IN (
    SELECT id FROM projects WHERE customer_id IN (
      SELECT id FROM customers WHERE email = '<customer_email>'
    )
  )
);
```
