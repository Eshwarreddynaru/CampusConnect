-- ============================================
-- KARE Lost & Found - Admin RLS Policies
-- Run this in Supabase Dashboard → SQL Editor
-- These policies allow admin users to access all data
-- ============================================

-- 1. Admin can view ALL reports (including returned ones)
CREATE POLICY "Admins can view all reports"
    ON public.reports FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 2. Admin can update any report
CREATE POLICY "Admins can update any report"
    ON public.reports FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 3. Admin can view ALL claims
CREATE POLICY "Admins can view all claims"
    ON public.claims FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 4. Admin can update any claim
CREATE POLICY "Admins can update any claim"
    ON public.claims FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 5. Admin can view ALL messages
CREATE POLICY "Admins can view all messages"
    ON public.messages FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 6. Admin can view all profiles
CREATE POLICY "Admins can view all profiles v2"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- 7. Admin can update any profile (ban/suspend users)
CREATE POLICY "Admins can update any profile v2"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ✅ Done! Admin can now access all data for oversight.
