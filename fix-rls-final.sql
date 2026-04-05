-- ============================================
-- FINAL FIX: Simplified and efficient RLS policy
-- ============================================

-- Drop the complex policy
DROP POLICY IF EXISTS "Users can view allowed reports" ON public.reports;

-- Create a simpler, more efficient policy
-- This uses the security definer function which is already optimized
CREATE POLICY "Users can view allowed reports"
    ON public.reports FOR SELECT
    USING (
        -- Use the security definer function which handles all cases
        -- (own reports, matched reports, and reports with claims)
        user_id = auth.uid()
        OR
        can_user_view_report(id, auth.uid())
    );

-- Now update the security definer function to include claims access
DROP FUNCTION IF EXISTS can_user_view_report(UUID, UUID) CASCADE;

CREATE OR REPLACE FUNCTION can_user_view_report(p_report_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_report_owner UUID;
    v_has_match BOOLEAN;
    v_has_claim BOOLEAN;
BEGIN
    -- Get the report owner
    SELECT reports.user_id INTO v_report_owner
    FROM reports
    WHERE reports.id = p_report_id;
    
    -- User can see their own reports
    IF v_report_owner = p_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has a matching report
    SELECT EXISTS (
        SELECT 1 
        FROM matches m
        INNER JOIN reports r1 ON (r1.id = m.lost_report_id OR r1.id = m.found_report_id)
        WHERE (m.lost_report_id = p_report_id OR m.found_report_id = p_report_id)
        AND r1.user_id = p_user_id
        AND r1.id != p_report_id
    ) INTO v_has_match;
    
    IF v_has_match THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has claimed this report OR received a claim on it
    SELECT EXISTS (
        SELECT 1 FROM claims c
        WHERE c.report_id = p_report_id
        AND (c.claimer_id = p_user_id OR v_report_owner = p_user_id)
    ) INTO v_has_claim;
    
    RETURN v_has_claim;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION can_user_view_report(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_view_report(UUID, UUID) TO anon;

-- Recreate the policy
CREATE POLICY "Users can view allowed reports"
    ON public.reports FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        can_user_view_report(id, auth.uid())
    );

-- Verify setup
SELECT 'Setup complete' as status;

SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename = 'reports' AND cmd = 'SELECT';

-- ✅ Done! This should work efficiently now.
