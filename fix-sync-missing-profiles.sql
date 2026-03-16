-- ============================================
-- Fix: Sync missing auth.users into profiles table
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- Insert profiles for auth users that don't have one yet
INSERT INTO profiles (id, register_number, role, status, qr_code, created_at, updated_at)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'register_number', SPLIT_PART(u.email, '@', 1)),
    'student',
    'active',
    encode(gen_random_bytes(32), 'hex'),
    u.created_at,
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = u.id
);

-- Verify the fix
SELECT 
    p.id,
    p.register_number,
    p.role,
    p.status,
    p.created_at
FROM profiles p
ORDER BY p.created_at DESC;

-- ✅ Done! All auth users now have profile entries.
