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

  const defaultGenerationConfig = {
    temperature: 0.7,
    maxOutputTokens: 800,
  };

  const mergedGenerationConfig = {
    ...defaultGenerationConfig,
    ...(generationConfig || {}),
  };

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
      generationConfig: mergedGenerationConfig,
    }),
  });

  if (!response.ok) {
    await response.text().catch(() => {});
    throw new Error(`I can't fully understand and answer your question right now. Could you try asking in a different way?`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
};
