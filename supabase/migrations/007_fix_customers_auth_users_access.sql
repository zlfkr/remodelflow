-- Fix customers policy that tries to access auth.users directly
-- The issue is that RLS policies can't directly query auth.users table
-- Solution: Use JWT claims to get email instead

-- Drop the problematic policy that tries to access auth.users
DROP POLICY IF EXISTS "Customers can view own customer record" ON customers;

-- Use JWT claims to get email (stored in token, accessible in RLS)
CREATE POLICY "Customers can view own customer record"
  ON customers FOR SELECT
  USING (
    email = (current_setting('request.jwt.claims', true)::json->>'email')
  );

-- For projects: Update policy to use JWT claims instead of auth.users
DROP POLICY IF EXISTS "Customers can view assigned projects" ON projects;

CREATE POLICY "Customers can view assigned projects"
  ON projects FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers 
      WHERE email = (current_setting('request.jwt.claims', true)::json->>'email')
    )
  );
