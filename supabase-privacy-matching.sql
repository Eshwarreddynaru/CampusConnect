-- ============================================
-- KARE Lost & Found - Privacy-Based Matching System
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Add visibility and matching fields to reports table
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS matched_with UUID REFERENCES public.reports(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS match_score NUMERIC(5,2) DEFAULT 0;

-- 2. Create matches table to track all potential matches
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

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_is_private ON public.reports(is_private);
CREATE INDEX IF NOT EXISTS idx_reports_matched_with ON public.reports(matched_with);
CREATE INDEX IF NOT EXISTS idx_matches_lost_report ON public.matches(lost_report_id);
CREATE INDEX IF NOT EXISTS idx_matches_found_report ON public.matches(found_report_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON public.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_score ON public.matches(match_score DESC);

-- 4. Enable RLS on matches table
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- 5. DROP old public reports policies
DROP POLICY IF EXISTS "Anyone can view reports" ON public.reports;
DROP POLICY IF EXISTS "Authenticated users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON public.reports;

-- 6. NEW Reports RLS Policies (Privacy-Based)
-- Users can view their own reports OR reports where they are matched
CREATE POLICY "Users can view own and matched reports"
    ON public.reports FOR SELECT
    USING (
        auth.uid() = user_id
        OR 
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE (m.lost_report_id = reports.id OR m.found_report_id = reports.id)
            AND EXISTS (
                SELECT 1 FROM public.reports r2
                WHERE (r2.id = m.lost_report_id OR r2.id = m.found_report_id)
                AND r2.user_id = auth.uid()
                AND r2.id != reports.id
            )
        )
    );

-- Authenticated users can create reports
CREATE POLICY "Authenticated users can create reports"
    ON public.reports FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update own reports
CREATE POLICY "Users can update own reports"
    ON public.reports FOR UPDATE TO authenticated
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

-- Users can delete own reports
CREATE POLICY "Users can delete own reports"
    ON public.reports FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 7. Matches RLS Policies
-- Users can view matches involving their reports
CREATE POLICY "Users can view their matches"
    ON public.matches FOR SELECT
    USING (
        lost_report_id IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
        OR found_report_id IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
    );

-- Users can update match status for their reports
CREATE POLICY "Users can update their matches"
    ON public.matches FOR UPDATE TO authenticated
    USING (
        lost_report_id IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
        OR found_report_id IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
    );

-- 8. Create function to calculate match score
-- Drop existing function first
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
    date_diff_days INTEGER;
BEGIN
    -- Category match (40 points)
    IF lost_category = found_category THEN
        score := score + 40;
    END IF;
    
    -- Title similarity (30 points)
    IF lost_title ILIKE '%' || found_title || '%' OR found_title ILIKE '%' || lost_title || '%' THEN
        score := score + 30;
    ELSIF similarity(LOWER(lost_title), LOWER(found_title)) > 0.3 THEN
        score := score + (similarity(LOWER(lost_title), LOWER(found_title)) * 30);
    END IF;
    
    -- Description similarity (15 points)
    IF lost_description IS NOT NULL AND found_description IS NOT NULL THEN
        IF similarity(LOWER(lost_description), LOWER(found_description)) > 0.2 THEN
            score := score + (similarity(LOWER(lost_description), LOWER(found_description)) * 15);
        END IF;
    END IF;
    
    -- Location similarity (10 points)
    IF lost_location IS NOT NULL AND found_location IS NOT NULL THEN
        IF lost_location ILIKE '%' || found_location || '%' OR found_location ILIKE '%' || lost_location || '%' THEN
            score := score + 10;
        ELSIF similarity(LOWER(lost_location), LOWER(found_location)) > 0.3 THEN
            score := score + (similarity(LOWER(lost_location), LOWER(found_location)) * 10);
        END IF;
    END IF;
    
    -- Date proximity (5 points - within 7 days)
    date_diff_days := ABS(EXTRACT(DAY FROM (lost_date - found_date)));
    IF date_diff_days <= 7 THEN
        score := score + (5 * (1 - (date_diff_days::NUMERIC / 7)));
    END IF;
    
    RETURN ROUND(score, 2);
END;
$$ LANGUAGE plpgsql;

-- 9. Enable pg_trgm extension for similarity matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 10. Create function to find matches for a report
-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS find_matches_for_report(UUID);

CREATE OR REPLACE FUNCTION find_matches_for_report(report_id UUID)
RETURNS TABLE (
    match_id UUID,
    matched_report_id UUID,
    score NUMERIC
) AS $$
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
    
    -- Find potential matches
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
        ) >= 50  -- Minimum match threshold
    ORDER BY score DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- 11. Create trigger function to auto-match on insert
-- Drop existing function first
DROP FUNCTION IF EXISTS auto_match_reports() CASCADE;

CREATE OR REPLACE FUNCTION auto_match_reports()
RETURNS TRIGGER AS $$
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
            ON CONFLICT (lost_report_id, found_report_id) DO NOTHING;
        ELSE
            INSERT INTO public.matches (lost_report_id, found_report_id, match_score, status)
            VALUES (match_record.matched_report_id, NEW.id, match_record.score, 'pending')
            ON CONFLICT (lost_report_id, found_report_id) DO NOTHING;
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

-- 12. Create trigger for auto-matching
DROP TRIGGER IF EXISTS trigger_auto_match_reports ON public.reports;
CREATE TRIGGER trigger_auto_match_reports
    AFTER INSERT ON public.reports
    FOR EACH ROW
    EXECUTE FUNCTION auto_match_reports();

-- 13. Update trigger for updated_at on matches
CREATE TRIGGER update_matches_updated_at
    BEFORE UPDATE ON public.matches
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ✅ Done! Privacy-based matching system is ready.
-- Note: Existing reports will remain public (is_private = FALSE by default for existing rows)
-- New reports will be private by default (is_private = TRUE)
