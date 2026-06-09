# Multi-Platform Social Media Automation Setup

This document explains the social media automation system for TravelSmarter that enables posting to Twitter, Reddit, Pinterest, Instagram, and LinkedIn.

## System Architecture

```
┌─────────────────────────────┐
│   Admin Dashboard           │
│  (Create & Publish Posts)   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Social Media Service       │
│  (Orchestrates Adapters)    │
└──────────────┬──────────────┘
               │
    ┌──────────┼──────────┐
    │          │          │
    ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐
│Twitter │ │ Reddit │ │Pinterest
└────────┘ └────────┘ └────────┘
    │          │          │
    │          │          │
   API        API        API
```

## Project Structure

```
server/
├── services/socialMedia/
│   ├── socialMediaService.js     # Main orchestrator
│   ├── adapters/
│   │   ├── platformAdapter.js    # Base class
│   │   ├── twitterAdapter.js
│   │   ├── redditAdapter.js
│   │   ├── pinterestAdapter.js
│   │   ├── instagramAdapter.js
│   │   └── linkedinAdapter.js
│   ├── postGeneratorService.js   # AI content generation (TODO)
│   ├── schedulerService.js       # Cron scheduling (TODO)
│   └── analyticsService.js       # Engagement tracking (TODO)
├── controllers/
│   └── socialMediaController.js
├── routes/
│   └── socialMediaRoutes.js
├── migrations/
│   └── 001_create_social_media_tables.js
└── package.json (updated with dependencies)

public/admin/
└── components/
    ├── socialMedia.html          # Dashboard UI
    └── socialMedia.js            # Frontend functions
```

## Database Tables Created

1. **social_media_accounts** - Stores OAuth tokens for each platform
2. **social_media_posts** - Content library
3. **post_platforms** - Platform-specific post versions
4. **scheduled_posts** - Posting schedule tracking
5. **post_analytics** - Engagement metrics
6. **social_media_config** - Platform configuration

See `migrations/001_create_social_media_tables.js` for schema details.

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

This installs:
- `snoowrap` - Reddit API client
- `bull` & `redis` - Job queue system
- `twitter-api-v2` - Twitter API (already installed)
- `axios` - HTTP requests (already installed)

### 2. Run Database Migrations

```bash
node migrations/runMigrations.js
```

This creates all necessary tables and initializes platform configurations.

### 3. Configure Environment Variables

Add these to your `.env` file:

```env
# Twitter
TWITTER_API_KEY=xxx
TWITTER_API_SECRET=xxx
TWITTER_BEARER_TOKEN=xxx
TWITTER_ACCESS_TOKEN=xxx
TWITTER_ACCESS_TOKEN_SECRET=xxx

# Reddit
REDDIT_CLIENT_ID=xxx
REDDIT_CLIENT_SECRET=xxx
REDDIT_USERNAME=xxx
REDDIT_PASSWORD=xxx

# Pinterest
PINTEREST_ACCESS_TOKEN=xxx
PINTEREST_BUSINESS_ACCOUNT_ID=xxx
PINTEREST_BOARD_ID=xxx

# Instagram (via Meta Graph API)
INSTAGRAM_ACCESS_TOKEN=xxx
INSTAGRAM_BUSINESS_ACCOUNT_ID=xxx

# LinkedIn
LINKEDIN_ACCESS_TOKEN=xxx
LINKEDIN_ORGANIZATION_ID=xxx

# Redis (for job queue)
REDIS_URL=redis://localhost:6379
```

### 4. Mount Routes

In `server.js`, add:

```javascript
const socialMediaRoutes = require('./routes/socialMediaRoutes');
app.use('/api/social', socialMediaRoutes);
```

### 5. Add Social Media Tab to Dashboard

In `public/admin/dashboard.html`:

1. Add to navigation:
```html
<a onclick="openTab('social-media')" class="tab-btn">📱 Social Media</a>
```

2. Include the HTML component:
```html
<!-- Include at bottom before closing body tag -->
<div id="components"></div>
<script src="components/socialMedia.html"></script>
```

3. Include JavaScript:
```html
<script src="components/socialMedia.js"></script>
```

4. Add tab click handler to `dashboard.js`:
```javascript
// In openTab() function, add:
if (tabName === 'social-media') {
  loadSocialMediaDashboard();
}
```

## API Endpoints

### Public
- `GET /api/social/status` - Get all platform connection status

### Admin Only (requires JWT token)
- `POST /api/social/posts` - Create new post
- `POST /api/social/posts/:id/publish` - Publish to platforms
- `GET /api/social/posts` - List all posts
- `GET /api/social/accounts` - List connected accounts
- `POST /api/social/accounts` - Add new account
- `DELETE /api/social/accounts/:id` - Remove account
- `GET /api/social/analytics` - Get engagement data
- `GET /api/social/config/:platform` - Get platform config
- `PUT /api/social/config/:platform` - Update platform config

## Usage

### Via Dashboard

1. Go to **Social Media** tab
2. **Create New Post** section:
   - Select post type (Travel Tip, Deal, Hack, etc.)
   - Write content
   - Select platforms to post to
   - Click "Publish Post"

3. **Connected Accounts** section:
   - View all connected platform accounts
   - Add new accounts via "+ Connect New Account" button
   - Disconnect accounts as needed

4. **Platform Settings** section:
   - Configure posting frequency per platform
   - Settings auto-save

### Via API

```bash
# Create post
curl -X POST https://api.travelsmarterapp.com/api/social/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Budget Flight Hack",
    "content": "Clear cookies before booking flights!",
    "post_type": "travel_tip",
    "platforms": ["twitter", "reddit"]
  }'

# Publish to platforms
curl -X POST https://api.travelsmarterapp.com/api/social/posts/{id}/publish \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platforms": ["twitter", "reddit", "pinterest"]
  }'
```

## Platform-Specific Notes

### Twitter
- Max 280 characters
- Requires Twitter API v2 access
- Supports images and hashtags
- Free tier: 450 tweets/month (v2 API)

### Reddit
- Max 40,000 characters
- Requires verified Reddit account
- Auto-selects subreddit based on post type
- Supports images and videos
- Free API access

### Pinterest
- Max 500 character description
- Requires image URL
- Image-first platform
- High engagement for travel content
- Free API access

### Instagram
- Max 2,200 characters
- Requires business account
- Meta Graph API v18.0
- Supports images and videos
- Free API access

### LinkedIn
- Max 1,300 characters
- Professional tone recommended
- Requires organization ID
- Supports images and videos
- Free API access

## Platform Adapter Template

Each adapter follows this interface:

```javascript
class PlatformAdapter {
  async authenticate(credentials) { }
  async postContent(post) { }
  async updatePost(postId, content) { }
  async deletePost(postId) { }
  async getEngagementData(postId) { }
  async validateContent(post) { }
  async getAuthStatus() { }
  getConfig() { }
}
```

To add a new platform:
1. Create new adapter in `services/socialMedia/adapters/newPlatformAdapter.js`
2. Extend `PlatformAdapter` class
3. Implement all required methods
4. Register in `socialMediaService.js`:
   ```javascript
   this.adapters.newPlatform = new NewPlatformAdapter();
   ```

## Next Steps (Phases)

### Phase 2: Content Generator
- AI-powered post generation from hacks/deals
- Platform-specific content adaptation

### Phase 3: Image Generator
- DALL-E/Stability AI integration
- Auto-generate travel graphics

### Phase 4: Scheduler
- Cron jobs for automated posting
- Optimal time calculation per platform

### Phase 5: Analytics
- Engagement tracking from all platforms
- Performance reports and recommendations

## Troubleshooting

### "Twitter API not configured"
- Ensure environment variables are set correctly
- Check JWT token validity
- Verify API credentials in Twitter Developer Portal

### "No active account found"
- Connect an account via dashboard first
- Check account is marked as `is_active = true`

### Reddit authentication fails
- Verify username/password are correct
- Ensure app ID/secret are correct
- Reddit account must be verified

### Image upload fails on Instagram/Pinterest
- Verify image URL is publicly accessible
- Check image format (JPEG, PNG, etc.)
- Ensure image dimensions match platform requirements

## Costs

| Service | Cost | Notes |
|---------|------|-------|
| Twitter | Free | 450 tweets/month free tier |
| Reddit | Free | Unlimited |
| Pinterest | Free | Free tier available |
| Instagram | Free | Requires business account |
| LinkedIn | Free | Requires organization setup |
| Redis | $6/month | DigitalOcean managed database |
| **Total** | **~$6/month** | Very cost-effective |

## Security Notes

- All API tokens stored in database (encrypted recommended)
- OAuth tokens refreshed automatically
- Admin authentication required for all modifications
- Rate limiting applied per platform
- Error messages logged without exposing credentials

## References

- [Twitter API v2 Docs](https://developer.twitter.com/en/docs/twitter-api)
- [Reddit API Docs](https://www.reddit.com/dev/api)
- [Pinterest API Docs](https://developers.pinterest.com/)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [LinkedIn API Docs](https://docs.microsoft.com/en-us/linkedin/)
