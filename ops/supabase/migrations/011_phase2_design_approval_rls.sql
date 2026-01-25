-- Phase 2: Enhanced RLS Policies for Design Approval
-- Ensures customers can only approve their own project designs
-- Restricts customer updates to only 'approved' status

-- ============================================================================
-- DESIGN APPROVALS POLICIES (Enhanced)
-- ============================================================================

-- Drop existing policies to recreate with proper validation
DROP POLICY IF EXISTS "Customers can approve designs" ON design_approvals;
DROP POLICY IF EXISTS "Owners can view approvals for their designs" ON design_approvals;
DROP POLICY IF EXISTS "Customers can view approvals for their designs" ON design_approvals;

-- Customers can INSERT approval only if:
-- 1. They are the customer for the project owning that design
-- 2. Their profile role is 'customer'
-- 3. approved_by matches their auth.uid()
CREATE POLICY "Customers can approve designs"
  ON design_approvals FOR INSERT
  WITH CHECK (
    approved_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'customer'
    )
    AND EXISTS (
      SELECT 1 FROM project_designs pd
      JOIN projects p ON pd.project_id = p.id
      JOIN customers c ON p.customer_id = c.id
      WHERE pd.id = design_approvals.design_id
      AND c.id IN (
        SELECT id FROM customers 
        WHERE email = (current_setting('request.jwt.claims', true)::json->>'email')
      )
    )
  );

-- Owners can view approvals for their project designs
CREATE POLICY "Owners can view approvals for their designs"
  ON design_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_designs pd
      JOIN projects p ON pd.project_id = p.id
      WHERE pd.id = design_approvals.design_id
      AND p.owner_id = auth.uid()
    )
  );

-- Customers can view approvals for their project designs
CREATE POLICY "Customers can view approvals for their designs"
  ON design_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_designs pd
      JOIN projects p ON pd.project_id = p.id
      JOIN customers c ON p.customer_id = c.id
      WHERE pd.id = design_approvals.design_id
      AND c.id IN (
        SELECT id FROM customers 
        WHERE email = (current_setting('request.jwt.claims', true)::json->>'email')
      )
    )
  );

-- ============================================================================
-- PROJECT DESIGNS POLICIES (Enhanced for Customer Updates)
-- ============================================================================

-- Drop existing customer update policy if it exists
DROP POLICY IF EXISTS "Customers can update designs" ON project_designs;

-- Customers can UPDATE designs ONLY to set status='approved'
-- They cannot change other fields or set other statuses
CREATE POLICY "Customers can approve designs only"
  ON project_designs FOR UPDATE
  USING (
    -- Can only update designs in their projects
    EXISTS (
      SELECT 1 FROM projects p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.id = project_designs.project_id
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
  )
  WITH CHECK (
    -- Can ONLY set status to 'approved', cannot change other fields
    status = 'approved'
    AND project_id = (SELECT project_id FROM project_designs WHERE id = project_designs.id)
    AND file_url = (SELECT file_url FROM project_designs WHERE id = project_designs.id)
    AND file_name = (SELECT file_name FROM project_designs WHERE id = project_designs.id)
    AND version = (SELECT version FROM project_designs WHERE id = project_designs.id)
    AND uploaded_by = (SELECT uploaded_by FROM project_designs WHERE id = project_designs.id)
  );

-- ============================================================================
-- PROJECT ACTIVITY POLICIES (Enhanced)
-- ============================================================================

-- Drop existing customer insert policy if it exists
DROP POLICY IF EXISTS "Customers can create activity" ON project_activity;

-- Customers can INSERT activity only for their projects
CREATE POLICY "Customers can create activity for their projects"
  ON project_activity FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN customers c ON p.customer_id = c.id
      WHERE p.id = project_activity.project_id
      AND c.id IN (
        SELECT id FROM customers 
        WHERE email = (current_setting('request.jwt.claims', true)::json->>'email')
      )
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = COALESCE(project_activity.created_by, auth.uid())
      AND role = 'customer'
    )
  );
