import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import profilesRouter from './routes/profiles.js';
import swipesRouter  from './routes/swipes.js';
import matchesRouter from './routes/matches.js';
import messagesRouter from './routes/messages.js';
import uploadRouter  from './routes/upload.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Security ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));

// ── Rate limiting ───────────────────────────────────────────
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
}));

// ── Body parsing ────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ─────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── Routes ───────────────────────────────────────────────────
app.use('/api/profiles', profilesRouter);
app.use('/api/swipes',   swipesRouter);
app.use('/api/matches',  matchesRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/upload',   uploadRouter);

// ── 404 ──────────────────────────────────────────────────────
app.use((_, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error handler ─────────────────────────────────────────────
app.use((err, _, res, __) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🔥 Binder API running on port ${PORT}`);
});
