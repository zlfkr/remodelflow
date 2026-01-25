-- Supabase Storage Policies for project-designs bucket
-- This file should be run in Supabase SQL Editor after creating the bucket

-- Note: First create the bucket in Supabase Dashboard:
-- Storage > New bucket > Name: "project-designs" > Public: false

-- Policy: Owners can upload files to their project folders
CREATE POLICY "Owners can upload design files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-designs' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE owner_id = auth.uid()
  )
);

-- Policy: Owners can view files in their project folders
CREATE POLICY "Owners can view design files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-designs' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE owner_id = auth.uid()
  )
);

-- Policy: Owners can delete files from their project folders
CREATE POLICY "Owners can delete design files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-designs' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM projects WHERE owner_id = auth.uid()
  )
);

-- Policy: Customers can view files for their assigned projects
-- Uses helper function to avoid RLS recursion
CREATE POLICY "Customers can view design files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'project-designs' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text 
    FROM projects 
    WHERE customer_id = public.get_current_customer_id()
  )
);
