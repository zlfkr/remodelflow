# Cabinet Bulk Upload Edge Function - Deployment Guide

## ✅ Implementation Complete

Supabase Edge Function for cabinet bulk uploads has been created at:
- `supabase/functions/cabinet-bulk-upload/index.ts`
- `supabase/functions/cabinet-bulk-upload/README.md`

## Quick Start

### 1. Set Secrets

```bash
# Get these from: Supabase Dashboard → Settings → API
# REQUIRED: Service role key (for database operations)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# REQUIRED: Anon key (for JWT verification)
supabase secrets set SUPABASE_ANON_KEY=your_anon_key_here

# REQUIRED: Supabase project URL
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
```

**Note**: In production deployments, `SUPABASE_URL` is often auto-available. For local dev or explicit control, set all three.

### 2. Deploy Function

```bash
supabase functions deploy cabinet-bulk-upload
```

### 3. Verify Deployment

```bash
# View function logs
supabase functions logs cabinet-bulk-upload

# List deployed functions
supabase functions list
```

## Frontend Integration

The frontend API helper (`src/lib/api/cabinets.ts`) has been updated to use the Edge Function endpoint:

**Endpoint**: `${SUPABASE_URL}/functions/v1/cabinet-bulk-upload?projectId={projectId}`

**Headers**: 
- `Authorization: Bearer {supabase_jwt_token}`

**Body**: `multipart/form-data` with field `file`

## Environment Variables

### Frontend (.env or .env.local):

```env
# For Vite
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key

# For Next.js
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Edge Function (set via Supabase CLI):

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
supabase secrets set SUPABASE_ANON_KEY=your_anon_key
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
```

## Testing

### Test Locally

```bash
# Start Supabase locally
supabase start

# Serve function locally
supabase functions serve cabinet-bulk-upload

# Test with curl
curl -X POST \
  'http://localhost:54321/functions/v1/cabinet-bulk-upload?projectId=your-project-id' \
  -H 'Authorization: Bearer your-jwt-token' \
  -F 'file=@path/to/test-file.xlsx'
```

### Test in Production

1. Deploy function: `supabase functions deploy cabinet-bulk-upload`
2. Use frontend UI to upload a test Excel file
3. Check `project_cabinet_batches` table for batch record
4. Check `project_cabinets` table for inserted rows

## Function Features

✅ **Security**
- JWT verification
- Owner role check
- Project ownership verification
- Service role for database operations

✅ **Validation**
- Excel file type check (.xlsx only)
- Row-level validation with detailed errors
- Required/optional field validation
- Enum validation (Room, Cabinet_Type)
- Numeric validation (dimensions, quantities, prices)

✅ **Error Handling**
- Row-level error collection
- Batch status tracking
- Partial success support
- Detailed error reports

✅ **Performance**
- Batch inserts (100 rows at a time)
- Efficient Excel parsing
- Non-blocking error handling

## Monitoring

### View Logs

```bash
# Real-time logs
supabase functions logs cabinet-bulk-upload --follow

# Recent logs
supabase functions logs cabinet-bulk-upload --limit 50
```

### Check Database

```sql
-- View recent batches
SELECT * FROM project_cabinet_batches 
ORDER BY created_at DESC 
LIMIT 10;

-- View batch errors
SELECT id, total_rows, success_rows, failed_rows, error_report 
FROM project_cabinet_batches 
WHERE status = 'completed' AND failed_rows > 0;

-- Count cabinets by project
SELECT project_id, COUNT(*) as cabinet_count 
FROM project_cabinets 
GROUP BY project_id;
```

## Troubleshooting

### "Function not found"
- Ensure function is deployed: `supabase functions deploy cabinet-bulk-upload`
- Check function name matches exactly

### "Missing secrets"
- Verify secrets are set: `supabase secrets list` (local only)
- For production, set secrets via Supabase Dashboard → Edge Functions → Secrets

### "Invalid token"
- Ensure JWT token is valid and not expired
- Check user has `role = 'owner'` in profiles table

### "Project not found"
- Verify projectId is a valid UUID
- Check project exists in projects table

### "Permission denied"
- Verify user owns the project (projects.owner_id = user.id)
- Check RLS policies allow access

## Commands Reference

```bash
# Deploy
supabase functions deploy cabinet-bulk-upload

# Set secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=key
supabase secrets set SUPABASE_ANON_KEY=key
supabase secrets set SUPABASE_URL=https://project.supabase.co

# View logs
supabase functions logs cabinet-bulk-upload

# Serve locally
supabase functions serve cabinet-bulk-upload

# Delete function (if needed)
supabase functions delete cabinet-bulk-upload
```

## Next Steps

1. ✅ Deploy function: `supabase functions deploy cabinet-bulk-upload`
2. ✅ Set secrets (see above)
3. ✅ Update frontend env vars with Supabase URL
4. ✅ Test upload from UI
5. ✅ Monitor logs and database

The Edge Function is ready for production use!
