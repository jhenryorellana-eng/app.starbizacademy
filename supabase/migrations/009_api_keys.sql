-- API keys for mini-apps to authenticate with Edge Functions
-- Each mini-app gets its own API key with a fixed target_app_id

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of the API key
    mini_app_id TEXT NOT NULL,      -- e.g. 'stareduca-junior', 'starvoices'
    target_app_id TEXT NOT NULL CHECK (target_app_id IN ('padres_3_0', 'ceo_junior')),
    name TEXT NOT NULL,             -- Human-readable description
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_mini_app_id ON api_keys(mini_app_id);
