-- ============================================
-- KARE Lost & Found - COMPLETE Database Setup
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Create the reports table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    report_code TEXT UNIQUE NOT NULL,
    register_number TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    location TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'returned_qr', 'returned_direct')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create the claims table
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    claimer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    claimer_register_number TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(report_id, claimer_id)
);

-- 3. Create the messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_category ON public.reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_report_code ON public.reports(report_code);
CREATE INDEX IF NOT EXISTS idx_claims_report_id ON public.claims(report_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimer_id ON public.claims(claimer_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_messages_claim_id ON public.messages(claim_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- 5. Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 6. Reports RLS Policies
CREATE POLICY "Anyone can view reports"
    ON public.reports FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create reports"
    ON public.reports FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reports"
    ON public.reports FOR UPDATE TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports"
    ON public.reports FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 7. Claims RLS Policies
CREATE POLICY "Users can view claims on their reports or their own claims"
    ON public.claims FOR SELECT
    USING (
        claimer_id = auth.uid()
        OR report_id IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
    );
CREATE POLICY "Authenticated users can create claims"
    ON public.claims FOR INSERT TO authenticated
    WITH CHECK (
        claimer_id = auth.uid()
        AND report_id NOT IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
    );
CREATE POLICY "Involved users can update claims"
    ON public.claims FOR UPDATE TO authenticated
    USING (
        claimer_id = auth.uid()
        OR report_id IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
    );

-- 8. Messages RLS Policies
CREATE POLICY "Involved users can view messages"
    ON public.messages FOR SELECT
    USING (
        claim_id IN (
            SELECT c.id FROM public.claims c
            JOIN public.reports r ON r.id = c.report_id
            WHERE c.claimer_id = auth.uid() OR r.user_id = auth.uid()
        )
    );
CREATE POLICY "Involved users can send messages"
    ON public.messages FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND claim_id IN (
            SELECT c.id FROM public.claims c
            JOIN public.reports r ON r.id = c.report_id
            WHERE c.claimer_id = auth.uid() OR r.user_id = auth.uid()
        )
    );
CREATE POLICY "Recipients can mark messages as read"
    ON public.messages FOR UPDATE TO authenticated
    USING (
        sender_id != auth.uid()
        AND claim_id IN (
            SELECT c.id FROM public.claims c
            JOIN public.reports r ON r.id = c.report_id
            WHERE c.claimer_id = auth.uid() OR r.user_id = auth.uid()
        )
    );

-- 9. Updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_reports_updated_at') THEN
        CREATE TRIGGER update_reports_updated_at
            BEFORE UPDATE ON public.reports
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_claims_updated_at') THEN
        CREATE TRIGGER update_claims_updated_at
            BEFORE UPDATE ON public.claims
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 10. Enable Realtime for messages (for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ✅ Done! All tables are ready.
