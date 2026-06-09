# Twitter Auto-Posting Service Setup Guide

## Overview
This guide walks you through setting up the automated Twitter posting service for TravelSmarter. The service automatically posts travel tips, hacks, and tricks to your Twitter account on a configurable schedule.

---

## **Step 1: Get Twitter API Credentials**

### 1.1 Create Twitter Developer Account
1. Go to **https://developer.twitter.com**
2. Click "Create an app"
3. Fill in app details:
   - App name: `TravelSmarter` (or similar)
   - Use case: Content publishing automation
   - Description: "Automated travel tips and hacks posting service"

### 1.2 Generate API Keys
1. Go to your app's **Keys and tokens** section
2. Copy these credentials:
   - **API Key** (also called Consumer Key)
   - **API Secret Key** (also called Consumer Secret)
   - **Access Token**
   - **Access Token Secret**
   - **Bearer Token**

### 1.3 Set Permissions
1. Go to **App settings**
2. Under "User authentication settings", set permissions:
   - Read: ✅
   - Write: ✅
   - Direct messages: ❌

---

## **Step 2: Add Environment Variables**

Create or update your `.env` file in `/server` directory with:

```bash
# Twitter API Credentials (from Step 1)
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_SECRET=your_access_token_secret_here
TWITTER_BEARER_TOKEN=your_bearer_token_here

# Auto-Posting Configuration
TWITTER_AUTO_POSTING=true                    # Enable/disable auto-posting
TWITTER_POSTING_SCHEDULE=recommended         # Schedule type
TWITTER_POSTING_TIME=09:00                   # Time for daily posting (24-hour format)

# Schedule Types:
# - recommended  : 3 posts daily (9 AM, 2 PM, 7 PM)
# - daily        : 1 post daily at TWITTER_POSTING_TIME
# - hourly       : 1 post every hour
# - category     : Daily rotation through tip categories
```

**Example `.env`:**
```bash
TWITTER_AUTO_POSTING=true
TWITTER_POSTING_SCHEDULE=recommended
```

---

## **Step 3: Install Dependencies**

```bash
cd server
npm install
```

This installs:
- `twitter-api-v2` - Twitter API client
- `node-cron` - Scheduler for automated posts

---

## **Step 4: Start the Server**

```bash
npm start
```

You should see:
```
🐦 Initializing Twitter auto-posting service...
✅ Twitter service initialized
```

If you see a warning that Twitter is not configured, double-check your `.env` variables.

---

## **Usage Guide**

### **Automatic Posting**
Once configured with `TWITTER_AUTO_POSTING=true`, the service will:
- Post according to your schedule
- Rotate between different tip categories
- Post from your curated travel tips database

### **Manual Posting via API**

**POST Random Tip:**
```bash
POST /api/twitter/post-random
Authorization: Bearer {admin_token}
```

**POST Tip by Category:**
```bash
POST /api/twitter/post-category
Authorization: Bearer {admin_token}
Body: { "category": "flights" }
```

Categories available:
- `flights` - Flight deals and hacks
- `hotels` - Accommodation tips
- `dining` - Food and restaurant hacks
- `transport` - Transportation tricks
- `activities` - Attractions and activities
- `seasonal` - Seasonal travel tips
- `general` - General travel hacks
- `app` - TravelSmarter app promotion

**POST Custom Tweet:**
```bash
POST /api/twitter/post-custom
Authorization: Bearer {admin_token}
Body: { "text": "Your custom tweet here" }
```

**Get Status:**
```bash
GET /api/twitter/status
```

**Start Scheduler:**
```bash
POST /api/twitter/scheduler/start
Authorization: Bearer {admin_token}
Body: {
  "schedule": "recommended",  // or "daily", "hourly", "multiple"
  "times": ["09:00", "14:00", "19:00"]  // required for "multiple"
}
```

**Stop Scheduler:**
```bash
POST /api/twitter/scheduler/stop
Authorization: Bearer {admin_token}
```

**Get All Tips:**
```bash
GET /api/twitter/tips
GET /api/twitter/tips?category=flights
```

---

## **Available Posting Schedules**

### **Recommended (Default)**
- **Posts:** 3 times daily
- **Times:** 9:00 AM, 2:00 PM, 7:00 PM
- **Best for:** Maximum engagement throughout the day
- **Config:** `TWITTER_POSTING_SCHEDULE=recommended`

### **Daily**
- **Posts:** 1 time daily
- **Time:** Configurable (default 9:00 AM)
- **Best for:** Consistent morning presence
- **Config:** `TWITTER_POSTING_SCHEDULE=daily`

### **Hourly**
- **Posts:** Every hour
- **Best for:** High-volume content strategy
- **Config:** `TWITTER_POSTING_SCHEDULE=hourly`

### **Category Rotation**
- **Posts:** 1 daily, different category each day
- **Pattern:** flights → hotels → dining → transport → activities → general
- **Best for:** Diverse content showcase
- **Config:** `TWITTER_POSTING_SCHEDULE=category`

---

## **Travel Tips Database**

The service includes 30+ pre-curated travel tips covering:

**Flight Hacks:**
- Browser cookie clearing tricks
- Best days to book flights
- Layover cost optimization
- Flight booking timing

**Hotel & Accommodation:**
- Direct booking benefits
- Long stay discounts
- Midweek pricing strategy
- Call-in negotiation tips

**Dining:**
- Local restaurant discovery
- Lunch special advantages
- Grocery store picnic hacks
- Free water opportunities

**Transportation:**
- Bus vs train cost comparison
- Train ticket timing
- Airport taxi alternatives
- City card benefits

**Activities:**
- Museum free admission hours
- Free walking tours
- Free church visits
- Nature hike savings

**General Travel:**
- Shoulder season planning
- Credit card rewards
- Packing light tips
- Travel insurance importance
- Language learning
- International SIM cards
- ATM withdrawal strategy
- Offline maps usage

**TravelSmarter Promotion:**
- App feature highlights
- Pricing and plans

---

## **Customizing Tips**

To add your own travel tips, edit `/services/travelTips.js`:

```javascript
const travelTips = [
  {
    category: 'flights',  // Choose category
    tip: '✈️ Your tip here with emoji',
    hashtags: '#TravelHack #BudgetTravel'
  },
  // ... more tips
];
```

---

## **Troubleshooting**

### **Twitter not initializing**
- ❌ Check all 5 environment variables are set
- ❌ Verify API keys are correct
- ❌ Ensure app has write permissions

### **Posts not being sent**
- ❌ Check Twitter API rate limits (300 posts per 15 minutes)
- ❌ Verify `TWITTER_AUTO_POSTING=true` in `.env`
- ❌ Check logs for specific error messages

### **Wrong schedule timing**
- ❌ Use 24-hour format for times (e.g., `14:00` for 2 PM)
- ❌ Verify server timezone matches expected posting time
- ❌ Restart server after changing `.env` variables

### **Tips not in Twitter format**
- ❌ Tips must be under 280 characters including hashtags
- ❌ Check `/api/twitter/tips` to see all available tips

---

## **API Dashboard Integration**

Add a Twitter management panel to your admin dashboard to:
- ✅ View scheduled posts
- ✅ Post manually
- ✅ View available tips
- ✅ Start/stop scheduler
- ✅ Monitor posting status

---

## **Best Practices**

1. **Optimal Posting Times**
   - Morning (9 AM): Commute audience
   - Afternoon (2 PM): Lunch break scrollers
   - Evening (7 PM): Wind-down audience

2. **Engagement Tips**
   - Mix different tip categories
   - Use relevant hashtags
   - Engage with comments
   - Retweet user responses

3. **Content Mix**
   - 70% tips and hacks
   - 20% engagement and community
   - 10% app promotion

4. **Monitoring**
   - Track engagement metrics
   - Note which tips perform best
   - Adjust schedule based on analytics
   - Monitor mentions and replies

---

## **Support**

For issues or questions about the Twitter integration:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify all environment variables are set
4. Test manual API endpoints to isolate issues

---

## **Next Steps**

After setup:
1. ✅ Verify auto-posting is working
2. ✅ Monitor first few posts
3. ✅ Adjust schedule if needed
4. ✅ Add custom tips relevant to your audience
5. ✅ Engage with responses and mentions
6. ✅ Track analytics and optimize

Happy tweeting! 🐦
