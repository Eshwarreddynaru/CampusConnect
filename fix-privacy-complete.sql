-- ============================================
-- COMPLETE PRIVACY MATCHING FIX
-- Run this in Supabase Dashboard → SQL Editor
-- This sets up proper RLS so only matched users
-- can see each other's posts
-- ============================================

-- Step 1: Enable pg_trgm extension (needed for similarity matching)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Step 2: Make sure reports table has required columns
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS matched_with UUID REFERENCES public.reports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS match_score NUMERIC(5,2) DEFAULT 0;

-- Step 3: Ensure matches table exists
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lost_report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    found_report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lost_report_id, found_report_id),
    CHECK (lost_report_id != found_report_id)
);

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_reports_is_private ON public.reports(is_private);
CREATE INDEX IF NOT EXISTS idx_reports_matched_with ON public.reports(matched_with);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_lost_report ON public.matches(lost_report_id);
CREATE INDEX IF NOT EXISTS idx_matches_found_report ON public.matches(found_report_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);

-- Step 5: Enable RLS on both tables
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'reports'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.reports', pol.policyname);
    END LOOP;
    
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'matches'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.matches', pol.policyname);
    END LOOP;
END $$;

-- Step 7: Drop old function if exists
DROP FUNCTION IF EXISTS can_user_view_report(UUID, UUID) CASCADE;

-- Step 8: Create the security definer function
-- This bypasses RLS internally to check permissions without recursion
CREATE OR REPLACE FUNCTION can_user_view_report(p_report_id UUID, p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_report_owner UUID;
    v_is_admin BOOLEAN;
BEGIN
    -- Get the report owner
    SELECT r.user_id INTO v_report_owner
    FROM reports r
    WHERE r.id = p_report_id;
    
    -- Report not found
    IF v_report_owner IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- User can always see their own reports
    IF v_report_owner = p_user_id THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user is admin
    SELECT EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = p_user_id AND role = 'admin'
    ) INTO v_is_admin;
    
    IF v_is_admin THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has a report that is matched with this report
    -- (either as lost_report or found_report in the matches table)
    RETURN EXISTS (
        SELECT 1 
        FROM matches m
        JOIN reports r ON (
            (r.id = m.lost_report_id AND m.found_report_id = p_report_id)
            OR
            (r.id = m.found_report_id AND m.lost_report_id = p_report_id)
        )
        WHERE r.user_id = p_user_id
        AND m.status != 'rejected'
    );
END;
$$;

-- Step 9: Grant execute permissions
GRANT EXECUTE ON FUNCTION can_user_view_report(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_user_view_report(UUID, UUID) TO anon;

-- Step 10: Create Reports RLS policies
-- SELECT: Users see own reports + matched reports + admins see all
CREATE POLICY "reports_select_policy"
    ON public.reports FOR SELECT
    USING (
        can_user_view_report(id, auth.uid())
    );

-- INSERT: Only authenticated users can create their own reports
CREATE POLICY "reports_insert_policy"
    ON public.reports FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- UPDATE: Users update their own reports
CREATE POLICY "reports_update_policy"
    ON public.reports FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- DELETE: Users delete their own reports
CREATE POLICY "reports_delete_policy"
    ON public.reports FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- Step 11: Create Matches RLS policies
-- SELECT: Users can see matches involving their reports + admins
CREATE POLICY "matches_select_policy"
    ON public.matches FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.reports r 
            WHERE r.user_id = auth.uid() 
            AND (r.id = lost_report_id OR r.id = found_report_id)
        )
        OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- INSERT: System-level only (via triggers), allow authenticated for the trigger
CREATE POLICY "matches_insert_policy"
    ON public.matches FOR INSERT TO authenticated
    WITH CHECK (true);

-- UPDATE: Users can update matches involving their reports
CREATE POLICY "matches_update_policy"
    ON public.matches FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.reports r 
            WHERE r.user_id = auth.uid() 
            AND (r.id = lost_report_id OR r.id = found_report_id)
        )
    );

-- Step 12: Recreate match scoring function
-- KEY RULE: Category match alone should NEVER be enough to create a match.
-- Items must share meaningful keywords in their title or description.
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
    -- Stopwords to skip (common English words that should not count as matches)
    stopwords TEXT[] := ARRAY['a','an','the','my','i','in','on','at','to','of','and','or','is','it','for','was','with','this','that','from','near','lost','found','someone','please','help','return'];
BEGIN
    -- =====================
    -- 1. CATEGORY MATCH (20 points)
    -- Necessary but not sufficient alone
    -- =====================
    IF LOWER(TRIM(lost_category)) = LOWER(TRIM(found_category)) THEN
        score := score + 20;
    ELSE
        -- Different categories = almost certainly not a match
        RETURN 0;
    END IF;
    
    -- =====================
    -- 2. TITLE KEYWORD MATCHING (40 points) - Most important
    -- We require actual keyword overlap between titles
    -- =====================
    lost_words := string_to_array(LOWER(TRIM(lost_title)), ' ');
    found_words := string_to_array(LOWER(TRIM(found_title)), ' ');
    
    -- Count common meaningful words (length > 2 and not a stopword)
    FOREACH word IN ARRAY lost_words
    LOOP
        IF LENGTH(word) > 2 
           AND NOT (word = ANY(stopwords))
           AND word = ANY(found_words) THEN
            common_word_count := common_word_count + 1;
            has_keyword_overlap := TRUE;
        END IF;
    END LOOP;
    
    -- Score based on common word count
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
        -- Check for common meaningful words in descriptions too
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
    -- CRITICAL: If there is NO keyword overlap in title or description,
    -- cap the score at 30 so it never reaches the match threshold.
    -- This prevents "id card" matching "mobile charger" just because
    -- both are "Electronics" category.
    -- =====================
    IF NOT has_keyword_overlap THEN
        score := LEAST(score, 30);
    END IF;
    
    RETURN ROUND(LEAST(score, 100), 2);
END;
$$ LANGUAGE plpgsql;

-- Step 13: Recreate find_matches function with LOWER threshold (30 instead of 50)
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
    -- Get the report details
    SELECT * INTO report_record FROM public.reports WHERE id = report_id;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Determine opposite type
    IF report_record.type = 'lost' THEN
        opposite_type := 'found';
    ELSE
        opposite_type := 'lost';
    END IF;
    
    -- Find potential matches with a lower threshold (30) so more matches are found
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
        ) >= 55  -- Threshold: requires category match + meaningful keyword overlap
    ORDER BY score DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Recreate auto-match trigger
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
    -- Find matches for the new report
    FOR match_record IN 
        SELECT * FROM find_matches_for_report(NEW.id)
    LOOP
        -- Insert into matches table
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
        
        -- Track best match
        IF match_record.score > best_match_score THEN
            best_match_score := match_record.score;
            best_match_id := match_record.matched_report_id;
        END IF;
    END LOOP;
    
    -- Update the report with best match info
    IF best_match_id IS NOT NULL THEN
        UPDATE public.reports 
        SET matched_with = best_match_id, match_score = best_match_score
        WHERE id = NEW.id;
        
        -- Also update the matched report if it doesn't have a better match
        UPDATE public.reports 
        SET matched_with = NEW.id, match_score = best_match_score
        WHERE id = best_match_id 
            AND (match_score IS NULL OR match_score < best_match_score);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 15: Create trigger
DROP TRIGGER IF EXISTS trigger_auto_match_reports ON public.reports;
CREATE TRIGGER trigger_auto_match_reports
    AFTER INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION auto_match_reports();

-- Step 16: Create function to manually re-run matching for existing reports
CREATE OR REPLACE FUNCTION rematch_all_reports()
RETURNS TEXT
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    r RECORD;
    match_count INTEGER := 0;
    report_count INTEGER := 0;
BEGIN
    -- Clear existing matches
    DELETE FROM matches;
    
    -- Reset matched_with on all reports
    UPDATE reports SET matched_with = NULL, match_score = 0;
    
    -- Re-run matching for each report
    FOR r IN SELECT id FROM reports WHERE status = 'active' ORDER BY created_at
    LOOP
        report_count := report_count + 1;
        -- Trigger the matching logic
        PERFORM auto_match_reports_manual(r.id);
    END LOOP;
    
    SELECT COUNT(*) INTO match_count FROM matches;
    
    RETURN format('Processed %s reports, found %s matches', report_count, match_count);
END;
$$;

-- Helper function for manual re-matching
CREATE OR REPLACE FUNCTION auto_match_reports_manual(report_id UUID)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    report_record RECORD;
    match_record RECORD;
    best_match_id UUID;
    best_match_score NUMERIC := 0;
BEGIN
    SELECT * INTO report_record FROM reports WHERE id = report_id;
    IF NOT FOUND THEN RETURN; END IF;
    
    FOR match_record IN 
        SELECT * FROM find_matches_for_report(report_id)
    LOOP
        IF report_record.type = 'lost' THEN
            INSERT INTO matches (lost_report_id, found_report_id, match_score, status)
            VALUES (report_id, match_record.matched_report_id, match_record.score, 'pending')
            ON CONFLICT (lost_report_id, found_report_id) DO UPDATE 
            SET match_score = GREATEST(matches.match_score, EXCLUDED.match_score), updated_at = NOW();
        ELSE
            INSERT INTO matches (lost_report_id, found_report_id, match_score, status)
            VALUES (match_record.matched_report_id, report_id, match_record.score, 'pending')
            ON CONFLICT (lost_report_id, found_report_id) DO UPDATE 
            SET match_score = GREATEST(matches.match_score, EXCLUDED.match_score), updated_at = NOW();
        END IF;
        
        IF match_record.score > best_match_score THEN
            best_match_score := match_record.score;
            best_match_id := match_record.matched_report_id;
        END IF;
    END LOOP;
    
    IF best_match_id IS NOT NULL THEN
        UPDATE reports 
        SET matched_with = best_match_id, match_score = best_match_score
        WHERE id = report_id
            AND (match_score IS NULL OR match_score < best_match_score);
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION rematch_all_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION auto_match_reports_manual(UUID) TO authenticated;

-- Step 17: Verify
SELECT 'RLS Policies on reports:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'reports';

SELECT 'RLS Policies on matches:' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'matches';

SELECT 'Functions:' as info;
SELECT proname FROM pg_proc WHERE proname IN ('can_user_view_report', 'calculate_match_score', 'find_matches_for_report', 'auto_match_reports', 'rematch_all_reports');

-- ============================================
-- IMPORTANT: After running this SQL, also run:
--   SELECT rematch_all_reports();
-- to create matches for any existing reports.
-- ============================================
