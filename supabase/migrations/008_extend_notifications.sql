-- Extend notifications table with additional fields for mini-app support

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'system';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS mini_app_id TEXT;

CREATE INDEX IF NOT EXISTS idx_notifications_source ON notifications(source);
CREATE INDEX IF NOT EXISTS idx_notifications_mini_app_id ON notifications(mini_app_id);
