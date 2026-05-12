import axios from 'axios';

const FALLBACK_REPLY = {
  content:
    'I can help you prioritize assignments, turn a deadline into a study plan, or break a big project into the next three steps. What are you working on right now?',
};

export const sendDashboardAssistantMessage = async ({ messages = [], userName = 'Student' }) => {
  try {
    const token = localStorage.getItem('token');

    const response = await axios.post(
      '/api/ai/dashboard-assistant',
      { messages, userName },
      {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }
    );

    const content = response?.data?.content?.trim();
    if (content) return { content };

    // If backend sent a structured error but no `content`, surface it.
    const message = response?.data?.message?.trim();
    return message ? { content: message } : FALLBACK_REPLY;
  } catch (error) {
    console.error('Error calling dashboard assistant AI:', error);

    const backendMessage = error?.response?.data?.message;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return { content: backendMessage.trim() };
    }

    return FALLBACK_REPLY;
  }
};
