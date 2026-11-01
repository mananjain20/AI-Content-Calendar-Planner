import { validateContentCalendar, validatePost } from './services/validationService.js';

console.log('🧪 Starting Comprehensive Content Validation Engine Tests (Phase 4)...\n');

let allPassed = true;

// -----------------------------------------------------------------------------
// Test Case 1: Valid Post across all checks (Expected: PASSED)
// -----------------------------------------------------------------------------
const validPost = {
  dayNumber: 1,
  scheduledDate: '2026-11-01',
  platform: 'LinkedIn',
  topicIdea: 'Productivity Frameworks for Engineering Teams',
  caption: 'Most engineering bottlenecks are communication bottlenecks in disguise. Over the last quarter, our team adopted asynchronous sprint updates and cut meeting time by 40%. The result? Higher code output and less context switching. What async practices has your team adopted? Drop your thoughts below! 👇',
  hashtags: ['#Engineering', '#Productivity', '#AsyncWork', '#Leadership'],
  callToAction: 'Drop your thoughts below! 👇',
  visualConcept: 'Infographic contrasting synchronous meeting overload vs async workflow sprint'
};

const audit1 = validatePost(validPost, 1, { startDate: '2026-11-01', endDate: '2026-11-07', postsPerDay: 1 });
const test1Passed = audit1.overallStatus === 'PASSED' && audit1.checks.every(c => c.status === 'PASSED');
console.log('Test 1 (Fully Valid Post):', test1Passed ? '✅ PASSED' : '❌ FAILED');
console.log(`- Overall Status: ${audit1.overallStatus}`);
console.log(`- Passed checks: ${audit1.passedChecksCount} / ${audit1.totalChecksCount}\n`);
if (!test1Passed) allPassed = false;

// -----------------------------------------------------------------------------
// Test Case 2: Empty Caption (Expected: FAILED on Caption & Required Fields)
// -----------------------------------------------------------------------------
const emptyCaptionPost = {
  ...validPost,
  caption: '   '
};

const audit2 = validatePost(emptyCaptionPost, 2);
const capCheck = audit2.checks.find(c => c.name === 'Character Limit Check');
const reqCheck = audit2.checks.find(c => c.name === 'Required Fields Check');
const test2Passed = audit2.overallStatus === 'FAILED' && capCheck.status === 'FAILED' && reqCheck.status === 'FAILED';
console.log('Test 2 (Empty Caption Violation):', test2Passed ? '✅ DETECTED FAILURE AS EXPECTED' : '❌ MISSED VIOLATION');
console.log(`- Caption Status: ${capCheck.status} ("${capCheck.detail}")`);
console.log(`- Overall Status: ${audit2.overallStatus}\n`);
if (!test2Passed) allPassed = false;

// -----------------------------------------------------------------------------
// Test Case 3: Caption Exceeding Platform Character Limit (Expected: FAILED)
// -----------------------------------------------------------------------------
const overlimitTweet = {
  dayNumber: 3,
  scheduledDate: '2026-11-03',
  platform: 'Twitter/X',
  topicIdea: 'Twitter limit overflow test',
  caption: 'A'.repeat(310),
  hashtags: ['#Tech'],
  callToAction: 'Click link in bio',
  visualConcept: 'Code snapshot'
};

const audit3 = validatePost(overlimitTweet, 3);
const charLimitCheck = audit3.checks.find(c => c.name === 'Character Limit Check');
const test3Passed = audit3.overallStatus === 'FAILED' && charLimitCheck.status === 'FAILED' && audit3.safeCaption.length <= 280;
console.log('Test 3 (Twitter >280 Chars Violation):', test3Passed ? '✅ DETECTED FAILURE AS EXPECTED' : '❌ MISSED VIOLATION');
console.log(`- Original length: ${audit3.characterCount} | Safe auto-truncated: ${audit3.safeCaption.length}\n`);
if (!test3Passed) allPassed = false;

// -----------------------------------------------------------------------------
// Test Case 4: Excessive Hashtags (Expected: WARNING / FAILED)
// -----------------------------------------------------------------------------
const spamHashtagsPost = {
  ...validPost,
  hashtags: ['#one', '#two', '#three', '#four', '#five', '#six', '#seven', '#eight', '#nine', '#ten', '#eleven', '#twelve', '#thirteen', '#fourteen', '#fifteen']
};

const audit4 = validatePost(spamHashtagsPost, 4);
const hashCheck = audit4.checks.find(c => c.name === 'Hashtag Density Check');
const test4Passed = hashCheck.status === 'FAILED' || hashCheck.status === 'WARNING';
console.log('Test 4 (Excessive Hashtags Usage):', test4Passed ? '✅ DETECTED VIOLATION AS EXPECTED' : '❌ MISSED VIOLATION');
console.log(`- Hashtags check: ${hashCheck.status} ("${hashCheck.detail}")\n`);
if (!test4Passed) allPassed = false;

// -----------------------------------------------------------------------------
// Test Case 5: Missing Call-to-Action (CTA) (Expected: WARNING)
// -----------------------------------------------------------------------------
const missingCTAPost = {
  ...validPost,
  caption: 'The weather today is cloudy with moderate winds. Temperatures remain steady around 22 degrees.',
  callToAction: ''
};

const audit5 = validatePost(missingCTAPost, 5);
const ctaCheck = audit5.checks.find(c => c.name === 'Call To Action (CTA)');
const test5Passed = ctaCheck.status === 'WARNING';
console.log('Test 5 (Missing Call-to-Action):', test5Passed ? '✅ DETECTED WARNING AS EXPECTED' : '❌ MISSED VIOLATION');
console.log(`- CTA check status: ${ctaCheck.status} ("${ctaCheck.detail}")\n`);
if (!test5Passed) allPassed = false;

// -----------------------------------------------------------------------------
// Test Case 6: Invalid & Out-of-Range Publishing Date (Expected: FAILED)
// -----------------------------------------------------------------------------
const invalidDatePost = {
  ...validPost,
  scheduledDate: 'not-a-valid-date'
};

const audit6 = validatePost(invalidDatePost, 6);
const dateCheck6 = audit6.checks.find(c => c.name === 'Publishing Date Integrity');
const test6Passed = audit6.overallStatus === 'FAILED' && dateCheck6.status === 'FAILED';
console.log('Test 6a (Invalid Date String):', test6Passed ? '✅ DETECTED FAILURE AS EXPECTED' : '❌ MISSED VIOLATION');
console.log(`- Date check status: ${dateCheck6.status} ("${dateCheck6.detail}")\n`);
if (!test6Passed) allPassed = false;

const outOfRangePost = {
  ...validPost,
  scheduledDate: '2026-12-25' // Campaign is 2026-11-01 to 2026-11-07
};

const audit6b = validatePost(outOfRangePost, 6, { startDate: '2026-11-01', endDate: '2026-11-07' });
const dateCheck6b = audit6b.checks.find(c => c.name === 'Publishing Date Integrity');
const test6bPassed = audit6b.overallStatus === 'FAILED' && dateCheck6b.status === 'FAILED';
console.log('Test 6b (Out-of-Range Campaign Date):', test6bPassed ? '✅ DETECTED FAILURE AS EXPECTED' : '❌ MISSED VIOLATION');
console.log(`- Date check status: ${dateCheck6b.status} ("${dateCheck6b.detail}")\n`);
if (!test6bPassed) allPassed = false;

// -----------------------------------------------------------------------------
// Test Case 7: Frequency Violation - Duplicate Dates (Expected: WARNING)
// -----------------------------------------------------------------------------
const dupDatePost = {
  ...validPost,
  scheduledDate: '2026-11-01'
};
const contextFreq = {
  startDate: '2026-11-01',
  endDate: '2026-11-07',
  postsPerDay: 1,
  dateFrequencyMap: { '2026-11-01': 3 } // 3 posts on same date when frequency is 1
};
const audit7 = validatePost(dupDatePost, 7, contextFreq);
const dateCheck7 = audit7.checks.find(c => c.name === 'Publishing Date Integrity');
const test7Passed = dateCheck7.status === 'WARNING';
console.log('Test 7 (Posting Frequency Violation):', test7Passed ? '✅ DETECTED WARNING AS EXPECTED' : '❌ MISSED VIOLATION');
console.log(`- Date check status: ${dateCheck7.status} ("${dateCheck7.detail}")\n`);
if (!test7Passed) allPassed = false;

// -----------------------------------------------------------------------------
// Test Case 8: Full Content Calendar Aggregation & Scoring
// -----------------------------------------------------------------------------
const mixedCalendarPlan = {
  posts: [
    { ...validPost, dayNumber: 1, scheduledDate: '2026-11-01' },
    { ...missingCTAPost, dayNumber: 2, scheduledDate: '2026-11-02' },
    { ...emptyCaptionPost, dayNumber: 3, scheduledDate: '2026-11-03' }
  ]
};
const fullReport = validateContentCalendar(mixedCalendarPlan, {
  requestedDuration: 3,
  startDate: '2026-11-01',
  postsPerDay: 1
});

const test8Passed = fullReport.summary.passedPostsCount === 1 &&
                    fullReport.summary.warningPostsCount === 1 &&
                    fullReport.summary.failedPostsCount === 1 &&
                    fullReport.qualityScore < 100 &&
                    fullReport.totalChecks > 0;

console.log('Test 8 (Full Content Calendar Multi-Post Scoring):', test8Passed ? '✅ PASSED' : '❌ FAILED');
console.log(`- Passed Posts: ${fullReport.summary.passedPostsCount}`);
console.log(`- Warning Posts: ${fullReport.summary.warningPostsCount}`);
console.log(`- Failed Posts: ${fullReport.summary.failedPostsCount}`);
console.log(`- Overall Quality Score: ${fullReport.qualityScore}%`);
console.log(`- Quality Status: ${fullReport.status}\n`);
if (!test8Passed) allPassed = false;

if (allPassed) {
  console.log('🎉 ALL 8 VALIDATION ENGINE TESTS PASSED WITH 100% ACCURACY!');
} else {
  console.error('❌ Some tests failed. Please review output above.');
  process.exit(1);
}
