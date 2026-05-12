const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// Minimal internal helper (uses global fetch if available, otherwise falls back to https)
async function postJson(url, body, headers) {
  const resolvedHeaders = headers || {};
  if (typeof fetch === 'function') {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...resolvedHeaders,
      },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
    return { ok: response.ok, status: response.status, data: parsed, text };
  }

  // Node < 18 fallback
  const https = require('https');
  const { URL } = require('url');

  const u = new URL(url);
  const payload = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: u.hostname,
        path: u.pathname + u.search,
        port: u.port || 443,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          ...resolvedHeaders,
        },
      },
      (res) => {
        let out = '';
        res.on('data', (chunk) => {
          out += chunk;
        });
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(out);
          } catch {
            parsed = null;
          }
          resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, data: parsed, text: out });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

function buildChatMessage({ role, content }) {
  return { role, content };
}

function safeTrim(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

router.post('/dashboard-assistant', authMiddleware, async (req, res) => {
  try {
    const { messages = [], userName = 'Student' } = req.body || {};

    const transcript = Array.isArray(messages)
      ? messages.slice(-10).map((m) => `${m.role === 'user' ? 'Student' : 'Coach'}: ${safeTrim(m.content)}`).join('\n')
      : '';

    const prompt = `You are the AI assistant for Assignment Tracker. Help students organize assignments, prioritize work, and plan study time. Be concise, encouraging, and practical. Avoid long explanations and end with a clear next step when helpful.

Student name: ${safeTrim(userName)}

Conversation:
${transcript}

Reply with 3-6 short sentences.`;

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return res.status(500).json({ message: 'AI not configured' });
    }

    const payload = {
      model: OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: 256,
      messages: [buildChatMessage({ role: 'user', content: prompt })],
    };

    const response = await postJson(
      OPENAI_API_URL,
      payload,
      {
        Authorization: `Bearer ${openAiKey}`,
      }
    );

    if (!response.ok || !response.data) {
      console.error('OpenAI error:', response.status, response.text);
      return res.status(502).json({ message: 'AI request failed' });
    }

    const text = response.data?.choices?.[0]?.message?.content?.trim();
    return res.json({ content: text || 'I can help you organize your next steps.' });
  } catch (err) {
    console.error('Dashboard assistant error:', err);
    return res.status(500).json({ message: 'AI error' });
  }
});

router.post('/study-coach', authMiddleware, async (req, res) => {
  try {
    const {
      question,
      userAnswer,
      correctAnswer,
      isCorrect,
      questionType,
      mode = 'review',
    } = req.body || {};

    const safeQuestion = safeTrim(question);
    const safeUserAnswer = safeTrim(userAnswer);
    const safeCorrectAnswer = safeTrim(correctAnswer);
    const safeQuestionType = safeTrim(questionType) || 'free-response';

    let prompt;
    if (mode === 'hint') {
      prompt = `You are a helpful study coach. Give a short hint without revealing the full answer.\n\nQuestion: ${safeQuestion}\nQuestion type: ${safeQuestionType}\nStudent answer: ${safeUserAnswer || 'Not provided'}\nCorrect answer: ${safeCorrectAnswer || 'Not provided'}\n\nRespond with a concise hint in 2-4 sentences. Do not reveal the final answer.`;
    } else if (isCorrect === true) {
      prompt = `You are a helpful study coach. The student answered correctly.\n\nQuestion: ${safeQuestion}\nQuestion type: ${safeQuestionType}\nStudent answer: ${safeUserAnswer}\nCorrect answer: ${safeCorrectAnswer}\n\nGive a short congratulatory confirmation and one brief follow-up insight that helps the student deepen understanding. Do not be verbose.`;
    } else {
      prompt = `You are a helpful study coach. The student answered incorrectly.\n\nQuestion: ${safeQuestion}\nQuestion type: ${safeQuestionType}\nStudent answer: ${safeUserAnswer}\nCorrect answer: ${safeCorrectAnswer}\n\nGive a short, encouraging hint that nudges the student toward the correct answer without directly repeating it. Do not reveal the full answer. Keep it to 2-4 sentences.`;
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    if (!openAiKey) {
      return res.status(500).json({ message: 'AI not configured' });
    }

    const payload = {
      model: OPENAI_MODEL,
      temperature: 0.7,
      max_tokens: 220,
      messages: [buildChatMessage({ role: 'user', content: prompt })],
    };

    const response = await postJson(
      OPENAI_API_URL,
      payload,
      {
        Authorization: `Bearer ${openAiKey}`,
      }
    );

    if (!response.ok || !response.data) {
      console.error('OpenAI error:', response.status, response.text);
      return res.status(502).json({ message: 'AI request failed' });
    }

    const text = response.data?.choices?.[0]?.message?.content?.trim();

    if (!text) {
      return res.json({ summary: isCorrect === true ? 'Correct answer.' : 'Not quite yet.', hint: 'Try again—focus on the key idea.' });
    }

    return res.json({
      summary: isCorrect === true ? 'Correct answer.' : 'Not quite yet.',
      hint: text,
    });
  } catch (err) {
    console.error('Study coach error:', err);
    return res.status(500).json({ message: 'AI error' });
  }
});

module.exports = router;
