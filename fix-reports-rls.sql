-- ============================================
-- Fix: Reports RLS SELECT policy
-- Run this in Supabase Dashboard → SQL Editor
-- This fixes the empty feed page by ensuring
-- all authenticated users can read reports
-- ============================================

-- Step 1: Drop all existing SELECT policies on reports
-- (Some may not exist — errors are safe to ignore)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Anyone can view reports" ON public.reports;
    DROP POLICY IF EXISTS "Anyone can view active reports" ON public.reports;
    DROP POLICY IF EXISTS "Admins can view all reports" ON public.reports;
    DROP POLICY IF EXISTS "Admins can manage all reports" ON public.reports;
    DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
    DROP POLICY IF EXISTS "Public can view reports" ON public.reports;
    DROP POLICY IF EXISTS "reports_select_policy" ON public.reports;
END $$;

-- Step 2: Recreate the correct SELECT policy — ANYONE can view reports
CREATE POLICY "Anyone can view reports"
    ON public.reports FOR SELECT
    USING (true);

-- Step 3: Make sure INSERT/UPDATE/DELETE policies also exist
DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
    DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
    DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
    DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;
    DROP POLICY IF EXISTS "Admins can update any report" ON public.reports;
END $$;

CREATE POLICY "Authenticated users can create reports"
    ON public.reports FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
    ON public.reports FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
    ON public.reports FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Admin override for all operations
CREATE POLICY "Admins can manage all reports"
    ON public.reports FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ✅ Done! The feed should now show reports.
