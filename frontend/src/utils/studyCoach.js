import axios from 'axios';

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
    hint: 'Compare your answer with the key idea the question is testing, then re-check where your reasoning diverged.',
  };
};

export const reviewAnswerWithGemini = async ({
  question,
  userAnswer,
  correctAnswer,
  isCorrect,
  questionType,
  mode = 'review',
}) => {
  try {
    const token = localStorage.getItem('token');

    const response = await axios.post(
      '/api/ai/study-coach',
      { question, userAnswer, correctAnswer, isCorrect, questionType, mode },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );

    const summary = response?.data?.summary;
    const hint = response?.data?.hint;

    if (!summary || !hint) {
      return buildFallbackFeedback({ isCorrect, correctAnswer, mode });
    }

    return { summary, hint };
  } catch (error) {
    console.error('Error calling AI study coach:', error);

    const backendMessage = error?.response?.data?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      const trimmed = backendMessage.trim();
      return {
        summary: 'Rate limited.',
        hint: trimmed,
      };
    }

    return buildFallbackFeedback({ isCorrect, correctAnswer, mode });
  }
};
