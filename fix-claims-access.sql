-- ============================================
-- FIX: Allow users to see reports they have claims on
-- ============================================

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view allowed reports" ON public.reports;

-- Recreate with claims access included
CREATE POLICY "Users can view allowed reports"
    ON public.reports FOR SELECT
    USING (
        -- Own reports
        user_id = auth.uid()
        OR
        -- Reports with matches
        can_user_view_report(id, auth.uid())
        OR
        -- Reports they have claimed
        id IN (
            SELECT report_id FROM public.claims 
            WHERE claimer_id = auth.uid()
        )
        OR
        -- Reports where they received claims
        id IN (
            SELECT report_id FROM public.claims c
            WHERE report_id IN (
                SELECT id FROM public.reports WHERE user_id = auth.uid()
            )
        )
    );

-- Verify the policy
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename = 'reports' AND cmd = 'SELECT';

-- ✅ Done! Now users can see reports they have claims on.
