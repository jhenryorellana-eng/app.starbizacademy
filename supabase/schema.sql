-- Starbiz Academy Hub Central - Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Families table
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Plans table
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- 'Familiar Básico', 'Familiar Plus', 'Familiar Premium'
    max_children INTEGER NOT NULL, -- 1, 2, 3
    price_monthly DECIMAL(10, 2) NOT NULL,
    price_yearly DECIMAL(10, 2) NOT NULL,
    stripe_price_id_monthly TEXT NOT NULL,
    stripe_price_id_yearly TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    whatsapp_number TEXT,
    country TEXT,
    city TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'child')),
    family_id UUID REFERENCES families(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memberships table
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'canceled', 'expired')),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
    stripe_subscription_id TEXT,
    stripe_customer_id TEXT,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family codes table
CREATE TABLE IF NOT EXISTS family_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL, -- 'P-12345678' or 'E-87654321'
    code_type TEXT NOT NULL CHECK (code_type IN ('parent', 'child')),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Children table (pre-registration info)
CREATE TABLE IF NOT EXISTS children (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    family_code_id UUID REFERENCES family_codes(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'subscription_canceled', 'payment_reminder', etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Login sessions table (for tracking user login activity)
CREATE TABLE IF NOT EXISTS login_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    browser_name TEXT,
    browser_version TEXT,
    os_name TEXT,
    os_version TEXT,
    device_type TEXT, -- 'desktop', 'mobile', 'tablet'
    city TEXT,
    country TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending downgrades table (for tracking scheduled subscription downgrades)
CREATE TABLE IF NOT EXISTS pending_downgrades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    new_children_count INTEGER NOT NULL,
    children_to_keep UUID[] NOT NULL, -- Array of children IDs to keep
    scheduled_for TIMESTAMPTZ NOT NULL, -- Date when downgrade will apply
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pending billing changes table (for tracking scheduled billing cycle changes)
CREATE TABLE IF NOT EXISTS pending_billing_changes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    membership_id UUID NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
    new_billing_cycle TEXT NOT NULL CHECK (new_billing_cycle IN ('monthly', 'yearly')),
    new_children_count INTEGER NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL, -- Date when billing cycle change will apply
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_memberships_family_id ON memberships(family_id);
CREATE INDEX IF NOT EXISTS idx_memberships_stripe_subscription_id ON memberships(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_family_codes_code ON family_codes(code);
CREATE INDEX IF NOT EXISTS idx_family_codes_family_id ON family_codes(family_id);
CREATE INDEX IF NOT EXISTS idx_children_family_id ON children(family_id);
CREATE INDEX IF NOT EXISTS idx_notifications_profile_id ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_login_sessions_profile_id ON login_sessions(profile_id);
CREATE INDEX IF NOT EXISTS idx_login_sessions_created_at ON login_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pending_downgrades_membership_id ON pending_downgrades(membership_id);
CREATE INDEX IF NOT EXISTS idx_pending_downgrades_status ON pending_downgrades(status);
CREATE INDEX IF NOT EXISTS idx_pending_billing_changes_membership_id ON pending_billing_changes(membership_id);
CREATE INDEX IF NOT EXISTS idx_pending_billing_changes_status ON pending_billing_changes(status);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for memberships updated_at
CREATE TRIGGER update_memberships_updated_at
    BEFORE UPDATE ON memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_downgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_billing_changes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Families policies
CREATE POLICY "Users can view their family"
    ON families FOR SELECT
    USING (
        id IN (
            SELECT family_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Plans policies (public read)
CREATE POLICY "Anyone can view plans"
    ON plans FOR SELECT
    TO authenticated
    USING (true);

-- Memberships policies
CREATE POLICY "Users can view their family membership"
    ON memberships FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Family codes policies
CREATE POLICY "Users can view their family codes"
    ON family_codes FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Children policies
CREATE POLICY "Parents can view their family children"
    ON children FOR SELECT
    USING (
        family_id IN (
            SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'
        )
    );

CREATE POLICY "Parents can create children in their family"
    ON children FOR INSERT
    WITH CHECK (
        family_id IN (
            SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'
        )
    );

CREATE POLICY "Parents can update children in their family"
    ON children FOR UPDATE
    USING (
        family_id IN (
            SELECT family_id FROM profiles WHERE id = auth.uid() AND role = 'parent'
        )
    );

-- Notifications policies
CREATE POLICY "Users can view their notifications"
    ON notifications FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "Users can update their notifications"
    ON notifications FOR UPDATE
    USING (profile_id = auth.uid());

-- Login sessions policies
CREATE POLICY "Users can view own login sessions"
    ON login_sessions FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own login sessions"
    ON login_sessions FOR INSERT
    WITH CHECK (profile_id = auth.uid());

-- Pending downgrades policies
CREATE POLICY "Users can view their family pending downgrades"
    ON pending_downgrades FOR SELECT
    USING (
        membership_id IN (
            SELECT m.id FROM memberships m
            JOIN profiles p ON p.family_id = m.family_id
            WHERE p.id = auth.uid()
        )
    );

-- Pending billing changes policies
CREATE POLICY "Users can view their family pending billing changes"
    ON pending_billing_changes FOR SELECT
    USING (
        membership_id IN (
            SELECT m.id FROM memberships m
            JOIN profiles p ON p.family_id = m.family_id
            WHERE p.id = auth.uid()
        )
    );

-- ============================================
-- SEED DATA - PLANS
-- ============================================

INSERT INTO plans (name, max_children, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly)
VALUES
    ('Familiar Básico', 1, 29.99, 299.99, 'price_basico_monthly', 'price_basico_yearly'),
    ('Familiar Plus', 2, 39.99, 399.99, 'price_plus_monthly', 'price_plus_yearly'),
    ('Familiar Premium', 3, 49.99, 499.99, 'price_premium_monthly', 'price_premium_yearly')
ON CONFLICT DO NOTHING;

-- ============================================
-- MIGRATION NOTES
-- ============================================

-- If you have existing data and need to add country/city to profiles:
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT;
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;

-- If you need to migrate from birth_year to birth_date in children:
-- 1. Add the new column:
--    ALTER TABLE children ADD COLUMN birth_date DATE;
-- 2. Migrate existing data (converts year to January 1st of that year):
--    UPDATE children SET birth_date = make_date(birth_year, 1, 1);
-- 3. Make birth_date required:
--    ALTER TABLE children ALTER COLUMN birth_date SET NOT NULL;
-- 4. Drop the old column:
--    ALTER TABLE children DROP COLUMN birth_year;
