-- Phase 2: Collaboration and Decision-Making Features
-- This migration adds messaging, design management, approvals, activity tracking, and notifications

-- 1. PROJECT MESSAGING
CREATE TABLE project_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('owner', 'customer')),
  sender_id UUID NOT NULL, -- References profiles.id for owner, or customer email for customer
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_messages_project_id ON project_messages(project_id);
CREATE INDEX idx_project_messages_created_at ON project_messages(created_at);

-- 2. DESIGN UPLOAD & REVIEW
CREATE TABLE project_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_name TEXT NOT NULL,
  file_type TEXT, -- e.g., 'image/jpeg', 'application/pdf'
  file_size BIGINT, -- bytes
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_review', 'approved', 'revised')),
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_designs_project_id ON project_designs(project_id);
CREATE INDEX idx_project_designs_status ON project_designs(status);
CREATE INDEX idx_project_designs_version ON project_designs(project_id, version);

-- 3. DESIGN APPROVAL
CREATE TABLE design_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  design_id UUID NOT NULL REFERENCES project_designs(id) ON DELETE CASCADE,
  approved_by UUID NOT NULL, -- References profiles.id (customer profile)
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comment TEXT,
  UNIQUE(design_id) -- One approval per design
);

CREATE INDEX idx_design_approvals_design_id ON design_approvals(design_id);
CREATE INDEX idx_design_approvals_approved_by ON design_approvals(approved_by);

-- 4. PROJECT ACTIVITY TIMELINE
CREATE TABLE project_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('design_uploaded', 'design_approved', 'status_changed', 'message_sent', 'project_created')),
  description TEXT NOT NULL,
  metadata JSONB, -- Store additional context (e.g., old_status, new_status, file_name)
  created_by UUID, -- References profiles.id (optional, for user attribution)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_activity_project_id ON project_activity(project_id);
CREATE INDEX idx_project_activity_created_at ON project_activity(created_at);
CREATE INDEX idx_project_activity_type ON project_activity(type);

-- 5. NOTIFICATIONS (IN-APP ONLY)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_message', 'design_uploaded', 'design_approved')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read_at ON notifications(user_id, read_at);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Function to update updated_at timestamp for project_designs
CREATE OR REPLACE FUNCTION update_project_designs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_designs_updated_at
  BEFORE UPDATE ON project_designs
  FOR EACH ROW EXECUTE FUNCTION update_project_designs_updated_at();

-- Function to auto-create activity entries (to be called from application)
-- Note: We'll create activity entries from the app, but this function can be used for triggers if needed
CREATE OR REPLACE FUNCTION create_project_activity(
  p_project_id UUID,
  p_type TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  activity_id UUID;
BEGIN
  INSERT INTO project_activity (project_id, type, description, metadata, created_by)
  VALUES (p_project_id, p_type, p_description, p_metadata, p_created_by)
  RETURNING id INTO activity_id;
  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
