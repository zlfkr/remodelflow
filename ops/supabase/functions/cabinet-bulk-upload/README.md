# Cabinet Bulk Upload Edge Function

Supabase Edge Function for handling Excel file uploads and bulk cabinet imports.

## Overview

This Edge Function:
- Accepts Excel (.xlsx) files via multipart/form-data
- Validates rows according to strict business rules
- Inserts valid rows into `project_cabinets` table
- Tracks batches in `project_cabinet_batches` table
- Returns detailed success/failure statistics

## Endpoint

**POST** `/functions/v1/cabinet-bulk-upload?projectId={uuid}`

**Headers:**
- `Authorization: Bearer {supabase_jwt_token}`
- `Content-Type: multipart/form-data`

**Body:**
- Form field: `file` (Excel .xlsx file)

**Response:**
```json
{
  "batchId": "uuid",
  "totalRows": 10,
  "successRows": 8,
  "failedRows": 2,
  "errors": [
    {
      "row": 3,
      "errors": ["Width_in must be > 0"]
    }
  ]
}
```

## Prerequisites

1. **Supabase CLI** installed
2. **Project initialized** with `supabase init`
3. **Secrets configured** (see below)

## Setup

### 1. Set Environment Secrets

```bash
# Set service role key (REQUIRED - for database operations)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Set anon key (REQUIRED - for JWT verification)
supabase secrets set SUPABASE_ANON_KEY=your_anon_key_here

# Set Supabase URL (REQUIRED - your project URL)
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
```

**Note**: In production, these are automatically available. For local development or explicit control, set them as secrets.

**Where to find these:**
- Supabase Dashboard → Settings → API
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key (secret)
- `SUPABASE_ANON_KEY`: Anon/public key
- `SUPABASE_URL`: Project URL

### 2. Deploy Function

```bash
# Deploy the function
supabase functions deploy cabinet-bulk-upload
```

### 3. Test Locally (Optional)

```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve cabinet-bulk-upload

# Test with curl (replace with your values)
curl -X POST \
  'http://localhost:54321/functions/v1/cabinet-bulk-upload?projectId=your-project-id' \
  -H 'Authorization: Bearer your-jwt-token' \
  -F 'file=@path/to/your/file.xlsx'
```

## Security

- **JWT Verification**: Function verifies the Bearer token and extracts user info
- **Role Check**: Only users with `role = 'owner'` can upload
- **Ownership Check**: Verifies user owns the project before allowing upload
- **Service Role**: Database operations use service role key (bypasses RLS for inserts)
- **User Verification**: User verification uses anon key to respect RLS

## Validation Rules

### Required Fields:
- `Room` - Must be: Kitchen, Bathroom, Laundry, Mudroom, Closet, Other
- `Cabinet_Type` - Must be: Base, Wall, Tall, Pantry, Island, Other
- `Width_in` - Number > 0
- `Height_in` - Number > 0
- `Depth_in` - Number > 0
- `Quantity` - Integer > 0

### Optional Fields:
- `Project_ID` - Uses query param if not provided
- `Drawer_Count` - Integer >= 0
- `Unit_Price` - Number >= 0
- `CNC_Ready` - "Yes"/"No" → boolean
- `Cabinet_Code`, `Material`, `Finish`, `Door_Type`, `Hinge_Type`, `Labor_Level`, `SKU`, `Notes`

## Excel File Format

The Excel file must contain a sheet named **"Cabinet_Requirements"** with the columns listed above.

## Error Handling

- **Row-level errors**: Invalid rows are collected but don't stop the upload
- **Batch tracking**: Every upload creates a batch record with statistics
- **Partial success**: If some rows succeed, batch status is "completed" with error report
- **Complete failure**: If all rows fail, batch status is "failed"

## Monitoring

Check batch records in `project_cabinet_batches` table:
- `status`: processing → completed/failed
- `total_rows`, `success_rows`, `failed_rows`
- `error_report`: JSON array of row errors

## Troubleshooting

**"Missing or invalid Authorization header"**
- Ensure Bearer token is included in request

**"Only owners can upload cabinets"**
- User must have `role = 'owner'` in profiles table

**"You do not have permission to upload cabinets for this project"**
- User must own the project (projects.owner_id = user.id)

**"Sheet 'Cabinet_Requirements' not found"**
- Excel file must have a sheet with this exact name

**"Failed to create batch record"**
- Check database connection and table exists
- Verify service role key is correct

## Commands Reference

```bash
# Deploy function
supabase functions deploy cabinet-bulk-upload

# Set secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key
supabase secrets set SUPABASE_ANON_KEY=your_key
supabase secrets set SUPABASE_URL=https://your-project.supabase.co

# View secrets (local only)
supabase secrets list

# Serve locally
supabase functions serve cabinet-bulk-upload

# View logs
supabase functions logs cabinet-bulk-upload
```
