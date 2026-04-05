import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// POST /api/swipes — like, dislike, or superlike
router.post('/', requireAuth, async (req, res) => {
  const { swiped_id, direction } = req.body;
  const swiper_id = req.user.id;

  if (!['like', 'dislike', 'superlike'].includes(direction)) {
    return res.status(400).json({ error: 'Invalid direction' });
  }

  const { error } = await supabase.from('swipes').insert({ swiper_id, swiped_id, direction });
  if (error) return res.status(400).json({ error: error.message });

  // Check for mutual match on like or superlike
  if (direction === 'like' || direction === 'superlike') {
    const { data: matchId } = await supabase.rpc('check_and_create_match', {
      p_swiper: swiper_id,
      p_swiped: swiped_id,
    });

    if (matchId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, photos')
        .eq('id', swiped_id)
        .single();
      return res.json({ match_id: matchId, profile });
    }
  }

  res.json({ match_id: null });
});

// DELETE /api/swipes/last — undo last swipe
router.delete('/last', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('swipes')
    .select('id, swiped_id, direction')
    .eq('swiper_id', req.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return res.status(404).json({ error: 'No swipe to undo' });

  // Cannot undo if it created a match
  if (data.direction === 'like' || data.direction === 'superlike') {
    const { data: match } = await supabase
      .from('matches')
      .select('id')
      .or(`and(user1_id.eq.${req.user.id},user2_id.eq.${data.swiped_id}),and(user1_id.eq.${data.swiped_id},user2_id.eq.${req.user.id})`)
      .single();

    if (match) return res.status(400).json({ error: 'Cannot undo a matched swipe' });
  }

  await supabase.from('swipes').delete().eq('id', data.id);

  // Return the profile so frontend can push it back
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.swiped_id)
    .single();

  res.json({ profile });
});

// GET /api/swipes/likes-me — people who liked/superliked me but no match yet
router.get('/likes-me', requireAuth, async (req, res) => {
  const userId = req.user.id;

  // People I've already swiped
  const { data: mySwipes } = await supabase
    .from('swipes')
    .select('swiped_id')
    .eq('swiper_id', userId);

  const alreadySwiped = (mySwipes || []).map(s => s.swiped_id);

  // People who liked me
  let query = supabase
    .from('swipes')
    .select('swiper_id, direction, created_at, profiles!swipes_swiper_id_fkey(id, name, age, photos, verified, last_active)')
    .eq('swiped_id', userId)
    .in('direction', ['like', 'superlike']);

  if (alreadySwiped.length > 0) {
    query = query.not('swiper_id', 'in', `(${alreadySwiped.join(',')})`);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return res.status(400).json({ error: error.message });

  const result = (data || []).map(s => ({ ...s.profiles, is_superlike: s.direction === 'superlike' }));
  res.json(result);
});

export default router;
