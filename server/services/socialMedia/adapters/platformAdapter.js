/**
 * Platform Adapter Base Class
 * Abstract interface for all social media platforms
 */

class PlatformAdapter {
  constructor(platform) {
    this.platform = platform;
    this.client = null;
    this.isAuthenticated = false;
  }

  /**
   * Authenticate with platform using credentials
   * @param {Object} credentials - Platform-specific credentials
   * @returns {Promise<boolean>} Authentication success
   */
  async authenticate(credentials) {
    throw new Error('authenticate() must be implemented by subclass');
  }

  /**
   * Post content to platform
   * @param {Object} post - Post content
   * @returns {Promise<{platform_post_id: string, url: string}>}
   */
  async postContent(post) {
    throw new Error('postContent() must be implemented by subclass');
  }

  /**
   * Update existing post
   * @param {string} postId - Platform post ID
   * @param {Object} content - Updated content
   * @returns {Promise<boolean>}
   */
  async updatePost(postId, content) {
    throw new Error('updatePost() must be implemented by subclass');
  }

  /**
   * Delete existing post
   * @param {string} postId - Platform post ID
   * @returns {Promise<boolean>}
   */
  async deletePost(postId) {
    throw new Error('deletePost() must be implemented by subclass');
  }

  /**
   * Get engagement metrics for post
   * @param {string} postId - Platform post ID
   * @returns {Promise<{likes: number, shares: number, comments: number, impressions: number}>}
   */
  async getEngagementData(postId) {
    throw new Error('getEngagementData() must be implemented by subclass');
  }

  /**
   * Validate content before posting
   * @param {Object} post - Post to validate
   * @returns {Promise<{valid: boolean, errors: string[]}>}
   */
  async validateContent(post) {
    throw new Error('validateContent() must be implemented by subclass');
  }

  /**
   * Check if adapter is authenticated
   * @returns {Promise<boolean>}
   */
  async getAuthStatus() {
    return this.isAuthenticated;
  }

  /**
   * Get platform-specific configuration
   * @returns {Object}
   */
  getConfig() {
    return {
      platform: this.platform,
      authenticated: this.isAuthenticated,
      maxCharacters: 280,
      supportsImages: true,
      supportsVideo: false,
      supportsHashtags: true
    };
  }
}

module.exports = PlatformAdapter;
