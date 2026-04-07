import { GoogleGenAI } from "@google/genai";

declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

/**
 * Creates a fresh instance of GoogleGenAI using the latest environment variables.
 * This ensures we always pick up the most up-to-date API key from the platform.
 */
export const getAI = () => {
  // The platform injects the key into GEMINI_API_KEY or API_KEY
  // We check process.env (defined in vite.config.ts) and import.meta.env as a fallback
  const rawKey = (
    process.env.GEMINI_API_KEY || 
    process.env.API_KEY || 
    (import.meta.env.VITE_GEMINI_API_KEY as string) || 
    (import.meta.env.VITE_API_KEY as string)
  );

  const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';
  
  const isPlaceholder = [
    '',
    'undefined',
    'null',
    'YOUR_GEMINI_API_KEY',
    'YOUR_API_KEY',
    'REPLACE_WITH_YOUR_KEY'
  ].includes(apiKey.toLowerCase()) || apiKey.length < 5; // Real keys are much longer
  
  if (isPlaceholder) {
    // If we're in AI Studio and no key is set, we might need to prompt
    if (window.aistudio) {
      window.aistudio.hasSelectedApiKey().then(hasKey => {
        if (!hasKey) {
          console.warn("No API key selected in AI Studio. Opening selector...");
          window.aistudio?.openSelectKey();
        }
      });
    }

    const msg = "Gemini API Key is missing or invalid. Please provide a valid API key in the Settings menu (GEMINI_API_KEY).";
    console.error(msg);
    throw new Error(msg);
  }
  
  // Basic format check for AIza...
  if (!apiKey.startsWith('AIza')) {
    console.warn("API Key does not start with 'AIza'. This might be an invalid Gemini API key.");
  }
  
  return new GoogleGenAI({ apiKey });
};

/**
 * Helper to handle AI errors, specifically invalid API keys.
 */
export const handleAiError = async (error: any) => {
  const errorMsg = error?.message || JSON.stringify(error);
  console.error("AI Service Error:", error);

  if (errorMsg.includes('API key not valid') || errorMsg.includes('API_KEY_INVALID')) {
    // Dispatch a custom event so the UI can show a warning
    window.dispatchEvent(new CustomEvent('ai-key-error', { 
      detail: { message: "Your Gemini API key is invalid or missing." } 
    }));

    if (window.aistudio) {
      console.warn("Detected invalid API key. Opening AI Studio key selector...");
      await window.aistudio.openSelectKey();
      return "Your API key is invalid. Please select a valid key in the dialog that appeared.";
    }
    return "The Gemini API key provided is invalid. Please check your settings.";
  }

  return "An error occurred while communicating with the AI service. Please try again later.";
};
