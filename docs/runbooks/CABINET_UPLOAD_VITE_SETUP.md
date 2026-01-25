# Cabinet Bulk Upload - Vite/React Setup

## ✅ Implementation Complete

The cabinet bulk upload UI has been implemented with tabs and Supabase auth token support.

## Changes Made

### 1. Added Tabs to Project Details
- **Overview Tab**: Contains Activity, Estimates, Designs, Messages
- **Cabinets Tab**: Contains bulk upload UI (owner only)

### 2. Updated API Helper (`src/lib/api/cabinets.ts`)
- ✅ Uses Supabase auth token in `Authorization: Bearer {token}` header
- ✅ Gets token from `supabase.auth.getSession()`
- ✅ Accepts Supabase client as parameter
- ✅ Only accepts `.xlsx` files (not `.xls`)
- ✅ Supports both Vite and Next.js env variable patterns

### 3. Updated Components
- ✅ `CabinetBulkUpload.tsx` - Passes Supabase client to API helper
- ✅ `UploadModal.tsx` - Only accepts `.xlsx` files
- ✅ `ProjectCabinetsTable.tsx` - Renamed from `CabinetsList.tsx`
- ✅ Removed `'use client'` directives (not needed for Vite)

### 4. Integrated into Project Details
- ✅ Tabs added with state management
- ✅ Cabinets tab only visible to owners
- ✅ Overview tab shows existing sections

## API Endpoint Required

**Endpoint**: `POST /api/projects/:projectId/cabinets/bulk-upload`

**Request**:
- Method: `POST`
- Headers: `Authorization: Bearer {supabase_access_token}`
- Content-Type: `multipart/form-data`
- Body: FormData with field `file` (Excel .xlsx file)

**Response**:
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

## Environment Variables

### For Vite:
```env
VITE_API_URL=http://localhost:3000  # Optional, defaults to relative path
```

### For Next.js (if using):
```env
NEXT_PUBLIC_API_URL=http://localhost:3000  # Optional, defaults to relative path
```

If not set, uses relative path: `/api/projects/${projectId}/cabinets/bulk-upload`

## File Structure

```
src/
├── lib/
│   ├── api/
│   │   └── cabinets.ts          # API helper with auth token
│   └── supabase/
│       └── client.ts            # Supabase client
├── components/
│   ├── cabinets/
│   │   ├── CabinetBulkUpload.tsx    # Main upload component
│   │   ├── UploadModal.tsx          # Upload modal with drag & drop
│   │   └── ProjectCabinetsTable.tsx # Cabinets list table
│   └── ProjectDetails.tsx       # Updated with tabs
```

## Features

✅ **Tabs Navigation**
- Overview tab (default)
- Cabinets tab (owner only)

✅ **Upload with Auth Token**
- Gets Supabase session token
- Sends in Authorization header
- Handles auth errors gracefully

✅ **File Validation**
- Only accepts `.xlsx` files
- 10MB file size limit
- Client-side validation before upload

✅ **Upload States**
- Idle, Uploading, Success, Partial, Failure
- Clear error messages
- Error table for failed rows

✅ **Cabinets Table**
- Fetches from Supabase
- RLS protected
- Refresh functionality

## Testing Checklist

1. **Authentication**
   - [ ] Upload works when logged in
   - [ ] Shows auth error when token missing
   - [ ] Token sent in Authorization header

2. **File Upload**
   - [ ] Only .xlsx files accepted
   - [ ] .xls files rejected
   - [ ] File size validation works
   - [ ] Drag & drop works
   - [ ] File picker works

3. **Tabs**
   - [ ] Overview tab shows by default
   - [ ] Cabinets tab visible to owners only
   - [ ] Tab switching works
   - [ ] State persists during navigation

4. **Results Display**
   - [ ] Success state shows correct counts
   - [ ] Partial state shows error table
   - [ ] Failure state shows error message
   - [ ] Error report download works

5. **Cabinets Table**
   - [ ] Loads cabinets after upload
   - [ ] Refresh button works
   - [ ] Empty state shows correctly
   - [ ] Error handling works

## Backend Requirements

Your Express server should:

1. **Extract auth token**:
   ```javascript
   const token = req.headers.authorization?.replace('Bearer ', '')
   ```

2. **Verify token with Supabase**:
   ```javascript
   const { data: { user }, error } = await supabase.auth.getUser(token)
   ```

3. **Check permissions**:
   - Verify user is owner
   - Verify user owns the project

4. **Call service**:
   ```javascript
   const result = await processCabinetUpload(
     fileBuffer,
     supabaseAdminClient, // Use service role for inserts
     user.id, // ownerId
     projectId,
     null, // customerId
     file.originalname
   )
   ```

5. **Return response**:
   ```javascript
   res.json(result)
   ```

## Notes

- The UI uses client-side fetch (no server actions)
- Auth token is obtained from Supabase session
- File parsing happens on backend (not in browser)
- All Supabase queries use anon client (RLS protects)
- Components are compatible with both Vite and Next.js patterns
