// server.js
require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch'); // v2 compatible
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const HF_TOKEN = process.env.HF_TOKEN;
const HF_MODEL = process.env.HF_MODEL || 'openai/gpt-oss-120b:together';
const HF_URL = 'https://router.huggingface.co/v1/chat/completions';

if (!HF_TOKEN) console.warn('HF_TOKEN not set. /ai-move will fail without it.');

function buildMessages(state) {
  const system = {
    role: "system",
    content:
`You are a Dot & Box move selector. You will be given the current board state as a JSON string by the user.
Your ONLY job: output EXACTLY one JSON object and nothing else (no commentary, no markdown).
The JSON must be parseable and exactly match this schema:
{ "row": <integer>, "col": <integer>, "explanation": "<short reason, max 80 chars>" }
Rows and cols use the same grid indexing as the client (size = boardSize*2-1). Valid moves are cells where (row%2==0 xor col%2==0) and not both even.
Prefer moves that complete a box immediately. Otherwise prefer safe moves that do NOT create a 3-sided box for the opponent.
If no valid moves exist, output { "row": -1, "col": -1, "explanation": "no moves" }`
  };

  const user = {
    role: "user",
    content: JSON.stringify(state)
  };

  return [system, user];
}

app.post('/ai-move', async (req, res) => {
  try {
    const state = req.body;
    if (!state || typeof state.boardSize !== 'number' || !Array.isArray(state.lines)) {
      return res.status(400).json({ error: 'invalid state payload' });
    }

    const messages = buildMessages(state);
    const payload = { model: HF_MODEL, messages, max_tokens: 128, temperature: 0.0 };

    const hfResp = await fetch(HF_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${HF_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!hfResp.ok) {
      const txt = await hfResp.text();
      console.error('HF error', hfResp.status, txt);
      return res.status(502).json({ error: 'HuggingFace API error', details: txt });
    }

    const result = await hfResp.json();
    let assistantContent = null;
    if (result?.choices?.length) {
      assistantContent = result.choices[0]?.message?.content ?? result.choices[0]?.text ?? null;
    } else {
      assistantContent = JSON.stringify(result);
    }

    // extract first JSON object from assistantContent
    let parsed = null;
    try {
      const match = assistantContent.match(/{[\s\S]*}/);
      if (match) parsed = JSON.parse(match[0]);
      else parsed = JSON.parse(assistantContent);
    } catch (e) {
      console.warn('parse failed, assistantContent=', assistantContent);
      // fallback: simple heuristic pick first available
      const size = state.boardSize*2-1;
      outer:
      for (let r=0;r<size;r++){
        for (let c=0;c<size;c++){
          const key = `${r}-${c}`;
          if ((r%2===0||c%2===0) && !(r%2===0 && c%2===0) && !state.lines.includes(key)) {
            parsed = { row: r, col: c, explanation: 'fallback-first-available' };
            break outer;
          }
        }
      }
      if (!parsed) parsed = { row: -1, col: -1, explanation: 'no moves' };
    }

    // sanitize to ensure valid numbers
    parsed.row = Number(parsed.row);
    parsed.col = Number(parsed.col);
    parsed.explanation = String(parsed.explanation || '');

    return res.json({ row: parsed.row, col: parsed.col, explanation: parsed.explanation, raw: assistantContent });
  } catch (err) {
    console.error('server error /ai-move', err);
    return res.status(500).json({ error: 'server error', details: String(err) });
  }
});

// Serve static (optional): put your public/ dir next to server.js
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

app.listen(PORT, ()=> console.log(`AI server running on port ${PORT}`));
