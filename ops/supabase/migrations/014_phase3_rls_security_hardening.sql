-- Phase 3: Security-First RLS Hardening
-- This migration ensures bulletproof security for cost/estimate data
-- Focus: Prevent any customer access to owner-only data, ensure explicit permissions

-- ============================================================================
-- HELPER FUNCTION: Check if project belongs to customer
-- ============================================================================
-- This simplifies customer ownership checks across policies
-- SECURITY INVOKER: Runs with caller's permissions (RLS context), not elevated
CREATE OR REPLACE FUNCTION current_customer_project_ids()
RETURNS TABLE(project_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT p.id
  FROM projects p
  JOIN customers c ON p.customer_id = c.id
  WHERE c.email = (current_setting('request.jwt.claims', true)::json->>'email');
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- ============================================================================
-- COST ITEMS: Owner-only, zero customer access
-- ============================================================================

-- Drop existing policies to recreate with explicit security
DROP POLICY IF EXISTS "Owners can view their cost items" ON cost_items;
DROP POLICY IF EXISTS "Owners can create cost items" ON cost_items;
DROP POLICY IF EXISTS "Owners can update their cost items" ON cost_items;
DROP POLICY IF EXISTS "Owners can delete their cost items" ON cost_items;

-- SECURITY: Only owners can SELECT their own cost items
-- Customers have ZERO access (no policy = denied)
CREATE POLICY "Owners can view their cost items"
  ON cost_items FOR SELECT
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- SECURITY: Only owners can INSERT cost items
CREATE POLICY "Owners can create cost items"
  ON cost_items FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- SECURITY: Only owners can UPDATE their cost items
CREATE POLICY "Owners can update their cost items"
  ON cost_items FOR UPDATE
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- SECURITY: Only owners can DELETE their cost items
CREATE POLICY "Owners can delete their cost items"
  ON cost_items FOR DELETE
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- ============================================================================
-- PROJECT ESTIMATE SETTINGS: Owner CRUD, Customer read-only (if enabled)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can view estimate settings for their projects" ON project_estimate_settings;
DROP POLICY IF EXISTS "Owners can manage estimate settings for their projects" ON project_estimate_settings;
DROP POLICY IF EXISTS "Customers can view estimate settings if enabled" ON project_estimate_settings;

-- SECURITY: Owners can SELECT settings for projects they own
CREATE POLICY "Owners can view estimate settings for their projects"
  ON project_estimate_settings FOR SELECT
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_estimate_settings.project_id 
      AND owner_id = auth.uid()
    )
  );

-- SECURITY: Owners can INSERT settings for projects they own
CREATE POLICY "Owners can insert estimate settings"
  ON project_estimate_settings FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_estimate_settings.project_id 
      AND owner_id = auth.uid()
    )
  );

-- SECURITY: Owners can UPDATE settings for projects they own
CREATE POLICY "Owners can update estimate settings"
  ON project_estimate_settings FOR UPDATE
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_estimate_settings.project_id 
      AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_estimate_settings.project_id 
      AND owner_id = auth.uid()
    )
  );

-- SECURITY: Owners can DELETE settings for projects they own
CREATE POLICY "Owners can delete estimate settings"
  ON project_estimate_settings FOR DELETE
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_estimate_settings.project_id 
      AND owner_id = auth.uid()
    )
  );

-- SECURITY: Customers can SELECT settings ONLY if:
-- 1. show_to_customer = true
-- 2. Project belongs to that customer
-- 3. User has customer role
-- Customers CANNOT INSERT/UPDATE/DELETE (no policies = denied)
CREATE POLICY "Customers can view estimate settings if enabled"
  ON project_estimate_settings FOR SELECT
  USING (
    show_to_customer = true
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'customer'
    )
    AND project_id IN (
      SELECT project_id FROM current_customer_project_ids()
    )
  );

-- ============================================================================
-- PROJECT ESTIMATES: Owner CRUD, Customer read-only (if enabled + visible)
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can view estimates for their projects" ON project_estimates;
DROP POLICY IF EXISTS "Owners can create estimates for their projects" ON project_estimates;
DROP POLICY IF EXISTS "Owners can update estimates for their projects" ON project_estimates;
DROP POLICY IF EXISTS "Owners can delete estimates for their projects" ON project_estimates;
DROP POLICY IF EXISTS "Customers can view visible estimate line items" ON project_estimates;

-- SECURITY: Owners can SELECT estimates for projects they own
CREATE POLICY "Owners can view estimates for their projects"
  ON project_estimates FOR SELECT
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_estimates.project_id 
      AND owner_id = auth.uid()
    )
  );

-- SECURITY: Owners can INSERT estimates for projects they own
CREATE POLICY "Owners can insert estimates for their projects"
  ON project_estimates FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_estimates.project_id 
      AND owner_id = auth.uid()
    )
  );

-- SECURITY: Owners can UPDATE estimates for projects they own
CREATE POLICY "Owners can update estimates for their projects"
  ON project_estimates FOR UPDATE
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_estimates.project_id 
      AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_estimates.project_id 
      AND owner_id = auth.uid()
    )
  );

-- SECURITY: Owners can DELETE estimates for projects they own
CREATE POLICY "Owners can delete estimates for their projects"
  ON project_estimates FOR DELETE
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = project_estimates.project_id 
      AND owner_id = auth.uid()
    )
  );

-- SECURITY: Customers can SELECT estimates ONLY when ALL are true:
-- 1. is_customer_visible = true (line item is marked visible)
-- 2. Settings show_to_customer = true (estimate is enabled for customer)
-- 3. Project belongs to that customer
-- 4. User has customer role
-- Customers CANNOT INSERT/UPDATE/DELETE (no policies = denied)
CREATE POLICY "Customers can view visible estimate line items"
  ON project_estimates FOR SELECT
  USING (
    is_customer_visible = true
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'customer'
    )
    AND EXISTS (
      SELECT 1 FROM project_estimate_settings pes
      WHERE pes.project_id = project_estimates.project_id
      AND pes.show_to_customer = true
    )
    AND project_id IN (
      SELECT project_id FROM current_customer_project_ids()
    )
  );

-- ============================================================================
-- ESTIMATE CHANGE LOG: Owner-only audit trail
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Owners can view estimate change log for their projects" ON estimate_change_log;
DROP POLICY IF EXISTS "Owners can create estimate change log" ON estimate_change_log;

-- SECURITY: Only owners can SELECT change log for their projects
-- Customers have ZERO access (no policy = denied)
CREATE POLICY "Owners can view estimate change log for their projects"
  ON estimate_change_log FOR SELECT
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = estimate_change_log.project_id 
      AND owner_id = auth.uid()
    )
  );

-- SECURITY: Only owners can INSERT change log entries for their projects
CREATE POLICY "Owners can insert estimate change log"
  ON estimate_change_log FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = estimate_change_log.project_id 
      AND owner_id = auth.uid()
    )
  );

-- SECURITY: Owners can UPDATE change log (for corrections, if needed)
CREATE POLICY "Owners can update estimate change log"
  ON estimate_change_log FOR UPDATE
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = estimate_change_log.project_id 
      AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = estimate_change_log.project_id 
      AND owner_id = auth.uid()
    )
  );

-- SECURITY: Owners can DELETE change log (for cleanup, if needed)
CREATE POLICY "Owners can delete estimate change log"
  ON estimate_change_log FOR DELETE
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND EXISTS (
      SELECT 1 FROM projects 
      WHERE id = estimate_change_log.project_id 
      AND owner_id = auth.uid()
    )
  );

-- ============================================================================
-- VERIFICATION: Ensure RLS is enabled on all Phase 3 tables
-- ============================================================================

-- Double-check RLS is enabled (idempotent)
ALTER TABLE cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_estimate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_change_log ENABLE ROW LEVEL SECURITY;
