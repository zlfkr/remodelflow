# Phase 2 Setup Instructions

This document outlines the setup steps for Phase 2 features: messaging, design management, approvals, activity tracking, and notifications.

## Database Setup

### 1. Run Migrations

Execute these migrations in your Supabase SQL Editor in order:

1. **`supabase/migrations/008_phase2_schema.sql`**
   - Creates all Phase 2 tables: `project_messages`, `project_designs`, `design_approvals`, `project_activity`, `notifications`
   - Creates helper functions for activity tracking

2. **`supabase/migrations/009_phase2_rls_policies.sql`**
   - Sets up Row Level Security policies for all Phase 2 tables
   - Ensures owners and customers can only access their own project data

### 2. Storage Setup

1. **Create Storage Bucket:**
   - Go to Supabase Dashboard → Storage
   - Click "New bucket"
   - Name: `project-designs`
   - Public: **false** (private bucket)
   - Click "Create bucket"

2. **Apply Storage Policies:**
   - Go to Supabase Dashboard → SQL Editor
   - Run `supabase/storage/policies/010_storage_policies.sql`
   - This sets up RLS for the storage bucket

## Features Overview

### 1. Project Messaging
- **Location:** Project detail page
- **Access:** Both owners and customers can send/receive messages
- **Features:**
  - Real-time message display (polling every 5 seconds)
  - Chronological message order
  - Role-based message styling
  - Auto-scroll to latest message

### 2. Design Upload & Review
- **Location:** Project detail page
- **Owner Actions:**
  - Upload design files (images/PDFs)
  - Add descriptions
  - View all uploaded designs
  - Delete designs
- **Customer Actions:**
  - View all designs
  - Preview images
  - Download PDFs
  - Approve designs with comments

### 3. Design Approval
- **Location:** Project detail page → Designs section
- **Workflow:**
  1. Owner uploads design (status: `in_review`)
  2. Customer sees design and can approve
  3. Customer adds approval comment
  4. Design status changes to `approved`
  5. Approved designs become read-only

### 4. Activity Timeline
- **Location:** Project detail page
- **Auto-generated activities:**
  - Design uploads
  - Design approvals
  - Status changes
  - Messages sent
  - Project creation
- **Features:**
  - Chronological display
  - Activity type icons
  - Metadata display (file names, status changes)
  - Auto-refresh every 10 seconds

### 5. Notifications
- **Location:** Navbar (bell icon)
- **Notification types:**
  - New message
  - Design uploaded
  - Design approved
- **Features:**
  - Unread count badge
  - Mark as read
  - Mark all as read
  - Click to navigate to project

## Component Structure

```
src/components/
├── ProjectMessages.tsx      # Messaging component
├── ProjectDesigns.tsx        # Design upload/review component
├── ProjectActivity.tsx       # Activity timeline component
├── Notifications.tsx         # Notification bell/dropdown
└── ProjectDetails.tsx        # Updated with Phase 2 features
```

## Routes

- **Customer:** `/customer/projects/[id]` - Project detail with Phase 2 features
- **Owner:** `/owner/projects/[id]` - Project detail with Phase 2 features

## RLS Security

All Phase 2 tables have RLS enabled with policies that ensure:
- **Owners** can only access data for their own projects
- **Customers** can only access data for projects assigned to them
- All access is scoped by `project_id`
- Storage bucket access follows the same rules

## TODO / Future Improvements

1. **Notifications:**
   - Currently notifications are created but customer profile lookup needs improvement
   - Consider adding `user_id` to `customers` table for direct linking

2. **Real-time:**
   - Currently using polling (5-10 second intervals)
   - Consider upgrading to Supabase Realtime for instant updates

3. **File Management:**
   - Add file deletion from storage when design is deleted
   - Add file size limits and validation
   - Add support for more file types

4. **Activity Tracking:**
   - Add more activity types (e.g., project status changes)
   - Add activity filtering
   - Add activity export

5. **Design Versioning:**
   - Currently basic versioning (incremental numbers)
   - Consider adding version comparison view
   - Add ability to revert to previous versions

## Testing Checklist

- [ ] Owner can upload design files
- [ ] Customer can view uploaded designs
- [ ] Customer can approve designs with comments
- [ ] Owner and customer can send messages
- [ ] Activity timeline shows all activities
- [ ] Notifications appear for relevant events
- [ ] RLS policies prevent unauthorized access
- [ ] Storage bucket access is properly restricted

## Notes

- All Phase 1 functionality remains intact
- No breaking changes to existing features
- New features are additive only
- All data access respects existing RLS policies
