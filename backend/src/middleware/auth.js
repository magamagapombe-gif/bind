import { supabase } from '../lib/supabase.js';

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user  = user;
  req.token = token;

  // Update last_active in background (don't await — keep request fast)
  supabase.from('profiles')
    .update({ last_active: new Date().toISOString() })
    .eq('id', user.id)
    .then(() => {});

  next();
};
