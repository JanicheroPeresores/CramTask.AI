import axios from 'axios';

const FALLBACK_REPLY = {
  content:
    "I can't fully understand and answer your question right now. Could you try asking in a different way?",
};

const FALLBACK_REPLY_TL = {
  content:
    "Hindi ko lubusang maintindihan at masagot ang tanong mo ngayon. Pwede mo bang subukan itong itanong sa ibang paraan?",
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
