import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

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

// POST /api/profiles  — create or upsert profile
router.post('/', requireAuth, async (req, res) => {
  const { name, age, bio, gender, interested_in, min_age, max_age, photos, location } = req.body;

  if (!name || !age || !gender) {
    return res.status(400).json({ error: 'name, age, and gender are required' });
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: req.user.id,
      name,
      age: parseInt(age),
      bio: bio || '',
      gender,
      interested_in: interested_in || ['man', 'woman', 'nonbinary', 'other'],
      min_age: min_age || 18,
      max_age: max_age || 99,
      photos: photos || [],
      location: location || '',
      is_setup: true,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/profiles  — update profile
router.put('/', requireAuth, async (req, res) => {
  const allowed = ['name', 'age', 'bio', 'gender', 'interested_in', 'min_age', 'max_age', 'photos', 'location'];
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

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/profiles/discover  — get profiles to swipe on
router.get('/discover', requireAuth, async (req, res) => {
  // Fetch current user's profile for preferences
  const { data: me, error: meErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (meErr || !me) return res.status(404).json({ error: 'Complete your profile first' });

  // Get IDs already swiped
  const { data: swiped } = await supabase
    .from('swipes')
    .select('swiped_id')
    .eq('swiper_id', req.user.id);

  const swipedIds = (swiped || []).map((s) => s.swiped_id);
  swipedIds.push(req.user.id); // exclude self

  // Build query
  let query = supabase
    .from('profiles')
    .select('id, name, age, bio, gender, photos, location')
    .not('id', 'in', `(${swipedIds.join(',')})`)
    .eq('is_setup', true)
    .gte('age', me.min_age)
    .lte('age', me.max_age)
    .limit(20);

  // Filter by gender preference
  if (me.interested_in && me.interested_in.length > 0) {
    query = query.in('gender', me.interested_in);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Shuffle for variety
  const shuffled = (data || []).sort(() => Math.random() - 0.5);
  res.json(shuffled);
});

// GET /api/profiles/:id  — get a specific profile (public info)
router.get('/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, age, bio, gender, photos, location')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Profile not found' });
  res.json(data);
});

export default router;
