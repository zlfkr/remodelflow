-- Fix RLS policies for customers and projects tables
-- Use EXISTS instead of IN subqueries for better performance and reliability

-- Drop existing customer policies
DROP POLICY IF EXISTS "Owners can view their customers" ON customers;
DROP POLICY IF EXISTS "Owners can insert their customers" ON customers;
DROP POLICY IF EXISTS "Owners can update their customers" ON customers;
DROP POLICY IF EXISTS "Owners can delete their customers" ON customers;

-- Recreate customer policies with simplified logic
CREATE POLICY "Owners can view their customers"
  ON customers FOR SELECT
  USING (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

CREATE POLICY "Owners can insert their customers"
  ON customers FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update their customers"
  ON customers FOR UPDATE
  USING (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their customers"
  ON customers FOR DELETE
  USING (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Drop existing project policies
DROP POLICY IF EXISTS "Owners can view their projects" ON projects;
DROP POLICY IF EXISTS "Owners can insert their projects" ON projects;
DROP POLICY IF EXISTS "Owners can update their projects" ON projects;
DROP POLICY IF EXISTS "Owners can delete their projects" ON projects;

-- Recreate project policies
CREATE POLICY "Owners can view their projects"
  ON projects FOR SELECT
  USING (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

CREATE POLICY "Owners can insert their projects"
  ON projects FOR INSERT
  WITH CHECK (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update their projects"
  ON projects FOR UPDATE
  USING (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their projects"
  ON projects FOR DELETE
  USING (
    owner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- Drop and recreate project_invites policies
DROP POLICY IF EXISTS "Owners can view invites for their projects" ON project_invites;
DROP POLICY IF EXISTS "Owners can create invites for their projects" ON project_invites;

CREATE POLICY "Owners can view invites for their projects"
  ON project_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN profiles pr ON p.owner_id = pr.id
      WHERE p.id = project_invites.project_id
      AND pr.id = auth.uid()
      AND pr.role = 'owner'
    )
  );

CREATE POLICY "Owners can create invites for their projects"
  ON project_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN profiles pr ON p.owner_id = pr.id
      WHERE p.id = project_invites.project_id
      AND pr.id = auth.uid()
      AND pr.role = 'owner'
    )
  );
