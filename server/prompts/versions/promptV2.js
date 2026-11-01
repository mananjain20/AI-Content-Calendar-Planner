/**
 * Prompt Version 2 (V2): Improved Prompt with Platform-Specific Copy Rules & Targeting
 * - Characteristics: Enhanced strategist persona, distinct guidelines per platform
 *   (Twitter, LinkedIn, Instagram), tone matching, and content pillars.
 * - Limitation: Verbose JSON schema without output token budgeting, often exceeding free-tier limits.
 */

export const SYSTEM_INSTRUCTION_V2 = `You are an experienced Social Media Content Strategist.
Craft a multi-channel campaign with distinct platform-specific styles:

PLATFORM GUIDELINES:
1. Twitter / X: Short, conversational copy with a strong hook in the first sentence.
2. LinkedIn: Professional, authoritative tone with industry insights and paragraph breaks.
3. Instagram: Engaging visual storytelling with emojis and a clear community prompt.

Ensure posts rotate across content pillars (Thought Leadership, Product Features, Engagement).
Return output strictly in valid JSON.`;

export const buildPromptV2 = ({
  campaignGoal,
  targetAudience,
  platforms,
  durationDays = 7,
  postsPerDay = 1,
  tone = 'Professional yet engaging',
  startDate = new Date().toISOString().split('T')[0]
}) => {
  const totalPosts = durationDays * postsPerDay;

  return `Generate a structured ${durationDays}-day content plan for:

CAMPAIGN PARAMETERS:
- Objective: ${campaignGoal}
- Target Audience: ${targetAudience}
- Target Channels: ${platforms.join(', ')}
- Duration: ${durationDays} days (${totalPosts} total posts)
- Brand Voice / Tone: ${tone}
- Launch Date: ${startDate}

OUTPUT REQUIREMENTS:
Produce a comprehensive JSON response:
{
  "campaignName": "Catchy Title",
  "campaignStrategy": "Executive strategic summary",
  "targetAudienceSummary": "Audience tone alignment",
  "posts": [
    {
      "dayNumber": 1,
      "platform": "${platforms[0] || 'Twitter/X'}",
      "contentPillar": "Educational | Promotional | Engagement",
      "topicIdea": "Post headline",
      "caption": "Full platform-tailored caption",
      "hashtags": ["#Tag1", "#Tag2", "#Tag3"],
      "callToAction": "Clear action for audience",
      "visualConcept": "Detailed visual storyboard description"
    }
  ]
}`;
};

