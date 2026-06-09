/**
 * Twitter Adapter
 * Posts to Twitter API v2
 */

const PlatformAdapter = require('./platformAdapter');
const { TwitterApi } = require('twitter-api-v2');

class TwitterAdapter extends PlatformAdapter {
  constructor() {
    super('twitter');
    this.client = null;
  }

  async authenticate(credentials) {
    try {
      if (!credentials.apiKey || !credentials.apiSecret || !credentials.accessToken || !credentials.accessSecret) {
        throw new Error('Missing required Twitter credentials');
      }

      this.client = new TwitterApi({
        appKey: credentials.apiKey,
        appSecret: credentials.apiSecret,
        accessToken: credentials.accessToken,
        accessSecret: credentials.accessSecret
      });

      // Test authentication
      await this.client.v2.me();
      this.isAuthenticated = true;
      console.log('✅ Twitter authenticated successfully');
      return true;
    } catch (error) {
      console.error('❌ Twitter authentication failed:', error.message);
      this.isAuthenticated = false;
      return false;
    }
  }

  async postContent(post) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Twitter adapter not authenticated');
      }

      const tweetData = {
        text: post.platform_content || post.content
      };

      const response = await this.client.v2.tweet(tweetData);

      console.log(`✅ Posted to Twitter: ${response.data.id}`);

      return {
        platform_post_id: response.data.id,
        url: `https://twitter.com/user/status/${response.data.id}`
      };
    } catch (error) {
      console.error('❌ Twitter post failed:', error.message);
      throw error;
    }
  }

  async updatePost(postId, content) {
    // Twitter API doesn't support post editing after creation
    console.warn('⚠️ Twitter does not support editing posts');
    return false;
  }

  async deletePost(postId) {
    try {
      await this.client.v2.deleteTweet(postId);
      return true;
    } catch (error) {
      console.error('❌ Twitter delete failed:', error.message);
      return false;
    }
  }

  async getEngagementData(postId) {
    try {
      const response = await this.client.v2.singleTweet(postId, {
        'tweet.fields': 'public_metrics,created_at'
      });

      const metrics = response.data.public_metrics;
      return {
        likes: metrics.like_count,
        shares: metrics.retweet_count,
        comments: metrics.reply_count,
        impressions: metrics.impression_count
      };
    } catch (error) {
      console.error('❌ Twitter analytics failed:', error.message);
      return { likes: 0, shares: 0, comments: 0, impressions: 0 };
    }
  }

  async validateContent(post) {
    const errors = [];

    if (!post.content || post.content.length === 0) {
      errors.push('Tweet text is required');
    }

    if (post.content.length > 280) {
      errors.push('Tweet must be 280 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getConfig() {
    return {
      ...super.getConfig(),
      platform: 'twitter',
      maxCharacters: 280,
      supportsImages: true,
      supportsVideo: true,
      supportsHashtags: true
    };
  }
}

module.exports = TwitterAdapter;
