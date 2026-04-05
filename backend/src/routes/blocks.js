import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// POST /api/blocks — block a user
router.post('/', requireAuth, async (req, res) => {
  const { blocked_id, reason } = req.body;

  const { error: blockErr } = await supabase.from('blocks').insert({
    blocker_id: req.user.id,
    blocked_id,
  });
  if (blockErr && !blockErr.message.includes('duplicate')) {
    return res.status(400).json({ error: blockErr.message });
  }

  // If a reason provided, also file a report
  if (reason) {
    await supabase.from('reports').insert({
      reporter_id: req.user.id,
      reported_id: blocked_id,
      reason,
    });
  }

  // Remove any match between these two users
  await supabase.from('matches').delete()
    .or(`and(user1_id.eq.${req.user.id},user2_id.eq.${blocked_id}),and(user1_id.eq.${blocked_id},user2_id.eq.${req.user.id})`);

  res.json({ success: true });
});

// GET /api/blocks — my blocked user IDs
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', req.user.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json((data || []).map(b => b.blocked_id));
});

export default router;
