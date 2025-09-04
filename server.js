// server.js - Express proxy for AI queries (HuggingFace router)
// Usage: set HF_TOKEN and optionally HF_MODEL, FRONTEND_ORIGIN, PORT in .env
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch'); // node-fetch v2
require('dotenv').config();

const app = express();

// CORS - restrict in production by setting FRONTEND_ORIGIN env
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || '*'
}));
app.use(bodyParser.json({ limit: '1mb' }));

// Simple health endpoint
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'aiva-proxy', env: process.env.NODE_ENV || 'development' });
});

// Low-level HF query helper
async function queryHF(payload) {
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) throw new Error('HF_TOKEN not set');

  const url = process.env.HF_BASE_URL || 'https://router.huggingface.co/v1/chat/completions';
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload),
    // optionally add a timeout wrapper in production
  });

  // try to parse JSON; if non-JSON returned, throw
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    // include response text for debugging
    throw new Error(`Non-JSON response from HF: ${text}`);
  }
}

// POST /api/query
// Accepts body.messages (array of {role, content}) or body.message (string)
// Optional: body.model (overrides env HF_MODEL)
app.post('/api/query', async (req, res) => {
  try {
    if (!process.env.HF_TOKEN) {
      return res.status(500).json({ error: 'HF_TOKEN not set on server' });
    }

    const body = req.body || {};
    let messages = [];

    if (Array.isArray(body.messages) && body.messages.length) {
      messages = body.messages;
    } else if (body.message && typeof body.message === 'string') {
      messages = [{ role: 'user', content: body.message }];
    } else {
      return res.status(400).json({ error: 'Provide messages array or message string' });
    }

    // Build payload for HF / router
    const payload = Object.assign({}, body);
    payload.messages = messages;
    payload.model = payload.model || process.env.HF_MODEL || 'openai/gpt-oss-120b:together';

    // Forward to HF
    const hfResp = await queryHF(payload);

    // Robustly extract reply text from HF response shapes
    let replyText = '';
    try {
      if (hfResp.choices && Array.isArray(hfResp.choices) && hfResp.choices.length) {
        // new style: choices[0].message.content
        const c0 = hfResp.choices[0];
        if (c0.message && (c0.message.content || c0.message.content === '')) {
          replyText = c0.message.content;
        } else if (typeof c0.text === 'string' && c0.text.length) {
          replyText = c0.text;
        } else if (c0.delta && c0.delta.content) {
          // streaming chunk fallback
          replyText = c0.delta.content;
        }
      }
      if (!replyText && hfResp.output && Array.isArray(hfResp.output) && hfResp.output[0] && hfResp.output[0].content) {
        replyText = hfResp.output[0].content;
      }
      if (!replyText && typeof hfResp === 'string') {
        replyText = hfResp;
      }
      if (!replyText && !replyText.length) {
        // fallback: stringify limited portion
        replyText = JSON.stringify(hfResp).slice(0, 2000);
      }
    } catch (err) {
      replyText = 'Unable to parse HF response';
    }

    return res.json({ ok: true, replyText, result: hfResp });
  } catch (err) {
    console.error('Error /api/query:', err && err.stack ? err.stack : err);
    // don't leak secrets in error responses
    return res.status(500).json({ error: 'Server error' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`AiVA proxy listening on port ${PORT}`);
});
