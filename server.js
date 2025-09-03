// server.js
/**
 * AiVA backend (simplified)
 * - No Firebase service account required
 * - PostgreSQL (conversations, messages, user_deleted_messages, jobs)
 * - Endpoints:
 *   GET /api/conversations
 *   POST /api/conversations
 *   GET /api/conversations/:id/messages
 *   POST /api/chat
 * - Model calling: HuggingFace Router (if HF_TOKEN) else OpenAI (if OPENAI_API_KEY)
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || '*' }));
app.use(express.json({ limit: '512kb' }));

/* -------------------- PostgreSQL pool -------------------- */
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

/* -------------------- Create tables if not exist -------------------- */
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id UUID PRIMARY KEY,
      title TEXT,
      owner_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY,
      conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT,
      role TEXT, -- 'user'|'assistant'|'system'
      text TEXT,
      meta JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_deleted_messages (
      user_id TEXT,
      message_id UUID,
      deleted_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (user_id, message_id)
    );
  `);
}
ensureTables().catch(err => console.error('ensureTables error', err));

/* -------------------- Model call -------------------- */
async function callModel(messages, opts = {}) {
  const model = opts.model || process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b:together';
  const timeoutMs = opts.timeoutMs || 20000;

  // HuggingFace Router
  if (process.env.HF_TOKEN) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const payload = { model, messages };
      const resp = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.HF_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const json = await resp.json();
      if (json.choices?.[0]?.message?.content) return json.choices[0].message.content;
      if (json.output?.[0]?.content) return json.output[0].content;
      if (json.choices?.[0]?.text) return json.choices[0].text;
      return JSON.stringify(json).slice(0, 2000);
    } catch (err) { clearTimeout(timeout); throw err; }
  }

  // OpenAI fallback
  if (process.env.OPENAI_API_KEY) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const payload = { model: opts.openaiModel || 'gpt-3.5-turbo', messages };
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const json = await resp.json();
      if (json.choices?.[0]?.message?.content) return json.choices[0].message.content;
      if (json.choices?.[0]?.text) return json.choices[0].text;
      return JSON.stringify(json).slice(0,2000);
    } catch (err) { clearTimeout(timeout); throw err; }
  }

  throw new Error('No model credentials configured (HF_TOKEN or OPENAI_API_KEY)');
}

/* -------------------- Load recent messages -------------------- */
async function loadRecentMessages(conversationId, limit = 20) {
  const res = await pool.query(
    'SELECT id, sender_id, role, text, meta, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2',
    [conversationId, limit]
  );
  return res.rows.reverse();
}

/* -------------------- Endpoints -------------------- */

// GET /api/conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const userId = req.query.userId; // placeholder: client must send uid
    if (!userId) return res.status(400).json({ error: 'userId required as query param' });

    const owned = await pool.query('SELECT * FROM conversations WHERE owner_id = $1 ORDER BY updated_at DESC', [userId]);
    res.json(owned.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/conversations
app.post('/api/conversations', async (req, res) => {
  try {
    const { title, ownerId } = req.body;
    if (!ownerId) return res.status(400).json({ error: 'ownerId required' });

    const id = uuidv4();
    await pool.query('INSERT INTO conversations (id, title, owner_id) VALUES ($1, $2, $3)', [id, title || 'Untitled', ownerId]);
    res.json({ id, title: title || 'Untitled', ownerId });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// GET /api/conversations/:id/messages
app.get('/api/conversations/:id/messages', async (req, res) => {
  try {
    const convId = req.params.id;
    const result = await pool.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [convId]);
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  try {
    const { conversationId, text, userId } = req.body;
    if (!conversationId || !text || !userId) return res.status(400).json({ error: 'conversationId, text, userId required' });

    // Save user message
    const msgId = uuidv4();
    await pool.query('INSERT INTO messages (id, conversation_id, sender_id, role, text) VALUES ($1,$2,$3,$4,$5)',
      [msgId, conversationId, userId, 'user', text]);

    const recent = await loadRecentMessages(conversationId, 20);
    const modelMessages = recent.map(r => ({ role: r.role === 'assistant' ? 'assistant' : 'user', content: r.text }));
    modelMessages.push({ role: 'user', content: text });

    const replyText = await callModel(modelMessages);
    const replyId = uuidv4();
    await pool.query('INSERT INTO messages (id, conversation_id, sender_id, role, text) VALUES ($1,$2,$3,$4,$5)',
      [replyId, conversationId, 'aiva_bot', 'assistant', replyText]);

    res.json({ reply: replyText });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

/* -------------------- Healthcheck -------------------- */
app.get('/', (req, res) => res.json({ ok: true, service: 'AiVA' }));

/* -------------------- Start server -------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AiVA server listening on port ${PORT}`));
