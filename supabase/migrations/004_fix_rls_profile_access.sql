-- Fix RLS policies to allow profile existence checks
-- This ensures users can check if their profile exists even if it's not created yet

-- Drop existing policies if they exist (to recreate them)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Recreate with better error handling
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Ensure the trigger function can insert profiles
-- The SECURITY DEFINER function should bypass RLS, but let's make sure it's set up correctly
-- This is already handled in migration 003, but included here for reference
