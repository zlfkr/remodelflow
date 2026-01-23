-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invites ENABLE ROW LEVEL SECURITY;

-- Profiles policies
-- Users can read and update their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Customers policies
-- Owners can manage their own customers
CREATE POLICY "Owners can view their customers"
  ON customers FOR SELECT
  USING (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can insert their customers"
  ON customers FOR INSERT
  WITH CHECK (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update their customers"
  ON customers FOR UPDATE
  USING (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their customers"
  ON customers FOR DELETE
  USING (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- Customers can view their own customer record (by email match)
CREATE POLICY "Customers can view own customer record"
  ON customers FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Projects policies
-- Owners can manage their own projects
CREATE POLICY "Owners can view their projects"
  ON projects FOR SELECT
  USING (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can insert their projects"
  ON projects FOR INSERT
  WITH CHECK (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can update their projects"
  ON projects FOR UPDATE
  USING (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their projects"
  ON projects FOR DELETE
  USING (
    owner_id IN (
      SELECT id FROM profiles WHERE id = auth.uid() AND role = 'owner'
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

-- Project invites policies
-- Owners can manage invites for their projects
CREATE POLICY "Owners can view invites for their projects"
  ON project_invites FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id IN (
        SELECT id FROM profiles WHERE id = auth.uid() AND role = 'owner'
      )
    )
  );

CREATE POLICY "Owners can create invites for their projects"
  ON project_invites FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id IN (
        SELECT id FROM profiles WHERE id = auth.uid() AND role = 'owner'
      )
    )
  );

-- Anyone with a valid token can view the invite (for accepting)
CREATE POLICY "Anyone can view invite by token"
  ON project_invites FOR SELECT
  USING (true);
