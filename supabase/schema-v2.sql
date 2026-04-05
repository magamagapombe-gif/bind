-- ============================================================
--  BINDER v2 — Run this AFTER schema.sql
-- ============================================================

-- Allow superlike as a swipe direction
ALTER TABLE swipes DROP CONSTRAINT IF EXISTS swipes_direction_check;
ALTER TABLE swipes ADD CONSTRAINT swipes_direction_check
  CHECK (direction IN ('like', 'dislike', 'superlike'));

-- Add last_active + verified + boost to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active  TIMESTAMPTZ DEFAULT now();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS verified     BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS boost_until  TIMESTAMPTZ;

-- ── BLOCKS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocks (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  blocker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks_all_own" ON blocks FOR ALL USING (auth.uid() = blocker_id);

-- ── REPORTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reports (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reported_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  reason      TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- ── REALTIME for typing presence ─────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
