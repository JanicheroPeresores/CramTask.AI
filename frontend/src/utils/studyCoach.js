import axios from 'axios';

const buildFallbackFeedback = ({ isCorrect, correctAnswer, mode }) => {
  if (mode === 'hint') {
    return {
      summary: "I can't give you a hint right now.",
      hint: "I'm having trouble understanding what you need. Could you rephrase the question or try again?",
    };
  }

  if (isCorrect) {
    return {
      summary: "That looks right!",
      hint: "I can't give you a detailed explanation right now, but your answer matches what was expected. If you want a deeper explanation, try asking in a different way.",
    };
  }

  return {
    summary: "Not quite.",
    hint: "I can't fully figure out where you went wrong at the moment. Maybe try reading the question again and see if there's a key detail you missed?",
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
        summary: 'A bit overwhelmed here!',
        hint: trimmed,
      };
    }

    return buildFallbackFeedback({ isCorrect, correctAnswer, mode });
  }
};
