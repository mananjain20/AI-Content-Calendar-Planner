import { getSheetsClient } from '../config/googleSheets.js';

// ---------------------------------------------------------------------------
// Google Sheets Table Header Definitions (Phase 5)
// ---------------------------------------------------------------------------
export const CAMPAIGNS_HEADER = [
  'Campaign ID',
  'Timestamp',
  'Campaign Name',
  'Goal',
  'Target Audience',
  'Platforms',
  'Start Date',
  'End Date',
  'Duration (Days)',
  'Posting Frequency',
  'Tone',
  'Quality Score (%)',
  'Overall Status'
];

export const CALENDAR_HEADER = [
  'Campaign ID',
  'Day #',
  'Scheduled Date',
  'Platform',
  'Content Pillar',
  'Content Idea',
  'Caption',
  'Hashtags',
  'Call To Action',
  'Visual Concept',
  'Char Count',
  'Validation Status'
];

export const VALIDATION_HEADER = [
  'Campaign ID',
  'Timestamp',
  'Total Posts',
  'Total Checks Evaluated',
  'Passed Checks',
  'Warning Checks',
  'Failed Checks',
  'Quality Score (%)',
  'Validation Status'
];

/**
 * Serializes campaign parameters and overview into a single row for the 'Campaigns' tab.
 */
export const formatCampaignRow = (campaignId, campaignParams = {}, plan = {}, validationReport = {}) => {
  const platforms = Array.isArray(campaignParams.platforms)
    ? campaignParams.platforms.join(', ')
    : (campaignParams.platforms || '');

  const startDate = campaignParams.startDate || validationReport.startDate || new Date().toISOString().split('T')[0];
  const duration = campaignParams.durationDays || validationReport.requestedDuration || 7;

  let endDate = validationReport.endDate || '';
  if (!endDate && startDate) {
    const s = new Date(startDate);
    if (!isNaN(s.getTime())) {
      const e = new Date(s);
      e.setDate(s.getDate() + Math.max(duration - 1, 0));
      endDate = e.toISOString().split('T')[0];
    }
  }

  const freq = campaignParams.postsPerDay ? `${campaignParams.postsPerDay} post(s)/day` : '1 post(s)/day';

  return [
    campaignId,
    new Date().toISOString(),
    plan.campaignName || 'Untitled Campaign',
    campaignParams.campaignGoal || '',
    campaignParams.targetAudience || '',
    platforms,
    startDate,
    endDate,
    duration,
    freq,
    campaignParams.tone || 'Professional',
    `${validationReport.qualityScore ?? 0}%`,
    validationReport.status || 'UNKNOWN'
  ];
};

/**
 * Serializes scheduled posts into multiple rows for the 'Content_Calendar' tab.
 */
export const formatCalendarRows = (campaignId, plan = {}, validationReport = {}) => {
  const posts = Array.isArray(plan.posts) ? plan.posts : [];
  const audits = Array.isArray(validationReport.postAudits) ? validationReport.postAudits : [];

  return posts.map((post, idx) => {
    // Find matching audit by dayNumber & platform, or fallback to index
    const audit = audits.find(a => a.dayNumber === post.dayNumber && a.platform === post.platform) || audits[idx] || {};

    const hashtagsStr = Array.isArray(post.hashtags)
      ? post.hashtags.join(' ')
      : (post.hashtags || '');

    const charCount = audit.characterCount || (post.caption ? post.caption.length : 0);
    const status = audit.overallStatus || (audit.isCompliant ? 'PASSED' : 'NEEDS_REVIEW');

    return [
      campaignId,
      post.dayNumber || (idx + 1),
      post.scheduledDate || '',
      post.platform || 'General',
      post.contentPillar || 'General',
      post.topicIdea || 'Untitled Idea',
      post.caption || '',
      hashtagsStr,
      post.callToAction || '',
      post.visualConcept || '',
      charCount,
      status
    ];
  });
};

/**
 * Serializes validation metrics into a single audit row for the 'Validation_Logs' tab.
 */
export const formatValidationRow = (campaignId, validationReport = {}) => {
  return [
    campaignId,
    validationReport.timestamp || new Date().toISOString(),
    validationReport.totalPosts || 0,
    validationReport.totalChecks || 0,
    validationReport.passedChecks || 0,
    validationReport.warningChecks || 0,
    validationReport.failedChecks || 0,
    `${validationReport.qualityScore ?? 0}%`,
    validationReport.status || 'UNKNOWN'
  ];
};

/**
 * Ensures a sheet tab exists with the given headers.
 * Idempotent: checks for tab and header existence before adding.
 */
const ensureTabAndHeaders = async (sheets, spreadsheetId, sheetTitle, headers) => {
  try {
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const tabExists = spreadsheet.data.sheets.some(
      s => s.properties.title.toLowerCase() === sheetTitle.toLowerCase()
    );

    if (!tabExists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: { title: sheetTitle }
              }
            }
          ]
        }
      });
    }

    // Check if header row exists
    const headerCheck = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetTitle}!A1:Z1`
    });

    if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetTitle}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers]
        }
      });
    }
  } catch (error) {
    console.warn(`[SheetsService] Notice on tab "${sheetTitle}":`, error.message);
    throw error;
  }
};

/**
 * Appends campaign data, generated posts, and validation results to Google Sheets.
 * Truthful reporting: returns { synced: false, message } if credentials or sheet are not configured.
 *
 * @param {Object} data
 * @param {string} data.campaignId
 * @param {Object} data.campaignParams
 * @param {Object} data.plan
 * @param {Object} data.validationReport
 * @returns {Promise<Object>} Sync outcome with spreadsheet URL or truthful error
 */
export const syncToGoogleSheets = async ({
  campaignId,
  campaignParams = {},
  plan = {},
  validationReport = {}
}) => {
  const clientInfo = await getSheetsClient();

  if (!clientInfo.configured) {
    return {
      synced: false,
      message: clientInfo.reason || 'Google Sheets is not configured in server/.env',
      spreadsheetUrl: null
    };
  }

  const { sheets, spreadsheetId } = clientInfo;

  try {
    console.log(`[SheetsService] Persisting campaign "${campaignId}" to Google Sheets (${spreadsheetId})...`);

    // Step 1: Ensure all three tabs and headers exist
    await ensureTabAndHeaders(sheets, spreadsheetId, 'Campaigns', CAMPAIGNS_HEADER);
    await ensureTabAndHeaders(sheets, spreadsheetId, 'Content_Calendar', CALENDAR_HEADER);
    await ensureTabAndHeaders(sheets, spreadsheetId, 'Validation_Logs', VALIDATION_HEADER);

    // Step 2: Append Campaign Overview Row
    const campaignRow = formatCampaignRow(campaignId, campaignParams, plan, validationReport);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Campaigns!A:M',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [campaignRow] }
    });

    // Step 3: Append Content Calendar Posts
    const calendarRows = formatCalendarRows(campaignId, plan, validationReport);
    if (calendarRows.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Content_Calendar!A:L',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: calendarRows }
      });
    }

    // Step 4: Append Validation Log
    const validationRow = formatValidationRow(campaignId, validationReport);
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Validation_Logs!A:I',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [validationRow] }
    });

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
    console.log(`[SheetsService] Successfully persisted to: ${spreadsheetUrl}`);

    return {
      synced: true,
      spreadsheetUrl,
      message: 'Campaign, calendar schedule, and validation logs successfully saved to Google Sheets.'
    };

  } catch (error) {
    console.error('[SheetsService Error]:', error.message);
    return {
      synced: false,
      message: `Failed to write to Google Sheets: ${error.message}`,
      spreadsheetUrl: null
    };
  }
};
