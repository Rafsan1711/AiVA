// server.js
/**
 * AiVA backend
 * - Firebase Admin token verification
 * - PostgreSQL (conversations, messages, user_deleted_messages, jobs)
 * - Endpoints:
 *   GET /api/conversations
 *   POST /api/conversations
 *   GET /api/conversations/:id/messages
 *   GET /api/conversations/:id/messages/:msgId
 *   DELETE /api/conversations/:id/messages/:msgId
 *   POST /api/chat
 *
 * - Model calling: HuggingFace Router (if HF_TOKEN) else OpenAI (if OPENAI_API_KEY)
 * - Background job processor that retries failed jobs
 * - Node-cron example for cleanup
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // v2
const { Pool } = require('pg');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const AbortController = global.AbortController || require('abort-controller');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '512kb' }));

/* --------------------
   Init Firebase Admin
   Accept either:
   - FIREBASE_SERVICE_ACCOUNT (JSON string) OR
   - FIREBASE_SERVICE_ACCOUNT_PATH (path to JSON file)
   -------------------- */
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const svc = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const svc = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
    admin.initializeApp({ credential: admin.credential.cert(svc) });
  } else {
    console.warn('No Firebase service account provided. Token verification will fail until configured.');
  }
} catch (e) {
  console.error('Firebase admin init error:', e);
}

/* --------------------
   Postgres pool
   DATABASE_URL in .env
   -------------------- */
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/* --------------------
   Create tables if not exist
   -------------------- */
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
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY,
      conversation_id UUID,
      type TEXT,
      payload JSONB,
      attempts INT DEFAULT 0,
      status TEXT DEFAULT 'pending', -- pending, processing, done, failed
      last_error TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}
ensureTables().catch(err => console.error('ensureTables error', err));

/* --------------------
   Helpers: verify Firebase token
   -------------------- */
async function verifyTokenFromHeader(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) throw { status: 401, message: 'Missing or invalid Authorization header' };
  const idToken = auth.split('Bearer ')[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    return decoded; // contains uid, email, etc.
  } catch (e) {
    throw { status: 401, message: 'Invalid token' };
  }
}

/* --------------------
   Model call wrapper
   - Prefer HF if HF_TOKEN present (router endpoint)
   - Else fallback to OpenAI (OPENAI_API_KEY)
   -------------------- */
const HF_URL = 'https://router.huggingface.co/v1/chat/completions';
async function callModel(messages, opts = {}) {
  // messages: [{role, content}, ...]
  const model = opts.model || process.env.DEFAULT_MODEL || 'openai/gpt-oss-120b:together';
  const timeoutMs = opts.timeoutMs || 20000;

  // Use HF if token present
  if (process.env.HF_TOKEN) {
    const controller = new AbortController();
    const timeout = setTimeout(()=> controller.abort(), timeoutMs);
    try {
      const payload = {
        model,
        messages
      };
      const resp = await fetch(HF_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const json = await resp.json();
      // try to extract reply text
      if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) {
        return json.choices[0].message.content;
      } else if (json.output && Array.isArray(json.output) && json.output[0] && json.output[0].content) {
        return json.output[0].content;
      } else if (json.choices && json.choices[0] && json.choices[0].text) {
        return json.choices[0].text;
      } else {
        return JSON.stringify(json).slice(0, 2000);
      }
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  // Fallback: OpenAI REST API
  if (process.env.OPENAI_API_KEY) {
    const controller = new AbortController();
    const timeout = setTimeout(()=> controller.abort(), timeoutMs);
    try {
      const url = 'https://api.openai.com/v1/chat/completions';
      const payload = {
        model: opts.openaiModel || 'gpt-3.5-turbo',
        messages
      };
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const json = await resp.json();
      if (json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content) {
        return json.choices[0].message.content;
      } else if (json.choices && json.choices[0] && json.choices[0].text) {
        return json.choices[0].text;
      } else {
        return JSON.stringify(json).slice(0,2000);
      }
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  throw new Error('No model credentials configured (set HF_TOKEN or OPENAI_API_KEY).');
}

/* --------------------
   Utilities: load recent messages for context
   -------------------- */
async function loadRecentMessages(conversationId, limit = 20) {
  const res = await pool.query(
    'SELECT id, sender_id, role, text, meta, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT $2',
    [conversationId, limit]
  );
  // return in ascending order
  return res.rows.reverse();
}

/* --------------------
   Endpoints
   -------------------- */

/**
 * GET /api/conversations
 * returns conversations relevant to user (owner or participant by messages)
 */
app.get('/api/conversations', async (req, res) => {
  try {
    const decoded = await verifyTokenFromHeader(req);
    const uid = decoded.uid;

    // Conversations owned by user
    const owned = await pool.query('SELECT * FROM conversations WHERE owner_id = $1 ORDER BY updated_at DESC LIMIT 200', [uid]);

    // Conversations where user has messages (and not already included)
    const withMsgs = await pool.query(`
      SELECT c.* FROM conversations c
      JOIN messages m ON m.conversation_id = c.id
      WHERE m.sender_id = $1
      GROUP BY c.id ORDER BY max(m.created_at) DESC LIMIT 200
    `, [uid]);

    // merge unique
    const map = new Map();
    owned.rows.concat(withMsgs.rows).forEach(r => { if(!map.has(r.id)) map.set(r.id, r); });

    const convs = Array.from(map.values()).map(c => ({
      id: c.id,
      title: c.title || 'Untitled',
      owner_id: c.owner_id,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
      lastMessage: null
    }));

    // populate lastMessage for each conv (optional small query)
    for (const conv of convs) {
      const lm = await pool.query('SELECT text, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 1', [conv.id]);
      if (lm.rows[0]) {
        conv.lastMessage = lm.rows[0].text;
        conv.updatedAt = lm.rows[0].created_at;
      }
    }

    res.json(convs);
  } catch (err) {
    console.error('GET /api/conversations error', err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
});

/**
 * POST /api/conversations
 * body: { title }
 */
app.post('/api/conversations', async (req, res) => {
  try {
    const decoded = await verifyTokenFromHeader(req);
    const uid = decoded.uid;
    const title = (req.body && req.body.title) ? req.body.title : 'Conversation';
    const id = uuidv4();
    await pool.query('INSERT INTO conversations (id, title, owner_id) VALUES ($1, $2, $3)', [id, title, uid]);
    const conv = (await pool.query('SELECT * FROM conversations WHERE id = $1', [id])).rows[0];
    res.json({ id: conv.id, title: conv.title, owner_id: conv.owner_id, createdAt: conv.created_at });
  } catch (err) {
    console.error('POST /api/conversations error', err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /api/conversations/:id/messages
 * query: since (ms timestamp) optional
 */
app.get('/api/conversations/:id/messages', async (req, res) => {
  try {
    const decoded = await verifyTokenFromHeader(req);
    const uid = decoded.uid;
    const convId = req.params.id;
    const since = req.query.since ? new Date(Number(req.query.since)) : null;

    // Fetch messages with exclusion for messages user deleted (user_deleted_messages)
    let q = 'SELECT m.id, m.sender_id, m.role, m.text, m.meta, m.created_at FROM messages m WHERE m.conversation_id = $1';
    const params = [convId];
    if (since) { params.push(since); q += ` AND m.created_at > $${params.length}`; }
    q += ' ORDER BY m.created_at ASC LIMIT 1000';

    const result = await pool.query(q, params);
    const rows = result.rows;

    // Filter out messages the user has deleted for themselves
    if (rows.length === 0) { return res.json([]); }
    const msgIds = rows.map(r => r.id);
    const delRes = await pool.query('SELECT message_id FROM user_deleted_messages WHERE user_id = $1 AND message_id = ANY($2::uuid[])', [uid, msgIds]);
    const deletedSet = new Set(delRes.rows.map(r => String(r.message_id)));

    const filtered = rows.filter(r => !deletedSet.has(String(r.id))).map(r => ({
      id: r.id,
      role: r.role,
      senderId: r.sender_id,
      text: r.text,
      meta: r.meta,
      createdAt: r.created_at
    }));

    res.json(filtered);
  } catch (err) {
    console.error('GET messages error', err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET single message
 */
app.get('/api/conversations/:id/messages/:msgId', async (req, res) => {
  try {
    await verifyTokenFromHeader(req);
    const msgId = req.params.msgId;
    const r = await pool.query('SELECT id, sender_id, role, text, meta, created_at FROM messages WHERE id = $1', [msgId]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Message not found' });
    const m = r.rows[0];
    res.json({ id: m.id, role: m.role, senderId: m.sender_id, text: m.text, meta: m.meta, createdAt: m.created_at });
  } catch (err) {
    console.error('GET single message error', err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
});

/**
 * DELETE message (for me OR for everyone)
 * Query param: forEveryone=1 to delete globally (only allowed to sender or conversation owner)
 */
app.delete('/api/conversations/:id/messages/:msgId', async (req, res) => {
  try {
    const decoded = await verifyTokenFromHeader(req);
    const uid = decoded.uid;
    const convId = req.params.id;
    const msgId = req.params.msgId;
    const forEveryone = req.query.forEveryone === '1' || req.query.forEveryone === 'true';

    if (forEveryone) {
      // check permission: only sender or conversation owner can delete for everyone
      const msg = (await pool.query('SELECT sender_id FROM messages WHERE id = $1', [msgId])).rows[0];
      const conv = (await pool.query('SELECT owner_id FROM conversations WHERE id = $1', [convId])).rows[0];
      if (!msg || !conv) return res.status(404).json({ error: 'Not found' });
      if (msg.sender_id !== uid && conv.owner_id !== uid) return res.status(403).json({ error: 'Not allowed to delete for everyone' });
      await pool.query('DELETE FROM messages WHERE id = $1', [msgId]);
      return res.json({ ok: true, deleted: true });
    } else {
      // delete for me: insert into user_deleted_messages
      await pool.query('INSERT INTO user_deleted_messages (user_id, message_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [uid, msgId]);
      return res.json({ ok: true, deletedForMe: true });
    }
  } catch (err) {
    console.error('DELETE message error', err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
});

/**
 * POST /api/chat
 * body: { conversationId, text, replyTo, settings }
 * Synchronous path: save user message, call model with recent context, save assistant reply, return reply.
 * If model fails or times out -> enqueue job for background worker and return { pending: true }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const decoded = await verifyTokenFromHeader(req);
    const uid = decoded.uid;
    const { conversationId, text, replyTo, settings } = req.body || {};

    if (!conversationId || !text) return res.status(400).json({ error: 'conversationId and text required' });

    // ensure conversation exists and (optionally) user has access
    const convRow = (await pool.query('SELECT * FROM conversations WHERE id = $1', [conversationId])).rows[0];
    if (!convRow) return res.status(404).json({ error: 'Conversation not found' });

    // Save user message
    const msgId = uuidv4();
    await pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, role, text, meta) VALUES ($1,$2,$3,$4,$5,$6)`,
      [msgId, conversationId, uid, 'user', text, JSON.stringify({ replyTo: replyTo || null })]
    );
    await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);

    // Build context (last N messages)
    const maxMessages = (settings && settings.maxMessages) ? Number(settings.maxMessages) : 20;
    const recent = await loadRecentMessages(conversationId, maxMessages);
    // Map to model messages: role mapping: 'user'/'assistant' => same, include system optionally
    const modelMessages = recent.map(r => ({
      role: r.role === 'assistant' ? 'assistant' : (r.role === 'system' ? 'system' : 'user'),
      content: r.text || ''
    }));
    // Append current user message at end (if not present)
    modelMessages.push({ role: 'user', content: text });

    // Attempt to call model synchronously
    try {
      const replyText = await callModel(modelMessages, { model: settings?.model, timeoutMs: 25000 });
      // Save assistant reply
      const replyId = uuidv4();
      await pool.query(
        `INSERT INTO messages (id, conversation_id, sender_id, role, text, meta) VALUES ($1,$2,$3,$4,$5,$6)`,
        [replyId, conversationId, 'aiva_bot', 'assistant', replyText, JSON.stringify({ generatedBy: 'model', model: settings?.model || null })]
      );
      await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);

      return res.json({ reply: replyText, saved: true });
    } catch (modelErr) {
      console.error('Model call failed synchronously, enqueuing job:', modelErr && modelErr.message ? modelErr.message : modelErr);
      // create job for background processing
      const jobId = uuidv4();
      await pool.query(
        `INSERT INTO jobs (id, conversation_id, type, payload, attempts, status) VALUES ($1,$2,$3,$4,0,'pending')`,
        [jobId, conversationId, 'generate-reply', JSON.stringify({ conversationId, userMessageId: msgId, settings }),]
      );
      return res.status(202).json({ pending: true, jobId });
    }
  } catch (err) {
    console.error('POST /api/chat error', err);
    res.status(err.status || 500).json({ error: err.message || 'Server error' });
  }
});

/* --------------------
   Background job worker (simple polling)
   - picks pending jobs, marks processing, runs model call, saves reply
   - retries up to 3 attempts
   -------------------- */
const JOB_POLL_INTERVAL_MS = Number(process.env.JOB_POLL_INTERVAL_MS || 5000);
async function processJobs() {
  try {
    const q = await pool.query("SELECT id, payload, attempts FROM jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 2");
    for (const job of q.rows) {
      const jobId = job.id;
      // mark processing
      await pool.query("UPDATE jobs SET status='processing', updated_at = NOW() WHERE id = $1", [jobId]);
      let payload = job.payload;
      if (typeof payload === 'string') payload = JSON.parse(payload);
      try {
        // rebuild context and call model
        const convId = payload.conversationId;
        const settings = payload.settings || {};
        const recent = await loadRecentMessages(convId, settings.maxMessages || 20);
        const modelMessages = recent.map(r => ({ role: r.role === 'assistant' ? 'assistant' : 'user', content: r.text || '' }));
        // Optionally ensure the user message is last (if payload contains)
        if (payload.userMessageId) {
          const userMsgRow = (await pool.query('SELECT text FROM messages WHERE id = $1', [payload.userMessageId])).rows[0];
          if (userMsgRow) modelMessages.push({ role: 'user', content: userMsgRow.text });
        }
        const replyText = await callModel(modelMessages, { model: settings.model, timeoutMs: 45000 });

        // save assistant reply
        const replyId = uuidv4();
        await pool.query(
          `INSERT INTO messages (id, conversation_id, sender_id, role, text, meta) VALUES ($1,$2,$3,$4,$5,$6)`,
          [replyId, convId, 'aiva_bot', 'assistant', replyText, JSON.stringify({ generatedBy: 'job', jobId })]
        );
        await pool.query("UPDATE jobs SET status='done', updated_at = NOW() WHERE id = $1", [jobId]);
        await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [convId]);
      } catch (innerErr) {
        console.error('Job processing error', jobId, innerErr);
        const attempts = (job.attempts || 0) + 1;
        const status = attempts >= 3 ? 'failed' : 'pending';
        await pool.query("UPDATE jobs SET attempts = $1, last_error = $2, status = $3, updated_at = NOW() WHERE id = $4",
          [attempts, String(innerErr).slice(0,1000), status, jobId]);
      }
    }
  } catch (e) {
    console.error('processJobs loop error', e);
  }
}
// Start job processor interval
setInterval(processJobs, JOB_POLL_INTERVAL_MS);

/* --------------------
   Cron job example (cleanup: delete jobs older than 30 days, or old messages)
   Runs daily at 03:00
   -------------------- */
cron.schedule('0 3 * * *', async () => {
  try {
    console.log('Running daily cleanup cron');
    await pool.query("DELETE FROM jobs WHERE status IN ('done','failed') AND created_at < NOW() - INTERVAL '30 days'");
    // optional: archive or delete very old conversations/messages if desired
  } catch (e) {
    console.error('Cron cleanup error', e);
  }
});

/* --------------------
   Healthcheck
   -------------------- */
app.get('/', (req, res) => res.json({ ok: true, service: 'aiva-proxy' }));

/* --------------------
   Start server
   -------------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AiVA server listening on port ${PORT}`);
});
