import axios from 'axios';

const FALLBACK_REPLY = {
  content:
    'I can help you prioritize assignments, turn a deadline into a study plan, or break a big project into the next three steps. Ask me what to do first, how to handle an overdue item, or how to prepare for a due date.',
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
    return content ? { content } : FALLBACK_REPLY;
  } catch (error) {
    console.error('Error calling dashboard assistant AI:', error);
    return FALLBACK_REPLY;
  }
};
