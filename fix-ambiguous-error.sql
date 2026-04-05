-- ============================================
-- FIX: Ambiguous column reference error
-- ============================================

-- Step 1: Drop the policy that depends on the function
DROP POLICY IF EXISTS "Users can view allowed reports" ON public.reports;

-- Step 2: Now drop the function
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
BEGIN
    -- Get the report owner (use explicit column reference)
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
    
    RETURN v_has_match;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION can_user_view_report(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_view_report(UUID, UUID) TO anon;

-- Step 4: Recreate the policy using the fixed function
CREATE POLICY "Users can view allowed reports"
    ON public.reports FOR SELECT
    USING (
        can_user_view_report(id, auth.uid())
    );

-- Verify function exists
SELECT 
    'Function fixed' as status,
    proname as function_name,
    pronargs as num_args
FROM pg_proc 
WHERE proname = 'can_user_view_report';

-- ✅ Done! Try creating a report now.
