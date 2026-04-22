import { GoogleGenAI } from "@google/genai";

export function getApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_APIKEY || undefined;
}

export function createClient() {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({ apiKey });
}
