-- QUICK FIX: Drop the recursive policy immediately
-- Run this FIRST in Supabase SQL Editor to stop the recursion error

-- Drop the problematic policy that causes recursion
-- This policy has a with_check clause that queries projects table recursively
DROP POLICY IF EXISTS "Customers can progress project status on design approval" ON projects;

-- Also drop any other customer UPDATE policies (we'll recreate them properly)
DROP POLICY IF EXISTS "customers can progress status in_progress to review" ON projects;
DROP POLICY IF EXISTS "customer can set project to review" ON projects;

-- After running this, the function should work without recursion
-- Then run migration 018 to set up the proper solution
