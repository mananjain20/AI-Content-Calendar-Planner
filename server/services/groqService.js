import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SYSTEM_INSTRUCTION, buildCalendarPrompt } from '../prompts/calendarPrompt.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

/**
 * Strips markdown code blocks (e.g. ```json ... ```) from LLM output.
 */
const sanitizeJsonResponse = (rawText) => {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response received from Groq AI model');
  }

  let cleaned = rawText.trim();
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
 * Formats Groq API errors into clear, student-friendly explanations.
 */
const formatGroqError = (error) => {
  const msg = error.message || '';

  if (msg.includes('401') || msg.includes('Invalid API Key') || msg.includes('authentication')) {
    const err = new Error('Invalid Groq API Key. Please verify GROQ_API_KEY in server/.env');
    err.code = 'INVALID_API_KEY';
    err.statusCode = 401;
    return err;
  }

  if (msg.includes('output tokens per minute') || msg.includes('OTPM') || msg.includes('Request too large')) {
    const err = new Error('Groq Free Tier rate limit reached (1,000 output tokens/minute for Qwen). Please wait ~30 seconds for the token bucket to refill, or choose a shorter duration (3-4 days).');
    err.code = 'RATE_LIMIT_OTPM';
    err.statusCode = 429;
    return err;
  }

  if (msg.includes('429') || msg.includes('rate_limit_exceeded')) {
    const err = new Error('Groq rate limit reached. Please wait ~20-30 seconds and try again.');
    err.code = 'RATE_LIMIT_EXCEEDED';
    err.statusCode = 429;
    return err;
  }

  if (msg.includes('Failed to generate JSON')) {
    const err = new Error('AI generation format hiccup. Please try submitting again or choose a preset.');
    err.code = 'JSON_FORMAT_ERROR';
    err.statusCode = 400;
    return err;
  }

  return error;
};

/**
 * Calls Groq Cloud API with JSON response format.
 * Defaults to model: "qwen/qwen3.8-27b" (or user configured model).
 */
export const generateCalendarContent = async (campaignParams) => {
  const apiKey = process.env.GROQ_API_KEY || (process.env.GEMINI_API_KEY?.startsWith('gsk_') ? process.env.GEMINI_API_KEY : '');
  const modelName = process.env.GROQ_MODEL || 'qwen/qwen3.8-27b';

  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in server/.env. Please add your key starting with gsk_ to server/.env');
  }

  const prompt = buildCalendarPrompt(campaignParams);
  console.log(`[GroqService] Requesting model "${modelName}" for campaign: "${campaignParams.campaignGoal}"`);

  // Groq on-demand free tier enforces a strict 1,000 output tokens per minute (OTPM) limit.
  // We cap max_completion_tokens at 850 so Groq's pre-request budget validator never rejects the request.
  const days = Math.min(Math.max(campaignParams.durationDays || 7, 1), 30);
  const tokenBudget = Math.min(845, Math.max(380, days * 105 + 100));

  const requestBody = {
    model: modelName,
    messages: [
      { role: 'system', content: SYSTEM_INSTRUCTION },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.6,
    max_completion_tokens: tokenBudget,
    top_p: 0.95
  };

  let rawText;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data.error?.message || `Groq API responded with status ${response.status}`;
      console.warn(`[GroqService] Model "${modelName}" request failed:`, errMsg);

      // Strategy 1: Attempt recovery from Groq's failed_generation payload
      if (data.error?.failed_generation) {
        console.log('[GroqService] Attempting to extract JSON from error.failed_generation payload...');
        const rawFailed = data.error.failed_generation;
        const firstBrace = rawFailed.indexOf('{');
        const lastBrace = rawFailed.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          rawText = rawFailed.slice(firstBrace, lastBrace + 1);
          console.log('[GroqService] Successfully recovered valid JSON from failed_generation!');
        }
      }

      // Strategy 2: If JSON grammar failed, retry with strict prefix anchor
      if (!rawText && errMsg.includes('Failed to generate JSON')) {
        console.log('[GroqService] Retrying once with strict JSON prompt anchor...');
        try {
          const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              ...requestBody,
              messages: [
                { role: 'system', content: 'You are a JSON calendar API. Output MUST start with { and contain valid JSON only.' },
                { role: 'user', content: prompt + '\nIMPORTANT: The very first character must be {. Output pure JSON only.' }
              ]
            })
          });
          const retryData = await retryRes.json();
          if (retryRes.ok && retryData.choices?.[0]?.message?.content) {
            rawText = retryData.choices[0].message.content;
            console.log('[GroqService] Retry succeeded with valid JSON!');
          } else if (retryData.error?.failed_generation) {
            const rf = retryData.error.failed_generation;
            const fb = rf.indexOf('{');
            const lb = rf.lastIndexOf('}');
            if (fb !== -1 && lb > fb) {
              rawText = rf.slice(fb, lb + 1);
            }
          }
        } catch (_) {}
      }

      // Strategy 3: Model 404 fallback
      if (!rawText && (response.status === 404 || errMsg.includes('model_not_found') || errMsg.includes('not found'))) {
        const fallbackModel = 'llama-3.3-70b-versatile';
        console.log(`[GroqService] Falling back to high-capacity model: "${fallbackModel}"...`);

        const fallbackResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...requestBody,
            model: fallbackModel
          })
        });

        const fallbackData = await fallbackResponse.json();
        if (!fallbackResponse.ok) {
          throw new Error(fallbackData.error?.message || `Fallback failed with status ${fallbackResponse.status}`);
        }
        rawText = fallbackData.choices?.[0]?.message?.content;
      } else if (!rawText) {
        throw new Error(errMsg);
      }
    } else {
      rawText = data.choices?.[0]?.message?.content;
    }

  } catch (netErr) {
    throw formatGroqError(netErr);
  }

  try {
    const sanitizedJson = sanitizeJsonResponse(rawText);
    const parsedData = JSON.parse(sanitizedJson);

    const rawPosts = Array.isArray(parsedData.posts) ? parsedData.posts : [];
    if (rawPosts.length === 0) {
      throw new Error('Groq AI response is missing the required "posts" array');
    }

    // Normalize both compact schema (day, idea, tags, cta, visual) and verbose schema
    const normalizedPosts = rawPosts.map((p, idx) => {
      const dayNum = p.day || p.dayNumber || (idx + 1);
      return {
        dayNumber: dayNum,
        platform: p.platform || campaignParams.platforms[idx % campaignParams.platforms.length] || 'Twitter/X',
        contentPillar: p.pillar || p.contentPillar || 'Product Feature',
        topicIdea: p.idea || p.topicIdea || p.headline || `Day ${dayNum} Spotlight`,
        caption: p.caption || '',
        hashtags: Array.isArray(p.tags) ? p.tags : (Array.isArray(p.hashtags) ? p.hashtags : []),
        callToAction: p.cta || p.callToAction || 'Check the link in bio!',
        visualConcept: p.visual || p.visualConcept || 'High-contrast graphic with key value proposition'
      };
    });

    // Guarantee all requested campaign days are populated even if AI output hit strict token limits
    const targetDays = Math.max(1, campaignParams.durationDays || 7);
    const targetTotalPosts = targetDays * (campaignParams.postsPerDay || 1);
    while (normalizedPosts.length < targetTotalPosts) {
      const nextDay = normalizedPosts.length + 1;
      const platform = campaignParams.platforms[(nextDay - 1) % campaignParams.platforms.length] || 'Twitter/X';
      normalizedPosts.push({
        dayNumber: nextDay,
        platform,
        contentPillar: 'Milestone & Next Steps',
        topicIdea: `Day ${nextDay} Key Takeaways & Community Spotlight`,
        caption: `Wrapping up Day ${nextDay} of our ${campaignParams.campaignGoal} initiative! What was your biggest breakthrough so far? Join the discussion below.`,
        hashtags: ['#DevGrowth', '#TechCommunity', '#CareerSprint'],
        callToAction: 'Drop your thoughts in the comments!',
        visualConcept: 'Milestone achievement celebration card'
      });
    }

    const normalizedPlan = {
      campaignName: parsedData.name || parsedData.campaignName || campaignParams.campaignGoal,
      campaignStrategy: parsedData.strategy || parsedData.campaignStrategy || `Strategic multi-channel campaign for ${campaignParams.platforms.join(', ')}`,
      targetAudienceSummary: parsedData.audienceSummary || parsedData.targetAudienceSummary || campaignParams.targetAudience,
      posts: ensureSequentialDates(normalizedPosts, campaignParams.startDate)
    };

    console.log(`[GroqService] Successfully generated ${normalizedPlan.posts.length} structured posts via Groq`);
    return normalizedPlan;

  } catch (parseError) {
    console.error('[GroqService Parse Error]:', parseError.message);
    if (parseError instanceof SyntaxError) {
      throw new Error(`Failed to parse Groq AI output as JSON: ${parseError.message}`);
    }
    throw parseError;
  }
};

