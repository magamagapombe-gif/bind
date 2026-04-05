import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Verify user is part of the match
const verifyMatchMember = async (matchId, userId) => {
  const { data } = await supabase
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .single();
  return !!data;
};

// GET /api/messages/:matchId
router.get('/:matchId', requireAuth, async (req, res) => {
  const isMember = await verifyMatchMember(req.params.matchId, req.user.id);
  if (!isMember) return res.status(403).json({ error: 'Not a member of this match' });

  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_id, content, read, created_at')
    .eq('match_id', req.params.matchId)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  // Mark messages sent by the other person as read
  await supabase
    .from('messages')
    .update({ read: true })
    .eq('match_id', req.params.matchId)
    .neq('sender_id', req.user.id)
    .eq('read', false);

  res.json(data || []);
});

// POST /api/messages/:matchId
router.post('/:matchId', requireAuth, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'content is required' });

  const isMember = await verifyMatchMember(req.params.matchId, req.user.id);
  if (!isMember) return res.status(403).json({ error: 'Not a member of this match' });

  const { data, error } = await supabase
    .from('messages')
    .insert({
      match_id: req.params.matchId,
      sender_id: req.user.id,
      content: content.trim(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

export default router;
