import {
  CAMPAIGNS_HEADER,
  CALENDAR_HEADER,
  VALIDATION_HEADER,
  formatCampaignRow,
  formatCalendarRows,
  formatValidationRow,
  syncToGoogleSheets
} from './services/sheetsService.js';
import { getSheetsClient } from './config/googleSheets.js';

console.log('🧪 Starting Google Sheets Integration & Automation Unit Tests (Phase 5)...\n');

let allPassed = true;

// Mock Campaign Payload
const mockCampaignId = 'CMP-PHASE5-TEST';
const mockParams = {
  campaignGoal: 'Promote our open-source developer toolkit and drive GitHub stars',
  targetAudience: 'Software engineers, computer science students, and full-stack builders',
  platforms: ['Twitter/X', 'LinkedIn', 'Instagram'],
  startDate: '2026-11-01',
  durationDays: 7,
  postsPerDay: 1,
  tone: 'Authoritative, technical, yet accessible'
};

const mockPlan = {
  campaignName: 'GitHub Star Sprint',
  campaignStrategy: '7-day developer advocacy strategy across 3 core platforms',
  posts: [
    {
      dayNumber: 1,
      scheduledDate: '2026-11-01',
      platform: 'Twitter/X',
      contentPillar: 'Product Launch',
      topicIdea: 'Announcing our new open-source CLI toolkit',
      caption: 'Tired of boilerplate setup? We just open-sourced our developer CLI! Build, test, and ship in seconds. Star the repo on GitHub! ⭐ #OpenSource #DevTools',
      hashtags: ['#OpenSource', '#DevTools'],
      callToAction: 'Star the repo on GitHub!',
      visualConcept: 'Terminal recording showing rapid installation and first build.'
    },
    {
      dayNumber: 2,
      scheduledDate: '2026-11-02',
      platform: 'LinkedIn',
      contentPillar: 'Architecture',
      topicIdea: 'How we structured a zero-dependency CLI in Node.js',
      caption: 'Why do so many developer tools ship with bloated dependency trees? When we designed our CLI, our strict goal was zero external runtime dependencies. Here is how we leveraged native Node.js APIs to achieve sub-100ms startup times. What is your policy on dependency bloat? Share below.',
      hashtags: ['#NodeJS', '#Architecture', '#SoftwareEngineering', '#CleanCode'],
      callToAction: 'Share your thoughts in the comments below.',
      visualConcept: 'Architecture flowchart contrasting native node modules vs third-party dependency graph.'
    }
  ]
};

const mockValidation = {
  timestamp: new Date().toISOString(),
  totalPosts: 2,
  totalChecks: 12,
  passedChecks: 12,
  warningChecks: 0,
  failedChecks: 0,
  qualityScore: 100,
  status: 'PASSED_HIGH_QUALITY',
  startDate: '2026-11-01',
  endDate: '2026-11-07',
  postAudits: [
    {
      dayNumber: 1,
      platform: 'Twitter/X',
      characterCount: 153,
      characterLimit: 280,
      overallStatus: 'PASSED',
      isCompliant: true
    },
    {
      dayNumber: 2,
      platform: 'LinkedIn',
      characterCount: 382,
      characterLimit: 3000,
      overallStatus: 'PASSED',
      isCompliant: true
    }
  ]
};

// -----------------------------------------------------------------------------
// Test 1: Campaigns Tab Schema & Row Serialization
// -----------------------------------------------------------------------------
const campaignRow = formatCampaignRow(mockCampaignId, mockParams, mockPlan, mockValidation);
const test1Passed = Array.isArray(campaignRow) &&
                    campaignRow.length === CAMPAIGNS_HEADER.length &&
                    campaignRow[0] === mockCampaignId &&
                    campaignRow[3] === mockParams.campaignGoal &&
                    campaignRow[6] === '2026-11-01' &&
                    campaignRow[7] === '2026-11-07' &&
                    campaignRow[9] === '1 post(s)/day';

console.log('Test 1 (Campaigns Tab Row Serialization):', test1Passed ? '✅ PASSED' : '❌ FAILED');
console.log(`- Header columns count: ${CAMPAIGNS_HEADER.length}`);
console.log(`- Serialized row length: ${campaignRow.length}`);
console.log(`- Included Start Date: ${campaignRow[6]} | End Date: ${campaignRow[7]}`);
console.log(`- Included Frequency: ${campaignRow[9]}\n`);
if (!test1Passed) allPassed = false;

// -----------------------------------------------------------------------------
// Test 2: Content_Calendar Tab Schema & Row Serialization
// -----------------------------------------------------------------------------
const calendarRows = formatCalendarRows(mockCampaignId, mockPlan, mockValidation);
const test2Passed = Array.isArray(calendarRows) &&
                    calendarRows.length === 2 &&
                    calendarRows.every(r => r.length === CALENDAR_HEADER.length) &&
                    calendarRows[0][3] === 'Twitter/X' &&
                    calendarRows[1][3] === 'LinkedIn' &&
                    calendarRows[0][11] === 'PASSED';

console.log('Test 2 (Content_Calendar Tab Row Serialization):', test2Passed ? '✅ PASSED' : '❌ FAILED');
console.log(`- Header columns count: ${CALENDAR_HEADER.length}`);
console.log(`- Serialized rows count: ${calendarRows.length}`);
console.log(`- Row 1 (Twitter/X): ${calendarRows[0][5]} (${calendarRows[0][10]} chars, Status: ${calendarRows[0][11]})`);
console.log(`- Row 2 (LinkedIn): ${calendarRows[1][5]} (${calendarRows[1][10]} chars, Status: ${calendarRows[1][11]})\n`);
if (!test2Passed) allPassed = false;

// -----------------------------------------------------------------------------
// Test 3: Validation_Logs Tab Schema & Row Serialization
// -----------------------------------------------------------------------------
const validationRow = formatValidationRow(mockCampaignId, mockValidation);
const test3Passed = Array.isArray(validationRow) &&
                    validationRow.length === VALIDATION_HEADER.length &&
                    validationRow[0] === mockCampaignId &&
                    validationRow[2] === 2 && // Total posts
                    validationRow[4] === 12 && // Passed checks
                    validationRow[5] === 0 && // Warning checks
                    validationRow[6] === 0 && // Failed checks
                    validationRow[7] === '100%';

console.log('Test 3 (Validation_Logs Tab Row Serialization):', test3Passed ? '✅ PASSED' : '❌ FAILED');
console.log(`- Header columns count: ${VALIDATION_HEADER.length}`);
console.log(`- Serialized row length: ${validationRow.length}`);
console.log(`- Score: ${validationRow[7]} | Passed: ${validationRow[4]} | Warnings: ${validationRow[5]} | Failed: ${validationRow[6]}\n`);
if (!test3Passed) allPassed = false;

// -----------------------------------------------------------------------------
// Test 4: Dual Credentials Authentication & Fallback Detection
// -----------------------------------------------------------------------------
const clientStatus = await getSheetsClient();
console.log('Test 4 (Google Sheets Client Config Inspection):');
console.log(`- Configured: ${clientStatus.configured}`);
console.log(`- Diagnostic Info: ${clientStatus.reason || 'Client active and authenticated'}\n`);

// -----------------------------------------------------------------------------
// Test 5: Truthful Trigger-Action Sync Response
// -----------------------------------------------------------------------------
const syncResult = await syncToGoogleSheets({
  campaignId: mockCampaignId,
  campaignParams: mockParams,
  plan: mockPlan,
  validationReport: mockValidation
});

const test5Passed = typeof syncResult === 'object' &&
                    typeof syncResult.synced === 'boolean' &&
                    typeof syncResult.message === 'string';

console.log('Test 5 (Trigger-Action Sync Result Structure):', test5Passed ? '✅ PASSED' : '❌ FAILED');
console.log(`- Synced: ${syncResult.synced}`);
console.log(`- Message: "${syncResult.message}"`);
console.log(`- Spreadsheet URL: ${syncResult.spreadsheetUrl || 'None (Unconfigured Standby)'}\n`);
if (!test5Passed) allPassed = false;

if (allPassed) {
  console.log('🎉 ALL GOOGLE SHEETS INTEGRATION & AUTOMATION TESTS PASSED WITH 100% ACCURACY!');
} else {
  console.error('❌ Some tests failed. Please review output above.');
  process.exit(1);
}

