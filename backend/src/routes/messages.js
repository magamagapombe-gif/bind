import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// GET /api/messages/:matchId
router.get('/:matchId', requireAuth, async (req, res) => {
  const { matchId } = req.params;
  const userId = req.user.id;

  // Verify membership
  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .single();

  if (!match) return res.status(403).json({ error: 'Not a member of this match' });

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// POST /api/messages/:matchId
router.post('/:matchId', requireAuth, async (req, res) => {
  const { matchId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  if (!content?.trim()) return res.status(400).json({ error: 'Content required' });

  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .single();

  if (!match) return res.status(403).json({ error: 'Not a member of this match' });

  const { data, error } = await supabase
    .from('messages')
    .insert({ match_id: matchId, sender_id: userId, content: content.trim() })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// PUT /api/messages/:matchId/read — mark all messages from other user as read
router.put('/:matchId/read', requireAuth, async (req, res) => {
  const { matchId } = req.params;
  const userId = req.user.id;

  await supabase
    .from('messages')
    .update({ read: true })
    .eq('match_id', matchId)
    .neq('sender_id', userId)
    .eq('read', false);

  res.json({ success: true });
});

export default router;
