const express = require('express');
const authMiddleware = require('../middleware/auth');
const GoogleClassroomCredentials = require('../models/GoogleClassroomCredentials');
const GoogleClassroomAssignment = require('../models/GoogleClassroomAssignment');
const { syncAllAssignments } = require('../utils/googleClassroom');

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

function safeText(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return safeTrim(String(value));
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

function normalizeAssignmentContext(assignments) {
  if (!Array.isArray(assignments)) return [];

  return assignments
    .map((assignment) => ({
      title: safeTrim(assignment.title || assignment.assignment_title),
      course: safeTrim(assignment.course || assignment.course_name),
      subject: safeTrim(assignment.subject),
      dueDate: safeText(assignment.dueDate || assignment.due_date),
      dueTime: safeTrim(assignment.dueTime || assignment.due_time),
      priority: safeTrim(assignment.priority),
      status: safeTrim(assignment.status || assignment.submission_status),
      source: safeTrim(assignment.source),
      classroomId: safeText(assignment.classroomId || assignment.google_classroom_id),
      link: safeTrim(assignment.link || assignment.alternate_link),
      description: safeTrim(assignment.description).slice(0, 240),
    }))
    .filter((assignment) => assignment.title || assignment.course || assignment.dueDate);
}

function dedupeAssignmentContext(assignments) {
  const seen = new Set();

  return assignments.filter((assignment) => {
    const key = assignment.classroomId
      ? `classroom:${assignment.classroomId}`
      : `${assignment.source || 'dashboard'}:${assignment.title}:${assignment.course}:${assignment.dueDate}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function buildAssignmentContextText(assignments) {
  if (!assignments.length) {
    return 'No saved assignments were provided from the dashboard yet.';
  }

  const now = new Date();
  const rows = assignments.map((assignment, index) => {
    const due = assignment.dueDate ? new Date(assignment.dueDate) : null;
    const daysUntilDue =
      due && !Number.isNaN(due.getTime())
        ? Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

    const timing =
      daysUntilDue === null
        ? 'no due date'
        : daysUntilDue < 0
        ? `${Math.abs(daysUntilDue)} day(s) overdue`
        : daysUntilDue === 0
        ? 'due today'
        : `due in ${daysUntilDue} day(s)`;

    return `${index + 1}. ${assignment.title || 'Untitled'} | source: ${
      assignment.source || 'dashboard'
    } | course: ${
      assignment.course || 'not set'
    } | subject: ${assignment.subject || 'not set'} | due: ${
      assignment.dueDate || 'not set'
    }${assignment.dueTime ? ` at ${assignment.dueTime}` : ''
    } (${timing}) | priority: ${assignment.priority || 'not set'} | status: ${
      assignment.status || 'not set'
    }${assignment.link ? ` | link: ${assignment.link}` : ''}${
      assignment.description ? ` | notes: ${assignment.description}` : ''
    }`;
  });

  return rows.join('\n');
}

function extractGeminiText(data) {
  // Typical response: { candidates: [{ content: { parts: [{ text: '...' }]}}]}
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('') ||
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    '';
  return typeof text === 'string' ? text.trim() : '';
}

async function callGemini({ apiKey, prompt, temperature = 0.7, maxOutputTokens = 800 }) {
  const url = buildGeminiUrl({ apiKey });

  const body = {
    ...buildGeminiContent(prompt),
    generationConfig: {
      temperature,
      maxOutputTokens,
    },
  };

  const maxAttempts = 3;
  const baseRetryMs = 2000;
  const maxRetryDelayMs = 5000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await postJson(url, body, {});
    if (!response.ok) {
      const status = response.status;

      // Gemini quota/rate limiting: retry a couple times
      const isRetryable429 = status === 429;

      if (isRetryable429 && attempt < maxAttempts) {
        const retryDelayRaw = response?.data?.error?.details?.[2]?.retryDelay;
        const retryDelayMsCalculated = typeof retryDelayRaw === 'string'
          ? Math.ceil(parseFloat(retryDelayRaw.replace('s', '')) * 1000) || baseRetryMs
          : baseRetryMs;

        const retryDelayMs = Math.min(retryDelayMsCalculated, maxRetryDelayMs);

        console.warn(`Gemini 429 received. Retrying attempt ${attempt + 1}/${maxAttempts} in ${retryDelayMs}ms...`);
        await new Promise((r) => setTimeout(r, retryDelayMs));
        continue;
      }

      const retryDelayRaw =
        response?.data?.error?.details?.[2]?.retryDelay ||
        response?.data?.error?.retryDelay;

      const retryAfterMs =
        typeof retryDelayRaw === 'string'
          ? Math.ceil(parseFloat(retryDelayRaw.replace('s', '')) * 1000) || undefined
          : undefined;

      console.error('Gemini error:', status, response.text);
      return { ok: false, status, data: response.data, text: response.text, retryAfterMs };
    }

    const text = extractGeminiText(response.data);
    if (!text) {
      console.error('Gemini empty text response:', response.data);
      return { ok: false, status: response.status, data: response.data, text: response.text };
    }

    return { ok: true, status: response.status, text, data: response.data };
  }

  // Should be unreachable due to returns, but keeps TS/linters happy.
  return { ok: false, status: 500, data: null, text: 'Gemini request failed after retries.' };
}

router.post('/dashboard-assistant', authMiddleware, async (req, res) => {
  try {
    const { messages = [], userName = 'Student', language = 'en', assignments = [] } = req.body || {};
    const dashboardAssignmentContext = normalizeAssignmentContext(assignments);
    let classroomAssignmentContext = [];

    try {
      const classroomCredentials = await GoogleClassroomCredentials.getByUserId(req.userId);
      if (classroomCredentials) {
        const syncedAssignments = await syncAllAssignments(classroomCredentials, req.userId);
        await GoogleClassroomAssignment.replaceForUser(req.userId, syncedAssignments);
      }

      const classroomAssignments = await GoogleClassroomAssignment.getByUserId(req.userId);
      classroomAssignmentContext = normalizeAssignmentContext(
        classroomAssignments.map((assignment) => ({
          ...assignment,
          source: 'Google Classroom',
        }))
      );
    } catch (err) {
      console.warn('Could not refresh Google Classroom assignments for AI context:', err.message);

      try {
        const classroomAssignments = await GoogleClassroomAssignment.getByUserId(req.userId);
        classroomAssignmentContext = normalizeAssignmentContext(
          classroomAssignments.map((assignment) => ({
            ...assignment,
            source: 'Google Classroom',
          }))
        );
      } catch (fallbackErr) {
        console.warn('Could not load saved Google Classroom assignments for AI context:', fallbackErr.message);
      }
    }

    const assignmentContext = dedupeAssignmentContext([
      ...dashboardAssignmentContext,
      ...classroomAssignmentContext,
    ])
      .sort((a, b) => new Date(a.dueDate || '9999-12-31') - new Date(b.dueDate || '9999-12-31'))
      .slice(0, 50);

    const safeMessages = Array.isArray(messages)
      ? messages
          .slice(-14)
          .map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: safeTrim(m.content),
          }))
          .filter((m) => m.content)
      : [];

    const responseLanguage =
      language === 'tl'
        ? 'Respond in natural Filipino/Taglish. Keep common technical terms in English when they are clearer.'
        : 'Respond in simple, clear English.';

    const system = `You are the AI assistant inside Assignment Tracker.
Be friendly, conversational, and useful. You can help with assignments, study planning, school topics, basic math, writing, explanations, brainstorming, and general student questions.
You can see the user's current dashboard and Google Classroom assignments below. When the user asks what is posted, what is nearly due, what was added or removed, what to do first, or asks for planning, use this assignment context before giving advice.
The assignment context is refreshed from saved Google Classroom sync data on every chat request, so treat it as the current known assignment list.
Treat "nearly due" as due today, overdue, or due within the next 3 days unless the user gives a different window.
Answer the user's actual question directly, even when it is not about assignments. For math questions, show the key steps and the final answer.
Keep replies short by default (3-6 sentences), practical, and easy to understand. If the user asks for help planning, propose a concrete first action.
${responseLanguage}`;

    const assignmentContextText = buildAssignmentContextText(assignmentContext);

    // Gemini doesn't use role-based chat completions in the same way as OpenAI;
    // flatten into a single prompt.
    const chatHistory = safeMessages
      .map((m) => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = `${system}\n\nCurrent saved assignments:\n${assignmentContextText}\n\n${chatHistory ? chatHistory + '\n\n' : ''}Student name: ${safeTrim(
      userName
    )}. Respond now:`;

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return res
        .status(500)
        .json({ message: "The AI assistant isn't fully set up yet. Let your teacher know to add the API key in the backend settings." });
    }

    const geminiResponse = await callGemini({
      apiKey: geminiKey,
      prompt,
      temperature: 0.7,
      maxOutputTokens: 800,
    });

    if (!geminiResponse.ok) {
      if (geminiResponse.status === 429) {
        const seconds =
          typeof geminiResponse.retryAfterMs === 'number'
            ? Math.ceil(geminiResponse.retryAfterMs / 1000)
            : undefined;

        return res.status(429).json({
          message: seconds
            ? `Whoa, slow down! The AI needs a ${seconds}-second break before I can answer your next question.`
            : 'I got a bit overwhelmed with requests. Give me a moment and try again.',
          retryAfterSeconds: seconds,
        });
      }

      return res.status(502).json({ message: "I can't fully understand and answer your question right now. Could you try asking in a different way?" });
    }

    return res.json({ content: geminiResponse.text });
  } catch (err) {
    console.error('Dashboard assistant error:', err);
    return res.status(500).json({ message: "Something went wrong on my end. Can you ask that again?" });
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
        .json({ message: "The study coach isn't ready yet. Ask your teacher to add the API key so I can help you study!" });
    }

    const geminiResponse = await callGemini({
      apiKey: geminiKey,
      prompt,
      temperature: 0.7,
      maxOutputTokens: 800,
    });

    if (!geminiResponse.ok) {
      if (geminiResponse.status === 429) {
        const seconds =
          typeof geminiResponse.retryAfterMs === 'number'
            ? Math.ceil(geminiResponse.retryAfterMs / 1000)
            : undefined;

        return res.status(429).json({
          message: seconds
            ? `You're asking too fast! Wait ${seconds}s and I'll be ready to help.`
            : 'I need a short breather before the next question. Try again in a few seconds.',
          retryAfterSeconds: seconds,
        });
      }

      return res.status(502).json({ message: "I can't fully understand and answer your question right now. Could you try asking in a different way?" });
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
    return res.status(500).json({ message: "Something went wrong on my end. Can you ask that again?" });
  }
});

module.exports = router;
