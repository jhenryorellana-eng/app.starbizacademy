-- Push tokens table for Expo push notifications
-- Stores device push tokens to send remote notifications

CREATE TABLE IF NOT EXISTS push_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL,           -- Expo push token (ExponentPushToken[xxx])
    device_id TEXT NOT NULL,       -- Unique device identifier
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    app_id TEXT NOT NULL CHECK (app_id IN ('padres_3_0', 'ceo_junior')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, device_id)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_profile_id ON push_tokens(profile_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);
CREATE INDEX IF NOT EXISTS idx_push_tokens_app_id ON push_tokens(app_id);

-- RLS
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their push tokens"
    ON push_tokens FOR SELECT
    USING (profile_id = auth.uid());

CREATE POLICY "Users can insert their push tokens"
    ON push_tokens FOR INSERT
    WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can update their push tokens"
    ON push_tokens FOR UPDATE
    USING (profile_id = auth.uid());

CREATE POLICY "Users can delete their push tokens"
    ON push_tokens FOR DELETE
    USING (profile_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_push_tokens_updated_at
    BEFORE UPDATE ON push_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
