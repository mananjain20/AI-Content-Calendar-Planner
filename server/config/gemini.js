import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initializes and returns the Gemini Generative AI client instance.
 * Reads GEMINI_API_KEY privately from server/.env.
 */
export const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error(
      'GEMINI_API_KEY is not configured in server/.env. Please add your key to server/.env'
    );
  }

  return new GoogleGenerativeAI(apiKey);
};

/**
 * Returns a configured model instance with JSON response enforcement.
 * Defaults to gemini-2.0-flash (stable public Google AI Studio model).
 */
export const getCalendarModel = (modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash') => {
  const genAI = getGeminiClient();

  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.7,
      topP: 0.95
    }
  });
};
