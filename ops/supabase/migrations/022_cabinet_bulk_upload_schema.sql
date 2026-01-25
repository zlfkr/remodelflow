-- Phase 4: Cabinet Bulk Upload Schema
-- This migration adds tables for bulk cabinet uploads from Excel files

-- 1. PROJECT CABINETS TABLE
-- Stores individual cabinet requirements imported from Excel
CREATE TABLE project_cabinets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  batch_id UUID, -- References project_cabinet_batches(id)
  
  -- Required fields from Excel
  room TEXT NOT NULL CHECK (room IN ('Kitchen', 'Bathroom', 'Laundry', 'Mudroom', 'Closet', 'Other')),
  cabinet_type TEXT NOT NULL CHECK (cabinet_type IN ('Base', 'Wall', 'Tall', 'Pantry', 'Island', 'Other')),
  width_in NUMERIC(10, 3) NOT NULL CHECK (width_in > 0),
  height_in NUMERIC(10, 3) NOT NULL CHECK (height_in > 0),
  depth_in NUMERIC(10, 3) NOT NULL CHECK (depth_in > 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  
  -- Optional fields from Excel
  cabinet_code TEXT,
  material TEXT,
  finish TEXT,
  door_type TEXT,
  drawer_count INTEGER CHECK (drawer_count >= 0),
  hinge_type TEXT,
  labor_level TEXT,
  cnc_ready BOOLEAN DEFAULT false,
  sku TEXT,
  unit_price NUMERIC(10, 2) CHECK (unit_price >= 0),
  notes TEXT,
  
  -- Calculated field (computed by database)
  extended_price NUMERIC(12, 2) GENERATED ALWAYS AS (quantity * COALESCE(unit_price, 0)) STORED,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_project_cabinets_project_id ON project_cabinets(project_id);
CREATE INDEX idx_project_cabinets_owner_id ON project_cabinets(owner_id);
CREATE INDEX idx_project_cabinets_batch_id ON project_cabinets(batch_id);
CREATE INDEX idx_project_cabinets_room ON project_cabinets(project_id, room);
CREATE INDEX idx_project_cabinets_cabinet_type ON project_cabinets(project_id, cabinet_type);

-- 2. PROJECT CABINET BATCHES TABLE
-- Tracks bulk upload batches for audit and error reporting
CREATE TABLE project_cabinet_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Batch statistics
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  
  -- Error reporting (JSON array of { row: number, errors: string[] })
  error_report JSONB DEFAULT '[]'::jsonb,
  
  -- File metadata
  file_name TEXT,
  file_size BIGINT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_project_cabinet_batches_project_id ON project_cabinet_batches(project_id);
CREATE INDEX idx_project_cabinet_batches_owner_id ON project_cabinet_batches(owner_id);
CREATE INDEX idx_project_cabinet_batches_status ON project_cabinet_batches(status);
CREATE INDEX idx_project_cabinet_batches_created_at ON project_cabinet_batches(created_at DESC);

-- Add foreign key constraint for batch_id in project_cabinets
ALTER TABLE project_cabinets
  ADD CONSTRAINT fk_project_cabinets_batch_id
  FOREIGN KEY (batch_id) REFERENCES project_cabinet_batches(id) ON DELETE SET NULL;

-- Function to update updated_at timestamp for project_cabinets
CREATE TRIGGER update_project_cabinets_updated_at
  BEFORE UPDATE ON project_cabinets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
