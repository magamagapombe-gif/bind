-- ============================================================
--  BINDER v3 — Run AFTER schema.sql and schema-v2.sql
-- ============================================================

-- Add new profile fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests    text[]      DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS prompts      jsonb       DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude     float;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude    float;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_distance integer     DEFAULT 50;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at   timestamptz DEFAULT now();

-- Daily swipe tracking
CREATE TABLE IF NOT EXISTS daily_swipes (
  id         UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  swipe_date DATE        DEFAULT CURRENT_DATE NOT NULL,
  count      INTEGER     DEFAULT 0,
  UNIQUE(user_id, swipe_date)
);
ALTER TABLE daily_swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_swipes_own" ON daily_swipes FOR ALL USING (auth.uid() = user_id);

-- Message reactions
CREATE TABLE IF NOT EXISTS message_reactions (
  id         UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID        REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  user_id    UUID        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  emoji      TEXT        NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions_select" ON message_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert" ON message_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions_delete" ON message_reactions FOR DELETE USING (auth.uid() = user_id);

-- gif_url on messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS gif_url TEXT;

-- Realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;

-- Function: increment daily swipe count, returns new count
CREATE OR REPLACE FUNCTION increment_daily_swipes(p_user uuid)
RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO daily_swipes (user_id, swipe_date, count)
  VALUES (p_user, CURRENT_DATE, 1)
  ON CONFLICT (user_id, swipe_date)
  DO UPDATE SET count = daily_swipes.count + 1
  RETURNING count INTO v_count;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update check_and_create_match to also match superlikes (v2 fix included)
CREATE OR REPLACE FUNCTION check_and_create_match(p_swiper uuid, p_swiped uuid)
RETURNS uuid AS $$
DECLARE
  v_match_id uuid;
BEGIN
  IF EXISTS (
    SELECT 1 FROM swipes
    WHERE swiper_id = p_swiped
      AND swiped_id = p_swiper
      AND direction IN ('like', 'superlike')
  ) THEN
    INSERT INTO matches (user1_id, user2_id)
    VALUES (least(p_swiper, p_swiped), greatest(p_swiper, p_swiped))
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_match_id;

    IF v_match_id IS NULL THEN
      SELECT id INTO v_match_id FROM matches
      WHERE user1_id = least(p_swiper, p_swiped)
        AND user2_id = greatest(p_swiper, p_swiped);
    END IF;

    RETURN v_match_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
