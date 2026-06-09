/**
 * Instagram Adapter
 * Posts to Instagram via Meta Graph API
 */

const PlatformAdapter = require('./platformAdapter');
const axios = require('axios');

class InstagramAdapter extends PlatformAdapter {
  constructor() {
    super('instagram');
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    this.businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
    this.apiUrl = 'https://graph.instagram.com/v18.0';
  }

  async authenticate(credentials) {
    try {
      if (!credentials.accessToken) {
        throw new Error('Missing Instagram access token');
      }

      this.accessToken = credentials.accessToken;
      this.businessAccountId = credentials.businessAccountId;

      // Test authentication
      await axios.get(
        `${this.apiUrl}/${this.businessAccountId}`,
        {
          params: { access_token: this.accessToken }
        }
      );

      this.isAuthenticated = true;
      console.log('✅ Instagram authenticated successfully');
      return true;
    } catch (error) {
      console.error('❌ Instagram authentication failed:', error.message);
      this.isAuthenticated = false;
      return false;
    }
  }

  async postContent(post) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Instagram adapter not authenticated');
      }

      if (!post.image_url) {
        throw new Error('Instagram requires an image for each post');
      }

      // Step 1: Create media container
      const mediaResponse = await axios.post(
        `${this.apiUrl}/${this.businessAccountId}/media`,
        {
          image_url: post.image_url,
          caption: post.platform_content || post.content
        },
        {
          params: { access_token: this.accessToken }
        }
      );

      const mediaId = mediaResponse.data.id;

      // Step 2: Publish media
      const publishResponse = await axios.post(
        `${this.apiUrl}/${this.businessAccountId}/media_publish`,
        {
          creation_id: mediaId
        },
        {
          params: { access_token: this.accessToken }
        }
      );

      console.log(`✅ Posted to Instagram: ${publishResponse.data.id}`);

      return {
        platform_post_id: publishResponse.data.id,
        url: `https://instagram.com/p/${publishResponse.data.id}`
      };
    } catch (error) {
      console.error('❌ Instagram post failed:', error.message);
      throw error;
    }
  }

  async updatePost(postId, content) {
    try {
      await axios.post(
        `${this.apiUrl}/${postId}`,
        { caption: content },
        {
          params: { access_token: this.accessToken }
        }
      );
      return true;
    } catch (error) {
      console.error('❌ Instagram update failed:', error.message);
      return false;
    }
  }

  async deletePost(postId) {
    try {
      await axios.delete(
        `${this.apiUrl}/${postId}`,
        {
          params: { access_token: this.accessToken }
        }
      );
      return true;
    } catch (error) {
      console.error('❌ Instagram delete failed:', error.message);
      return false;
    }
  }

  async getEngagementData(postId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/${postId}`,
        {
          params: {
            fields: 'like_count,comments_count,caption,media_type,timestamp',
            access_token: this.accessToken
          }
        }
      );

      return {
        likes: response.data.like_count || 0,
        shares: 0,
        comments: response.data.comments_count || 0,
        impressions: (response.data.like_count || 0) + (response.data.comments_count || 0)
      };
    } catch (error) {
      console.error('❌ Instagram analytics failed:', error.message);
      return { likes: 0, shares: 0, comments: 0, impressions: 0 };
    }
  }

  async validateContent(post) {
    const errors = [];

    if (!post.content || post.content.length === 0) {
      errors.push('Caption is required');
    }

    if (!post.image_url) {
      errors.push('Image URL is required for Instagram');
    }

    if (post.content.length > 2200) {
      errors.push('Caption must be 2200 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getConfig() {
    return {
      ...super.getConfig(),
      platform: 'instagram',
      maxCharacters: 2200,
      supportsImages: true,
      supportsVideo: true,
      supportsHashtags: true,
      requiredFields: ['image_url']
    };
  }
}

module.exports = InstagramAdapter;
