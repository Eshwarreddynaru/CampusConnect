-- ============================================
-- TEST: Check if matching system is working
-- ============================================

-- 1. Check if the trigger exists
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    tgtype as trigger_type
FROM pg_trigger 
WHERE tgname = 'trigger_auto_match_reports';

-- 2. Check if the function exists
SELECT 
    proname as function_name,
    pronargs as num_args
FROM pg_proc 
WHERE proname = 'auto_match_reports';

-- 3. Check if there are any matches in the matches table
SELECT 
    COUNT(*) as total_matches,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed
FROM matches;

-- 4. Check recent reports
SELECT 
    id,
    type,
    title,
    category,
    matched_with,
    match_score,
    created_at
FROM reports 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Test the matching function manually
-- Replace 'your-report-id' with an actual report ID from above
-- SELECT * FROM find_matches_for_report('your-report-id');

-- ✅ Run this to diagnose the matching system
