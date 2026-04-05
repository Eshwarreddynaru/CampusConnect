-- Create a storage bucket for report images
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)

-- 1. Create the bucket (public so images can be viewed by anyone)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'report-images',
    'report-images',
    true,
    5242880, -- 5MB max file size
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view report images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;

-- 3. Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'report-images');

-- 4. Allow anyone to view images (public bucket)
CREATE POLICY "Anyone can view report images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'report-images');

-- 5. Allow users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'report-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);
