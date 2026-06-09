/**
 * LinkedIn Adapter
 * Posts to LinkedIn API
 */

const PlatformAdapter = require('./platformAdapter');
const axios = require('axios');

class LinkedInAdapter extends PlatformAdapter {
  constructor() {
    super('linkedin');
    this.accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    this.organizationId = process.env.LINKEDIN_ORGANIZATION_ID;
    this.apiUrl = 'https://api.linkedin.com/v2';
  }

  async authenticate(credentials) {
    try {
      if (!credentials.accessToken) {
        throw new Error('Missing LinkedIn access token');
      }

      this.accessToken = credentials.accessToken;
      this.organizationId = credentials.organizationId;

      // Test authentication
      await axios.get(
        `${this.apiUrl}/me`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      this.isAuthenticated = true;
      console.log('✅ LinkedIn authenticated successfully');
      return true;
    } catch (error) {
      console.error('❌ LinkedIn authentication failed:', error.message);
      this.isAuthenticated = false;
      return false;
    }
  }

  async postContent(post) {
    try {
      if (!this.isAuthenticated) {
        throw new Error('LinkedIn adapter not authenticated');
      }

      const payload = {
        commentary: {
          text: post.platform_content || post.content
        },
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED'
        }
      };

      // Add image if present
      if (post.image_url) {
        payload.content = {
          media: {
            title: post.title || 'Travel Tip',
            description: post.content.substring(0, 100),
            originalUrl: post.image_url
          }
        };
      }

      const response = await axios.post(
        `${this.apiUrl}/ugcPosts`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Posted to LinkedIn: ${response.data.id}`);

      return {
        platform_post_id: response.data.id,
        url: `https://linkedin.com/feed/update/${response.data.id}`
      };
    } catch (error) {
      console.error('❌ LinkedIn post failed:', error.message);
      throw error;
    }
  }

  async updatePost(postId, content) {
    try {
      await axios.patch(
        `${this.apiUrl}/ugcPosts/${postId}`,
        {
          commentary: {
            text: content
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return true;
    } catch (error) {
      console.error('❌ LinkedIn update failed:', error.message);
      return false;
    }
  }

  async deletePost(postId) {
    try {
      await axios.delete(
        `${this.apiUrl}/ugcPosts/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      return true;
    } catch (error) {
      console.error('❌ LinkedIn delete failed:', error.message);
      return false;
    }
  }

  async getEngagementData(postId) {
    try {
      const response = await axios.get(
        `${this.apiUrl}/ugcPosts/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );

      // LinkedIn doesn't provide real-time engagement via API
      // Return placeholder data
      return {
        likes: 0,
        shares: 0,
        comments: 0,
        impressions: 0
      };
    } catch (error) {
      console.error('❌ LinkedIn analytics failed:', error.message);
      return { likes: 0, shares: 0, comments: 0, impressions: 0 };
    }
  }

  async validateContent(post) {
    const errors = [];

    if (!post.content || post.content.length === 0) {
      errors.push('Content is required');
    }

    if (post.content.length > 1300) {
      errors.push('Content must be 1300 characters or less');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  getConfig() {
    return {
      ...super.getConfig(),
      platform: 'linkedin',
      maxCharacters: 1300,
      supportsImages: true,
      supportsVideo: true,
      supportsHashtags: true,
      tone: 'professional'
    };
  }
}

module.exports = LinkedInAdapter;
