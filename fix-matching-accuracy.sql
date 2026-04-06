-- ============================================
-- FIX MATCHING ACCURACY
-- Run this in Supabase Dashboard → SQL Editor
-- Fixes false matches like "id card" ↔ "mobile charger"
-- ============================================

-- Step 1: Drop and recreate the scoring function
DROP FUNCTION IF EXISTS calculate_match_score(TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION calculate_match_score(
    lost_title TEXT,
    lost_description TEXT,
    lost_category TEXT,
    lost_location TEXT,
    lost_date TIMESTAMPTZ,
    found_title TEXT,
    found_description TEXT,
    found_category TEXT,
    found_location TEXT,
    found_date TIMESTAMPTZ
) RETURNS NUMERIC AS $$
DECLARE
    score NUMERIC := 0;
    title_score NUMERIC := 0;
    desc_score NUMERIC := 0;
    has_keyword_overlap BOOLEAN := FALSE;
    date_diff_days INTEGER;
    lost_words TEXT[];
    found_words TEXT[];
    word TEXT;
    common_word_count INTEGER := 0;
    -- Stopwords to skip
    stopwords TEXT[] := ARRAY['a','an','the','my','i','in','on','at','to','of','and','or','is','it','for','was','with','this','that','from','near','lost','found','someone','please','help','return'];
BEGIN
    -- =====================
    -- 1. CATEGORY MATCH (20 points)
    -- Required but not sufficient alone
    -- =====================
    IF LOWER(TRIM(lost_category)) = LOWER(TRIM(found_category)) THEN
        score := score + 20;
    ELSE
        -- Different categories = not a match
        RETURN 0;
    END IF;
    
    -- =====================
    -- 2. TITLE KEYWORD MATCHING (40 points)
    -- Most important - requires actual keyword overlap
    -- =====================
    lost_words := string_to_array(LOWER(TRIM(lost_title)), ' ');
    found_words := string_to_array(LOWER(TRIM(found_title)), ' ');
    
    -- Count common meaningful words (length > 2, not a stopword)
    FOREACH word IN ARRAY lost_words
    LOOP
        IF LENGTH(word) > 2 
           AND NOT (word = ANY(stopwords))
           AND word = ANY(found_words) THEN
            common_word_count := common_word_count + 1;
            has_keyword_overlap := TRUE;
        END IF;
    END LOOP;
    
    -- Score based on common words
    IF common_word_count >= 2 THEN
        title_score := 40;  -- Multiple common words = very strong
    ELSIF common_word_count = 1 THEN
        title_score := 30;  -- One common word = strong
    END IF;
    
    -- Check substring containment (e.g. "charger" in "mobile charger")
    IF title_score < 40 THEN
        IF LOWER(lost_title) ILIKE '%' || LOWER(found_title) || '%' 
           OR LOWER(found_title) ILIKE '%' || LOWER(lost_title) || '%' THEN
            title_score := GREATEST(title_score, 35);
            has_keyword_overlap := TRUE;
        ELSIF similarity(LOWER(lost_title), LOWER(found_title)) > 0.4 THEN
            title_score := GREATEST(title_score, ROUND(similarity(LOWER(lost_title), LOWER(found_title)) * 30, 2));
            IF similarity(LOWER(lost_title), LOWER(found_title)) > 0.5 THEN
                has_keyword_overlap := TRUE;
            END IF;
        END IF;
    END IF;
    
    score := score + title_score;
    
    -- =====================
    -- 3. DESCRIPTION SIMILARITY (20 points)
    -- =====================
    IF lost_description IS NOT NULL AND found_description IS NOT NULL 
       AND TRIM(lost_description) != '' AND TRIM(found_description) != '' THEN
        DECLARE
            lost_desc_words TEXT[];
            found_desc_words TEXT[];
            desc_word TEXT;
            desc_common_count INTEGER := 0;
        BEGIN
            lost_desc_words := string_to_array(LOWER(TRIM(lost_description)), ' ');
            found_desc_words := string_to_array(LOWER(TRIM(found_description)), ' ');
            
            FOREACH desc_word IN ARRAY lost_desc_words
            LOOP
                IF LENGTH(desc_word) > 3 
                   AND NOT (desc_word = ANY(stopwords))
                   AND desc_word = ANY(found_desc_words) THEN
                    desc_common_count := desc_common_count + 1;
                END IF;
            END LOOP;
            
            IF desc_common_count >= 2 THEN
                desc_score := 20;
                has_keyword_overlap := TRUE;
            ELSIF desc_common_count = 1 THEN
                desc_score := 10;
                has_keyword_overlap := TRUE;
            ELSIF similarity(LOWER(lost_description), LOWER(found_description)) > 0.3 THEN
                desc_score := ROUND(similarity(LOWER(lost_description), LOWER(found_description)) * 15, 2);
            END IF;
        END;
    END IF;
    
    score := score + desc_score;
    
    -- =====================
    -- 4. LOCATION MATCH (10 points)
    -- =====================
    IF lost_location IS NOT NULL AND found_location IS NOT NULL 
       AND TRIM(lost_location) != '' AND TRIM(found_location) != '' THEN
        IF LOWER(lost_location) ILIKE '%' || LOWER(found_location) || '%' 
           OR LOWER(found_location) ILIKE '%' || LOWER(lost_location) || '%' THEN
            score := score + 10;
        ELSIF similarity(LOWER(lost_location), LOWER(found_location)) > 0.3 THEN
            score := score + ROUND(similarity(LOWER(lost_location), LOWER(found_location)) * 10, 2);
        END IF;
    END IF;
    
    -- =====================
    -- 5. DATE PROXIMITY (10 points - within 14 days)
    -- =====================
    IF lost_date IS NOT NULL AND found_date IS NOT NULL THEN
        date_diff_days := ABS(EXTRACT(DAY FROM (lost_date - found_date)));
        IF date_diff_days <= 14 THEN
            score := score + ROUND(10 * (1 - (date_diff_days::NUMERIC / 14)), 2);
        END IF;
    END IF;
    
    -- =====================
    -- CRITICAL RULE: No keyword overlap = no real match
    -- Cap score at 30 (below threshold) if titles/descriptions
    -- share no meaningful words. This prevents "id card" matching
    -- "mobile charger" just because both are "Electronics".
    -- =====================
    IF NOT has_keyword_overlap THEN
        score := LEAST(score, 30);
    END IF;
    
    RETURN ROUND(LEAST(score, 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Step 2: Update the find_matches threshold to 55
DROP FUNCTION IF EXISTS find_matches_for_report(UUID);

CREATE OR REPLACE FUNCTION find_matches_for_report(report_id UUID)
RETURNS TABLE (
    match_id UUID,
    matched_report_id UUID,
    score NUMERIC
) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    report_record RECORD;
    opposite_type TEXT;
BEGIN
    SELECT * INTO report_record FROM public.reports WHERE id = report_id;
    IF NOT FOUND THEN RETURN; END IF;
    
    IF report_record.type = 'lost' THEN
        opposite_type := 'found';
    ELSE
        opposite_type := 'lost';
    END IF;
    
    RETURN QUERY
    SELECT 
        gen_random_uuid() as match_id,
        r.id as matched_report_id,
        calculate_match_score(
            CASE WHEN report_record.type = 'lost' THEN report_record.title ELSE r.title END,
            CASE WHEN report_record.type = 'lost' THEN report_record.description ELSE r.description END,
            CASE WHEN report_record.type = 'lost' THEN report_record.category ELSE r.category END,
            CASE WHEN report_record.type = 'lost' THEN report_record.location ELSE r.location END,
            CASE WHEN report_record.type = 'lost' THEN report_record.created_at ELSE r.created_at END,
            CASE WHEN report_record.type = 'found' THEN report_record.title ELSE r.title END,
            CASE WHEN report_record.type = 'found' THEN report_record.description ELSE r.description END,
            CASE WHEN report_record.type = 'found' THEN report_record.category ELSE r.category END,
            CASE WHEN report_record.type = 'found' THEN report_record.location ELSE r.location END,
            CASE WHEN report_record.type = 'found' THEN report_record.created_at ELSE r.created_at END
        ) as score
    FROM public.reports r
    WHERE r.type = opposite_type
        AND r.status = 'active'
        AND r.id != report_id
        AND calculate_match_score(
            CASE WHEN report_record.type = 'lost' THEN report_record.title ELSE r.title END,
            CASE WHEN report_record.type = 'lost' THEN report_record.description ELSE r.description END,
            CASE WHEN report_record.type = 'lost' THEN report_record.category ELSE r.category END,
            CASE WHEN report_record.type = 'lost' THEN report_record.location ELSE r.location END,
            CASE WHEN report_record.type = 'lost' THEN report_record.created_at ELSE r.created_at END,
            CASE WHEN report_record.type = 'found' THEN report_record.title ELSE r.title END,
            CASE WHEN report_record.type = 'found' THEN report_record.description ELSE r.description END,
            CASE WHEN report_record.type = 'found' THEN report_record.category ELSE r.category END,
            CASE WHEN report_record.type = 'found' THEN report_record.location ELSE r.location END,
            CASE WHEN report_record.type = 'found' THEN report_record.created_at ELSE r.created_at END
        ) >= 55  -- Requires category + keyword overlap to match
    ORDER BY score DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Recreate auto-match trigger
DROP FUNCTION IF EXISTS auto_match_reports() CASCADE;

CREATE OR REPLACE FUNCTION auto_match_reports()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    match_record RECORD;
    best_match_id UUID;
    best_match_score NUMERIC := 0;
BEGIN
    FOR match_record IN 
        SELECT * FROM find_matches_for_report(NEW.id)
    LOOP
        IF NEW.type = 'lost' THEN
            INSERT INTO public.matches (lost_report_id, found_report_id, match_score, status)
            VALUES (NEW.id, match_record.matched_report_id, match_record.score, 'pending')
            ON CONFLICT (lost_report_id, found_report_id) DO UPDATE 
            SET match_score = EXCLUDED.match_score, updated_at = NOW();
        ELSE
            INSERT INTO public.matches (lost_report_id, found_report_id, match_score, status)
            VALUES (match_record.matched_report_id, NEW.id, match_record.score, 'pending')
            ON CONFLICT (lost_report_id, found_report_id) DO UPDATE 
            SET match_score = EXCLUDED.match_score, updated_at = NOW();
        END IF;
        
        IF match_record.score > best_match_score THEN
            best_match_score := match_record.score;
            best_match_id := match_record.matched_report_id;
        END IF;
    END LOOP;
    
    IF best_match_id IS NOT NULL THEN
        UPDATE public.reports 
        SET matched_with = best_match_id, match_score = best_match_score
        WHERE id = NEW.id;
        
        UPDATE public.reports 
        SET matched_with = NEW.id, match_score = best_match_score
        WHERE id = best_match_id 
            AND (match_score IS NULL OR match_score < best_match_score);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate trigger
DROP TRIGGER IF EXISTS trigger_auto_match_reports ON public.reports;
CREATE TRIGGER trigger_auto_match_reports
    AFTER INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION auto_match_reports();

-- Step 5: Clear all bad matches and re-run with new logic
DELETE FROM public.matches;
UPDATE public.reports SET matched_with = NULL, match_score = 0;

-- Step 6: Re-create matches for existing reports
DO $$
DECLARE
    r RECORD;
    match_record RECORD;
    report_record RECORD;
    best_match_id UUID;
    best_match_score NUMERIC;
BEGIN
    FOR r IN SELECT id FROM public.reports WHERE status = 'active' ORDER BY created_at
    LOOP
        SELECT * INTO report_record FROM public.reports WHERE id = r.id;
        best_match_id := NULL;
        best_match_score := 0;
        
        FOR match_record IN SELECT * FROM find_matches_for_report(r.id)
        LOOP
            IF report_record.type = 'lost' THEN
                INSERT INTO public.matches (lost_report_id, found_report_id, match_score, status)
                VALUES (r.id, match_record.matched_report_id, match_record.score, 'pending')
                ON CONFLICT (lost_report_id, found_report_id) DO UPDATE 
                SET match_score = GREATEST(public.matches.match_score, EXCLUDED.match_score), updated_at = NOW();
            ELSE
                INSERT INTO public.matches (lost_report_id, found_report_id, match_score, status)
                VALUES (match_record.matched_report_id, r.id, match_record.score, 'pending')
                ON CONFLICT (lost_report_id, found_report_id) DO UPDATE 
                SET match_score = GREATEST(public.matches.match_score, EXCLUDED.match_score), updated_at = NOW();
            END IF;
            
            IF match_record.score > best_match_score THEN
                best_match_score := match_record.score;
                best_match_id := match_record.matched_report_id;
            END IF;
        END LOOP;
        
        IF best_match_id IS NOT NULL THEN
            UPDATE public.reports 
            SET matched_with = best_match_id, match_score = best_match_score
            WHERE id = r.id
                AND (match_score IS NULL OR match_score < best_match_score);
        END IF;
    END LOOP;
END $$;

-- Step 7: Show results
SELECT 'Matches after re-run:' as info, COUNT(*) as total FROM public.matches;
SELECT m.match_score, lr.title as lost_title, fr.title as found_title, lr.category
FROM public.matches m
JOIN public.reports lr ON lr.id = m.lost_report_id
JOIN public.reports fr ON fr.id = m.found_report_id
ORDER BY m.match_score DESC;

-- ✅ Done! False matches like "id card" ↔ "mobile charger" are now eliminated.
-- Only items with matching keywords (e.g. "lost charger" ↔ "found charger") will match.
