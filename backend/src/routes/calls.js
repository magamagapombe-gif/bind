import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const router = express.Router();

// POST /api/calls — initiate a call (creates DB record, signaling via Supabase Realtime)
router.post('/', requireAuth, async (req, res) => {
  const { match_id, callee_id, call_type = 'audio' } = req.body;
  const caller_id = req.user.id;

  if (!match_id || !callee_id) return res.status(400).json({ error: 'match_id and callee_id required' });
  if (!['audio', 'video'].includes(call_type)) return res.status(400).json({ error: 'Invalid call_type' });

  // Verify caller is member of match
  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('id', match_id)
    .or(`user1_id.eq.${caller_id},user2_id.eq.${caller_id}`)
    .maybeSingle();

  if (!match) return res.status(403).json({ error: 'Not a member of this match' });

  // Check no active call already exists for this match
  const { data: existing } = await supabase
    .from('calls')
    .select('id, status')
    .eq('match_id', match_id)
    .in('status', ['ringing', 'accepted'])
    .maybeSingle();

  if (existing) return res.status(409).json({ error: 'A call is already active for this match' });

  const { data, error } = await supabase
    .from('calls')
    .insert({ match_id, caller_id, callee_id, call_type, status: 'ringing' })
    .select()
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// PATCH /api/calls/:callId — update call status
router.patch('/:callId', requireAuth, async (req, res) => {
  const { callId } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  const validStatuses = ['accepted', 'declined', 'missed', 'ended'];
  if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const { data: call } = await supabase
    .from('calls')
    .select('*')
    .eq('id', callId)
    .maybeSingle();

  if (!call) return res.status(404).json({ error: 'Call not found' });
  if (call.caller_id !== userId && call.callee_id !== userId) {
    return res.status(403).json({ error: 'Not a member of this call' });
  }

  const updates = { status };
  if (status === 'accepted') updates.started_at = new Date().toISOString();
  if (status === 'ended' || status === 'declined' || status === 'missed') {
    updates.ended_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('calls')
    .update(updates)
    .eq('id', callId)
    .select()
    .maybeSingle();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// GET /api/calls/history/:matchId
router.get('/history/:matchId', requireAuth, async (req, res) => {
  const { matchId } = req.params;
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('calls')
    .select('*')
    .eq('match_id', matchId)
    .or(`caller_id.eq.${userId},callee_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

export default router;
