-- ============================================
-- KARE Lost & Found - Claims & Messages Tables
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Create the claims table
-- Tracks when someone says "I Found This" on a lost item
CREATE TABLE IF NOT EXISTS public.claims (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
    claimer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    claimer_register_number TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Prevent duplicate claims by the same user on the same report
    UNIQUE(report_id, claimer_id)
);

-- 2. Create the messages table
-- Private chat between report owner and claimer
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    claim_id UUID NOT NULL REFERENCES public.claims(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_claims_report_id ON public.claims(report_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimer_id ON public.claims(claimer_id);
CREATE INDEX IF NOT EXISTS idx_claims_status ON public.claims(status);
CREATE INDEX IF NOT EXISTS idx_messages_claim_id ON public.messages(claim_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- 4. Enable RLS
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 5. Claims RLS Policies

-- View claims: report owner can see all claims on their reports, claimer can see their own claims
CREATE POLICY "Users can view claims on their reports or their own claims"
    ON public.claims
    FOR SELECT
    USING (
        claimer_id = auth.uid() 
        OR report_id IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
    );

-- Create claim: any authenticated user can claim (except on their own report)
CREATE POLICY "Authenticated users can create claims"
    ON public.claims
    FOR INSERT
    TO authenticated
    WITH CHECK (
        claimer_id = auth.uid()
        AND report_id NOT IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
    );

-- Update claim: report owner can accept/reject, claimer can update their message
CREATE POLICY "Involved users can update claims"
    ON public.claims
    FOR UPDATE
    TO authenticated
    USING (
        claimer_id = auth.uid()
        OR report_id IN (SELECT id FROM public.reports WHERE user_id = auth.uid())
    );

-- 6. Messages RLS Policies

-- View messages: only the two parties involved in the claim
CREATE POLICY "Involved users can view messages"
    ON public.messages
    FOR SELECT
    USING (
        claim_id IN (
            SELECT c.id FROM public.claims c
            JOIN public.reports r ON r.id = c.report_id
            WHERE c.claimer_id = auth.uid() OR r.user_id = auth.uid()
        )
    );

-- Send messages: only the two parties involved in the claim
CREATE POLICY "Involved users can send messages"
    ON public.messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND claim_id IN (
            SELECT c.id FROM public.claims c
            JOIN public.reports r ON r.id = c.report_id
            WHERE c.claimer_id = auth.uid() OR r.user_id = auth.uid()
        )
    );

-- Update messages (for marking as read)
CREATE POLICY "Recipients can mark messages as read"
    ON public.messages
    FOR UPDATE
    TO authenticated
    USING (
        sender_id != auth.uid()
        AND claim_id IN (
            SELECT c.id FROM public.claims c
            JOIN public.reports r ON r.id = c.report_id
            WHERE c.claimer_id = auth.uid() OR r.user_id = auth.uid()
        )
    );

-- 7. Updated_at trigger for claims
CREATE TRIGGER update_claims_updated_at
    BEFORE UPDATE ON public.claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Done! Claims and messages tables are ready.
