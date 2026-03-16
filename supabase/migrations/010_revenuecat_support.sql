-- Migration: Add RevenueCat/IAP support to memberships
-- This enables in-app purchases via RevenueCat alongside existing Stripe web purchases

-- Add RevenueCat subscription ID to track IAP subscriptions
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS revenuecat_id TEXT;

-- Add purchase platform to distinguish where the subscription was bought
ALTER TABLE memberships ADD COLUMN IF NOT EXISTS purchase_platform TEXT DEFAULT 'web'
  CHECK (purchase_platform IN ('web', 'app_store', 'play_store'));

-- Index for RevenueCat ID lookups (webhook processing)
CREATE INDEX IF NOT EXISTS idx_memberships_revenuecat_id
  ON memberships(revenuecat_id) WHERE revenuecat_id IS NOT NULL;

-- Make Stripe price IDs nullable on plans table
-- IAP plans are managed through App Store Connect / Google Play Console,
-- so they won't have Stripe price IDs
ALTER TABLE plans ALTER COLUMN stripe_price_id_monthly DROP NOT NULL;
ALTER TABLE plans ALTER COLUMN stripe_price_id_yearly DROP NOT NULL;
