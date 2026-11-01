/**
 * Prompt Version 1 (V1): Basic Campaign Content Generation Prompt
 * - Characteristics: Minimal persona, basic parameters, generic post generation,
 *   unconstrained output schema without character limits or token budgeting.
 */

export const SYSTEM_INSTRUCTION_V1 = `You are a helpful social media assistant.
Generate engaging posts for marketing campaigns across social media channels.`;

export const buildPromptV1 = ({
  campaignGoal,
  targetAudience,
  platforms,
  durationDays = 7,
  postsPerDay = 1,
  tone = 'Engaging'
}) => {
  return `Generate social media posts for the following campaign:

CAMPAIGN DETAILS:
- Objective: ${campaignGoal}
- Audience: ${targetAudience}
- Channels: ${platforms.join(', ')}
- Days: ${durationDays}
- Tone: ${tone}

Please write posts for each day covering the selected channels.
Return your response in JSON format:
{
  "campaignName": "Campaign Name",
  "posts": [
    {
      "day": 1,
      "platform": "Platform Name",
      "caption": "Post text",
      "hashtags": ["#tag1", "#tag2"]
    }
  ]
}`;
};

