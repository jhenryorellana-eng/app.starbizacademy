-- ============================================
-- Migration 011: Enrollment system ($25 one-time payment)
-- ============================================

-- Table: enrollments
-- Tracks one-time enrollment payments ($25) that grant access to Starbooks PWA.
-- This is a prerequisite for the monthly membership ($17/month) when it becomes available.
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  status TEXT CHECK (status IN ('pending', 'active', 'refunded')) DEFAULT 'pending' NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 25.00,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_enrollments_profile_id ON enrollments(profile_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_stripe_session ON enrollments(stripe_checkout_session_id);

-- RLS
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own enrollment"
  ON enrollments FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Service role can insert enrollments"
  ON enrollments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update enrollments"
  ON enrollments FOR UPDATE
  USING (true);
