-- ============================================
-- COMPLETE FIX - Ensure Matching System Works
-- Run this entire script to fix everything
-- ============================================

-- PART 1: Ensure the trigger is enabled
-- ============================================
DROP TRIGGER IF EXISTS trigger_auto_match_reports ON public.reports;

CREATE TRIGGER trigger_auto_match_reports
    AFTER INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION auto_match_reports();

-- PART 2: Test if matching function works
-- ============================================
-- This will show you if the function can find matches
SELECT 'Testing matching function...' as status;

-- Get a sample report ID to test (you can replace this)
DO $$
DECLARE
    test_report_id UUID;
    match_count INTEGER;
BEGIN
    -- Get the most recent report
    SELECT id INTO test_report_id FROM reports ORDER BY created_at DESC LIMIT 1;
    
    IF test_report_id IS NOT NULL THEN
        -- Count how many matches it finds
        SELECT COUNT(*) INTO match_count 
        FROM find_matches_for_report(test_report_id);
        
        RAISE NOTICE 'Report ID: %', test_report_id;
        RAISE NOTICE 'Matches found: %', match_count;
    END IF;
END $$;

-- PART 3: Manually run matching on ALL existing reports
-- ============================================
SELECT 'Running matching on all existing reports...' as status;

DO $$
DECLARE
    report_record RECORD;
    match_record RECORD;
    best_match_id UUID;
    best_match_score NUMERIC;
    match_count INTEGER := 0;
BEGIN
    -- Loop through all active reports
    FOR report_record IN 
        SELECT id, type, title FROM public.reports 
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
                ON CONFLICT (lost_report_id, found_report_id) DO UPDATE
                SET match_score = EXCLUDED.match_score;
            ELSE
                INSERT INTO public.matches (lost_report_id, found_report_id, match_score, status)
                VALUES (match_record.matched_report_id, report_record.id, match_record.score, 'pending')
                ON CONFLICT (lost_report_id, found_report_id) DO UPDATE
                SET match_score = EXCLUDED.match_score;
            END IF;
            
            match_count := match_count + 1;
            
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
            
            RAISE NOTICE 'Report "%" matched with score %', report_record.title, best_match_score;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Total matches created: %', match_count;
END $$;

-- PART 4: Verify the results
-- ============================================
SELECT 'Verification Results:' as status;

-- Show match statistics
SELECT 
    'Total Matches' as metric,
    COUNT(*) as count
FROM matches
UNION ALL
SELECT 
    'Pending Matches' as metric,
    COUNT(*) as count
FROM matches WHERE status = 'pending'
UNION ALL
SELECT 
    'Reports with Matches' as metric,
    COUNT(*) as count
FROM reports WHERE matched_with IS NOT NULL;

-- Show recent matches
SELECT 
    m.id,
    m.match_score,
    m.status,
    l.title as lost_item,
    l.category as lost_category,
    f.title as found_item,
    f.category as found_category,
    m.created_at
FROM matches m
JOIN reports l ON l.id = m.lost_report_id
JOIN reports f ON f.id = m.found_report_id
ORDER BY m.created_at DESC
LIMIT 10;

-- ✅ DONE! Check the results above.
-- If you see matches, the system is working!
-- Now go to your app and view a report detail page to see the matches.
