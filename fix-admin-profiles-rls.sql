-- ============================================
-- Fix: Admin Profile Viewing
-- Run this in Supabase Dashboard → SQL Editor
-- This creates a SECURITY DEFINER function that
-- bypasses RLS to allow admins to view all profiles
-- ============================================

-- Create a function to check if a user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get all profiles for admin users
CREATE OR REPLACE FUNCTION get_all_profiles_admin()
RETURNS SETOF profiles AS $$
BEGIN
    -- Verify the caller is an admin
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    RETURN QUERY SELECT * FROM profiles ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Alternative fix: Replace the existing RLS policy
-- to use the SECURITY DEFINER function instead of
-- a self-referencing subquery
-- ============================================

-- Drop the old problematic policies (they have self-referencing RLS issues)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles v2" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update any profile v2" ON profiles;

-- Recreate with the SECURITY DEFINER helper function
CREATE POLICY "Admins can view all profiles" ON profiles
    FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles" ON profiles
    FOR UPDATE USING (is_admin(auth.uid()));

-- Function to update user status as admin
CREATE OR REPLACE FUNCTION admin_update_user_status(target_user_id UUID, new_status TEXT)
RETURNS VOID AS $$
BEGIN
    -- Verify the caller is an admin
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Access denied: Admin role required';
    END IF;
    
    UPDATE profiles SET status = new_status, updated_at = NOW() WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ Done! Admin can now properly view all user profiles.
