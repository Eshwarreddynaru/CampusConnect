-- KARE Lost & Found - Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- PROFILES TABLE
-- Extends Supabase auth.users with app-specific data
-- ========================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  register_number TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'warned', 'suspended', 'banned')),
  qr_code TEXT,
  warning_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- REPORTS TABLE
-- Lost and Found item reports
-- ========================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_code TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('lost', 'found')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  location_description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'returned_qr', 'returned_direct')),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- CLAIMS TABLE
-- Item claim requests
-- ========================================
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  claimer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'verified')),
  verification_method TEXT CHECK (verification_method IN ('qr', 'direct', NULL)),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- MESSAGES TABLE
-- Community chat messages
-- ========================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- ABUSE REPORTS TABLE
-- For reporting inappropriate content/users
-- ========================================
CREATE TABLE IF NOT EXISTS abuse_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('report', 'message', 'user')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- QR VERIFICATION LOGS
-- Audit trail for QR code verifications
-- ========================================
CREATE TABLE IF NOT EXISTS verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  verifier_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verification_type TEXT NOT NULL CHECK (verification_type IN ('qr', 'direct')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- SEQUENCES FOR REPORT CODES
-- ========================================
CREATE SEQUENCE IF NOT EXISTS report_lost_seq START 1;
CREATE SEQUENCE IF NOT EXISTS report_found_seq START 1;

-- ========================================
-- INDEXES
-- ========================================
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_category ON reports(category);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_report ON claims(report_id);
CREATE INDEX IF NOT EXISTS idx_claims_claimer ON claims(claimer_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_abuse_reports_status ON abuse_reports(status);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE abuse_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Reports policies
CREATE POLICY "Anyone can view active reports" ON reports
  FOR SELECT USING (status != 'returned_qr' AND status != 'returned_direct');

CREATE POLICY "Users can create reports" ON reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports" ON reports
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all reports" ON reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Claims policies
CREATE POLICY "Users can view claims on own reports" ON claims
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = claims.report_id AND reports.user_id = auth.uid())
    OR claimer_id = auth.uid()
  );

CREATE POLICY "Users can create claims" ON claims
  FOR INSERT WITH CHECK (auth.uid() = claimer_id);

CREATE POLICY "Report owners can update claims" ON claims
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = claims.report_id AND reports.user_id = auth.uid())
  );

-- Messages policies
CREATE POLICY "Anyone can view messages" ON messages
  FOR SELECT USING (is_deleted = FALSE);

CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage messages" ON messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Abuse reports policies
CREATE POLICY "Users can create abuse reports" ON abuse_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own abuse reports" ON abuse_reports
  FOR SELECT USING (reporter_id = auth.uid());

CREATE POLICY "Admins can manage abuse reports" ON abuse_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Verification logs policies
CREATE POLICY "Users can view verification logs for own reports" ON verification_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM reports WHERE reports.id = verification_logs.report_id AND reports.user_id = auth.uid())
    OR verified_user_id = auth.uid()
    OR verifier_id = auth.uid()
  );

CREATE POLICY "Admins can view all verification logs" ON verification_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ========================================
-- FUNCTIONS
-- ========================================

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, register_number, qr_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'register_number', 'REG' || EXTRACT(EPOCH FROM NOW())::TEXT),
    encode(gen_random_bytes(32), 'hex')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_claims_updated_at
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_abuse_reports_updated_at
  BEFORE UPDATE ON abuse_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
