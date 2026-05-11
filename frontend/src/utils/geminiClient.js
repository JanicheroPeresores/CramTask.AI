const GEMINI_MODEL = process.env.REACT_APP_GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_API_VERSION = process.env.REACT_APP_GEMINI_API_VERSION || 'v1beta';

export const getGeminiApiKey = () => process.env.REACT_APP_GEMINI_API_KEY;

export const generateGeminiContent = async ({ prompt, generationConfig }) => {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const url = new URL(
    `https://generativelanguage.googleapis.com/${GEMINI_API_VERSION}/models/${GEMINI_MODEL}:generateContent`
  );
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
      ...(generationConfig ? { generationConfig } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Gemini API error: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
};
