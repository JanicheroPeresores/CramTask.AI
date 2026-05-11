import { generateGeminiContent, getGeminiApiKey } from './geminiClient';

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
  if (!getGeminiApiKey()) {
    return buildFallbackFeedback({ isCorrect, correctAnswer, mode });
  }

  const prompt = mode === 'hint'
    ? `You are a helpful study coach. Give a short hint without revealing the full answer.\n\nQuestion: ${question}\nQuestion type: ${questionType || 'free-response'}\nStudent answer: ${userAnswer || 'Not provided'}\nCorrect answer: ${correctAnswer || 'Not provided'}\n\nRespond with a concise hint in 2-4 sentences. Do not reveal the final answer.`
    : isCorrect
      ? `You are a helpful study coach. The student answered correctly.\n\nQuestion: ${question}\nQuestion type: ${questionType || 'free-response'}\nStudent answer: ${userAnswer}\nCorrect answer: ${correctAnswer}\n\nGive a short congratulatory confirmation and one brief follow-up insight that helps the student deepen understanding. Do not be verbose.`
      : `You are a helpful study coach. The student answered incorrectly.\n\nQuestion: ${question}\nQuestion type: ${questionType || 'free-response'}\nStudent answer: ${userAnswer}\nCorrect answer: ${correctAnswer}\n\nGive a short, encouraging hint that nudges the student toward the correct answer without directly repeating it. Do not reveal the full answer. Keep it to 2-4 sentences.`;

  try {
    const text = await generateGeminiContent({ prompt });

    if (!text) {
      return buildFallbackFeedback({ isCorrect, correctAnswer, mode });
    }

    return {
      summary: isCorrect ? 'Correct answer.' : 'Not quite yet.',
      hint: text,
    };
  } catch (error) {
    console.error('Error calling Gemini study coach:', error);
    return buildFallbackFeedback({ isCorrect, correctAnswer, mode });
  }
};
