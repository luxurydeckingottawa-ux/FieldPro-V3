/**
 * AI client — routes all Gemini calls through the server-side proxy function so
 * the API key is never exposed in the browser bundle.
 *
 * Drop-in replacement for the old GoogleGenAI approach:
 *   const ai = getAI();
 *   const response = await ai.models.generateContent({ model, contents, config });
 *   response.text
 */

const INTERNAL_SECRET = import.meta.env.VITE_INTERNAL_API_SECRET as string | undefined;

interface GenerateContentParams {
  model?: string;
  contents: string | Array<{ role?: string; parts: Array<{ text: string }> }>;
  config?: {
    responseMimeType?: string;
    responseSchema?: unknown;
  };
}

interface GenerateContentResponse {
  text: string;
}

async function generateViaProxy(params: GenerateContentParams): Promise<GenerateContentResponse> {
  // Flatten contents to a single prompt string (covers all current usages which pass a plain string)
  const prompt =
    typeof params.contents === 'string'
      ? params.contents
      : params.contents.map((c) => c.parts.map((p) => p.text).join('\n')).join('\n');

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (INTERNAL_SECRET) headers['X-Internal-Secret'] = INTERNAL_SECRET;

  const response = await fetch('/.netlify/functions/gemini-proxy', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: params.model || 'gemini-2.0-flash',
      prompt,
      responseMimeType: params.config?.responseMimeType,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Gemini proxy error ${response.status}`);
  }

  return { text: data.text || '' };
}

/**
 * Returns a lightweight proxy client with the same shape as GoogleGenAI
 * so geminiService.ts callers require zero changes.
 */
export const getAI = () => ({
  models: {
    generateContent: generateViaProxy,
  },
});

/**
 * Helper to handle AI errors, specifically invalid API keys.
 */
export const handleAiError = async (error: unknown): Promise<string> => {
  const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
  console.error('AI Service Error:', error);

  if (errorMsg.includes('API key not valid') || errorMsg.includes('API_KEY_INVALID')) {
    window.dispatchEvent(new CustomEvent('ai-key-error', {
      detail: { message: 'The Gemini API key on the server is invalid. Contact the administrator.' },
    }));
    return 'The Gemini API key is invalid. Please contact the administrator.';
  }

  return 'An error occurred while communicating with the AI service. Please try again later.';
};
