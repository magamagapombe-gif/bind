import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/swipes
router.post('/', requireAuth, async (req, res) => {
  const { swiped_id, direction } = req.body;

  if (!swiped_id || !['like', 'dislike'].includes(direction)) {
    return res.status(400).json({ error: 'swiped_id and direction (like|dislike) are required' });
  }

  if (swiped_id === req.user.id) {
    return res.status(400).json({ error: 'Cannot swipe on yourself' });
  }

  // Record the swipe (ignore if already exists)
  const { error: swipeErr } = await supabase
    .from('swipes')
    .upsert({ swiper_id: req.user.id, swiped_id, direction });

  if (swipeErr) return res.status(500).json({ error: swipeErr.message });

  let match = null;

  // Check for mutual like → create match
  if (direction === 'like') {
    const { data, error: rpcErr } = await supabase.rpc('check_and_create_match', {
      p_swiper: req.user.id,
      p_swiped: swiped_id,
    });

    if (!rpcErr && data) {
      // Fetch match with both profiles
      const { data: matchData } = await supabase
        .from('matches')
        .select(`
          id, created_at,
          user1:user1_id ( id, name, photos ),
          user2:user2_id ( id, name, photos )
        `)
        .eq('id', data)
        .single();

      match = matchData;
    }
  }

  res.json({ success: true, match });
});

export default router;
