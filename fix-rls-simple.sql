-- ============================================
-- SIMPLE FIX - Remove ALL complex RLS policies
-- This makes reports work like before (public)
-- while we fix the matching system
-- ============================================

-- Step 1: Drop ALL policies on reports
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view matched reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view own and matched reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;
DROP POLICY IF EXISTS "Anyone can view reports" ON public.reports;

-- Step 2: Create SIMPLE policies (like the original system)
-- Everyone can view all reports (we'll add privacy later)
CREATE POLICY "Anyone can view reports"
    ON public.reports FOR SELECT
    USING (true);

-- Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
    ON public.reports FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own reports
CREATE POLICY "Users can update own reports"
    ON public.reports FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own reports
CREATE POLICY "Users can delete own reports"
    ON public.reports FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Step 3: Verify policies
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'reports'
ORDER BY cmd;

-- ✅ Done! Now try creating a report - it should work!
-- Note: All reports are visible for now. We'll implement privacy gradually.
