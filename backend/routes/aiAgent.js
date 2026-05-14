const express = require('express');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Gemini (backend env vars)
const GEMINI_API_VERSION = process.env.GEMINI_API_VERSION || 'v1beta';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

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
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            data: parsed,
            text: out,
          });
        });
      }
    );

    req.on('error', (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

function safeTrim(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function buildGeminiUrl({ apiKey }) {
  // Gemini API key is sent as ?key=... (matches Google docs style)
  return `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${encodeURIComponent(
    GEMINI_MODEL
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function buildGeminiContent(prompt) {
  return {
    contents: [{ parts: [{ text: prompt }] }],
  };
}

function extractGeminiText(data) {
  // Typical response: { candidates: [{ content: { parts: [{ text: '...' }]}}]}
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') ||
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    '';
  return typeof text === 'string' ? text.trim() : '';
}

async function callGemini({ apiKey, prompt, temperature = 0.7, maxOutputTokens = 220 }) {
  const url = buildGeminiUrl({ apiKey });

  const body = {
    ...buildGeminiContent(prompt),
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  const response = await postJson(url, body, {});
  if (!response.ok) {
    console.error('Gemini error:', response.status, response.text);
    return { ok: false, status: response.status, data: response.data, text: response.text };
  }

  const text = extractGeminiText(response.data);
  if (!text) {
    console.error('Gemini empty text response:', response.data);
    return { ok: false, status: response.status, data: response.data, text: response.text };
  }

  return { ok: true, status: response.status, text, data: response.data };
}

router.post('/dashboard-assistant', authMiddleware, async (req, res) => {
  try {
    const { messages = [], userName = 'Student' } = req.body || {};

    const safeMessages = Array.isArray(messages)
      ? messages
          .slice(-14)
          .map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: safeTrim(m.content),
          }))
          .filter((m) => m.content)
      : [];

    const system = `You are the AI assistant for Assignment Tracker (a student study coach).
Be friendly and conversational. Help the student organize assignments, prioritize work, and plan study time.
Keep replies short (3-6 sentences), practical, and encourage the next step.
If the student asks for help planning, propose a concrete first action. If the student asks a question, answer it directly.`;

    // Gemini doesn't use role-based chat completions in the same way as OpenAI;
    // flatten into a single prompt.
    const chatHistory = safeMessages
      .map((m) => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `${system}\n\n${chatHistory ? chatHistory + '\n\n' : ''}Student name: ${safeTrim(
      userName
    )}. Respond now:`;

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res
        .status(500)
        .json({ message: 'AI not configured. Set GEMINI_API_KEY in your backend environment.' });
    }

    const geminiResponse = await callGemini({
      apiKey: geminiKey,
      prompt,
      temperature: 0.7,
      maxOutputTokens: 220,
    });

    if (!geminiResponse.ok) {
      return res.status(502).json({ message: 'AI request failed' });
    }

    return res.json({ content: geminiResponse.text });
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
      prompt = `You are a helpful study coach. Give a short hint without revealing the full answer.

Question: ${safeQuestion}
Question type: ${safeQuestionType}
Student answer: ${safeUserAnswer || 'Not provided'}
Correct answer: ${safeCorrectAnswer || 'Not provided'}

Respond with a concise hint in 2-4 sentences. Do not reveal the final answer.`;
    } else if (isCorrect === true) {
      prompt = `You are a helpful study coach. The student answered correctly.

Question: ${safeQuestion}
Question type: ${safeQuestionType}
Student answer: ${safeUserAnswer}
Correct answer: ${safeCorrectAnswer}

Give a short congratulatory confirmation and one brief follow-up insight that helps the student deepen understanding. Do not be verbose.`;
    } else {
      prompt = `You are a helpful study coach. The student answered incorrectly.

Question: ${safeQuestion}
Question type: ${safeQuestionType}
Student answer: ${safeUserAnswer}
Correct answer: ${safeCorrectAnswer}

Give a short, encouraging hint that nudges the student toward the correct answer without directly repeating it. Do not reveal the full answer. Keep it to 2-4 sentences.`;
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res
        .status(500)
        .json({ message: 'AI not configured. Set GEMINI_API_KEY in your backend environment.' });
    }

    const geminiResponse = await callGemini({
      apiKey: geminiKey,
      prompt,
      temperature: 0.7,
      maxOutputTokens: 220,
    });

    if (!geminiResponse.ok) {
      return res.status(502).json({ message: 'AI request failed' });
    }

    const hintText = geminiResponse.text;
    if (!hintText) {
      return res.json({
        summary: isCorrect === true ? 'Correct answer.' : 'Not quite yet.',
        hint: 'Try again—focus on the key idea.',
      });
    }

    return res.json({
      summary: isCorrect === true ? 'Correct answer.' : 'Not quite yet.',
      hint: hintText,
    });
  } catch (err) {
    console.error('Study coach error:', err);
    return res.status(500).json({ message: 'AI error' });
  }
});

module.exports = router;
