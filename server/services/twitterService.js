/**
 * Twitter API Service
 * Handles posting travel tips to Twitter
 */

const { ETwitterStreamEvent, TwitterApi } = require('twitter-api-v2');
const travelTips = require('./travelTips');

let client = null;

/**
 * Initialize Twitter API client
 */
function initializeTwitter() {
  const apiKey = process.env.TWITTER_API_KEY;
  const apiSecret = process.env.TWITTER_API_SECRET;
  const accessToken = process.env.TWITTER_ACCESS_TOKEN;
  const accessSecret = process.env.TWITTER_ACCESS_SECRET;
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
    console.warn('⚠️ Twitter API credentials not configured. Auto-posting disabled.');
    return false;
  }

  try {
    // Create client with v2 API
    client = new TwitterApi({
      appKey: apiKey,
      appSecret: apiSecret,
      accessToken,
      accessSecret
    });

    console.log('✅ Twitter API client initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to initialize Twitter API:', error.message);
    return false;
  }
}

/**
 * Post a single tip to Twitter
 */
async function postTip(tip) {
  if (!client) {
    console.error('Twitter client not initialized');
    return { success: false, error: 'Twitter not configured' };
  }

  try {
    // Combine tip with hashtags
    const tweet = `${tip.tip}\n\n${tip.hashtags}`;

    // Twitter has 280 character limit
    if (tweet.length > 280) {
      console.warn(`⚠️ Tweet too long (${tweet.length} chars). Truncating...`);
      const truncated = tweet.substring(0, 274) + '...';
      return await postTweet(truncated);
    }

    return await postTweet(tweet);
  } catch (error) {
    console.error('Error posting tip:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Post a tweet (helper function)
 */
async function postTweet(tweetText) {
  try {
    const rwClient = client.readWrite;
    const response = await rwClient.v2.tweet(tweetText);

    console.log(`✅ Tweet posted successfully! ID: ${response.data.id}`);

    return {
      success: true,
      tweetId: response.data.id,
      text: tweetText
    };
  } catch (error) {
    console.error('Error posting tweet:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Post random travel tip
 */
async function postRandomTip() {
  const tip = travelTips.getRandomTip();
  return await postTip(tip);
}

/**
 * Post tip by category
 */
async function postTipByCategory(category) {
  const tip = travelTips.getRandomTipByCategory(category);
  return await postTip(tip);
}

/**
 * Post multiple tips
 */
async function postMultipleTips(count = 3) {
  const tips = travelTips.getRandomTips(count);
  const results = [];

  for (const tip of tips) {
    const result = await postTip(tip);
    results.push(result);

    // Add delay between posts to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  return results;
}

/**
 * Get Twitter client
 */
function getClient() {
  return client;
}

/**
 * Check if Twitter is configured
 */
function isConfigured() {
  return client !== null;
}

module.exports = {
  initializeTwitter,
  postTip,
  postTweet,
  postRandomTip,
  postTipByCategory,
  postMultipleTips,
  getClient,
  isConfigured
};
