-- Phase 3: Cost Estimation and Scope Control
-- This migration adds cost catalog, project estimates, settings, and change tracking

-- 1. COST ITEMS CATALOG (Owner-level reusable catalog)
CREATE TABLE cost_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- e.g. 'cabinets', 'countertop', 'labor', 'permit', 'plumbing', 'electrical'
  unit_type TEXT NOT NULL CHECK (unit_type IN ('each', 'sqft', 'linear_ft', 'hour', 'flat')),
  default_unit_cost NUMERIC(10, 2) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cost_items_owner_id ON cost_items(owner_id);
CREATE INDEX idx_cost_items_category ON cost_items(owner_id, category);
CREATE INDEX idx_cost_items_is_active ON cost_items(owner_id, is_active);

-- 2. PROJECT ESTIMATE SETTINGS
CREATE TABLE project_estimate_settings (
  project_id UUID PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  show_to_customer BOOLEAN NOT NULL DEFAULT false,
  tax_rate NUMERIC(5, 4) NULL, -- e.g. 0.0825 for 8.25%
  discount_amount NUMERIC(10, 2) NULL,
  markup_percent NUMERIC(5, 2) NULL, -- e.g. 15.00 for 15%
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_estimate_settings_owner_id ON project_estimate_settings(owner_id);

-- 3. PROJECT ESTIMATE LINE ITEMS
CREATE TABLE project_estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cost_item_id UUID REFERENCES cost_items(id) ON DELETE SET NULL, -- nullable for custom items
  name TEXT NOT NULL, -- snapshot of item name
  category TEXT NOT NULL,
  unit_type TEXT NOT NULL CHECK (unit_type IN ('each', 'sqft', 'linear_ft', 'hour', 'flat')),
  quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(10, 2) NOT NULL,
  line_total NUMERIC(10, 2) NOT NULL, -- computed: quantity * unit_cost
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_customer_visible BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_estimates_project_id ON project_estimates(project_id);
CREATE INDEX idx_project_estimates_owner_id ON project_estimates(owner_id);
CREATE INDEX idx_project_estimates_cost_item_id ON project_estimates(cost_item_id);
CREATE INDEX idx_project_estimates_sort_order ON project_estimates(project_id, sort_order);

-- 4. ESTIMATE CHANGE LOG (Audit trail)
CREATE TABLE estimate_change_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('add', 'update', 'delete')),
  before_json JSONB, -- snapshot before change
  after_json JSONB, -- snapshot after change
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_estimate_change_log_project_id ON estimate_change_log(project_id);
CREATE INDEX idx_estimate_change_log_owner_id ON estimate_change_log(owner_id);
CREATE INDEX idx_estimate_change_log_created_at ON estimate_change_log(created_at);

-- Function to update updated_at timestamp for cost_items
CREATE OR REPLACE FUNCTION update_cost_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cost_items_updated_at
  BEFORE UPDATE ON cost_items
  FOR EACH ROW EXECUTE FUNCTION update_cost_items_updated_at();

-- Function to update updated_at timestamp for project_estimate_settings
CREATE OR REPLACE FUNCTION update_project_estimate_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_estimate_settings_updated_at
  BEFORE UPDATE ON project_estimate_settings
  FOR EACH ROW EXECUTE FUNCTION update_project_estimate_settings_updated_at();

-- Function to update updated_at timestamp for project_estimates
CREATE OR REPLACE FUNCTION update_project_estimates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_estimates_updated_at
  BEFORE UPDATE ON project_estimates
  FOR EACH ROW EXECUTE FUNCTION update_project_estimates_updated_at();

-- Function to auto-calculate line_total
CREATE OR REPLACE FUNCTION calculate_line_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.line_total = NEW.quantity * NEW.unit_cost;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_project_estimates_line_total
  BEFORE INSERT OR UPDATE ON project_estimates
  FOR EACH ROW EXECUTE FUNCTION calculate_line_total();
