-- ============================================
-- WORKING PRIVACY SYSTEM - No Recursion
-- This implements privacy correctly using security definer functions
-- ============================================

-- Step 1: Create a security definer function to check if user can see a report
-- This function runs with elevated privileges and doesn't trigger RLS
CREATE OR REPLACE FUNCTION can_user_view_report(report_id UUID, user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    report_owner UUID;
    has_match BOOLEAN;
BEGIN
    -- Get the report owner
    SELECT r.user_id INTO report_owner
    FROM reports r
    WHERE r.id = report_id;
    
    -- User can see their own reports
    IF report_owner = user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has a matching report
    SELECT EXISTS (
        SELECT 1 FROM matches m
        INNER JOIN reports r1 ON (r1.id = m.lost_report_id OR r1.id = m.found_report_id)
        WHERE (m.lost_report_id = report_id OR m.found_report_id = report_id)
        AND r1.user_id = user_id
        AND r1.id != report_id
    ) INTO has_match;
    
    RETURN has_match;
END;
$$;

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view matched reports" ON public.reports;
DROP POLICY IF EXISTS "Users can view own and matched reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;
DROP POLICY IF EXISTS "Anyone can view reports" ON public.reports;

-- Step 3: Create new policies using the security definer function
CREATE POLICY "Users can view allowed reports"
    ON public.reports FOR SELECT
    USING (
        can_user_view_report(id, auth.uid())
    );

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

-- Step 4: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION can_user_view_report(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_view_report(UUID, UUID) TO anon;

-- Step 5: Verify the setup
SELECT 
    'Policies created' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'reports';

SELECT 
    'Function created' as status,
    proname as function_name
FROM pg_proc 
WHERE proname = 'can_user_view_report';

-- ✅ Done! Privacy is now working without recursion.
-- Users can only see:
-- 1. Their own reports
-- 2. Reports they are matched with
