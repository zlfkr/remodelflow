-- Verify and ensure projects policies are correct
-- This migration ensures projects can be queried with customer joins

-- First, let's check if we need to drop and recreate
DROP POLICY IF EXISTS "Owners can view their projects" ON projects;
DROP POLICY IF EXISTS "Owners can insert their projects" ON projects;
DROP POLICY IF EXISTS "Owners can update their projects" ON projects;
DROP POLICY IF EXISTS "Owners can delete their projects" ON projects;
DROP POLICY IF EXISTS "Customers can view assigned projects" ON projects;

-- Recreate all project policies
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

-- Customers can view projects assigned to them
CREATE POLICY "Customers can view assigned projects"
  ON projects FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );
