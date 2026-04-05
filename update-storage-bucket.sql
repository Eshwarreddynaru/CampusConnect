-- Update the storage bucket to accept more image types (including HEIC from mobile)
-- Run this in the Supabase SQL Editor

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'image/heif'
]
WHERE id = 'report-images';
