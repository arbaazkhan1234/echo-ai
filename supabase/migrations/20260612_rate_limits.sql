-- Echo AI — API rate-limiting table
-- Run this in Supabase SQL editor (or via `supabase db push`)

CREATE TABLE IF NOT EXISTS api_rate_limits (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  api        text        NOT NULL,                    -- 'groq' | 'elevenlabs_tts'
  date       date        NOT NULL DEFAULT CURRENT_DATE,
  call_count integer     NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_rate_limit UNIQUE (user_id, api, date)
);

-- Index for the daily look-up pattern
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON api_rate_limits (user_id, api, date);

-- RLS: users can only read their own counters; edge functions use service-role key
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own limits"
  ON api_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Inserts/updates are done by the service-role key inside edge functions,
-- which bypasses RLS — no INSERT/UPDATE policy needed for end-users.
