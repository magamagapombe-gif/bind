import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// Safe column list — starts with base columns guaranteed to exist
const BASE_COLS  = 'id,name,age,bio,gender,interested_in,min_age,max_age,photos,location,is_setup,last_active,verified,boost_until,created_at,updated_at';
const V3_COLS    = ',interests,prompts,latitude,longitude,max_distance';

async function fetchProfile(userId) {
  // Try with v3 columns first, fall back to base columns
  let { data, error } = await supabase
    .from('profiles')
    .select(BASE_COLS + V3_COLS)
    .eq('id', userId)
    .maybeSingle();

  if (error && (error.message.includes('interests') || error.message.includes('prompts') || error.message.includes('latitude'))) {
    ({ data, error } = await supabase
      .from('profiles')
      .select(BASE_COLS)
      .eq('id', userId)
      .maybeSingle());
  }

  if (error) throw error;
  return data;
}

// GET /api/profiles/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const data = await fetchProfile(req.user.id);
    if (!data) return res.json({ id: req.user.id, is_setup: false });
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/profiles/me
router.put('/me', requireAuth, async (req, res) => {
  const baseAllowed = ['name','age','bio','gender','interested_in','min_age','max_age','photos','location','is_setup'];
  const v3Allowed   = ['interests','prompts','latitude','longitude','max_distance'];

  const updates = { id: req.user.id };
  for (const key of baseAllowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  // Try upsert with all fields first
  const updatesWithV3 = { ...updates };
  for (const key of v3Allowed) {
    if (req.body[key] !== undefined) updatesWithV3[key] = req.body[key];
  }

  let { data, error } = await supabase
    .from('profiles')
    .upsert(updatesWithV3, { onConflict: 'id' })
    .select()
    .maybeSingle();

  // If v3 columns don't exist yet, retry with only base columns
  if (error && (error.message.includes('interests') || error.message.includes('prompts') || error.message.includes('latitude'))) {
    ({ data, error } = await supabase
      .from('profiles')
      .upsert(updates, { onConflict: 'id' })
      .select()
      .maybeSingle());
  }

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// GET /api/profiles/discover
router.get('/discover', requireAuth, async (req, res) => {
  const userId = req.user.id;

  let me;
  try { me = await fetchProfile(userId); } catch (e) { return res.status(400).json({ error: e.message }); }
  if (!me) return res.status(404).json({ error: 'Profile not found' });

  const { data: mySwipes } = await supabase.from('swipes').select('swiped_id').eq('swiper_id', userId);
  const swiped = (mySwipes || []).map(s => s.swiped_id);

  const { data: myBlocks }    = await supabase.from('blocks').select('blocked_id').eq('blocker_id', userId);
  const { data: blockedByMe } = await supabase.from('blocks').select('blocker_id').eq('blocked_id', userId);
  const blocked = [
    ...(myBlocks    || []).map(b => b.blocked_id),
    ...(blockedByMe || []).map(b => b.blocker_id),
  ];

  const exclude = [...new Set([userId, ...swiped, ...blocked])];

  // Build discover columns — try v3, fall back to base
  const discoverV3  = 'id,name,age,bio,gender,photos,location,verified,last_active,is_setup,interests,prompts,created_at,latitude,longitude';
  const discoverBase = 'id,name,age,bio,gender,photos,location,verified,last_active,is_setup,created_at';

  let query = supabase
    .from('profiles')
    .select(discoverV3)
    .eq('is_setup', true)
    .gte('age', me.min_age || 18)
    .lte('age', me.max_age || 99)
    .limit(50);

  if (me.gender) query = query.contains('interested_in', [me.gender]);
  if (exclude.length > 0) query = query.not('id', 'in', `(${exclude.join(',')})`);

  // Try with boost_until ordering (v2+)
  let { data, error } = await query
    .order('boost_until', { ascending: false, nullsFirst: false })
    .order('last_active', { ascending: false });

  if (error && (error.message.includes('interests') || error.message.includes('prompts'))) {
    // Retry with base columns
    let q2 = supabase.from('profiles').select(discoverBase)
      .eq('is_setup', true)
      .gte('age', me.min_age || 18)
      .lte('age', me.max_age || 99)
      .limit(50);
    if (me.gender) q2 = q2.contains('interested_in', [me.gender]);
    if (exclude.length > 0) q2 = q2.not('id', 'in', `(${exclude.join(',')})`);
    ({ data, error } = await q2.order('last_active', { ascending: false }));
  }

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

// GET /api/profiles/:id
router.get('/:id', requireAuth, async (req, res) => {
  const cols = 'id,name,age,bio,gender,photos,location,verified,last_active,interests,prompts,created_at';
  let { data, error } = await supabase
    .from('profiles')
    .select(cols)
    .eq('id', req.params.id)
    .maybeSingle();

  if (error && (error.message.includes('interests') || error.message.includes('prompts'))) {
    ({ data, error } = await supabase
      .from('profiles')
      .select('id,name,age,bio,gender,photos,location,verified,last_active,created_at')
      .eq('id', req.params.id)
      .maybeSingle());
  }

  if (error || !data) return res.status(404).json({ error: 'Profile not found' });
  res.json(data);
});

export default router;
