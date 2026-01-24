# Phase 3: Cost Estimation Setup

## Overview

Phase 3 adds cost estimation and scope control features:
- **Cost Catalog**: Owner-maintained reusable cost items
- **Project Estimates**: Line items for each project
- **Estimate Settings**: Tax, discount, markup, customer visibility
- **Change Tracking**: Audit trail for estimate changes
- **Customer View**: Read-only estimate display (if enabled)

## Database Setup

### 1. Run Migrations

Execute these migrations in your Supabase SQL Editor **in order**:

1. **`supabase/migrations/012_phase3_cost_estimation_schema.sql`**
   - Creates `cost_items` table (owner catalog)
   - Creates `project_estimate_settings` table
   - Creates `project_estimates` table (line items)
   - Creates `estimate_change_log` table (audit trail)
   - Creates triggers for auto-calculating line totals
   - Creates triggers for updated_at timestamps

2. **`supabase/migrations/013_phase3_cost_estimation_rls.sql`**
   - Sets up Row Level Security policies for all Phase 3 tables
   - Ensures owners can only access their own data
   - Ensures customers can only view enabled/visible estimates

## Features

### 1. Cost Catalog (Owner)
- **Location**: `/owner/catalog`
- **Access**: Owner dashboard → "Cost Catalog" tab
- **Features**:
  - Create/edit/delete cost items
  - Search and filter by category
  - Mark items as active/inactive
  - Categories: cabinets, countertop, labor, permit, plumbing, electrical, flooring, paint, hardware, other
  - Unit types: each, sqft, linear_ft, hour, flat

### 2. Project Estimates (Owner)
- **Location**: Project detail page → "Estimate" section
- **Features**:
  - Add line items from catalog (dropdown search)
  - Add custom line items (free text)
  - Edit quantity and unit cost inline
  - Auto-calculate line totals
  - Toggle customer visibility per item
  - Remove line items
  - Settings: tax rate, discount, markup, customer visibility

### 3. Estimate Settings
- **Owner Controls**:
  - Show/hide estimate to customer
  - Tax rate (decimal, e.g. 0.0825 for 8.25%)
  - Discount amount (flat dollar amount)
  - Markup percent (e.g. 15.00 for 15%)
- **Calculation Order**:
  1. Subtotal (sum of line items)
  2. Apply markup (if set)
  3. Apply discount (if set)
  4. Apply tax (if set)
  5. Final total

### 4. Change Tracking
- **Automatic Logging**:
  - Every add/update/delete creates `estimate_change_log` entry
  - Every change creates `project_activity` entry
  - Human-readable descriptions:
    - "Estimate item added: Quartz Countertop (20 sqft @ $75)"
    - "Estimate item updated: Labor hours - quantity changed"
    - "Estimate item removed: Permit fee"

### 5. Customer View
- **Visibility Rules**:
  - Only shows if `show_to_customer = true` in settings
  - Only shows line items where `is_customer_visible = true`
  - Read-only (no editing)
  - Shows subtotal, tax (if set), and total

## RLS Security

### Cost Items
- ✅ Owners can CRUD their own cost items only
- ✅ Customers cannot access cost items

### Project Estimates
- ✅ Owners can CRUD estimates for their projects
- ✅ Customers can SELECT only:
  - If `show_to_customer = true` in settings
  - AND `is_customer_visible = true` on line item
  - Customers cannot see owner-only line items

### Estimate Settings
- ✅ Owners can manage settings for their projects
- ✅ Customers can SELECT only if `show_to_customer = true`

### Change Log
- ✅ Owner-only (customers cannot access audit trail)

## Component Structure

```
src/components/
├── CostCatalog.tsx          # Owner cost catalog management
├── EstimateSection.tsx       # Project estimate line items + settings
└── ProjectDetails.tsx        # Updated with EstimateSection

src/app/
└── owner/
    └── catalog/
        └── page.tsx          # Cost catalog page
```

## Routes

- **Owner**: `/owner/catalog` - Cost catalog management
- **Owner**: `/owner/projects/[id]` - Project detail with estimate section
- **Customer**: `/customer/projects/[id]` - Project detail with estimate (if enabled)

## Usage Flow

### Owner Workflow:
1. Go to `/owner/catalog`
2. Create cost items (e.g., "Quartz Countertop", "Labor Hour")
3. Go to project detail page
4. Click "Add Line Item" → Select from catalog or add custom
5. Adjust quantities and costs
6. Configure settings (tax, discount, markup)
7. Toggle "Show estimate to customer" if needed
8. Mark items as "Visible to customer" individually

### Customer Workflow:
1. Go to project detail page
2. If estimate is enabled and has visible items:
   - See read-only estimate
   - See line items marked as visible
   - See subtotal, tax (if set), and total

## Testing Checklist

- [ ] Owner can create cost items in catalog
- [ ] Owner can add line items from catalog to project
- [ ] Owner can add custom line items
- [ ] Line totals auto-calculate correctly
- [ ] Owner can update quantity/unit cost inline
- [ ] Owner can toggle customer visibility
- [ ] Settings save correctly (tax, discount, markup)
- [ ] Customer sees estimate only if enabled
- [ ] Customer sees only visible line items
- [ ] Change log entries are created
- [ ] Activity timeline shows estimate changes
- [ ] RLS prevents cross-owner/cross-customer access

## Notes

- Line totals are auto-calculated by database trigger
- Markup is applied before discount and tax
- All Phase 1 and Phase 2 functionality remains intact
- No breaking changes
- Estimate section appears above Designs section in project detail
