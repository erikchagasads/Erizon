ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE DEFAULT NULL;

-- Generates a random API key for existing users that don't have one
-- (manual step: users generate their key in Settings UI)
CREATE INDEX IF NOT EXISTS idx_user_settings_api_key ON user_settings(api_key) WHERE api_key IS NOT NULL;
