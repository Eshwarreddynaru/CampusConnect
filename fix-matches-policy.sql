-- ============================================
-- FIX: Matches table RLS policy
-- Allow the trigger to insert matches
-- ============================================

-- Drop existing matches policies
DROP POLICY IF EXISTS "Users can view their matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update their matches" ON public.matches;

-- Create new policies for matches table

-- 1. Users can view matches involving their reports
CREATE POLICY "Users can view their matches"
    ON public.matches FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE (r.id = matches.lost_report_id OR r.id = matches.found_report_id)
            AND r.user_id = auth.uid()
        )
    );

-- 2. Allow INSERT for the trigger (bypass RLS for system operations)
-- This allows the auto_match_reports trigger to insert matches
CREATE POLICY "System can insert matches"
    ON public.matches FOR INSERT
    WITH CHECK (true);

-- 3. Users can update match status for their reports
CREATE POLICY "Users can update their matches"
    ON public.matches FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.reports r
            WHERE (r.id = matches.lost_report_id OR r.id = matches.found_report_id)
            AND r.user_id = auth.uid()
        )
    );

-- Verify policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'matches'
ORDER BY cmd;

-- ✅ Done! Try creating a report now - matching should work!
