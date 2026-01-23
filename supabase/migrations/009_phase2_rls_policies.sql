-- Phase 2: RLS Policies for Collaboration Features
-- All policies respect project-level access: owners see their projects, customers see assigned projects

-- Enable RLS on all Phase 2 tables
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROJECT MESSAGES POLICIES
-- ============================================================================

-- Owners can view messages for their projects
CREATE POLICY "Owners can view messages for their projects"
  ON project_messages FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Owners can send messages to their projects
CREATE POLICY "Owners can send messages to their projects"
  ON project_messages FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
    AND sender_role = 'owner'
    AND sender_id = auth.uid()
  );

-- Customers can view messages for their assigned projects
CREATE POLICY "Customers can view messages for their projects"
  ON project_messages FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE customer_id IN (
        SELECT id FROM customers WHERE email = (
          current_setting('request.jwt.claims', true)::json->>'email'
        )
      )
    )
  );

-- Customers can send messages to their projects
CREATE POLICY "Customers can send messages to their projects"
  ON project_messages FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE customer_id IN (
        SELECT id FROM customers WHERE email = (
          current_setting('request.jwt.claims', true)::json->>'email'
        )
      )
    )
    AND sender_role = 'customer'
    AND sender_id = auth.uid()
  );

-- ============================================================================
-- PROJECT DESIGNS POLICIES
-- ============================================================================

-- Owners can view designs for their projects
CREATE POLICY "Owners can view designs for their projects"
  ON project_designs FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Owners can upload designs to their projects
CREATE POLICY "Owners can upload designs to their projects"
  ON project_designs FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
    AND uploaded_by = auth.uid()
  );

-- Owners can update designs for their projects
CREATE POLICY "Owners can update designs for their projects"
  ON project_designs FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Owners can delete designs for their projects
CREATE POLICY "Owners can delete designs for their projects"
  ON project_designs FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Customers can view designs for their assigned projects
CREATE POLICY "Customers can view designs for their projects"
  ON project_designs FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE customer_id IN (
        SELECT id FROM customers WHERE email = (
          current_setting('request.jwt.claims', true)::json->>'email'
        )
      )
    )
  );

-- ============================================================================
-- DESIGN APPROVALS POLICIES
-- ============================================================================

-- Owners can view approvals for their project designs
CREATE POLICY "Owners can view approvals for their designs"
  ON design_approvals FOR SELECT
  USING (
    design_id IN (
      SELECT id FROM project_designs WHERE project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
      )
    )
  );

-- Customers can view approvals for their project designs
CREATE POLICY "Customers can view approvals for their designs"
  ON design_approvals FOR SELECT
  USING (
    design_id IN (
      SELECT id FROM project_designs WHERE project_id IN (
        SELECT id FROM projects WHERE customer_id IN (
          SELECT id FROM customers WHERE email = (
            current_setting('request.jwt.claims', true)::json->>'email'
          )
        )
      )
    )
  );

-- Customers can create approvals for their project designs
CREATE POLICY "Customers can approve designs"
  ON design_approvals FOR INSERT
  WITH CHECK (
    design_id IN (
      SELECT id FROM project_designs WHERE project_id IN (
        SELECT id FROM projects WHERE customer_id IN (
          SELECT id FROM customers WHERE email = (
            current_setting('request.jwt.claims', true)::json->>'email'
          )
        )
      )
    )
    AND approved_by = auth.uid()
  );

-- ============================================================================
-- PROJECT ACTIVITY POLICIES
-- ============================================================================

-- Owners can view activity for their projects
CREATE POLICY "Owners can view activity for their projects"
  ON project_activity FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Owners can create activity for their projects
CREATE POLICY "Owners can create activity for their projects"
  ON project_activity FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Customers can view activity for their assigned projects
CREATE POLICY "Customers can view activity for their projects"
  ON project_activity FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE customer_id IN (
        SELECT id FROM customers WHERE email = (
          current_setting('request.jwt.claims', true)::json->>'email'
        )
      )
    )
  );

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- System can create notifications (via SECURITY DEFINER function)
-- For now, we'll create notifications from the app using service role or triggers
-- This policy allows owners to create notifications for customers
CREATE POLICY "Owners can create notifications for their projects"
  ON notifications FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
    )
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
