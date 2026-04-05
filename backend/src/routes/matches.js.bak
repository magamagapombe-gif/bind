import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// GET /api/matches — with other profile, last message, and unread count
router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.id;

  const { data: matches, error } = await supabase
    .from('matches')
    .select('id, user1_id, user2_id, created_at')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(400).json({ error: error.message });

  const enriched = await Promise.all((matches || []).map(async m => {
    const otherId = m.user1_id === userId ? m.user2_id : m.user1_id;

    const [profileRes, lastMsgRes, unreadRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, name, age, photos, last_active, verified')
        .eq('id', otherId)
        .single(),

      supabase.from('messages')
        .select('content, created_at, sender_id, read')
        .eq('match_id', m.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(),

      supabase.from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('match_id', m.id)
        .neq('sender_id', userId)
        .eq('read', false),
    ]);

    return {
      ...m,
      other_profile:  profileRes.data,
      last_message:   lastMsgRes.data?.content || null,
      last_message_at: lastMsgRes.data?.created_at || m.created_at,
      unread_count:   unreadRes.count || 0,
    };
  }));

  // Sort by most recent message
  enriched.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));

  res.json(enriched);
});

export default router;
