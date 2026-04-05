-- ============================================
-- Migration Script for Existing Reports
-- Run this AFTER supabase-privacy-matching.sql
-- ============================================

-- This script handles existing reports in your database
-- and runs the matching algorithm on them

-- Option 1: Keep existing reports PUBLIC (recommended for transition)
-- This allows users to gradually adopt the new privacy system
UPDATE public.reports 
SET is_private = FALSE 
WHERE created_at < NOW();

-- Option 2: Make all existing reports PRIVATE (strict privacy)
-- Uncomment the line below if you want all reports to be private
-- UPDATE public.reports SET is_private = TRUE WHERE created_at < NOW();

-- Run matching for all existing active reports
DO $$
DECLARE
    report_record RECORD;
    match_record RECORD;
    best_match_id UUID;
    best_match_score NUMERIC;
BEGIN
    -- Loop through all active reports
    FOR report_record IN 
        SELECT id, type FROM public.reports 
        WHERE status = 'active' 
        ORDER BY created_at DESC
    LOOP
        best_match_id := NULL;
        best_match_score := 0;
        
        -- Find matches for this report
        FOR match_record IN 
            SELECT * FROM find_matches_for_report(report_record.id)
        LOOP
            -- Insert into matches table
            IF report_record.type = 'lost' THEN
                INSERT INTO public.matches (lost_report_id, found_report_id, match_score, status)
                VALUES (report_record.id, match_record.matched_report_id, match_record.score, 'pending')
                ON CONFLICT (lost_report_id, found_report_id) DO NOTHING;
            ELSE
                INSERT INTO public.matches (lost_report_id, found_report_id, match_score, status)
                VALUES (match_record.matched_report_id, report_record.id, match_record.score, 'pending')
                ON CONFLICT (lost_report_id, found_report_id) DO NOTHING;
            END IF;
            
            -- Track best match
            IF match_record.score > best_match_score THEN
                best_match_score := match_record.score;
                best_match_id := match_record.matched_report_id;
            END IF;
        END LOOP;
        
        -- Update report with best match
        IF best_match_id IS NOT NULL THEN
            UPDATE public.reports 
            SET matched_with = best_match_id, match_score = best_match_score
            WHERE id = report_record.id;
            
            RAISE NOTICE 'Report % matched with % (score: %)', 
                report_record.id, best_match_id, best_match_score;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration complete!';
END $$;

-- Show migration results
SELECT 
    COUNT(*) as total_reports,
    COUNT(*) FILTER (WHERE is_private = TRUE) as private_reports,
    COUNT(*) FILTER (WHERE is_private = FALSE) as public_reports,
    COUNT(*) FILTER (WHERE matched_with IS NOT NULL) as matched_reports
FROM public.reports;

SELECT 
    COUNT(*) as total_matches,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_matches,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_matches,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_matches,
    ROUND(AVG(match_score), 2) as avg_match_score
FROM public.matches;

-- ✅ Migration complete! Check the results above.
