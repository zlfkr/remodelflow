-- Phase 3: RLS Policies for Cost Estimation
-- All policies ensure owners can only access their own data, customers can only read visible estimates

-- Enable RLS on all Phase 3 tables
ALTER TABLE cost_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_estimate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_change_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COST ITEMS POLICIES (Owner-only catalog)
-- ============================================================================

-- Owners can view their own cost items
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

-- Owners can create cost items
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

-- Owners can update their cost items
CREATE POLICY "Owners can update their cost items"
  ON cost_items FOR UPDATE
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Owners can delete their cost items
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
-- PROJECT ESTIMATE SETTINGS POLICIES
-- ============================================================================

-- Owners can view settings for their projects
CREATE POLICY "Owners can view estimate settings for their projects"
  ON project_estimate_settings FOR SELECT
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Owners can create/update settings for their projects
CREATE POLICY "Owners can manage estimate settings for their projects"
  ON project_estimate_settings FOR ALL
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

-- Customers can view settings ONLY if show_to_customer = true
CREATE POLICY "Customers can view estimate settings if enabled"
  ON project_estimate_settings FOR SELECT
  USING (
    show_to_customer = true
    AND EXISTS (
      SELECT 1 FROM projects p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.id = project_estimate_settings.project_id
      AND c.id IN (
        SELECT id FROM customers 
        WHERE email = (current_setting('request.jwt.claims', true)::json->>'email')
      )
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'customer'
    )
  );

-- ============================================================================
-- PROJECT ESTIMATES POLICIES
-- ============================================================================

-- Owners can view estimates for their projects
CREATE POLICY "Owners can view estimates for their projects"
  ON project_estimates FOR SELECT
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Owners can create estimates for their projects
CREATE POLICY "Owners can create estimates for their projects"
  ON project_estimates FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Owners can update estimates for their projects
CREATE POLICY "Owners can update estimates for their projects"
  ON project_estimates FOR UPDATE
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
    AND project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Owners can delete estimates for their projects
CREATE POLICY "Owners can delete estimates for their projects"
  ON project_estimates FOR DELETE
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Customers can view estimates ONLY if:
-- 1. Settings show_to_customer = true
-- 2. Line item is_customer_visible = true
CREATE POLICY "Customers can view visible estimate line items"
  ON project_estimates FOR SELECT
  USING (
    is_customer_visible = true
    AND EXISTS (
      SELECT 1 FROM project_estimate_settings pes
      WHERE pes.project_id = project_estimates.project_id
      AND pes.show_to_customer = true
    )
    AND EXISTS (
      SELECT 1 FROM projects p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.id = project_estimates.project_id
      AND c.id IN (
        SELECT id FROM customers 
        WHERE email = (current_setting('request.jwt.claims', true)::json->>'email')
      )
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'customer'
    )
  );

-- ============================================================================
-- ESTIMATE CHANGE LOG POLICIES
-- ============================================================================

-- Owners can view change log for their projects
CREATE POLICY "Owners can view estimate change log for their projects"
  ON estimate_change_log FOR SELECT
  USING (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Owners can create change log entries for their projects
CREATE POLICY "Owners can create estimate change log"
  ON estimate_change_log FOR INSERT
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
    AND project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Customers cannot access change log (audit trail is owner-only)
