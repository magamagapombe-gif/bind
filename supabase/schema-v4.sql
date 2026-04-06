-- ============================================================
--  BINDER v4 — Calling support
--  Run AFTER schema.sql, schema-v2.sql, schema-v3.sql
-- ============================================================

-- calls table: tracks call history
CREATE TABLE IF NOT EXISTS calls (
  id          UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  match_id    UUID        REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  caller_id   UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  callee_id   UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  call_type   TEXT        CHECK (call_type IN ('audio', 'video')) NOT NULL DEFAULT 'audio',
  status      TEXT        CHECK (status IN ('ringing','accepted','declined','missed','ended')) NOT NULL DEFAULT 'ringing',
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "calls_member" ON calls FOR ALL
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

-- Realtime for calls
ALTER PUBLICATION supabase_realtime ADD TABLE calls;
