-- Account deletion audit log (for compliance)
-- No foreign keys since referenced rows will be deleted
CREATE TABLE IF NOT EXISTS account_deletions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    family_id UUID,
    deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS: no public reads, inserts only via service role (admin client)
ALTER TABLE account_deletions ENABLE ROW LEVEL SECURITY;
