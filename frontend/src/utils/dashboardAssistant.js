import axios from 'axios';

const FALLBACK_REPLY = {
  content:
    'I can help you prioritize assignments, turn a deadline into a study plan, or break a big project into the next three steps. What are you working on right now?',
};

const FALLBACK_REPLY_TL = {
  content:
    'Matutulungan kitang ayusin ang priorities, gawing study plan ang deadline, o hatiin ang malaking project sa susunod na tatlong steps. Ano ang ginagawa mo ngayon?',
};

export const sendDashboardAssistantMessage = async ({
  messages = [],
  userName = 'Student',
  language = 'en',
  assignments = [],
}) => {
  const fallback = language === 'tl' ? FALLBACK_REPLY_TL : FALLBACK_REPLY;

  try {
    const token = localStorage.getItem('token');

    const response = await axios.post(
      '/api/ai/dashboard-assistant',
      { messages, userName, language, assignments },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );

    const content = response?.data?.content?.trim();
    if (content) return { content };

    // If backend sent a structured error but no `content`, surface it.
    const message = response?.data?.message?.trim();
    return message ? { content: message } : fallback;
  } catch (error) {
    console.error('Error calling dashboard assistant AI:', error);

    const backendMessage = error?.response?.data?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return { content: backendMessage.trim() };
    }

    return fallback;
  }
};
