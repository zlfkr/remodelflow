# Cabinet Bulk Upload UI - Setup Checklist

## ✅ Implementation Complete

The UI components for cabinet bulk upload have been created and integrated.

## Files Created

1. **`src/lib/api/cabinets.ts`**
   - API client helper functions
   - `bulkUploadCabinets()` - Uploads Excel file to backend
   - `downloadErrorReport()` - Downloads error JSON
   - Type definitions for `UploadResponse` and `Cabinet`

2. **`src/components/cabinets/UploadModal.tsx`**
   - Modal component with drag & drop
   - File validation (type and size)
   - Upload state handling

3. **`src/components/cabinets/CabinetsList.tsx`**
   - Displays list of cabinets for a project
   - Fetches from Supabase with RLS protection
   - Refresh functionality

4. **`src/components/cabinets/CabinetBulkUpload.tsx`**
   - Main component orchestrating upload flow
   - Results display (success/partial/failure)
   - Error table for failed rows
   - Action buttons (download errors, upload another, view list)

5. **`src/components/ProjectDetails.tsx`** (Updated)
   - Integrated `CabinetBulkUpload` component
   - Only visible to owners

## Where to Mount

✅ **Already Integrated**: The component is mounted in `ProjectDetails.tsx` and will appear on the project detail page for owners.

**Location**: `/owner/projects/[id]` or `/customer/projects/[id]` (owner view only)

The cabinets section appears after:
- Project Status
- Project Information
- Activity Timeline
- Estimate Section
- Designs Section
- Messages Section

## Route

✅ **No new route needed**: The component is integrated into the existing project detail page.

**Existing Route**: 
- Owner: `/owner/projects/[id]` → renders `src/app/owner/projects/[id]/page.tsx`
- This page renders `ProjectDetails` component
- `ProjectDetails` now includes `CabinetBulkUpload` for owners

## Environment Variables

### Required:
- ✅ `NEXT_PUBLIC_SUPABASE_URL` - Already configured
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Already configured

### Optional:
- `NEXT_PUBLIC_API_URL` - Base URL for API endpoint (defaults to empty string for relative paths)

**If using relative paths** (recommended for Next.js):
- No additional env var needed
- API endpoint will be: `/api/projects/${projectId}/cabinets/bulk-upload`

**If using absolute paths** (e.g., separate backend):
- Set `NEXT_PUBLIC_API_URL=https://api.yourdomain.com`
- API endpoint will be: `${NEXT_PUBLIC_API_URL}/api/projects/${projectId}/cabinets/bulk-upload`

## Backend Endpoint Required

⚠️ **You need to create the backend API endpoint**:

**Endpoint**: `POST /api/projects/:projectId/cabinets/bulk-upload`

**Location**: 
- Next.js API Route: `src/app/api/projects/[projectId]/cabinets/bulk-upload/route.ts`
- Or separate backend service

**Expected Request**:
- Method: `POST`
- Content-Type: `multipart/form-data`
- Field name: `file` (Excel file)

**Expected Response**:
```json
{
  "batchId": "uuid",
  "totalRows": 10,
  "successRows": 8,
  "failedRows": 2,
  "errors": [
    {
      "row": 3,
      "errors": ["Width_in must be > 0", "Room is required"]
    },
    {
      "row": 7,
      "errors": ["Cabinet_Type must be one of: Base, Wall, Tall, Pantry, Island, Other"]
    }
  ]
}
```

**Error Responses**:
- `401` - Unauthorized (user not logged in)
- `403` - Forbidden (user doesn't have permission)
- `400` - Bad Request (invalid file or data)
- `413` - Payload Too Large (file too big)
- `500` - Server Error

## Features Implemented

✅ **Upload Modal**
- Drag & drop file upload
- File picker button
- File type validation (.xlsx, .xls)
- File size validation (10MB max)
- Upload button (disabled while uploading)
- Cancel button

✅ **Upload States**
- Idle (no upload in progress)
- Uploading (shows spinner)
- Success (all rows imported)
- Partial (some rows failed)
- Failure (all rows failed or network error)

✅ **Results Display**
- Success banner with summary
- Partial success banner with error table
- Failure banner with error message
- Action buttons for each state

✅ **Error Handling**
- Network errors
- Invalid file type
- File too large (413)
- Authentication errors (401)
- Permission errors (403)
- Validation errors from backend

✅ **Cabinets List**
- Fetches from Supabase
- Displays: room, type, dimensions, quantity, prices
- Refresh button
- Empty state
- Error state with retry

✅ **Error Report Download**
- Downloads JSON file with all errors
- Filename includes batch ID and timestamp

## Testing Checklist

Before going live, test:

1. **File Upload**
   - [ ] Upload valid .xlsx file → should succeed
   - [ ] Upload .xls file → should succeed
   - [ ] Upload .csv file → should show error
   - [ ] Upload file > 10MB → should show error
   - [ ] Drag & drop file → should work
   - [ ] Click browse → should open file picker

2. **Upload States**
   - [ ] Upload button disabled while uploading
   - [ ] Cancel button works during upload
   - [ ] Success state shows correct counts
   - [ ] Partial state shows error table
   - [ ] Failure state shows error message

3. **Error Handling**
   - [ ] Network error → shows user-friendly message
   - [ ] 401 error → shows auth message
   - [ ] 403 error → shows permission message
   - [ ] 413 error → shows file size message
   - [ ] Backend validation errors → shows in table

4. **Cabinets List**
   - [ ] Loads cabinets after upload
   - [ ] Refresh button works
   - [ ] Empty state shows when no cabinets
   - [ ] Error state shows with retry button

5. **Error Report**
   - [ ] Download button works
   - [ ] JSON file contains correct errors
   - [ ] Filename is correct

6. **Permissions**
   - [ ] Owner can see upload section
   - [ ] Customer cannot see upload section
   - [ ] RLS protects cabinet data

## Next Steps

1. **Create Backend Endpoint**
   - Implement `POST /api/projects/:projectId/cabinets/bulk-upload`
   - Use `processCabinetUpload()` from `src/lib/services/cabinetUpload.ts`
   - Handle authentication and authorization
   - Return expected JSON response

2. **Add RLS Policies** (if not already done)
   - Owners can insert/read their own project cabinets
   - Customers can read cabinets for their projects (if needed)

3. **Template Download** (optional)
   - Create Excel template file
   - Update link in help text to point to actual template

4. **Testing**
   - Test with various Excel files
   - Test error scenarios
   - Test with large files
   - Test permissions

## Notes

- The UI uses client-side fetch API (no server actions)
- All Supabase queries use the anon client (RLS protects data)
- File parsing happens on backend (not in browser)
- Error handling is comprehensive and user-friendly
- Mobile-responsive design using Tailwind CSS
- Follows existing component patterns in the codebase
