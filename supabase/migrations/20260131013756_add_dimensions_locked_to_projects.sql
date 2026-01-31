-- Add dimensions_locked and dimensions_locked_at to projects (production readiness)
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS dimensions_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dimensions_locked_at timestamptz NULL;

COMMENT ON COLUMN public.projects.dimensions_locked IS 'Set when owner locks dimensions before CNC/export';
COMMENT ON COLUMN public.projects.dimensions_locked_at IS 'When dimensions were locked';
