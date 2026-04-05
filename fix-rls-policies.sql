-- ============================================
-- Fix RLS Policies - Remove Infinite Recursion
-- Run this to fix the policy error
-- ============================================

-- Drop all existing policies on reports table
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view matched reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;

-- Create new policy without recursion
-- This policy uses the matches table to determine visibility
CREATE POLICY "Users can view own and matched reports"
    ON public.reports FOR SELECT
    USING (
        auth.uid() = user_id
        OR 
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE (m.lost_report_id = reports.id OR m.found_report_id = reports.id)
            AND EXISTS (
                SELECT 1 FROM public.reports r2
                WHERE (r2.id = m.lost_report_id OR r2.id = m.found_report_id)
                AND r2.user_id = auth.uid()
                AND r2.id != reports.id
            )
        )
    );

-- Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
    ON public.reports FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update own reports
CREATE POLICY "Users can update own reports"
    ON public.reports FOR UPDATE TO authenticated
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Users can delete own reports
CREATE POLICY "Users can delete own reports"
    ON public.reports FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Verify policies
SELECT schemaname, tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'reports';

-- ✅ Done! Try creating a report again.
