-- ============================================
-- Migration 013: Enrollment IAP support (App Store / Play Store via RevenueCat)
-- ============================================
-- Extends the enrollments table (see 011_enrollments.sql) so the $25 one-time
-- inscription can also be paid from the Padres 3.0 mobile app via IAP.
-- The RevenueCat webhook inserts rows here when product_id is 'enrollment_one_time'.

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS purchase_platform TEXT DEFAULT 'web'
    CHECK (purchase_platform IN ('web', 'app_store', 'play_store')),
  ADD COLUMN IF NOT EXISTS revenuecat_product_id TEXT,
  ADD COLUMN IF NOT EXISTS revenuecat_transaction_id TEXT;

-- Unique constraint on RevenueCat transaction id (only when set) to dedupe
-- webhook retries from RevenueCat. NULL values are allowed for web (Stripe) rows.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_enrollments_rc_tx
  ON enrollments(revenuecat_transaction_id)
  WHERE revenuecat_transaction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_enrollments_platform ON enrollments(purchase_platform);
