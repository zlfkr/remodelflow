-- Phase 2: Design Approval Constraints
-- Ensures one approval per design and prevents duplicate approvals

-- Add unique constraint on design_approvals(design_id) if it doesn't exist
-- This prevents double-approval (one approval per design)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'design_approvals_design_id_key'
  ) THEN
    ALTER TABLE design_approvals 
    ADD CONSTRAINT design_approvals_design_id_key UNIQUE (design_id);
  END IF;
END $$;

-- Add index for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_design_approvals_design_id_unique 
ON design_approvals(design_id);
