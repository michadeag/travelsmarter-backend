/**
 * Twitter Auto-Posting Scheduler
 * Posts travel tips at scheduled intervals
 */

const cron = require('node-cron');
const twitterService = require('./twitterService');
const travelTips = require('./travelTips');

let scheduledJobs = [];

/**
 * Start daily auto-posting (1 random tip per day at specified time)
 * @param {string} time - Time in HH:MM format (24-hour), default "09:00"
 */
function startDailyPosting(time = '09:00') {
  if (!twitterService.isConfigured()) {
    console.warn('⚠️ Twitter not configured. Daily posting disabled.');
    return;
  }

  const [hour, minute] = time.split(':');

  // Cron format: minute hour day month day-of-week
  const cronExpression = `${minute} ${hour} * * *`;

  console.log(`📅 Scheduling daily tweet at ${time} (${cronExpression})`);

  const job = cron.schedule(cronExpression, async () => {
    console.log('⏰ Daily posting time reached. Posting travel tip...');
    const result = await twitterService.postRandomTip();

    if (result.success) {
      console.log(`✅ Daily tip posted: "${result.text.substring(0, 50)}..."`);
    } else {
      console.error(`❌ Failed to post daily tip: ${result.error}`);
    }
  });

  scheduledJobs.push({ type: 'daily', time, job });
  console.log(`✅ Daily posting scheduled at ${time}`);

  return job;
}

/**
 * Start multiple daily posts
 * @param {array} times - Array of times ["09:00", "14:00", "18:00"]
 */
function startMultipleDailyPostings(times = ['09:00', '14:00', '18:00']) {
  const jobs = times.map(time => startDailyPosting(time));
  console.log(`✅ ${times.length} daily postings scheduled: ${times.join(', ')}`);
  return jobs;
}

/**
 * Start hourly posting
 */
function startHourlyPosting() {
  if (!twitterService.isConfigured()) {
    console.warn('⚠️ Twitter not configured. Hourly posting disabled.');
    return;
  }

  console.log('📅 Scheduling hourly tweets');

  const job = cron.schedule('0 * * * *', async () => {
    console.log('⏰ Hourly posting time reached...');
    const result = await twitterService.postRandomTip();

    if (result.success) {
      console.log(`✅ Hourly tip posted`);
    } else {
      console.error(`❌ Failed to post hourly tip: ${result.error}`);
    }
  });

  scheduledJobs.push({ type: 'hourly', job });
  console.log('✅ Hourly posting scheduled');

  return job;
}

/**
 * Start category rotation (post different category each day)
 * @param {array} categories - Array of categories to rotate
 */
function startCategoryRotation(categories = ['flights', 'hotels', 'dining', 'transport', 'activities', 'general']) {
  if (!twitterService.isConfigured()) {
    console.warn('⚠️ Twitter not configured. Category rotation disabled.');
    return;
  }

  let currentCategoryIndex = 0;

  console.log(`📅 Scheduling category rotation: ${categories.join(', ')}`);

  const job = cron.schedule('0 10 * * *', async () => {
    const category = categories[currentCategoryIndex];
    console.log(`⏰ Posting ${category} tip...`);

    const result = await twitterService.postTipByCategory(category);

    if (result.success) {
      console.log(`✅ ${category.toUpperCase()} tip posted`);
    } else {
      console.error(`❌ Failed to post ${category} tip: ${result.error}`);
    }

    // Rotate to next category
    currentCategoryIndex = (currentCategoryIndex + 1) % categories.length;
  });

  scheduledJobs.push({ type: 'category-rotation', categories, job });
  console.log(`✅ Category rotation scheduled`);

  return job;
}

/**
 * Stop all scheduled jobs
 */
function stopAllJobs() {
  console.log(`⏹️ Stopping ${scheduledJobs.length} scheduled jobs...`);

  scheduledJobs.forEach(({ job }) => {
    job.stop();
  });

  scheduledJobs = [];
  console.log('✅ All jobs stopped');
}

/**
 * Get list of scheduled jobs
 */
function getScheduledJobs() {
  return scheduledJobs;
}

/**
 * Start recommended schedule
 * Posts 3 times per day + daily category rotation
 */
function startRecommendedSchedule() {
  if (!twitterService.isConfigured()) {
    console.warn('⚠️ Twitter not configured. Recommended schedule disabled.');
    return;
  }

  console.log('🚀 Starting recommended Twitter posting schedule...');

  // 3 posts per day at optimal times
  startMultipleDailyPostings(['09:00', '14:00', '19:00']);

  console.log('✅ Recommended schedule active: 3 posts daily');
}

/**
 * Initialize scheduler (called from server startup)
 */
function initializeScheduler() {
  if (!twitterService.isConfigured()) {
    console.warn('⚠️ Twitter API not configured. Skipping scheduler initialization.');
    return false;
  }

  console.log('🎯 Initializing Twitter posting scheduler...');

  // Check if auto-posting is enabled
  const autoPostingEnabled = process.env.TWITTER_AUTO_POSTING === 'true';

  if (autoPostingEnabled) {
    const schedule = process.env.TWITTER_POSTING_SCHEDULE || 'recommended';

    switch (schedule) {
      case 'daily':
        startDailyPosting(process.env.TWITTER_POSTING_TIME || '09:00');
        break;
      case 'hourly':
        startHourlyPosting();
        break;
      case 'recommended':
        startRecommendedSchedule();
        break;
      case 'category':
        startCategoryRotation();
        break;
      default:
        console.warn(`Unknown schedule: ${schedule}`);
    }

    console.log('✅ Scheduler initialized successfully');
    return true;
  } else {
    console.log('ℹ️ Auto-posting is disabled. Manual posting still available via API.');
    return false;
  }
}

module.exports = {
  startDailyPosting,
  startMultipleDailyPostings,
  startHourlyPosting,
  startCategoryRotation,
  stopAllJobs,
  getScheduledJobs,
  startRecommendedSchedule,
  initializeScheduler
};
