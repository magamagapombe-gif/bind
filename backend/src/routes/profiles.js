import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// GET /api/profiles/me
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();
  if (error) return res.status(404).json({ error: 'Profile not found' });
  res.json(data);
});

// PUT /api/profiles/me
router.put('/me', requireAuth, async (req, res) => {
  const allowed = ['name','age','bio','gender','interested_in','min_age','max_age','photos','location','is_setup'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// GET /api/profiles/discover
router.get('/discover', requireAuth, async (req, res) => {
  const userId = req.user.id;

  const { data: me } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (!me) return res.status(404).json({ error: 'Profile not found' });

  // Users I already swiped
  const { data: mySwipes } = await supabase.from('swipes').select('swiped_id').eq('swiper_id', userId);
  const swiped = (mySwipes || []).map(s => s.swiped_id);

  // Users who blocked me or I blocked
  const { data: myBlocks }   = await supabase.from('blocks').select('blocked_id').eq('blocker_id', userId);
  const { data: blockedByMe } = await supabase.from('blocks').select('blocker_id').eq('blocked_id', userId);
  const blocked = [
    ...(myBlocks    || []).map(b => b.blocked_id),
    ...(blockedByMe || []).map(b => b.blocker_id),
  ];

  const exclude = [...new Set([userId, ...swiped, ...blocked])];

  let query = supabase
    .from('profiles')
    .select('id,name,age,bio,gender,photos,location,verified,last_active,is_setup')
    .eq('is_setup', true)
    .contains('interested_in', [me.gender])
    .gte('age', me.min_age)
    .lte('age', me.max_age)
    .limit(50);

  if (exclude.length > 0) {
    query = query.not('id', 'in', `(${exclude.join(',')})`);
  }

  // Boosted profiles first
  query = query.order('boost_until', { ascending: false, nullsFirst: false })
               .order('last_active', { ascending: false });

  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

// GET /api/profiles/:id
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,name,age,bio,gender,photos,location,verified,last_active')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Profile not found' });
  res.json(data);
});

export default router;
