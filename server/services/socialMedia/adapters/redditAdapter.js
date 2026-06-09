/**
 * Reddit Adapter
 * Posts to Reddit API
 */

const PlatformAdapter = require('./platformAdapter');
const snoowrap = require('snoowrap');

class RedditAdapter extends PlatformAdapter {
  constructor() {
    super('reddit');
    this.client = null;
    this.subredditMap = {
      'travel_tip': 'budgettravel',
      'deal': 'travel',
      'hack': 'solotravel',
      'engagement': 'travel'
    };
  }

  async authenticate(credentials) {
    try {
      if (!credentials.clientId || !credentials.clientSecret || !credentials.username || !credentials.password) {
        throw new Error('Missing required Reddit credentials');
      }

      this.client = new snoowrap({
        userAgent: 'TravelSmarter/1.0.0',
        clientId: credentials.clientId,
        clientSecret: credentials.clientSecret,
        username: credentials.username,
        password: credentials.password
      });

      // Test authentication
      await this.client.getMe();
      this.isAuthenticated = true;
      console.log('✅ Reddit authenticated successfully');
      return true;
    } catch (error) {
      console.error('❌ Reddit authentication failed:', error.message);
      this.isAuthenticated = false;
      return false;
    }
  }

  async postContent(post) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Reddit adapter not authenticated');
      }

      const subreddit = this.selectSubreddit(post.post_type);
      const title = post.title || post.content.substring(0, 100);
      const content = post.platform_content || post.content;

      const response = await this.client.getSubreddit(subreddit).submitSelfpost({
        title: title,
        text: content,
        sendReplies: true
      });

      console.log(`✅ Posted to Reddit r/${subreddit}: ${response.id}`);

      return {
        platform_post_id: response.id,
        url: response.url
      };
    } catch (error) {
      console.error('❌ Reddit post failed:', error.message);
      throw error;
    }
  }

  async updatePost(postId, content) {
    try {
      const submission = await this.client.getSubmission(postId);
      await submission.edit(content);
      return true;
    } catch (error) {
      console.error('❌ Reddit update failed:', error.message);
      return false;
    }
  }

  async deletePost(postId) {
    try {
      const submission = await this.client.getSubmission(postId);
      await submission.delete();
      return true;
    } catch (error) {
      console.error('❌ Reddit delete failed:', error.message);
      return false;
    }
  }

  async getEngagementData(postId) {
    try {
      const submission = await this.client.getSubmission(postId).fetch();
      return {
        likes: submission.ups,
        shares: submission.num_shares || 0,
        comments: submission.num_comments,
        impressions: submission.ups + submission.downs
      };
    } catch (error) {
      console.error('❌ Reddit analytics failed:', error.message);
      return { likes: 0, shares: 0, comments: 0, impressions: 0 };
    }
  }

  async validateContent(post) {
    const errors = [];

    if (!post.content || post.content.length === 0) {
      errors.push('Content is required');
    }

    if (post.title && post.title.length > 300) {
      errors.push('Title must be 300 characters or less');
    }

    if (post.content.length > 40000) {
      errors.push('Content must be 40000 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  selectSubreddit(postType) {
    return this.subredditMap[postType] || this.subredditMap['travel_tip'];
  }

  getConfig() {
    return {
      ...super.getConfig(),
      platform: 'reddit',
      maxCharacters: 40000,
      supportsImages: true,
      supportsVideo: true,
      supportsHashtags: false
    };
  }
}

module.exports = RedditAdapter;
