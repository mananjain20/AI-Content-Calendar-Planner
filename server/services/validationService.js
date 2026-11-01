/**
 * Validation Engine for AI-generated social media content calendars (Phase 4).
 * Evaluates posts against platform constraints, required schema fields,
 * caption bounds, hashtag density, Call-To-Action (CTA) presence,
 * and publishing date integrity.
 */

// Platform constraint rules & best-practice thresholds
export const PLATFORM_LIMITS = {
  'Twitter/X': {
    minCharacters: 15,
    recommendedMinCharacters: 30,
    maxCharacters: 280,
    recommendedMaxCharacters: 260,
    minHashtags: 1,
    maxHashtags: 4,
    requiresVisual: false
  },
  'LinkedIn': {
    minCharacters: 30,
    recommendedMinCharacters: 150,
    maxCharacters: 3000,
    recommendedMaxCharacters: 2000,
    minHashtags: 2,
    maxHashtags: 6,
    requiresVisual: false
  },
  'Instagram': {
    minCharacters: 20,
    recommendedMinCharacters: 50,
    maxCharacters: 2200,
    recommendedMaxCharacters: 1500,
    minHashtags: 3,
    maxHashtags: 15,
    requiresVisual: true
  }
};

/**
 * Normalizes platform names for consistent matching.
 */
export const normalizePlatformName = (platform) => {
  if (!platform || typeof platform !== 'string') return 'General';
  const lower = platform.toLowerCase();
  if (lower.includes('twit') || lower.includes('x')) return 'Twitter/X';
  if (lower.includes('link')) return 'LinkedIn';
  if (lower.includes('insta')) return 'Instagram';
  return platform.trim();
};

/**
 * Common call-to-action trigger phrases used to identify CTAs inside caption text.
 */
const CTA_TRIGGERS = [
  'link in bio',
  'click the link',
  'sign up',
  'register',
  'comment below',
  'share this',
  'drop a comment',
  'drop your',
  'let us know',
  'tell us',
  'reply with',
  'what do you think',
  'save this',
  'tag a friend',
  'check out',
  'visit',
  'join now',
  'download',
  'learn more',
  'read more',
  'subscribe'
];

/**
 * Validates a single scheduled post.
 * Defensive by design: never throws an exception on missing or malformed fields.
 *
 * @param {Object} post - The post object to evaluate
 * @param {number} expectedDay - Fallback day number
 * @param {Object} [context] - Optional campaign-level context (dates, frequency)
 * @returns {Object} Comprehensive post audit with 3-tier check statuses
 */
export const validatePost = (post = {}, expectedDay = 1, context = {}) => {
  const normalizedPlatform = normalizePlatformName(post?.platform);
  const rules = PLATFORM_LIMITS[normalizedPlatform] || {
    minCharacters: 15,
    recommendedMinCharacters: 40,
    maxCharacters: 2000,
    recommendedMaxCharacters: 1800,
    minHashtags: 1,
    maxHashtags: 10,
    requiresVisual: false
  };

  const caption = typeof post?.caption === 'string' ? post.caption : '';
  const trimmedCaption = caption.trim();
  const charLength = caption.length;
  const hashtags = Array.isArray(post?.hashtags) ? post.hashtags : [];
  const checks = [];

  // ---------------------------------------------------------------------------
  // Check 1: Required Fields Check (Platform, Caption, Content Idea, Publishing Date)
  // ---------------------------------------------------------------------------
  const missingFields = [];
  if (!post?.platform || typeof post.platform !== 'string' || post.platform.trim().length === 0) {
    missingFields.push('Platform');
  }
  if (trimmedCaption.length === 0) {
    missingFields.push('Caption');
  }
  if (!post?.topicIdea || typeof post.topicIdea !== 'string' || post.topicIdea.trim().length === 0) {
    missingFields.push('Content Idea');
  }
  if (!post?.scheduledDate || typeof post.scheduledDate !== 'string' || post.scheduledDate.trim().length === 0) {
    missingFields.push('Publishing Date');
  }

  const reqCheckStatus = missingFields.length === 0 ? 'PASSED' : 'FAILED';
  checks.push({
    name: 'Required Fields Check',
    status: reqCheckStatus,
    passed: reqCheckStatus === 'PASSED',
    detail: missingFields.length === 0
      ? 'All required fields present (platform, idea, caption, date)'
      : `Missing required field(s): ${missingFields.join(', ')}`
  });

  // ---------------------------------------------------------------------------
  // Check 2: Caption Validation (Empty check + Platform Character Bounds)
  // ---------------------------------------------------------------------------
  let captionStatus = 'PASSED';
  let captionDetail = `${charLength} / ${rules.maxCharacters} chars (Compliant)`;

  if (trimmedCaption.length === 0) {
    captionStatus = 'FAILED';
    captionDetail = 'Caption is completely empty. A valid platform caption is required.';
  } else if (charLength > rules.maxCharacters) {
    captionStatus = 'FAILED';
    captionDetail = `${charLength} / ${rules.maxCharacters} chars (EXCEEDS LIMIT by ${charLength - rules.maxCharacters} chars)`;
  } else if (charLength < (rules.recommendedMinCharacters || rules.minCharacters)) {
    captionStatus = 'WARNING';
    captionDetail = `${charLength} chars (Too brief for ${normalizedPlatform}; recommend at least ${rules.recommendedMinCharacters || rules.minCharacters} chars)`;
  }

  checks.push({
    name: 'Character Limit Check',
    status: captionStatus,
    passed: captionStatus === 'PASSED',
    detail: captionDetail
  });

  // ---------------------------------------------------------------------------
  // Check 3: Hashtag Validation (Presence & Overuse Limits)
  // ---------------------------------------------------------------------------
  const hashtagCount = hashtags.length;
  let hashtagStatus = 'PASSED';
  let hashtagDetail = `${hashtagCount} tags (Target: ${rules.minHashtags}-${rules.maxHashtags})`;

  if (hashtagCount === 0) {
    hashtagStatus = 'WARNING';
    hashtagDetail = `0 hashtags provided. Recommended for ${normalizedPlatform}: ${rules.minHashtags}-${rules.maxHashtags} tags.`;
  } else if (hashtagCount > rules.maxHashtags * 2) {
    hashtagStatus = 'FAILED';
    hashtagDetail = `Excessive hashtags: ${hashtagCount} tags (Maximum allowed is ${rules.maxHashtags}). High risk of shadowban/spam penalty.`;
  } else if (hashtagCount > rules.maxHashtags) {
    hashtagStatus = 'WARNING';
    hashtagDetail = `High hashtag count: ${hashtagCount} tags (Platform target is ${rules.minHashtags}-${rules.maxHashtags}).`;
  } else if (hashtagCount < rules.minHashtags) {
    hashtagStatus = 'WARNING';
    hashtagDetail = `${hashtagCount} tags is below the recommended minimum of ${rules.minHashtags}.`;
  }

  checks.push({
    name: 'Hashtag Density Check',
    status: hashtagStatus,
    passed: hashtagStatus === 'PASSED',
    detail: hashtagDetail
  });

  // ---------------------------------------------------------------------------
  // Check 4: Call-To-Action (CTA) Validation
  // ---------------------------------------------------------------------------
  const explicitCTA = typeof post?.callToAction === 'string' ? post.callToAction.trim() : '';
  const lowerCaption = trimmedCaption.toLowerCase();
  const ctaFoundInCaption = CTA_TRIGGERS.some(trigger => lowerCaption.includes(trigger)) || lowerCaption.includes('?');

  let ctaStatus = 'PASSED';
  let ctaDetail = explicitCTA
    ? `CTA Defined: "${explicitCTA}"`
    : (ctaFoundInCaption ? 'CTA detected in caption text' : 'Missing Call-to-Action');

  if (!explicitCTA && !ctaFoundInCaption) {
    ctaStatus = 'WARNING';
    ctaDetail = 'Missing or weak Call-to-Action. Every post should prompt the audience to engage, click, or save.';
  }

  checks.push({
    name: 'Call To Action (CTA)',
    status: ctaStatus,
    passed: ctaStatus === 'PASSED',
    detail: ctaDetail
  });

  // ---------------------------------------------------------------------------
  // Check 5: Publishing Date Validation (Valid ISO, within window, frequency)
  // ---------------------------------------------------------------------------
  const rawDate = post?.scheduledDate;
  let dateStatus = 'PASSED';
  let dateDetail = `Scheduled for ${rawDate || 'N/A'} (Valid date)`;

  if (!rawDate || typeof rawDate !== 'string') {
    dateStatus = 'FAILED';
    dateDetail = 'Missing publishing date.';
  } else {
    const parsedDate = new Date(rawDate);
    if (isNaN(parsedDate.getTime())) {
      dateStatus = 'FAILED';
      dateDetail = `Invalid date format: "${rawDate}". Expected valid YYYY-MM-DD.`;
    } else {
      // Check campaign date bounds if context is provided
      if (context.startDate && context.endDate) {
        const postTime = parsedDate.getTime();
        const startTime = new Date(context.startDate).getTime();
        const endTime = new Date(context.endDate).getTime();

        // Compare using date string boundaries or millisecond timestamps (day-precision)
        const dateStr = rawDate.split('T')[0];
        if (dateStr < context.startDate || dateStr > context.endDate) {
          dateStatus = 'FAILED';
          dateDetail = `Date ${dateStr} falls outside campaign window (${context.startDate} to ${context.endDate}).`;
        }
      }

      // Check posting frequency violation if frequency map is provided
      if (dateStatus === 'PASSED' && context.dateFrequencyMap && context.postsPerDay) {
        const dateKey = rawDate.split('T')[0];
        const countOnDate = context.dateFrequencyMap[dateKey] || 1;
        if (countOnDate > context.postsPerDay) {
          dateStatus = 'WARNING';
          dateDetail = `Frequency alert: ${countOnDate} posts scheduled on ${dateKey} (Selected rate: ${context.postsPerDay} post(s)/day).`;
        }
      }
    }
  }

  checks.push({
    name: 'Publishing Date Integrity',
    status: dateStatus,
    passed: dateStatus === 'PASSED',
    detail: dateDetail
  });

  // ---------------------------------------------------------------------------
  // Check 6: Visual Asset Concept / Direction Check
  // ---------------------------------------------------------------------------
  const visualConcept = typeof post?.visualConcept === 'string' ? post.visualConcept.trim() : '';
  let visualStatus = 'PASSED';
  let visualDetail = visualConcept
    ? `Visual storyboard provided: "${visualConcept.substring(0, 50)}${visualConcept.length > 50 ? '...' : ''}"`
    : 'Visual concept is optional for this platform';

  if (rules.requiresVisual && (!visualConcept || visualConcept.length < 8)) {
    visualStatus = 'WARNING';
    visualDetail = `Instagram posts strictly benefit from visual direction; currently missing or brief.`;
  }

  checks.push({
    name: 'Visual Asset Concept',
    status: visualStatus,
    passed: visualStatus === 'PASSED',
    detail: visualDetail
  });

  // ---------------------------------------------------------------------------
  // Aggregate Post Audit Results
  // ---------------------------------------------------------------------------
  const failedChecks = checks.filter(c => c.status === 'FAILED');
  const warningChecks = checks.filter(c => c.status === 'WARNING');
  const passedChecks = checks.filter(c => c.status === 'PASSED');

  let overallStatus = 'PASSED';
  if (failedChecks.length > 0) {
    overallStatus = 'FAILED';
  } else if (warningChecks.length > 0) {
    overallStatus = 'WARNING';
  }

  // Safe auto-remediation snippet (e.g. for Twitter limit overflow)
  let safeCaption = caption;
  if (charLength > rules.maxCharacters && normalizedPlatform === 'Twitter/X') {
    safeCaption = caption.substring(0, 275).trim() + '...';
  }

  return {
    dayNumber: post?.dayNumber || expectedDay,
    platform: normalizedPlatform,
    characterCount: charLength,
    characterLimit: rules.maxCharacters,
    overallStatus,
    isCompliant: overallStatus !== 'FAILED', // Backward compatible flag
    passedChecksCount: passedChecks.length,
    warningChecksCount: warningChecks.length,
    failedChecksCount: failedChecks.length,
    totalChecksCount: checks.length,
    checks,
    safeCaption
  };
};

/**
 * Validates the entire social media content calendar plan.
 *
 * @param {Object} plan - The calendar plan containing a `posts` array
 * @param {number|Object} options - Either requestedDuration (number) or an options object
 * @returns {Object} Comprehensive validation report with quality score and metrics
 */
export const validateContentCalendar = (plan = {}, options = 7) => {
  const posts = Array.isArray(plan?.posts) ? plan.posts : [];

  // Parse options: accepts either a number or { requestedDuration, startDate, postsPerDay }
  let requestedDuration = 7;
  let startDate = null;
  let endDate = null;
  let postsPerDay = 1;

  if (typeof options === 'number') {
    requestedDuration = options;
  } else if (options && typeof options === 'object') {
    requestedDuration = options.requestedDuration || options.durationDays || 7;
    startDate = options.startDate || null;
    postsPerDay = options.postsPerDay || 1;
  }

  // Compute campaign end date if startDate is provided
  if (startDate) {
    const sDate = new Date(startDate);
    if (!isNaN(sDate.getTime())) {
      const eDate = new Date(sDate);
      eDate.setDate(sDate.getDate() + Math.max(requestedDuration - 1, 0));
      endDate = eDate.toISOString().split('T')[0];
    }
  }

  // Build date frequency map to detect duplicate publishing dates exceeding postsPerDay
  const dateFrequencyMap = {};
  posts.forEach(p => {
    if (p?.scheduledDate && typeof p.scheduledDate === 'string') {
      const dateKey = p.scheduledDate.split('T')[0];
      dateFrequencyMap[dateKey] = (dateFrequencyMap[dateKey] || 0) + 1;
    }
  });

  const campaignContext = {
    startDate,
    endDate,
    dateFrequencyMap,
    postsPerDay
  };

  const auditResults = [];
  let totalChecks = 0;
  let passedChecks = 0;
  let warningChecks = 0;
  let failedChecks = 0;

  posts.forEach((post, index) => {
    const postAudit = validatePost(post, index + 1, campaignContext);
    auditResults.push(postAudit);
    totalChecks += postAudit.totalChecksCount;
    passedChecks += postAudit.passedChecksCount;
    warningChecks += postAudit.warningChecksCount;
    failedChecks += postAudit.failedChecksCount;
  });

  // Campaign-level completeness check: did the plan provide posts covering the requested duration?
  const daysCovered = posts.length;
  const durationCheckPassed = daysCovered >= requestedDuration;
  totalChecks += 1;
  if (durationCheckPassed) {
    passedChecks += 1;
  } else {
    warningChecks += 1;
  }

  // Quality score formula: Passed checks weighted at 100%, warnings weighted at 50%, failures at 0%
  const weightedPassed = passedChecks + (warningChecks * 0.5);
  const qualityScore = totalChecks > 0 ? Math.round((weightedPassed / totalChecks) * 100) : 0;

  // Derive top-level status
  let status = 'PASSED_HIGH_QUALITY';
  if (failedChecks > 0) {
    status = qualityScore >= 60 ? 'NEEDS_REVIEW' : 'FAILED_VALIDATION';
  } else if (warningChecks > 0) {
    status = qualityScore >= 80 ? 'PASSED_HIGH_QUALITY' : 'WARNINGS_DETECTED';
  }

  const passedPostsCount = auditResults.filter(a => a.overallStatus === 'PASSED').length;
  const warningPostsCount = auditResults.filter(a => a.overallStatus === 'WARNING').length;
  const failedPostsCount = auditResults.filter(a => a.overallStatus === 'FAILED').length;

  return {
    timestamp: new Date().toISOString(),
    totalPosts: posts.length,
    requestedDuration,
    startDate,
    endDate,
    durationCheckPassed,
    totalChecks,
    passedChecks,
    warningChecks,
    failedChecks,
    qualityScore,
    status,
    summary: {
      passedPostsCount,
      warningPostsCount,
      failedPostsCount
    },
    postAudits: auditResults
  };
};
