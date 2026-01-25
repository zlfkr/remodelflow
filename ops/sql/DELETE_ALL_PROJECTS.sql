-- WARNING: This will delete ALL projects and all related data!
-- This action cannot be undone. Make sure you have a backup if needed.

-- Tables that will be CASCADE deleted when projects are deleted:
-- - project_messages
-- - project_designs
-- - design_approvals
-- - project_activity
-- - project_estimates
-- - project_estimate_settings
-- - estimate_change_log
-- - project_invites

-- Option 1: Delete all projects (CASCADE will delete related data)
DELETE FROM projects;

-- Option 2: Delete projects and reset sequences (if using auto-increment IDs)
-- DELETE FROM projects;
-- ALTER SEQUENCE projects_id_seq RESTART WITH 1;  -- Only if using sequences

-- Option 3: Delete with confirmation (safer - shows count first)
-- SELECT COUNT(*) as project_count FROM projects;  -- Check count first
-- DELETE FROM projects;  -- Then delete

-- After deletion, verify:
-- SELECT COUNT(*) FROM projects;  -- Should return 0
