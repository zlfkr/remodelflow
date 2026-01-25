# Estimate Activity Timeline Integration

## Overview

All estimate actions (add, update, remove, settings changes) now automatically create entries in the project activity timeline.

## Implementation

### 1. Helper Function Created
**File:** `src/lib/activity.ts`

- `addProjectActivity()` - Centralized function for creating activity entries
- `formatCurrency()` - Currency formatting utility
- `formatUnitType()` - Unit type formatting utility

### 2. Database Migration
**File:** `supabase/migrations/016_add_estimate_activity_types.sql`

Adds new activity types to the `project_activity` CHECK constraint:
- `estimate_item_added`
- `estimate_item_updated`
- `estimate_item_removed`
- `estimate_settings_updated`

**⚠️ IMPORTANT:** Run this migration before using estimate features!

### 3. Activity Events

#### A) Line Item Added
- **Type:** `estimate_item_added`
- **Description:** "Estimate item added: [Name] ([Qty] [Unit] @ $[Cost]) — Visible to customer" (if visible)
- **Triggered:** After successful insert into `project_estimates`

#### B) Line Item Updated
- **Type:** `estimate_item_updated`
- **Description Examples:**
  - Quantity: "Estimate updated: [Name] qty [old] → [new]"
  - Unit Cost: "Estimate updated: [Name] rate $[old] → $[new]"
  - Visibility: "Estimate updated: [Name] visibility On → Off"
  - Name: "Estimate updated: [Old Name] → [New Name]"
- **Triggered:** After successful update to `project_estimates`
- **Note:** Only logs if value actually changed

#### C) Line Item Removed
- **Type:** `estimate_item_removed`
- **Description:** "Estimate item removed: [Name]"
- **Triggered:** After successful delete from `project_estimates`

#### D) Settings Updated
- **Type:** `estimate_settings_updated`
- **Description Examples:**
  - "Estimate settings updated: show_to_customer Off → On"
  - "Estimate settings updated: tax 0.0000 → 0.0825, markup 0% → 10%, discount $0.00 → $250.00"
- **Triggered:** After successful upsert to `project_estimate_settings`
- **Note:** Only logs fields that actually changed

## Integration Points

### EstimateSection Component
All estimate actions in `src/components/EstimateSection.tsx` now call `addProjectActivity()`:

1. **`createLineItem()`** - After adding line item
2. **`handleUpdateItem()`** - After updating line item (qty, cost, visibility, name)
3. **`handleDeleteItem()`** - After removing line item
4. **`handleSaveSettings()`** - After saving settings

## Security

- Activities are only created by owners (not customers)
- Activities are created in the same transaction context as the data change
- No duplicate activities on page refresh (only created in user-triggered handlers)

## Testing Checklist

- [ ] Run migration `016_add_estimate_activity_types.sql`
- [ ] Add a line item → Verify activity appears in timeline
- [ ] Update quantity → Verify activity shows old → new
- [ ] Update unit cost → Verify activity shows old → new
- [ ] Toggle visibility → Verify activity shows On/Off change
- [ ] Remove line item → Verify activity appears
- [ ] Save settings → Verify activity shows changed fields
- [ ] Verify timestamps order correctly (newest first)
- [ ] Verify no duplicate activities on page refresh

## Type Updates

- `src/lib/supabase/types.ts` - Updated `project_activity` type definitions
- `src/components/ProjectActivity.tsx` - Updated Activity interface to include estimate types

## Notes

- Activities are created asynchronously and won't block the main operation
- If activity creation fails, it's logged but doesn't break the estimate operation
- All activities include `created_by` (owner ID) for attribution
- Activity descriptions are human-readable and include context (quantities, costs, etc.)
