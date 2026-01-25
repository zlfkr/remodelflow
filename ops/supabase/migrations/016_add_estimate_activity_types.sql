-- Add estimate activity types to project_activity CHECK constraint
-- This allows estimate-related activities to be logged

-- Drop the existing CHECK constraint
ALTER TABLE project_activity 
  DROP CONSTRAINT IF EXISTS project_activity_type_check;

-- Recreate with estimate activity types included
ALTER TABLE project_activity 
  ADD CONSTRAINT project_activity_type_check 
  CHECK (type IN (
    'design_uploaded',
    'design_approved',
    'status_changed',
    'message_sent',
    'project_created',
    'estimate_item_added',
    'estimate_item_updated',
    'estimate_item_removed',
    'estimate_settings_updated'
  ));
