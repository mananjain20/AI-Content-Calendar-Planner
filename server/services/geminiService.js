import { getCalendarModel, getGeminiClient } from '../config/gemini.js';
import { SYSTEM_INSTRUCTION, buildCalendarPrompt } from '../prompts/calendarPrompt.js';

/**
 * Strips markdown code blocks (e.g. ```json ... ```) from LLM output.
 * Guarantees safe parsing even if the model encloses its response in backticks.
 */
const sanitizeJsonResponse = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response received from AI model');
  }

  let cleaned = rawText.trim();

  // Strip leading markdown backticks
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
    cleaned = cleaned.replace(/\s*```$/, '');
  }

  return cleaned.trim();
};

/**
 * Ensures all posts have valid sequential ISO dates based on campaign start date.
 */
const ensureSequentialDates = (posts, startDate) => {
  const baseDate = new Date(startDate || new Date().toISOString().split('T')[0]);

  return posts.map((post, idx) => {
    const dayOffset = (post.dayNumber && post.dayNumber > 0) ? (post.dayNumber - 1) : idx;
    const targetDate = new Date(baseDate);
    targetDate.setDate(baseDate.getDate() + dayOffset);
    const dateStr = targetDate.toISOString().split('T')[0];

    return {
      ...post,
      dayNumber: post.dayNumber || (idx + 1),
      scheduledDate: post.scheduledDate && !isNaN(new Date(post.scheduledDate).getTime())
        ? post.scheduledDate
        : dateStr,
      hashtags: Array.isArray(post.hashtags) ? post.hashtags : []
    };
  });
};

/**
 * Categorizes and formats errors into actionable developer/student messages.
 */
const formatGeminiError = (error) => {
  const msg = error.message || '';

  if (msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
    const err = new Error('Invalid Gemini API Key. Please verify the GEMINI_API_KEY value in server/.env');
    err.code = 'INVALID_API_KEY';
    err.statusCode = 401;
    return err;
  }

  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429') || msg.includes('quota')) {
    const err = new Error('Gemini API rate limit reached. Please wait 30 seconds and retry.');
    err.code = 'RATE_LIMIT_EXCEEDED';
    err.statusCode = 429;
    return err;
  }

  if (msg.includes('GEMINI_API_KEY is not configured')) {
    const err = new Error(msg);
    err.code = 'MISSING_API_KEY';
    err.statusCode = 500;
    return err;
  }

  return error;
};

/**
 * Calls the Gemini API to generate a structured content calendar.
 * Uses gemini-3.8-flash (with automatic fallback to gemini-2.5-flash / gemini-2.0-flash if the account requires).
 * @param {Object} campaignParams - Goal, audience, platforms, days, tone, startDate, postsPerDay
 * @returns {Promise<Object>} Parsed JSON content calendar
 */
export const generateCalendarContent = async (campaignParams) => {
  const modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const prompt = buildCalendarPrompt(campaignParams);

  console.log(`[GeminiService] Calling model "${modelName}" for campaign: "${campaignParams.campaignGoal}"`);

  let rawText;

  try {
    const model = getCalendarModel(modelName);

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
    });

    const response = await result.response;
    rawText = response.text();

  } catch (primaryError) {
    console.warn(`[GeminiService] Primary model "${modelName}" encountered:`, primaryError.message);

    // If model name is not found (404), attempt graceful fallback
    if (primaryError.message?.includes('404') || primaryError.message?.includes('not found')) {
      const fallbackModelName = 'gemini-2.5-flash';
      console.log(`[GeminiService] Attempting fallback model: "${fallbackModelName}"...`);

      try {
        const fallbackModel = getCalendarModel(fallbackModelName);
        const result = await fallbackModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
        });
        const response = await result.response;
        rawText = response.text();
      } catch (fallbackError) {
        throw formatGeminiError(fallbackError);
      }
    } else {
      throw formatGeminiError(primaryError);
    }
  }

  try {
    const sanitizedJson = sanitizeJsonResponse(rawText);
    const parsedData = JSON.parse(sanitizedJson);

    if (!parsedData || !Array.isArray(parsedData.posts) || parsedData.posts.length === 0) {
      throw new Error('AI response is missing the required "posts" array');
    }

    // Ensure all posts have sequential calendar dates
    parsedData.posts = ensureSequentialDates(parsedData.posts, campaignParams.startDate);

    console.log(`[GeminiService] Successfully generated ${parsedData.posts.length} structured posts`);
    return parsedData;

  } catch (parseError) {
    console.error('[GeminiService Parse Error]:', parseError.message);
    if (parseError instanceof SyntaxError) {
      throw new Error(`Failed to parse AI output as JSON: ${parseError.message}`);
    }
    throw parseError;
  }
};
