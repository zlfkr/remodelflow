# Cabinet Bulk Upload Service - STEP 1

## Overview

This is **STEP 1** of the cabinet bulk upload feature: backend parsing and validation only.

The service accepts an Excel (.xlsx) file, parses the "Cabinet_Requirements" sheet, validates each row according to strict rules, and bulk inserts valid rows into the database.

## Files Created

### 1. Database Migration
- **`supabase/migrations/022_cabinet_bulk_upload_schema.sql`**
  - Creates `project_cabinets` table for individual cabinet records
  - Creates `project_cabinet_batches` table for batch tracking
  - Includes indexes, constraints, and triggers

### 2. Backend Service
- **`src/lib/services/cabinetUpload.ts`**
  - Main service function: `processCabinetUpload()`
  - Row validation logic
  - Batch processing with error tracking
  - TypeScript types and interfaces

### 3. Dependencies
- Added `xlsx` package for Excel parsing
- Added `@types/xlsx` for TypeScript types

## Excel File Structure

The uploaded Excel file must contain a sheet named **"Cabinet_Requirements"** with these columns:

### Required Columns:
- `Room` - Must be one of: Kitchen, Bathroom, Laundry, Mudroom, Closet, Other
- `Cabinet_Type` - Must be one of: Base, Wall, Tall, Pantry, Island, Other
- `Width_in` - Number > 0
- `Height_in` - Number > 0
- `Depth_in` - Number > 0
- `Quantity` - Integer > 0

### Optional Columns:
- `Project_ID` - UUID (if not provided, uses default from function parameter)
- `Cabinet_Code` - Text
- `Material` - Text
- `Finish` - Text
- `Door_Type` - Text
- `Drawer_Count` - Integer >= 0
- `Hinge_Type` - Text
- `Labor_Level` - Text
- `CNC_Ready` - "Yes" or "No" (converted to boolean)
- `SKU` - Text
- `Unit_Price` - Number >= 0
- `Notes` - Text

## Usage

```typescript
import { processCabinetUpload } from '@/lib/services/cabinetUpload';
import { createClient } from '@/lib/supabase/server';

// In a server-side API route or server action
const supabase = await createClient();
const fileBuffer = await file.arrayBuffer(); // or Buffer

const result = await processCabinetUpload(
  fileBuffer,
  supabase,
  ownerId,        // Current user's owner ID
  projectId,      // Optional: default project ID
  customerId,      // Optional: default customer ID
  fileName        // Optional: original file name
);

// Result contains:
// - batchId: UUID of the batch record
// - totalRows: Total rows in Excel (excluding header)
// - successRows: Number of successfully inserted rows
// - failedRows: Number of rows with validation errors
// - errors: Array of { row: number, errors: string[] }
```

## Validation Rules

### Server-Side Validation (Enforced):
1. **Required fields** must not be null or empty
2. **Width/Height/Depth** must be numbers > 0
3. **Quantity** must be an integer > 0
4. **Drawer_Count** must be integer >= 0 if provided
5. **Unit_Price** must be number >= 0 if provided
6. **CNC_Ready** converts "Yes"/"No" → boolean
7. **Room** and **Cabinet_Type** must match allowed enum values

### Error Handling:
- **Row-level errors**: Invalid rows are collected but don't stop the entire upload
- **Batch tracking**: Every upload creates a batch record with statistics
- **Error reporting**: Failed rows include row number and specific error messages

## Database Schema

### `project_cabinets` Table:
- Stores individual cabinet records
- Includes all Excel columns plus metadata (project_id, owner_id, customer_id, batch_id)
- `extended_price` is auto-calculated: `quantity * unit_price`
- Foreign keys to projects, profiles, customers, and batches

### `project_cabinet_batches` Table:
- Tracks each bulk upload operation
- Records: total_rows, success_rows, failed_rows, status, error_report
- Status: 'processing' → 'completed' or 'failed'
- Error report is JSON array: `[{ row: number, errors: string[] }]`

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the database migration:**
   - Apply `supabase/migrations/022_cabinet_bulk_upload_schema.sql` to your Supabase database
   - This creates the `project_cabinets` and `project_cabinet_batches` tables

3. **Regenerate TypeScript types (optional but recommended):**
   ```bash
   # If using Supabase CLI:
   supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/types.ts
   ```
   - This updates the Database type to include the new tables
   - Without this, TypeScript may show type errors for the new tables (but code will still work at runtime)

## Next Steps (Not Implemented Yet)

- **STEP 2**: UI component for file upload
- **STEP 3**: Pricing logic and calculations
- **STEP 4**: RLS policies for security
- **STEP 5**: Error display and batch history UI

## Testing

To test the service:

1. Create a test Excel file with "Cabinet_Requirements" sheet
2. Populate with sample data (mix of valid and invalid rows)
3. Call `processCabinetUpload()` with the file buffer
4. Check the result for success/failure counts and errors
5. Verify data in `project_cabinets` and `project_cabinet_batches` tables

## Error Examples

```typescript
// Example error response:
{
  batchId: "uuid-here",
  totalRows: 10,
  successRows: 7,
  failedRows: 3,
  errors: [
    { row: 3, errors: ["Width_in must be > 0", "Room is required"] },
    { row: 5, errors: ["Cabinet_Type must be one of: Base, Wall, Tall, Pantry, Island, Other"] },
    { row: 8, errors: ["Quantity must be > 0"] }
  ]
}
```

## Notes

- **No UI code**: This is backend-only
- **No pricing logic**: Extended_price is calculated by database, but no business logic yet
- **Scalable**: Uses batch inserts (100 rows at a time) to handle large files
- **Deterministic**: Same input always produces same validation results
- **Production-ready**: Includes error handling, transaction-like behavior, and audit trail
