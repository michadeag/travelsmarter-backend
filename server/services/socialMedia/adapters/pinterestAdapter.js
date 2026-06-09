/**
 * Pinterest Adapter
 * Posts to Pinterest API
 */

const PlatformAdapter = require('./platformAdapter');
const axios = require('axios');

class PinterestAdapter extends PlatformAdapter {
  constructor() {
    super('pinterest');
    this.accessToken = process.env.PINTEREST_ACCESS_TOKEN;
    this.businessAccountId = process.env.PINTEREST_BUSINESS_ACCOUNT_ID;
    this.boardId = process.env.PINTEREST_BOARD_ID;
    this.apiUrl = 'https://api.pinterest.com/v5';
  }

  async authenticate(credentials) {
    try {
      if (!credentials.accessToken) {
        throw new Error('Missing Pinterest access token');
      }

      this.accessToken = credentials.accessToken;
      this.businessAccountId = credentials.businessAccountId;
      this.boardId = credentials.boardId;

      // Test authentication
      await axios.get(`${this.apiUrl}/user_account`, {
        params: { access_token: this.accessToken }
      });

      this.isAuthenticated = true;
      console.log('✅ Pinterest authenticated successfully');
      return true;
    } catch (error) {
      console.error('❌ Pinterest authentication failed:', error.message);
      this.isAuthenticated = false;
      return false;
    }
  }

  async postContent(post) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('Pinterest adapter not authenticated');
      }

      if (!post.image_url) {
        throw new Error('Pinterest requires an image for each post');
      }

      const pinData = {
        media_source: {
          source_type: 'image_url',
          url: post.image_url
        },
        description: post.platform_content || post.content,
        title: post.title || post.content.substring(0, 100),
        board_id: this.boardId,
        alt_text: post.content.substring(0, 100)
      };

      const response = await axios.post(
        `${this.apiUrl}/pins`,
        pinData,
        {
          params: { access_token: this.accessToken }
        }
      );

      console.log(`✅ Posted to Pinterest: ${response.data.id}`);

      return {
        platform_post_id: response.data.id,
        url: `https://pinterest.com/pin/${response.data.id}`
      };
    } catch (error) {
      console.error('❌ Pinterest post failed:', error.message);
      throw error;
    }
  }

  async updatePost(postId, content) {
    try {
      await axios.patch(
        `${this.apiUrl}/pins/${postId}`,
        { description: content },
        {
          params: { access_token: this.accessToken }
        }
      );
      return true;
    } catch (error) {
      console.error('❌ Pinterest update failed:', error.message);
      return false;
    }
  }

  async deletePost(postId) {
    try {
      await axios.delete(
        `${this.apiUrl}/pins/${postId}`,
        {
          params: { access_token: this.accessToken }
        }
      );
      return true;
    } catch (error) {
      console.error('❌ Pinterest delete failed:', error.message);
      return false;
    }
  }

  async getEngagementData(postId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/pins/${postId}`,
        {
          params: {
            fields: 'created_at,note,description,pinner,media,url,link,counts',
            access_token: this.accessToken
          }
        }
      );

      const counts = response.data.counts || {};
      return {
        likes: counts.saves || 0,
        shares: counts.outbound_clicks || 0,
        comments: 0,
        impressions: counts.impressions || 0
      };
    } catch (error) {
      console.error('❌ Pinterest analytics failed:', error.message);
      return { likes: 0, shares: 0, comments: 0, impressions: 0 };
    }
  }

  async validateContent(post) {
    const errors = [];

    if (!post.content || post.content.length === 0) {
      errors.push('Description is required');
    }

    if (!post.image_url) {
      errors.push('Image URL is required for Pinterest');
    }

    if (post.content.length > 500) {
      errors.push('Description must be 500 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getConfig() {
    return {
      ...super.getConfig(),
      platform: 'pinterest',
      maxCharacters: 500,
      supportsImages: true,
      supportsVideo: false,
      supportsHashtags: true,
      requiredFields: ['image_url']
    };
  }
}

module.exports = PinterestAdapter;
