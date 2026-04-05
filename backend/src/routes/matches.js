import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/matches  — get all matches for current user
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('matches')
    .select(`
      id, created_at,
      user1:user1_id ( id, name, photos, age ),
      user2:user2_id ( id, name, photos, age )
    `)
    .or(`user1_id.eq.${req.user.id},user2_id.eq.${req.user.id}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // Normalize: always expose the OTHER person as "match"
  const normalized = (data || []).map((m) => {
    const other = m.user1.id === req.user.id ? m.user2 : m.user1;
    return { id: m.id, created_at: m.created_at, match: other };
  });

  res.json(normalized);
});

export default router;
