-- ============================================
-- Fix: Admin Claims & Messages RLS Policies
-- Run this in Supabase Dashboard → SQL Editor
-- This ensures the All Claims page shows all data
-- ============================================

-- Step 1: Drop existing Admin policies for claims and messages
-- (Some may not exist — errors are safe to ignore)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Admins can view all claims" ON public.claims;
    DROP POLICY IF EXISTS "Admins can update any claim" ON public.claims;
    DROP POLICY IF EXISTS "Admins can view all messages" ON public.messages;
    DROP POLICY IF EXISTS "Admins can manage all claims" ON public.claims;
    DROP POLICY IF EXISTS "Admins can manage all messages" ON public.messages;
END $$;

-- Step 2: Create universal admin policies using the profiles table check
CREATE POLICY "Admins can manage all claims"
    ON public.claims FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Admins can manage all messages"
    ON public.messages FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ✅ Done! The Admin Claims and Chats pages should now show all data.
