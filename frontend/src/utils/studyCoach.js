const buildFallbackFeedback = ({ isCorrect, correctAnswer, mode }) => {
  if (mode === 'hint') {
    return {
      summary: 'Hint mode.',
      hint: 'Focus on the main concept in the question, then eliminate any choices that do not fit that concept.',
    };
  }

  if (isCorrect) {
    return {
      summary: 'Correct answer.',
      hint: 'Your answer matches the expected solution. Try explaining why it works in one sentence.',
    };
  }

  return {
    summary: 'Not quite yet.',
    hint: `Compare your answer with the expected answer: ${correctAnswer}. Focus on the part of the question that your answer may have missed.`,
  };
};

export const reviewAnswerWithGemini = async ({ question, userAnswer, correctAnswer, isCorrect, questionType, mode = 'review' }) => {
  const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
  if (!apiKey) {
    return buildFallbackFeedback({ isCorrect, correctAnswer, mode });
  }

  const prompt = mode === 'hint'
    ? `You are a helpful study coach. Give a short hint without revealing the full answer.\n\nQuestion: ${question}\nQuestion type: ${questionType || 'free-response'}\nStudent answer: ${userAnswer || 'Not provided'}\nCorrect answer: ${correctAnswer || 'Not provided'}\n\nRespond with a concise hint in 2-4 sentences. Do not reveal the final answer.`
    : isCorrect
      ? `You are a helpful study coach. The student answered correctly.\n\nQuestion: ${question}\nQuestion type: ${questionType || 'free-response'}\nStudent answer: ${userAnswer}\nCorrect answer: ${correctAnswer}\n\nGive a short congratulatory confirmation and one brief follow-up insight that helps the student deepen understanding. Do not be verbose.`
      : `You are a helpful study coach. The student answered incorrectly.\n\nQuestion: ${question}\nQuestion type: ${questionType || 'free-response'}\nStudent answer: ${userAnswer}\nCorrect answer: ${correctAnswer}\n\nGive a short, encouraging hint that nudges the student toward the correct answer without directly repeating it. Do not reveal the full answer. Keep it to 2-4 sentences.`;

  try {
    const url = new URL('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent');
    url.searchParams.append('key', apiKey);

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!text) {
      return buildFallbackFeedback(isCorrect, question, userAnswer, correctAnswer);
    }

    return {
      summary: isCorrect ? 'Correct answer.' : 'Not quite yet.',
      hint: text,
    };
  } catch (error) {
    console.error('Error calling Gemini study coach:', error);
    return buildFallbackFeedback(isCorrect, question, userAnswer, correctAnswer);
  }
};
