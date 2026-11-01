import { generateCalendarContent } from '../services/groqService.js';
import { validateContentCalendar, validatePost } from '../services/validationService.js';
import { getSheetsClient } from '../config/googleSheets.js';
import { syncToGoogleSheets } from '../services/sheetsService.js';
import {
  saveCampaign,
  getAllCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  getLatestCampaign
} from '../services/storageService.js';

// ---------------------------------------------------------------------------
// Dedicated Phase 4 Test Dataset
// Specifically designed to exercise every validation rule:
// 1. Valid post (PASSED)
// 2. Excessive hashtags (WARNING)
// 3. Missing CTA (WARNING)
// 4. Empty caption (FAILED)
// 5. Out-of-range publishing date (FAILED)
// 6. Valid Twitter post (PASSED)
// ---------------------------------------------------------------------------
const TEST_SUITE_POSTS = [
  {
    dayNumber: 1,
    scheduledDate: null, // Computed relative to start date
    platform: 'LinkedIn',
    contentPillar: 'Thought Leadership',
    topicIdea: 'Why AI is transforming content marketing workflows',
    caption: 'Content teams that embrace AI tools are producing 3× more output without sacrificing quality. The key? Using AI to handle the repetitive structure while humans focus on strategy and tone. Here is what we have learned after 6 months of AI-assisted publishing. 🚀',
    hashtags: ['#ContentMarketing', '#AITools', '#MarketingStrategy', '#LinkedInTips'],
    callToAction: 'What is your experience with AI in content creation? Share below 👇',
    visualConcept: 'Side-by-side comparison infographic: traditional workflow vs AI-assisted workflow with time savings highlighted'
  },
  {
    dayNumber: 2,
    scheduledDate: null,
    platform: 'Twitter/X',
    contentPillar: 'Engagement',
    topicIdea: 'Weekly publishing cadence poll (Excessive Hashtags Test)',
    caption: 'Hot take: Most brands are either posting too little or too much. Consistency > volume. What is your team weekly publishing cadence? Drop your number below 👇',
    // 8 hashtags on Twitter (Target max is 4) -> Triggers Hashtag Density Alert
    hashtags: ['#ContentStrategy', '#SocialMedia', '#Marketing', '#DigitalMarketing', '#ContentCreator', '#CMO', '#Growth', '#Strategy'],
    callToAction: 'Reply with your number!',
    visualConcept: 'Bold typographic card with the question text on a gradient background'
  },
  {
    dayNumber: 3,
    scheduledDate: null,
    platform: 'Instagram',
    contentPillar: 'Education',
    topicIdea: '5 content calendar mistakes that kill engagement (Missing CTA Test)',
    // Caption completely lacks a Call-To-Action -> Triggers CTA Warning
    caption: 'Still winging your content calendar? Here are 5 mistakes that quietly tank reach:\n1. No content pillars\n2. Ignoring platform-specific formats\n3. Skipping the CTA\n4. Posting without visual strategy\n5. Inconsistent tone',
    hashtags: ['#InstagramMarketing', '#ContentCalendar', '#SocialMediaTips', '#CreatorTips'],
    callToAction: '', // Explicitly empty
    visualConcept: 'Carousel: slide 1 = problem statement, slides 2-6 = one mistake per slide with icon, slide 7 = summary'
  },
  {
    dayNumber: 4,
    scheduledDate: null,
    platform: 'LinkedIn',
    contentPillar: 'Product Demo',
    topicIdea: 'Platform Feature Breakdown (Empty Caption Test)',
    // Completely empty caption -> Triggers Caption & Required Fields Failure
    caption: '',
    hashtags: ['#ProductLaunch', '#Tech'],
    callToAction: 'Check out the live demo',
    visualConcept: 'Product UI screenshot walkthrough'
  },
  {
    dayNumber: 5,
    scheduledDate: '2029-12-31', // Far in future -> Triggers Out-of-Range Date Failure
    platform: 'Twitter/X',
    contentPillar: 'Announcement',
    topicIdea: 'Future Roadmap Milestone (Invalid Date Test)',
    caption: 'Sneak peek at our 2030 roadmap: Autonomous multi-platform cross-posting with real-time analytics sync. What feature do you want next? link in bio',
    hashtags: ['#Roadmap', '#FutureTech'],
    callToAction: 'Vote on roadmap features via bio link',
    visualConcept: 'Gantt chart timeline roadmap with upcoming milestones'
  },
  {
    dayNumber: 6,
    scheduledDate: null,
    platform: 'Twitter/X',
    contentPillar: 'Community',
    topicIdea: 'Open-source tools for student developers',
    caption: 'Building your portfolio this semester? Here are 3 open-source dev tools you should know about: Antigravity IDE, Vite, and Express. What is your go-to tech stack? Reply below!',
    hashtags: ['#StudentDevelopers', '#WebDev', '#OpenSource'],
    callToAction: 'Reply below with your stack! 👇',
    visualConcept: 'Clean 3-column infographic showcasing logos and one-line summaries'
  }
];

/**
 * Generates realistic demo posts tailored to preset campaign parameters.
 * Used while Gemini AI is on hold to allow full end-to-end testing of presets.
 */
const generatePresetDemoPlan = (params) => {
  const { campaignGoal, targetAudience, platforms, durationDays = 7, postsPerDay = 1, startDate } = params;
  const baseDate = new Date(startDate || new Date().toISOString().split('T')[0]);

  const pillars = ['Thought Leadership', 'Product Showcase', 'Audience Engagement', 'Educational Value', 'Behind The Scenes'];
  const posts = [];

  let postCount = 0;
  for (let day = 1; day <= durationDays; day++) {
    for (let pIdx = 0; pIdx < postsPerDay; pIdx++) {
      postCount++;
      const platform = platforms[(postCount - 1) % platforms.length];
      const pillar = pillars[(day - 1) % pillars.length];
      const targetDate = new Date(baseDate);
      targetDate.setDate(baseDate.getDate() + (day - 1));
      const dateStr = targetDate.toISOString().split('T')[0];

      let caption = '';
      let hashtags = [];
      let cta = '';
      let visual = '';

      if (platform.toLowerCase().includes('twitter') || platform.toLowerCase().includes('x')) {
        caption = `Day ${day} Blueprint: ${campaignGoal.slice(0, 80)}. Designed specifically for ${targetAudience.slice(0, 40)}. Join the movement! 👇`;
        hashtags = ['#TechInnovation', '#BuildInPublic', '#Productivity'];
        cta = 'Drop your thoughts or retweet!';
        visual = 'Clean graphic highlighting key metric with high contrast typography.';
      } else if (platform.toLowerCase().includes('link')) {
        caption = `Key insight for ${targetAudience}: When executing on "${campaignGoal}", consistency and structured planning beat raw volume every time.\n\nHere are 3 core takeaways from our latest sprint:\n1. Define clear content pillars\n2. Automate calendar scheduling\n3. Validate compliance before publishing.\n\nHow is your organization approaching this? Share below.`;
        hashtags = ['#Leadership', '#ProfessionalProductivity', '#Strategy', '#Innovation'];
        cta = 'Join the discussion in the comments below.';
        visual = 'Infographic workflow diagram illustrating step-by-step strategy.';
      } else {
        caption = `✨ Focus of the Day: ${campaignGoal}.\n\nBuilt for ${targetAudience} who value quality and speed.\n\nSave this for your next planning session! 📌`;
        hashtags = ['#CreativePlanning', '#DailyInspiration', '#WorkflowTips', '#ProductivityHacks'];
        cta = 'Save this post and share with your team!';
        visual = 'Modern carousel cover slide with bold headline, followed by 3 tip slides.';
      }

      posts.push({
        dayNumber: day,
        scheduledDate: dateStr,
        platform,
        contentPillar: pillar,
        topicIdea: `${pillar}: Actionable strategy for ${targetAudience.slice(0, 30)}`,
        caption,
        hashtags,
        callToAction: cta,
        visualConcept: visual
      });
    }
  }

  return {
    campaignName: `${campaignGoal.slice(0, 50)}...`,
    campaignStrategy: `Multi-channel content strategy across ${platforms.join(', ')} targeting ${targetAudience}.`,
    targetAudienceSummary: targetAudience,
    posts
  };
};

/**
 * Returns a dedicated Phase 4 test suite calendar with validation results.
 * Clearly labelled as demo data — not AI-generated content.
 */
export const getDemoCalendar = async (req, res) => {
  const today = new Date();
  const startDateStr = today.toISOString().split('T')[0];

  const postsWithDates = TEST_SUITE_POSTS.map((post, idx) => {
    // If post already has a specific date (like Day 5 test case), keep it
    if (post.scheduledDate) return post;
    const d = new Date(today);
    d.setDate(today.getDate() + idx);
    return { ...post, scheduledDate: d.toISOString().split('T')[0] };
  });

  const demoPlan = {
    campaignName: '[Demo Validation Suite] Quality & Rule Testing Calendar',
    campaignStrategy: 'Comprehensive stress-test containing valid posts, missing CTAs, excessive hashtags, empty captions, and out-of-range dates.',
    targetAudienceSummary: 'Evaluators, faculty, and student developers inspecting validation logic.',
    posts: postsWithDates
  };

  const demoCampaignParams = {
    campaignGoal: '[Demo Validation Suite] Evaluate character bounds, hashtag density, CTAs, and date integrity',
    targetAudience: 'Content evaluators and social media managers',
    platforms: ['LinkedIn', 'Twitter/X', 'Instagram'],
    durationDays: 6,
    postsPerDay: 1,
    tone: 'Professional & Engaging',
    startDate: startDateStr
  };

  const validation = validateContentCalendar(demoPlan, {
    requestedDuration: 6,
    startDate: startDateStr,
    postsPerDay: 1
  });

  // Trigger-Action: Sync to Google Sheets if configured
  const sheetsResult = await syncToGoogleSheets({
    campaignId: 'DEMO-VALIDATION-SUITE',
    campaignParams: demoCampaignParams,
    plan: demoPlan,
    validationReport: validation
  });

  return res.status(200).json({
    success: true,
    isDemo: true,
    demoNotice: '⚠️ DEMO DATA — These posts are sample test content for evaluating the Phase 4 Validation Engine. They are not AI-generated.',
    campaignId: 'DEMO-VALIDATION-SUITE',
    campaignParams: demoCampaignParams,
    data: demoPlan,
    validation,
    sheetsSync: sheetsResult
  });
};

/**
 * Controller to handle content calendar generation and validation.
 * While Gemini integration is on hold, if Gemini call fails, falls back
 * cleanly to a preset-specific demo plan with explicit demo labeling.
 */
export const generateCalendar = async (req, res, next) => {
  try {
    const {
      campaignGoal,
      targetAudience,
      platforms,
      durationDays = 7,
      postsPerDay = 1,
      tone = 'Engaging & Professional',
      startDate
    } = req.body;

    // Validate required request payload
    if (!campaignGoal || typeof campaignGoal !== 'string' || campaignGoal.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign goal is required.', code: 'MISSING_GOAL' }
      });
    }

    if (!targetAudience || typeof targetAudience !== 'string' || targetAudience.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Target audience is required.', code: 'MISSING_AUDIENCE' }
      });
    }

    if (!Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'At least one social media platform must be selected.', code: 'MISSING_PLATFORMS' }
      });
    }

    const parsedDays = Math.min(Math.max(parseInt(durationDays, 10) || 7, 1), 30);
    const parsedPostsPerDay = Math.min(Math.max(parseInt(postsPerDay, 10) || 1, 1), 3);
    const campaignId = `CMP-${Date.now().toString(36).toUpperCase()}`;

    const campaignParams = {
      campaignGoal: campaignGoal.trim(),
      targetAudience: targetAudience.trim(),
      platforms,
      durationDays: parsedDays,
      postsPerDay: parsedPostsPerDay,
      tone: tone.trim(),
      startDate: startDate || new Date().toISOString().split('T')[0]
    };

    // Step 1: Generate Content Plan via Groq Qwen AI
    const plan = await generateCalendarContent(campaignParams);

    // Step 2: Run Content Validation Engine with full campaign context
    const validationReport = validateContentCalendar(plan, {
      requestedDuration: parsedDays,
      startDate: campaignParams.startDate,
      postsPerDay: parsedPostsPerDay
    });

    // Step 3: Persistent Local Storage (Automatic Workflow Requirement)
    let savedRecord = null;
    try {
      savedRecord = saveCampaign({
        campaignId,
        campaignParams,
        data: plan,
        validation: validationReport
      });
    } catch (storageErr) {
      console.warn('[CalendarController] Storage write warning (non-fatal):', storageErr.message);
    }

    // Step 4: Return Complete Response to Frontend
    return res.status(200).json({
      success: true,
      campaignId,
      campaignParams,
      data: plan,
      validation: validationReport,
      persisted: Boolean(savedRecord),
      savedAt: savedRecord?.updatedAt || new Date().toISOString()
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Standalone endpoint to validate a single post or draft.
 * Useful for testing and viva demonstrations of individual validation rules.
 */
export const validateDraftPost = (req, res, next) => {
  try {
    const { post, context } = req.body;
    if (!post || typeof post !== 'object') {
      return res.status(400).json({
        success: false,
        error: { message: 'Post object is required for validation.' }
      });
    }

    const audit = validatePost(post, post.dayNumber || 1, context || {});
    return res.status(200).json({
      success: true,
      audit
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Checks the Google Sheets integration status.
 */
export const getSheetsStatus = async (req, res, next) => {
  try {
    const clientInfo = await getSheetsClient();
    return res.status(200).json({
      success: true,
      configured: clientInfo.configured,
      spreadsheetId: clientInfo.spreadsheetId || null,
      message: clientInfo.configured
        ? 'Google Sheets integration is connected and ready.'
        : clientInfo.reason
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger-Action endpoint to sync an active or modified calendar to Google Sheets.
 */
export const syncSheetsDirect = async (req, res, next) => {
  try {
    const { campaignId, campaignParams, plan, validation } = req.body;
    if (!campaignId || !plan) {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign ID and calendar plan are required for Google Sheets synchronization.' }
      });
    }

    const sheetsResult = await syncToGoogleSheets({
      campaignId,
      campaignParams: campaignParams || {},
      plan,
      validationReport: validation || {}
    });

    return res.status(200).json({
      success: true,
      sheetsSync: sheetsResult
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieves all saved campaigns from local persistent storage.
 */
export const listCampaigns = (req, res) => {
  try {
    const campaigns = getAllCampaigns();
    return res.status(200).json({
      success: true,
      count: campaigns.length,
      campaigns
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: `Failed to retrieve campaigns: ${error.message}` }
    });
  }
};

/**
 * Retrieves the most recently created or updated campaign.
 */
export const getLatestSavedCampaign = (req, res) => {
  try {
    const campaign = getLatestCampaign();
    return res.status(200).json({
      success: true,
      campaign
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: `Failed to retrieve latest campaign: ${error.message}` }
    });
  }
};

/**
 * Retrieves a single campaign by ID from persistent storage.
 */
export const getCampaign = (req, res) => {
  try {
    const { id } = req.params;
    const campaign = getCampaignById(id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: `Campaign "${id}" not found in persistent storage.`, code: 'NOT_FOUND' }
      });
    }

    return res.status(200).json({
      success: true,
      campaign
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: `Failed to retrieve campaign: ${error.message}` }
    });
  }
};

/**
 * Updates a saved campaign (e.g. caption edits, re-validated audits).
 */
export const updateCampaignData = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = getCampaignById(id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        error: { message: `Campaign "${id}" not found in persistent storage.`, code: 'NOT_FOUND' }
      });
    }

    const updated = updateCampaign(id, updates);
    return res.status(200).json({
      success: true,
      campaign: updated,
      message: 'Campaign successfully updated and persisted.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: `Failed to update campaign: ${error.message}` }
    });
  }
};

/**
 * Deletes a campaign from persistent storage.
 */
export const removeCampaign = (req, res) => {
  try {
    const { id } = req.params;
    const deleted = deleteCampaign(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: { message: `Campaign "${id}" not found or could not be deleted.`, code: 'NOT_FOUND' }
      });
    }

    return res.status(200).json({
      success: true,
      deleted: true,
      message: `Campaign "${id}" permanently deleted from storage.`
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: { message: `Failed to delete campaign: ${error.message}` }
    });
  }
};

