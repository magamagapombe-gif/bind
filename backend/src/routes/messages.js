import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// GET /api/messages/:matchId
router.get('/:matchId', requireAuth, async (req, res) => {
  const { matchId } = req.params;
  const userId = req.user.id;

  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();

  if (!match) return res.status(403).json({ error: 'Not a member of this match' });

  // Try fetching with reactions join — fall back to plain messages if table doesn't exist yet
  let data, error;
  ({ data, error } = await supabase
    .from('messages')
    .select('*, message_reactions(id, user_id, emoji)')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true }));

  if (error) {
    // message_reactions table may not exist yet — fall back to plain select
    ({ data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true }));
  }

  if (error) return res.status(400).json({ error: error.message });

  // Normalise: ensure message_reactions always present
  const normalised = (data || []).map(m => ({
    ...m,
    message_reactions: m.message_reactions || [],
  }));

  res.json(normalised);
});

// POST /api/messages/:matchId
router.post('/:matchId', requireAuth, async (req, res) => {
  const { matchId } = req.params;
  const { content, gif_url } = req.body;
  const userId = req.user.id;

  if (!content?.trim() && !gif_url) return res.status(400).json({ error: 'Content required' });

  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('id', matchId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();

  if (!match) return res.status(403).json({ error: 'Not a member of this match' });

  // Build insert — only include gif_url if column exists (try/catch handles it)
  const insertPayload = {
    match_id:  matchId,
    sender_id: userId,
    content:   content?.trim() || '',
  };
  if (gif_url) insertPayload.gif_url = gif_url;

  let data, error;
  ({ data, error } = await supabase
    .from('messages')
    .insert(insertPayload)
    .select()
    .maybeSingle());

  if (error && gif_url && error.message.includes('gif_url')) {
    // gif_url column not added yet — insert without it
    delete insertPayload.gif_url;
    ({ data, error } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select()
      .maybeSingle());
  }

  if (error) return res.status(400).json({ error: error.message });
  res.json({ ...data, message_reactions: [] });
});

// PUT /api/messages/:matchId/read
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

// POST /api/messages/:messageId/react
router.post('/:messageId/react', requireAuth, async (req, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;
  const userId = req.user.id;

  if (!emoji) return res.status(400).json({ error: 'Emoji required' });

  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id, emoji')
    .eq('message_id', messageId)
    .eq('user_id', userId)
    .maybeSingle()
    .catch(() => ({ data: null }));

  if (existing) {
    if (existing.emoji === emoji) {
      await supabase.from('message_reactions').delete().eq('id', existing.id);
      return res.json({ removed: true });
    } else {
      const { data } = await supabase
        .from('message_reactions')
        .update({ emoji })
        .eq('id', existing.id)
        .select()
        .maybeSingle();
      return res.json(data || {});
    }
  }

  const { data, error } = await supabase
    .from('message_reactions')
    .insert({ message_id: messageId, user_id: userId, emoji })
    .select()
    .maybeSingle()
    .catch(e => ({ data: null, error: e }));

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || {});
});

export default router;
