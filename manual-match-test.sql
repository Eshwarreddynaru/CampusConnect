-- ============================================
-- MANUAL MATCHING TEST
-- Run this to manually trigger matching for existing reports
-- ============================================

-- Step 1: Get the IDs of your test reports
-- Replace these with your actual report IDs
DO $$
DECLARE
    lost_report_id UUID;
    found_report_id UUID;
    match_score_value NUMERIC;
BEGIN
    -- Find a lost report (change the title to match yours)
    SELECT id INTO lost_report_id 
    FROM reports 
    WHERE type = 'lost' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    -- Find a found report (change the title to match yours)
    SELECT id INTO found_report_id 
    FROM reports 
    WHERE type = 'found' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    RAISE NOTICE 'Lost Report ID: %', lost_report_id;
    RAISE NOTICE 'Found Report ID: %', found_report_id;
    
    -- Calculate match score
    SELECT calculate_match_score(
        (SELECT title FROM reports WHERE id = lost_report_id),
        (SELECT description FROM reports WHERE id = lost_report_id),
        (SELECT category FROM reports WHERE id = lost_report_id),
        (SELECT location FROM reports WHERE id = lost_report_id),
        (SELECT created_at FROM reports WHERE id = lost_report_id),
        (SELECT title FROM reports WHERE id = found_report_id),
        (SELECT description FROM reports WHERE id = found_report_id),
        (SELECT category FROM reports WHERE id = found_report_id),
        (SELECT location FROM reports WHERE id = found_report_id),
        (SELECT created_at FROM reports WHERE id = found_report_id)
    ) INTO match_score_value;
    
    RAISE NOTICE 'Match Score: %', match_score_value;
    
    -- If score is good enough, create the match
    IF match_score_value >= 50 THEN
        INSERT INTO matches (lost_report_id, found_report_id, match_score, status)
        VALUES (lost_report_id, found_report_id, match_score_value, 'pending')
        ON CONFLICT (lost_report_id, found_report_id) DO UPDATE
        SET match_score = match_score_value;
        
        -- Update both reports
        UPDATE reports SET matched_with = found_report_id, match_score = match_score_value
        WHERE id = lost_report_id;
        
        UPDATE reports SET matched_with = lost_report_id, match_score = match_score_value
        WHERE id = found_report_id;
        
        RAISE NOTICE 'Match created successfully!';
    ELSE
        RAISE NOTICE 'Score too low (< 50), no match created';
    END IF;
END $$;

-- Check the results
SELECT 
    m.id,
    m.match_score,
    m.status,
    l.title as lost_item,
    f.title as found_item
FROM matches m
JOIN reports l ON l.id = m.lost_report_id
JOIN reports f ON f.id = m.found_report_id
ORDER BY m.created_at DESC
LIMIT 5;

-- ✅ This will manually create a match between your most recent lost and found items
