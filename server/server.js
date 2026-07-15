const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const pool = require('./config/database');
const emailSequenceService = require('./services/emailSequenceService');
const hackUpdateService = require('./services/hackUpdateService');
const redditService = require('./services/redditService');
const linkedinService = require('./services/linkedinService');
const pinterestService = require('./services/pinterestService');
const instagramService = require('./services/instagramService');
const mediumService = require('./services/mediumService');
const quoraService = require('./services/quoraService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const dealsRoutes = require('./routes/dealsRoutes');
const hacksRoutes = require('./routes/hacksRoutes');
const dealFiltersRoutes = require('./routes/dealFiltersRoutes');
const communityRoutes = require('./routes/communityRoutes');
const adminRoutes = require('./routes/adminRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const socialMediaRoutes = require('./routes/socialMediaRoutes');
const twitterRoutes = require('./routes/twitterRoutes');
const promoRoutes = require('./routes/promoRoutes');
const contactRoutes = require('./routes/contactRoutes');
const seedRoutes = require('./routes/seedRoutes');
const awardChartsRoutes = require('./routes/awardChartsRoutes');
const eliteStatusRoutes = require('./routes/eliteStatusRoutes');

// Email template routes
const emailTemplateRoutes = require('./routes/emailTemplateRoutes');
const broadcastRoutes = require('./routes/broadcastRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const affiliateRoutes = require('./routes/affiliateRoutes');
const affiliateController = require('./controllers/affiliateController');
const referralRoutes = require('./routes/referralRoutes');
const outreachRoutes = require('./routes/outreachRoutes');
const hiddenGemRoutes = require('./routes/hiddenGemRoutes');
const flightAlertRoutes = require('./routes/flightAlertRoutes');
const { runDailyPriceCheck } = require('./services/flightPriceService');
const redditRoutes = require('./routes/redditRoutes');
const linkedinRoutes = require('./routes/linkedinRoutes');
const pinterestRoutes = require('./routes/pinterestRoutes');
const instagramRoutes = require('./routes/instagramRoutes');
const mediumRoutes = require('./routes/mediumRoutes');
const wordpressRoutes = require('./routes/wordpressRoutes');
const slideshareRoutes = require('./routes/slideshareRoutes');
const partnerDealsRoutes = require('./routes/partnerDealsRoutes');
const quoraRoutes = require('./routes/quoraRoutes');
const bloggerRoutes = require('./routes/bloggerRoutes');
const youtubeRoutes = require('./routes/youtubeRoutes');

// Import controllers
const SettingsController = require('./controllers/settingsController');

const app = express();

// Middleware - Security
app.use(helmet());

// Middleware - CORS
app.use(cors({
  origin: function (origin, callback) {
    // Allow all origins for now (can be restricted later)
    callback(null, true);
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware - Webhook raw body (MUST be before JSON parser)
app.use('/api/subscriptions/webhook', express.raw({type: 'application/json'}));

// Middleware - Body parser for all other routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware - Serve static frontend files (from current /server directory)
app.use(express.static(__dirname));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/hacks', hacksRoutes);
app.use('/api/user/deal-filters', dealFiltersRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin-auth', adminAuthRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/social-media', socialMediaRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/admin/seed', seedRoutes);
app.use('/api/award-charts', awardChartsRoutes);
app.use('/api/elite-status', eliteStatusRoutes);
app.use('/api/promos', promoRoutes);

// Contact routes - inline for now
const sgMail = require('@sendgrid/mail');
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

app.post('/api/contact/send', async (req, res) => {
  try {
    const { name, email, topic, message } = req.body;

    // Validation
    if (!name || !email || !topic || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, topic, message'
      });
    }

    // Send email if configured
    if (process.env.SENDGRID_API_KEY) {
      const topicLabels = {
        billing: 'Billing/Subscription Issue',
        refund: 'Money-Back Guarantee Refund',
        technical: 'Technical Issue/Bug',
        account: 'Account Issue',
        feature: 'Feature Request',
        hack: 'Hack Verification Question',
        other: 'Other'
      };

      const topicLabel = topicLabels[topic] || topic;

      await sgMail.send({
        to: 'michael@reesin.com',
        from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
        subject: `TravelSmarter Contact: ${topicLabel} - ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nTopic: ${topicLabel}\n\nMessage:\n${message}`
      });

      // Send confirmation to user
      try {
        await sgMail.send({
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL || 'michael@reesin.com',
          subject: 'We received your message - TravelSmarter Support',
          text: `Hi ${name},\n\nThank you for contacting TravelSmarter! We received your message and will get back to you within 2-4 hours.\n\nBest regards,\nThe TravelSmarter Team`
        });
      } catch (confirmError) {
        console.error('Error sending confirmation email:', confirmError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully. We will respond within 2-4 hours.'
    });

  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending message. Please try again later.'
    });
  }
});

// Use the external contact routes as fallback
app.use('/api/contact', contactRoutes);

// Email template routes
app.use('/api/email-templates', emailTemplateRoutes);
app.use('/api/broadcast', broadcastRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/hidden-gem', hiddenGemRoutes);
app.use('/api/flight-alerts', flightAlertRoutes);
app.use('/api/travel-ai', require('./routes/travelAiRoutes'));
app.use('/api/compensation-checker', require('./routes/compensationCheckerRoutes'));
app.use('/api/fine-print', require('./routes/finePrintRoutes'));
app.use('/api/booking-risk', require('./routes/bookingRiskRoutes'));
app.use('/api/reddit', redditRoutes);
app.use('/api/linkedin', linkedinRoutes);
app.use('/api/pinterest', pinterestRoutes);
app.use('/api/slideshare', slideshareRoutes);
app.use('/api/partner-deals', partnerDealsRoutes);
app.use('/api/instagram', instagramRoutes);
app.use('/api/medium', mediumRoutes);
app.use('/api/wordpress', wordpressRoutes);
app.use('/api/quora', quoraRoutes);
app.use('/api/blogger', bloggerRoutes);
app.use('/api/youtube', youtubeRoutes);

// One-time password reset for known admin user
app.post('/api/diag/reset-password', async (req, res) => {
  const { email, newPassword, secret } = req.body;
  if (secret !== 'ts-diag-2026') return res.status(403).json({ error: 'Forbidden' });
  try {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    const result = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email`,
      [hash, email]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User not found', email });
    }
    res.json({ success: true, message: `Password reset for ${email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Diagnostic endpoint - updated Jun 6 21:57
app.get('/api/test/version', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend updated at 21:57',
    timestamp: new Date().toISOString(),
  });
});

// Test endpoint to verify routes are loading
app.get('/api/promos/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Promo test endpoint working!',
    timestamp: new Date().toISOString(),
  });
});

// Test email templates endpoint (inline - to verify it works)
app.get('/api/email-templates/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Email templates endpoint is working!',
    timestamp: new Date().toISOString(),
  });
});

// Test sequences endpoint (inline - to verify it works)
app.get('/api/email-templates/sequences-test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Email sequences endpoint is working!',
    data: [],
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TravelSmarter API is running',
    timestamp: new Date().toISOString(),
  });
});

// Test email system endpoint - for debugging
app.get('/api/test/email-system', async (req, res) => {
  try {
    console.log('🔍 Testing email system...');

    // Check if SendGrid is configured
    const sendgridConfigured = !!process.env.SENDGRID_API_KEY;
    console.log(`SendGrid configured: ${sendgridConfigured}`);

    // Check if email sequence exists
    const sequenceResult = await pool.query(
      `SELECT id, name FROM email_sequences WHERE name = 'Welcome Email Sequence' LIMIT 1`
    );
    const sequenceExists = sequenceResult.rows.length > 0;
    console.log(`Email sequence exists: ${sequenceExists}`);

    if (sequenceExists) {
      console.log(`Sequence ID: ${sequenceResult.rows[0].id}`);
    }

    // Check email templates
    const templatesResult = await pool.query(
      `SELECT COUNT(*) as count FROM email_templates`
    );
    const templateCount = parseInt(templatesResult.rows[0].count);
    console.log(`Email templates: ${templateCount}`);

    // Check scheduled emails
    const scheduledResult = await pool.query(
      `SELECT status, COUNT(*) as count FROM scheduled_emails GROUP BY status`
    );
    const scheduledByStatus = {};
    scheduledResult.rows.forEach(row => {
      scheduledByStatus[row.status] = parseInt(row.count);
    });
    console.log(`Scheduled emails by status:`, scheduledByStatus);

    // Check pending emails due to send
    const pendingDueResult = await pool.query(`
      SELECT COUNT(*) as count FROM scheduled_emails
      WHERE status = 'pending' AND scheduled_at <= NOW()
    `);
    const pendingDue = parseInt(pendingDueResult.rows[0].count);
    console.log(`Pending emails due to send: ${pendingDue}`);

    // Get some sample scheduled emails
    const sampleResult = await pool.query(`
      SELECT se.id, u.email, et.day, et.subject, se.scheduled_at, se.status
      FROM scheduled_emails se
      JOIN users u ON se.user_id = u.id
      JOIN email_templates et ON se.template_id = et.id
      ORDER BY se.created_at DESC
      LIMIT 5
    `);

    res.status(200).json({
      success: true,
      message: 'Email system diagnostics',
      diagnostics: {
        sendgridConfigured,
        sequenceExists,
        templateCount,
        scheduledByStatus,
        pendingDue,
        recentScheduledEmails: sampleResult.rows
      }
    });
  } catch (error) {
    console.error('Error in email system test:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing email system',
      error: error.message
    });
  }
});

// Manually trigger pending email sending (for testing)
app.post('/api/test/send-pending-emails', async (req, res) => {
  try {
    console.log('🔄 Manually triggering pending email send...');
    const result = await emailSequenceService.sendPendingEmails();
    res.status(200).json({
      success: true,
      message: 'Triggered pending email sending',
      result
    });
  } catch (error) {
    console.error('Error sending pending emails:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending pending emails',
      error: error.message
    });
  }
});

// Home endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to TravelSmarter API',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

// Seed travel hacks into database
async function seedTravelHacks() {
  try {
    // Check if hacks already exist
    const result = await pool.query('SELECT COUNT(*) as count FROM hacks');
    const hackCount = parseInt(result.rows[0].count);

    if (hackCount > 0) {
      console.log(`✅ Hacks already seeded (${hackCount} total)`);
      return;
    }

    console.log('🌱 Seeding travel hacks...');

    // Insert all 87 travel hacks
    const hacksSql = `
      INSERT INTO hacks (module_id, title, description, category, difficulty, usage_count, avg_savings_euros, success_rate) VALUES
      (1, 'Book Flights on Tuesday', 'Airlines typically release sales on Tuesday mornings. Search and book on Tuesday-Thursday for best prices, saving up to 30%.', 'Pricing', 'easy', 4850, 287.50, 96.2),
      (1, 'Use Incognito Mode', 'Clear cookies or use incognito mode when searching for flights to avoid price increases from repeated searches.', 'Tricks', 'easy', 5120, 124.75, 94.8),
      (1, 'Fly on Off-Peak Days', 'Fly mid-week (Tuesday-Thursday) instead of weekends. Mid-week flights are 15-25% cheaper on average.', 'Timing', 'easy', 4620, 198.30, 95.5),
      (1, 'Set Price Alerts', 'Use Google Flights, Hopper, or Kayak alerts to track prices. Book when you see a 20%+ drop from historical average.', 'Tools', 'easy', 4950, 156.80, 93.7),
      (1, 'Fly Into Nearby Airports', 'Instead of flying into major hubs, fly into secondary airports 1-2 hours away for 30-50% savings.', 'Strategy', 'medium', 2840, 315.20, 89.4),
      (1, 'Use Budget Airlines Strategically', 'Budget airlines are cheap but add fees. Use them for short flights or when layovers work with your schedule.', 'Strategy', 'medium', 2150, 287.60, 87.3),
      (2, 'Maximize Travel Rewards', 'Use credit cards with 2-5% travel rewards. A $5,000 flight earns $100-250 in rewards or points.', 'Rewards', 'easy', 5340, 342.15, 97.1),
      (2, 'Sign-Up Bonuses', 'New card sign-up bonuses often give 50,000+ miles worth $500-1,000. Worth opening a card for planned travel.', 'Bonuses', 'medium', 3420, 425.60, 91.8),
      (2, 'Transfer Points to Airlines', 'Credit card points transfer to airlines at better rates than airline direct purchases. 1 point = 1.5-2 miles often.', 'Strategy', 'medium', 2780, 278.40, 88.6),
      (2, 'No Foreign Transaction Fees', 'Get a card with no foreign transaction fees. Regular cards charge 2-3% on every international purchase.', 'Banking', 'easy', 4680, 89.20, 95.3),
      (2, 'Travel Insurance Included', 'Premium cards include trip cancellation, lost luggage, and emergency medical coverage worth $500-5,000.', 'Protection', 'easy', 4520, 298.70, 94.2),
      (2, 'Priority Pass Lounges', 'Premium travel cards include Priority Pass membership for airport lounge access (saves $30-50 per visit).', 'Perks', 'medium', 2310, 156.80, 86.5),
      (2, 'Airline Status Matching', 'New elite cardholders can match status on another airline. Matches last 1-2 years, saving thousands in upgrades.', 'Status', 'hard', 1240, 487.30, 78.9),
      (3, 'Book Direct for Loyalty Points', 'Booking direct on hotel websites earns more loyalty points than booking through Expedia/Booking.com.', 'Loyalty', 'easy', 4180, 142.50, 93.8),
      (3, 'Negotiate Room Upgrades', 'Arrive early and politely ask about upgrades. Mention loyalty status or special occasions. 40%+ success rate.', 'Strategy', 'easy', 3950, 198.60, 92.1),
      (3, 'Off-Season Travel', 'Travel during shoulder seasons (March-May, September-November) for 30-50% hotel discounts.', 'Timing', 'easy', 5210, 267.40, 96.7),
      (3, 'Hotel Price Match Guarantees', 'Book hotels that offer price matching. If you find lower prices within 24-48 hours, they match and give discount.', 'Tools', 'medium', 2650, 187.20, 87.2),
      (3, 'Use Hotel Loyalty Elites', 'Join hotel loyalty programs (free). Accumulate status to get free nights, room upgrades, and late checkout.', 'Loyalty', 'easy', 4890, 224.80, 95.4),
      (3, 'AAA and Corporate Discounts', 'AAA members get 10% off most hotels. Corporate/government employees can save 20% with employee discounts.', 'Discounts', 'easy', 4120, 156.30, 94.6),
      (3, 'Book Packages with Flights', 'Flight+Hotel packages sometimes cost less than booking separately. Compare bundled prices carefully.', 'Bundles', 'medium', 2890, 245.70, 88.9),
      (4, 'Avoid Peak Travel Seasons', 'Avoid school holidays, summer (June-August), and December holidays. Travel in shoulder seasons saves 40-60%.', 'Timing', 'easy', 4950, 298.50, 96.1),
      (4, 'Fly on Holidays', 'Thanksgiving, Christmas day, and New Year''s Day have fewer travelers. Book these dates for cheaper flights.', 'Timing', 'medium', 2420, 187.60, 84.3),
      (4, 'Book 1-3 Months Ahead', 'Sweet spot for booking is 1-3 months before travel. Earlier = uncertain prices, later = more expensive.', 'Strategy', 'easy', 5180, 276.40, 95.9),
      (4, 'Red-Eye Flights Save Money', 'Late night and early morning flights are 20-40% cheaper and less crowded. Trade sleep for savings.', 'Strategy', 'medium', 3180, 156.80, 89.2),
      (4, 'Travel Tuesday-Thursday', 'These days have lowest fares. Avoid Friday-Sunday for best prices on flights and hotels.', 'Timing', 'easy', 5340, 198.50, 97.2),
      (4, 'Check Fare Calendars', 'Use Google Flights, Kayak, or Skyscanner''s calendar view to find cheapest travel dates at a glance.', 'Tools', 'easy', 4870, 124.30, 94.8),
      (5, 'Use Public Transit to Airports', 'Public transportation to airports costs $5-15. Parking and rideshares cost $15-50. Save $30-100 each trip.', 'Savings', 'easy', 4620, 67.80, 93.4),
      (5, 'Arrive 2 Hours Early (Domestic)', 'Arrive 2 hours early for domestic flights to avoid stress and potentially make missed flights due to delays.', 'Efficiency', 'easy', 3450, 45.20, 91.6),
      (5, 'TSA PreCheck and CLEAR', 'TSA PreCheck ($78/5 years) gets you to security in 5 minutes. CLEAR ($179/year) bypasses security lines entirely.', 'Speed', 'medium', 2980, 89.50, 86.7),
      (5, 'Lounge Access Strategies', 'Get lounge access via airline status, credit cards, or loyalty memberships rather than $30 day passes.', 'Perks', 'medium', 2650, 124.80, 85.2),
      (5, 'Airport WiFi Free Workarounds', 'Use airline/lounge WiFi, credit card WiFi passes, or mobile hotspot. Most paid airport WiFi isn''t worth it.', 'Hacks', 'easy', 4180, 32.50, 92.3),
      (5, 'Transfer During Layovers', 'Stay in airport if layover is under 2 hours. Don''t go through immigration/customs unless 3+ hour layover.', 'Strategy', 'medium', 2340, 78.60, 82.9),
      (6, 'Visit Underrated Destinations', 'Skip expensive tourist hotspots. Visit lesser-known destinations 50% cheaper with better experiences.', 'Strategy', 'medium', 3210, 342.70, 88.5),
      (6, 'Eastern Europe & Southeast Asia', 'These regions offer 10x value: $10/day food, $5/night hostels, $0.50 beers. Stretch travel budget 10x further.', 'Budget', 'easy', 5410, 456.20, 97.3),
      (6, 'Shoulder Season Travel', 'March-May and September-November offer perfect weather and 40% lower prices than peak season.', 'Timing', 'easy', 5020, 267.80, 96.5),
      (6, 'Digital Nomad Hotspots', 'Portugal, Mexico, Thailand, Vietnam have cheap long-term rentals ($300-500/month) perfect for extended stays.', 'Strategy', 'medium', 2890, 378.40, 87.1),
      (7, 'Book Through Costco Travel', 'Costco members get 30-50% discounts on car rentals. Membership pays for itself on one rental.', 'Discounts', 'easy', 4120, 156.70, 94.2),
      (7, 'Decline Rental Insurance', 'Your credit card or auto insurance covers rentals. Decline rental company insurance and save $15-30/day.', 'Savings', 'easy', 4850, 98.40, 95.8),
      (7, 'Pick Up at Offsite Locations', 'Rental cars are cheaper at offsite, non-airport locations. Save $20-50/day by picking up downtown.', 'Strategy', 'easy', 3980, 124.60, 93.1),
      (7, 'Autoslash for Price Monitoring', 'Book rentals early through Autoslash. If prices drop, it automatically rebooking at lower rates.', 'Tools', 'medium', 2650, 87.30, 84.6),
      (8, 'Use Couchsurfing', 'Free homestays with locals. Better than hotels: authentic experiences, local knowledge, free breakfast.', 'Accommodation', 'medium', 3120, 224.50, 86.3),
      (8, 'Workaway & Volunteer Programs', 'Exchange labor (4-6 hours/day) for free accommodation. Work with animals, farms, hostels, or startups.', 'Accommodation', 'medium', 2450, 298.70, 81.8),
      (8, 'Join Facebook Travel Groups', 'Join destination-specific Facebook groups. Locals give free tips, recommendations, and sometimes offer couches.', 'Community', 'easy', 4520, 156.30, 93.9),
      (8, 'Meetup Travel Groups', 'Meetup.com has free travel group meetups in your city. Connect with other travelers, share tips, travel buddies.', 'Community', 'easy', 3850, 78.20, 92.1),
      (8, 'Travel Blogs & YouTube Channels', 'Follow travel bloggers for destination guides. They find the best hidden spots, budget hacks, and travel timing.', 'Research', 'easy', 4980, 142.80, 95.6),
      (8, 'Travel Forums & Reddit', 'r/travel, r/solotravel, r/budgettravel have millions of travelers. Ask questions, get real advice from experienced travelers.', 'Research', 'easy', 5240, 124.50, 96.8),
      (8, 'Hospitality Exchanges', 'Use Hospitality Club or Global Freeloaders for free homestays. Similar to Couchsurfing but with different communities.', 'Accommodation', 'medium', 1890, 267.40, 79.2),
      (9, 'Notify Bank Before Travel', 'Tell your bank your travel dates. Without notice, purchases abroad trigger fraud blocks and card declines.', 'Banking', 'easy', 4680, 32.10, 92.8),
      (9, 'Avoid Airport Money Exchange', 'Airport currency exchange has 5-10% markup. Use ATMs to withdraw local currency at real exchange rates.', 'Money', 'easy', 5020, 87.60, 94.3),
      (9, 'Use ATMs, Not Credit Cards', 'ATM withdrawals cost $2-3 but give real exchange rates. Credit cards charge 3-4% foreign transaction fees.', 'Strategy', 'easy', 4850, 67.40, 93.7),
      (9, 'Get No-Fee International Card', 'Use cards with no foreign transaction fees. Capital One 360, Charles Schwab, or Wise cards work worldwide.', 'Banking', 'medium', 3180, 145.20, 87.5),
      (9, 'Wise (formerly TransferWise)', 'Transfer money internationally at real mid-market rates with minimal fees. Perfect for extended international travel.', 'Tools', 'medium', 2980, 198.70, 88.2),
      (10, 'Credit Card Coverage Included', 'Premium travel credit cards include trip cancellation, emergency medical, and lost baggage insurance automatically.', 'Insurance', 'easy', 4120, 267.80, 91.4),
      (10, 'Annual vs Single Trip Policies', 'Annual travel insurance ($200-300) is cheaper than single trip ($50 per trip) if you travel 5+ times/year.', 'Strategy', 'medium', 2650, 156.40, 85.3),
      (10, 'Comprehensive Coverage Matters', 'Get coverage for: trip cancellation, medical emergencies, evacuation, lost baggage. Don''t skip any category.', 'Planning', 'medium', 2340, 198.50, 83.7),
      (10, 'Buy Insurance Within 14 Days', 'Many policies won''t cover pre-existing conditions unless bought within 14 days of initial trip booking.', 'Timing', 'easy', 3820, 98.60, 90.2),
      (10, 'Read the Fine Print', 'Insurance claims get denied on technicalities. Understand what''s covered, deductibles, and claim process before travel.', 'Planning', 'hard', 1450, 234.80, 72.6),
      (11, 'Visa-Free Travel List', 'Check which countries you can visit visa-free. EU, Mexico, Canada are visa-free for US/EU citizens.', 'Planning', 'easy', 4950, 45.30, 94.9),
      (11, 'Visa on Arrival', 'Many countries (Thailand, Vietnam, Turkey) offer visa-on-arrival. Cheaper than pre-applying at embassies.', 'Strategy', 'easy', 4180, 78.90, 92.5),
      (11, 'Digital Nomad Visas', 'Countries like Portugal, Estonia, and Mexico now offer 1-year digital nomad visas for remote workers.', 'Visas', 'medium', 2120, 156.70, 81.3),
      (11, 'Plan Extended Stays Legally', 'Instead of visa runs, apply for long-term visas. Student, work, or residence visas allow 1-5 years legally.', 'Planning', 'hard', 1320, 267.40, 68.9),
      (11, 'Passport Strength Matters', 'Strong passports (US, EU, Singapore) get visa-free access to 190+ countries. Renew early if approaching expiry.', 'Planning', 'easy', 4620, 56.80, 93.2),
      (12, 'Airbnb Entire Homes are Better', 'Entire homes are often cheaper than hotel rooms and include kitchens (save 60% on food costs).', 'Strategy', 'easy', 5180, 287.40, 96.4),
      (12, 'Long-Term Airbnb Discounts', 'Stays over 28 days get 20-40% discounts automatically. Perfect for month-long explorations.', 'Discounts', 'easy', 4850, 156.80, 95.1),
      (12, 'Hostels with Private Rooms', 'Hostels charge $20-40/night for private rooms with community vibes. Cheaper and more social than hotels.', 'Accommodation', 'easy', 4650, 98.50, 94.7),
      (12, 'House Swapping', 'Swap homes with someone traveling to your city. Free accommodation worldwide through HomeExchange.com.', 'Accommodation', 'medium', 1980, 324.60, 77.4),
      (12, 'Serviced Apartments', 'Serviced apartments in Eastern Europe and SE Asia cost $15-30/night with kitchens and laundry.', 'Budget', 'medium', 2780, 267.30, 86.8),
      (13, 'Get City Tourist Cards', 'Most cities have tourist cards with unlimited public transit + attractions. Often save 40-60% vs individual tickets.', 'Savings', 'easy', 4520, 124.70, 93.6),
      (13, 'Buy Transport Passes Upfront', 'Weekly/monthly passes cost 40-50% less than daily tickets. Buy at beginning of stay.', 'Strategy', 'easy', 4870, 87.30, 95.2),
      (13, 'Walk & Bike Instead', 'Walking and biking cost nothing, improve fitness, and help you discover hidden gems tourists miss.', 'Health', 'easy', 3620, 45.20, 91.8),
      (13, 'Overnight Buses Save Hotel', 'Sleep on buses/trains overnight. Save $50-100 on accommodation while making progress on your journey.', 'Strategy', 'medium', 2890, 178.60, 83.5),
      (13, 'Ride-Share Splitting', 'Share Uber/Grab rides with other travelers you meet. Split cost 50/50 and make friends.', 'Social', 'easy', 4180, 56.40, 92.3),
      (14, 'Comparison Shop Always', 'Use Kayak, Google Flights, Skyscanner to compare all booking sites. Prices vary by $50-200 for same flight.', 'Strategy', 'easy', 5240, 124.80, 97.1),
      (14, 'Book Flights and Hotels Separately', 'Booking separately is usually 10-20% cheaper than packages. Book hotel separately for better cancellation.', 'Strategy', 'easy', 4950, 156.40, 96.3),
      (14, 'Use Cashback Sites', 'Rakuten, TopCashback give 5-10% cashback on bookings. Every $1,000 spent earns $50-100 cashback.', 'Savings', 'easy', 4620, 89.70, 94.8),
      (14, 'Clear Cookies and Compare', 'Websites track your searches and increase prices. Use incognito/private mode or clear cookies before final booking.', 'Tricks', 'easy', 5120, 98.30, 95.6),
      (14, 'Flexible Date Flexibility Pays', 'Being flexible with dates saves $500+ on flights. Shift travel by even 1-2 days to find cheaper flights.', 'Strategy', 'medium', 3450, 267.80, 89.4),
      (15, 'Eat Where Locals Eat', 'Avoid touristy restaurants. Eat at local markets, street food stalls, and non-tourist areas. Save 70% on food.', 'Strategy', 'easy', 5340, 156.20, 97.5),
      (15, 'Lunch Specials Over Dinner', 'Lunch menus are 30-50% cheaper than dinner at same restaurants. Eat your main meal at lunch.', 'Timing', 'easy', 4850, 78.90, 95.3),
      (15, 'Street Food is Safe & Cheap', 'Street food is usually $1-3 per meal, freshly cooked, and safer than you think. Ask locals where to eat.', 'Budget', 'easy', 5180, 67.40, 96.1),
      (15, 'Cook Your Own Meals', 'Airbnbs with kitchens let you cook meals for $2-5. Buy groceries at local markets, not tourist shops.', 'Budget', 'easy', 4620, 89.50, 94.2),
      (15, 'Happy Hour & Set Menus', 'Many restaurants have 4-8pm happy hours with 50% off drinks and appetizers. Eat light happy hour meals.', 'Timing', 'easy', 4120, 45.70, 91.7),
      (16, 'EU VAT Refunds', 'Non-EU residents get 15-25% VAT refunds on purchases over €50-100. Claim at airport before departure.', 'Money', 'medium', 2450, 198.60, 81.2),
      (16, 'Shop Duty-Free on Exit', 'Duty-free shopping on exit is actually duty-free (tax-free). Cheaper for alcohol, perfume, electronics.', 'Strategy', 'easy', 3950, 124.30, 90.8),
      (16, 'Outlet Malls Outside Cities', 'Outlet malls outside major cities have 40-60% discounts vs downtown boutiques. Worth the day trip.', 'Shopping', 'easy', 4520, 156.80, 93.4),
      (16, 'Local Markets vs Tourist Shops', 'Markets have 50-70% cheaper prices than tourist shops selling same items. Always negotiate at markets.', 'Strategy', 'easy', 4850, 87.60, 94.9),
      (16, 'Timing Sales & Seasons', 'Shop during sales (January, July) for 40-70% discounts. Avoid shopping during peak seasons (June, December).', 'Timing', 'easy', 4680, 124.50, 93.6)
    `;

    await pool.query(hacksSql);
    console.log('✅ Successfully seeded 87 travel hacks!');
  } catch (error) {
    console.error('Error seeding hacks:', error.message);
    throw error;
  }
}

// Seed community discussions
async function seedCommunityDiscussions() {
  try {
    // Check if community posts already exist
    const result = await pool.query('SELECT COUNT(*) as count FROM community_posts');
    const postCount = parseInt(result.rows[0].count);

    if (postCount > 0) {
      console.log(`✅ Community discussions already seeded (${postCount} posts)`);
      return;
    }

    console.log('💬 Seeding community discussions...');

    // Create demo Elite user for community posts
    const demoUserResult = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      ['demo@travelsmarterapp.com']
    );

    let demoUserId;
    if (demoUserResult.rows.length === 0) {
      // Create demo user if doesn't exist
      const createUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, subscription_tier)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        ['demo@travelsmarterapp.com', 'hashed_demo_password', 'Community', 'Expert', 'elite']
      );
      demoUserId = createUserResult.rows[0].id;
    } else {
      demoUserId = demoUserResult.rows[0].id;
    }

    // Community posts data
    const posts = [
      {
        module_id: 1,
        title: 'Best time to book flights to Asia?',
        content: 'I\'m planning a trip to Thailand in March. Should I book now or wait? I\'ve been monitoring prices and they seem to fluctuate daily. Any tips on when to pull the trigger?',
        replies: [
          { content: 'March is shoulder season for Thailand - great timing! Book 6-8 weeks in advance. That usually hits the sweet spot. I saved €180 on my Bangkok flight this way.', upvotes: 24 },
          { content: 'Pro tip: Set up price alerts on Google Flights and wait for that Tuesday dip. I got mine for €520 roundtrip from Milan!', upvotes: 18 },
          { content: 'Just booked mine for €480. Used incognito mode + checked different dates. March midweek is cheaper than weekends.', upvotes: 15 }
        ]
      },
      {
        module_id: 2,
        title: 'Credit card sign-up bonus strategy?',
        content: 'Has anyone successfully used multiple sign-up bonuses in a short period? I\'m planning 3 trips this year and want to maximize my points. Is it worth opening 2-3 cards back to back?',
        replies: [
          { content: 'Totally worth it! I opened 3 cards over 6 months and got 150k points total. Now 2 free business class tickets to NYC. Just space them 3 months apart to avoid red flags.', upvotes: 42 },
          { content: 'Be careful with your credit score. I did 4 cards and my score dipped 30 points. Recovered in 6 months though. The value was worth it for me.', upvotes: 28 },
          { content: 'Which cards are you targeting? The Sapphire Preferred is still king for travel rewards IMO. 50k bonus = €500 travel credit.', upvotes: 19 }
        ]
      },
      {
        module_id: 3,
        title: 'Hotel status matching - anyone tried this?',
        content: 'Just got a new travel card with Platinum Hotel status. Can I actually match to other hotel chains? What\'s the process and success rate?',
        replies: [
          { content: 'Yes! I matched my IHG status to Marriott. Took 2 weeks via email. Free breakfast now at most properties - saves €50-80/night!', upvotes: 35 },
          { content: 'Pro tip: Match to Hyatt too if possible. Their free breakfast is the best value among major chains.', upvotes: 22 },
          { content: 'Success rate is ~80% in my experience. Make sure your card status is recognized first before applying for matches. Good luck!', upvotes: 17 }
        ]
      },
      {
        module_id: 4,
        title: 'Red-eye flights - worth the sleep loss?',
        content: 'Debating whether to save €150-200 on a red-eye flight or just pay extra for a morning departure. Mentally how do you recover the next day?',
        replies: [
          { content: 'Depends on the flight length. 5+ hours? The savings aren\'t worth it. 2-3 hours? Absolutely take the red-eye. I save on hotels AND flights!', upvotes: 31 },
          { content: 'I sleep better on planes than in hotels so red-eyes are perfect for me. Saved €2,400 last year on cheap overnight flights.', upvotes: 27 },
          { content: 'Coffee and a power nap at your destination airport. Work remotely if possible the next day. Not ideal but the math works out.', upvotes: 14 }
        ]
      },
      {
        module_id: 6,
        title: 'Southeast Asia on €30/day - possible in 2024?',
        content: 'Thinking about a 2-month backpacking trip through Vietnam, Thailand, Cambodia. Is €30/day realistic with good food and nice hostels?',
        replies: [
          { content: 'Easily doable in Vietnam/Cambodia. Thailand is pricey but still possible outside Bangkok. Budget €25 food, €8 hostel, €2 transport daily.', upvotes: 38 },
          { content: 'I did it last year: €15 dorm, €5 street food, €3 long-distance bus. Leave party cities early and go rural = instant savings.', upvotes: 29 },
          { content: 'Also check Workaway for free accommodation! Stayed 3 weeks at a farm in Thailand for 4 hours work/day. Recommend this route!', upvotes: 25 }
        ]
      },
      {
        module_id: 9,
        title: 'Best no-fee international card?',
        content: 'Currently using a card with 3% foreign transaction fees. Thinking about switching. Has anyone compared Wise vs Charles Schwab vs others?',
        replies: [
          { content: 'Wise card saved me €80+ last month alone. Real exchange rates, no hidden fees. Best for currency conversion. Plus debit card is instant.', upvotes: 45 },
          { content: 'Charles Schwab checking account is free too! Zero fees on ATM withdrawals worldwide. That alone saves €200+/year vs other banks.', upvotes: 33 },
          { content: 'Get both! Wise for spending abroad, Schwab for ATM withdrawals. I use them together for every trip.', upvotes: 28 }
        ]
      },
      {
        module_id: 10,
        title: 'Annual travel insurance - which provider?',
        content: 'Looking at annual travel insurance since I take 4-5 trips per year. Single trip policies add up fast. Any trusted providers with good claims experience?',
        replies: [
          { content: 'SafetyWing is €45/month, unlimited trips. Great for frequent travelers. I had malaria claim in Senegal - paid out €3,500 in 3 days.', upvotes: 42 },
          { content: 'Check your credit card benefits first! My Amex covers €50k medical. Combined with €100/year insurance = rock solid coverage for €100 total.', upvotes: 31 },
          { content: 'Allianz Global is solid but read reviews first. Their claim process can be slow. SafetyWing faster but slightly pricier. Pick your priority.', upvotes: 19 }
        ]
      },
      {
        module_id: 12,
        title: 'Airbnb long-term discount - how much should I expect?',
        content: 'Considering a 60-day Airbnb stay in Portugal. The platform shows 15% monthly discount. Is this typical or should I negotiate more?',
        replies: [
          { content: '15% is standard. Some hosts give 20-25% if you message them directly. Always message first with your dates - hosts sometimes do better deals off-platform.', upvotes: 36 },
          { content: 'I negotiated 30% off by booking 90 days. Pro tip: mention you\'re a quiet, long-term guest. Hosts love predictability.', upvotes: 28 },
          { content: 'Watch out for cleaning fees! Those kill your savings on long stays. Calculate total cost including all fees before committing.', upvotes: 22 }
        ]
      },
      {
        module_id: 14,
        title: 'Google Flights vs Skyscanner - which is better?',
        content: 'I always use Google Flights but wondering if I\'m missing deals on Skyscanner. Does anyone consistently find cheaper flights on one vs the other?',
        replies: [
          { content: 'Google Flights for price history and flexibility. Skyscanner for finding hidden gem budget airlines. Use both, compare on the airline site directly.', upvotes: 40 },
          { content: 'Pro move: Search Google Flights, then go to the airline website directly to book. Sometimes cheaper than booking through aggregators!', upvotes: 35 },
          { content: 'Kayak has good price prediction. I check all 3 plus directly on airline websites. Takes 10 minutes but saves €50-100 average.', upvotes: 26 }
        ]
      },
      {
        module_id: 15,
        title: 'Street food safety in Southeast Asia - real talk?',
        content: 'Excited for Bangkok but worried about street food. Friends warned me about getting sick. How risky is it really if you pick the right spots?',
        replies: [
          { content: 'Totally safe if you follow one rule: eat where locals eat, not tourists. The busier the stall = fresher food. Never had an issue this way.', upvotes: 44 },
          { content: 'I got food poisoning once from a fancy restaurant, never from street food. Cooked fresh > pre-made touristy meals. Pick busy stalls.', upvotes: 37 },
          { content: 'Pro tip: Watch the cook. If they\'re sloppy, walk away. If they look professional with high turnover, you\'re golden. Trust your gut (literally!)', upvotes: 31 }
        ]
      }
    ];

    // Insert posts and replies
    for (const post of posts) {
      const postResult = await pool.query(
        `INSERT INTO community_posts (user_id, module_id, title, content, upvote_count)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [demoUserId, post.module_id, post.title, post.content, 12 + Math.floor(Math.random() * 20)]
      );

      const postId = postResult.rows[0].id;

      // Insert replies
      for (const reply of post.replies) {
        await pool.query(
          `INSERT INTO community_replies (post_id, user_id, content, upvote_count)
           VALUES ($1, $2, $3, $4)`,
          [postId, demoUserId, reply.content, reply.upvotes]
        );
      }
    }

    console.log(`✅ Successfully seeded 10 community discussions with ${posts.reduce((sum, p) => sum + p.replies.length, 0)} replies!`);
  } catch (error) {
    console.error('Error seeding community discussions:', error.message);
    throw error;
  }
}

// Initialize database tables and settings on startup
async function initializeApp() {
  try {
    console.log('🚀 TravelSmarter Backend v2.0 — Reddit/LinkedIn/Pinterest/Instagram/WordPress/Blogger/Quora enabled');
    console.log('🔧 Initializing database...');

    // Create all required tables FIRST
    const createTablesSQL = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        subscription_tier VARCHAR(50) DEFAULT 'free',
        subscription_status VARCHAR(50) DEFAULT 'inactive',
        stripe_customer_id VARCHAR(255),
        stripe_subscription_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );

      -- Subscriptions table
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        price_monthly DECIMAL(10, 2),
        stripe_subscription_id VARCHAR(255) UNIQUE,
        current_period_start TIMESTAMP,
        current_period_end TIMESTAMP,
        cancel_at_period_end BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- User preferences table
      CREATE TABLE IF NOT EXISTS user_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_email BOOLEAN DEFAULT true,
        notification_sms BOOLEAN DEFAULT false,
        notification_push BOOLEAN DEFAULT true,
        deal_alert_categories TEXT[],
        language VARCHAR(10) DEFAULT 'en',
        timezone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Hacks table (travel hacks content)
      CREATE TABLE IF NOT EXISTS hacks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        module_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        difficulty VARCHAR(50) DEFAULT 'medium',
        is_active BOOLEAN DEFAULT true,
        usage_count INTEGER DEFAULT 0,
        avg_savings_euros DECIMAL(10, 2) DEFAULT 0,
        success_rate DECIMAL(5, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create index for module lookups
      CREATE INDEX IF NOT EXISTS idx_hacks_module_id ON hacks(module_id);

      -- Add columns if they don't exist (for existing databases)
      ALTER TABLE hacks ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
      ALTER TABLE hacks ADD COLUMN IF NOT EXISTS avg_savings_euros DECIMAL(10, 2) DEFAULT 0;
      ALTER TABLE hacks ADD COLUMN IF NOT EXISTS success_rate DECIMAL(5, 2) DEFAULT 0;

      -- Drop old saved_hacks table if it exists with wrong schema
      DROP TABLE IF EXISTS saved_hacks CASCADE;

      -- Saved hacks table (recreated with correct UUID schema)
      CREATE TABLE IF NOT EXISTS saved_hacks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        hack_id UUID NOT NULL REFERENCES hacks(id) ON DELETE CASCADE,
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, hack_id)
      );

      -- Deals table
      CREATE TABLE IF NOT EXISTS deals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        deal_type VARCHAR(50),
        value_amount DECIMAL(10, 2),
        value_currency VARCHAR(10) DEFAULT 'USD',
        image_url VARCHAR(500),
        source VARCHAR(100),
        verified BOOLEAN DEFAULT false,
        verification_count INTEGER DEFAULT 0,
        upvote_count INTEGER DEFAULT 0,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Deal interactions table
      CREATE TABLE IF NOT EXISTS deal_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
        interaction_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, deal_id, interaction_type)
      );

      -- Promo codes table
      CREATE TABLE IF NOT EXISTS promo_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        discount_percent DECIMAL(5, 2),
        discount_amount DECIMAL(10, 2),
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        max_uses INTEGER,
        current_uses INTEGER DEFAULT 0,
        valid_from TIMESTAMP,
        valid_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create index for promo code lookups
      CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

      -- Payment history table
      CREATE TABLE IF NOT EXISTS payment_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_payment_intent_id VARCHAR(255),
        amount DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) NOT NULL,
        subscription_tier VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create index for payment history lookups
      CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);

      -- Email sequences table (e.g., "10-day welcome sequence")
      CREATE TABLE IF NOT EXISTS email_sequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        trigger_event VARCHAR(100) DEFAULT 'signup',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Email templates table (individual email content)
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sequence_id UUID NOT NULL REFERENCES email_sequences(id) ON DELETE CASCADE,
        day INTEGER NOT NULL,
        subject VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        html_content TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Scheduled emails table (tracks which emails have been sent to which users)
      CREATE TABLE IF NOT EXISTS scheduled_emails (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        template_id UUID NOT NULL REFERENCES email_templates(id),
        scheduled_at TIMESTAMP,
        sent_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for email lookups
      CREATE INDEX IF NOT EXISTS idx_email_templates_sequence ON email_templates(sequence_id);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
      CREATE INDEX IF NOT EXISTS idx_scheduled_emails_user ON scheduled_emails(user_id);

      -- Hack update logs table (for tracking automated hack updates)
      CREATE TABLE IF NOT EXISTS hack_update_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stage VARCHAR(100),
        new_hacks_added INTEGER DEFAULT 0,
        hacks_updated INTEGER DEFAULT 0,
        hacks_marked_obsolete INTEGER DEFAULT 0,
        duplicates_skipped INTEGER DEFAULT 0,
        errors TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_hack_update_logs_started ON hack_update_logs(started_at);

      -- User deal filters table (Elite tier feature for custom alert filtering)
      CREATE TABLE IF NOT EXISTS user_deal_filters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        trip_type VARCHAR(50) DEFAULT 'all',
        min_savings_threshold INTEGER DEFAULT 100,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_user_deal_filters_user ON user_deal_filters(user_id);

      -- Community discussion boards (Elite tier feature)
      CREATE TABLE IF NOT EXISTS community_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        module_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        upvote_count INTEGER DEFAULT 0,
        reply_count INTEGER DEFAULT 0,
        is_pinned BOOLEAN DEFAULT false,
        is_featured BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_community_posts_module ON community_posts(module_id);
      CREATE INDEX IF NOT EXISTS idx_community_posts_user ON community_posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);

      -- Community post replies
      CREATE TABLE IF NOT EXISTS community_replies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        upvote_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_community_replies_post ON community_replies(post_id);
      CREATE INDEX IF NOT EXISTS idx_community_replies_user ON community_replies(user_id);

      -- Community votes (for both posts and replies)
      CREATE TABLE IF NOT EXISTS community_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
        reply_id UUID REFERENCES community_replies(id) ON DELETE CASCADE,
        vote_type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, post_id, reply_id)
      );

      CREATE INDEX IF NOT EXISTS idx_community_votes_user ON community_votes(user_id);
      CREATE INDEX IF NOT EXISTS idx_community_votes_post ON community_votes(post_id);
      CREATE INDEX IF NOT EXISTS idx_community_votes_reply ON community_votes(reply_id);

      -- Award charts table (airline/hotel award redemption rates)
      CREATE TABLE IF NOT EXISTS award_charts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        airline_name VARCHAR(100) NOT NULL,
        origin_airport VARCHAR(10) NOT NULL,
        destination_airport VARCHAR(10) NOT NULL,
        cabin_class VARCHAR(50) NOT NULL,
        miles_required INTEGER NOT NULL,
        cash_equivalent_eur DECIMAL(10, 2),
        value_cpp DECIMAL(5, 2),
        notes TEXT,
        source VARCHAR(100),
        last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(airline_name, origin_airport, destination_airport, cabin_class)
      );

      CREATE INDEX IF NOT EXISTS idx_award_charts_airline ON award_charts(airline_name);
      CREATE INDEX IF NOT EXISTS idx_award_charts_route ON award_charts(origin_airport, destination_airport);
      CREATE INDEX IF NOT EXISTS idx_award_charts_cabin ON award_charts(cabin_class);

      -- Elite status tracking table (user progress toward loyalty tiers)
      CREATE TABLE IF NOT EXISTS user_elite_progress (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        program_type VARCHAR(50) NOT NULL,
        program_name VARCHAR(100) NOT NULL,
        current_tier VARCHAR(100) NOT NULL,
        elite_nights INTEGER DEFAULT 0,
        tier_miles INTEGER DEFAULT 0,
        elite_night_certificates INTEGER DEFAULT 0,
        status_expires_at TIMESTAMP,
        last_activity TIMESTAMP,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, program_name)
      );

      CREATE INDEX IF NOT EXISTS idx_elite_progress_user ON user_elite_progress(user_id);
      CREATE INDEX IF NOT EXISTS idx_elite_progress_program ON user_elite_progress(program_type, program_name);

      -- Twitter posts log
      CREATE TABLE IF NOT EXISTS twitter_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        body TEXT,
        tweet_id VARCHAR(100),
        included_cta BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'posted',
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_twitter_posts_posted_at ON twitter_posts(posted_at DESC);
      ALTER TABLE twitter_posts ADD COLUMN IF NOT EXISTS included_cta BOOLEAN DEFAULT false;
      ALTER TABLE twitter_posts ADD COLUMN IF NOT EXISTS tweet_id VARCHAR(100);
      ALTER TABLE twitter_posts ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'posted';

      -- Reddit posts log
      CREATE TABLE IF NOT EXISTS reddit_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(300),
        body TEXT,
        subreddit VARCHAR(100),
        category VARCHAR(50),
        included_cta BOOLEAN DEFAULT false,
        reddit_url VARCHAR(500),
        status VARCHAR(50) DEFAULT 'posted',
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_reddit_posts_posted_at ON reddit_posts(posted_at DESC);

      -- LinkedIn posts log
      CREATE TABLE IF NOT EXISTS linkedin_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        body TEXT,
        category VARCHAR(50),
        included_cta BOOLEAN DEFAULT false,
        linkedin_post_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'posted',
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_linkedin_posts_posted_at ON linkedin_posts(posted_at DESC);

      -- Pinterest posts log
      CREATE TABLE IF NOT EXISTS pinterest_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(300),
        category VARCHAR(50),
        image_url TEXT,
        description TEXT,
        tags TEXT,
        board_id VARCHAR(100),
        board_name VARCHAR(200),
        link TEXT,
        pin_id VARCHAR(255),
        included_cta BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'draft',
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE pinterest_posts ADD COLUMN IF NOT EXISTS tags TEXT;
      ALTER TABLE pinterest_posts ADD COLUMN IF NOT EXISTS board_id VARCHAR(100);
      ALTER TABLE pinterest_posts ADD COLUMN IF NOT EXISTS board_name VARCHAR(200);
      ALTER TABLE pinterest_posts ADD COLUMN IF NOT EXISTS link TEXT;

      CREATE INDEX IF NOT EXISTS idx_pinterest_posts_posted_at ON pinterest_posts(posted_at DESC);

      -- Instagram posts log
      CREATE TABLE IF NOT EXISTS instagram_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(300),
        category VARCHAR(50),
        image_url TEXT,
        caption TEXT,
        post_id VARCHAR(255),
        included_cta BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'posted',
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE instagram_posts ADD COLUMN IF NOT EXISTS post_url TEXT;

      CREATE INDEX IF NOT EXISTS idx_instagram_posts_posted_at ON instagram_posts(posted_at DESC);

      -- Medium posts log
      CREATE TABLE IF NOT EXISTS medium_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(300),
        body TEXT,
        category VARCHAR(50),
        tags VARCHAR(500),
        medium_id VARCHAR(255),
        medium_url TEXT,
        included_cta BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'published',
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_medium_posts_posted_at ON medium_posts(posted_at DESC);

      -- Quora generated answers
      CREATE TABLE IF NOT EXISTS quora_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question TEXT,
        answer TEXT,
        category VARCHAR(50),
        space_suggestions TEXT,
        status VARCHAR(20) DEFAULT 'draft',
        post_url TEXT,
        included_cta BOOLEAN DEFAULT false,
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS partner_deals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(300) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'other',
        discount_badge VARCHAR(100),
        affiliate_url TEXT NOT NULL,
        logo_url TEXT,
        is_verified BOOLEAN DEFAULT true,
        is_active BOOLEAN DEFAULT true,
        click_count INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE users ADD COLUMN IF NOT EXISTS unsubscribe_token UUID DEFAULT gen_random_uuid();
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_marketing_opt_out BOOLEAN DEFAULT false;
      UPDATE users SET unsubscribe_token = gen_random_uuid() WHERE unsubscribe_token IS NULL;

      ALTER TABLE quora_answers ADD COLUMN IF NOT EXISTS space_suggestions TEXT;
      ALTER TABLE quora_answers ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
      ALTER TABLE quora_answers ADD COLUMN IF NOT EXISTS post_url TEXT;

      CREATE INDEX IF NOT EXISTS idx_quora_answers_posted_at ON quora_answers(posted_at DESC);

      -- SlideShare / Gamma presentations
      CREATE TABLE IF NOT EXISTS slideshare_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT,
        category VARCHAR(100),
        gamma_prompt TEXT,
        ss_title TEXT,
        ss_description TEXT,
        ss_tags TEXT,
        link TEXT,
        post_url TEXT,
        included_cta BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'draft',
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_slideshare_posts_posted_at ON slideshare_posts(posted_at DESC);

      -- Goodies Library (free PDFs/guides for users)
      CREATE TABLE IF NOT EXISTS goodies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        description TEXT,
        slideshare_url TEXT,
        pdf_url TEXT,
        category VARCHAR(100),
        thumbnail_url TEXT,
        download_count INTEGER DEFAULT 0,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_goodies_created_at ON goodies(created_at DESC);

      -- Blogger published posts
      CREATE TABLE IF NOT EXISTS blogger_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT,
        body TEXT,
        category VARCHAR(100),
        blogger_post_id VARCHAR(255),
        blogger_url TEXT,
        included_cta BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'published',
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_blogger_posts_posted_at ON blogger_posts(posted_at DESC);

      -- WordPress.com published posts
      CREATE TABLE IF NOT EXISTS wordpress_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT,
        body TEXT,
        category VARCHAR(100),
        wp_post_id VARCHAR(255),
        wp_url TEXT,
        included_cta BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'published',
        posted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_wordpress_posts_posted_at ON wordpress_posts(posted_at DESC);

      -- Referral partners (bloggers/YouTubers recruited to promote TravelSmarter —
      -- distinct from affiliate_partners, which are outbound links TO other companies)
      CREATE TABLE IF NOT EXISTS referral_partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        referral_code VARCHAR(50) UNIQUE NOT NULL,
        channel_type VARCHAR(50) DEFAULT 'other',
        website_url TEXT,
        audience_size VARCHAR(100),
        status VARCHAR(20) DEFAULT 'pending',
        stripe_connect_account_id VARCHAR(255),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_referral_partners_code ON referral_partners(referral_code);
      CREATE INDEX IF NOT EXISTS idx_referral_partners_status ON referral_partners(status);

      CREATE TABLE IF NOT EXISTS referral_clicks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        referral_code VARCHAR(50) NOT NULL,
        partner_id UUID REFERENCES referral_partners(id),
        source_page TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_referral_clicks_code ON referral_clicks(referral_code);

      -- One-time commission per converted paying customer (100% of first month's
      -- revenue, per business decision) — eligible for payout 14 days after the
      -- charge, to cover the refund/chargeback window.
      CREATE TABLE IF NOT EXISTS referral_conversions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_id UUID NOT NULL REFERENCES referral_partners(id),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tier VARCHAR(50) NOT NULL,
        commission_amount DECIMAL(10, 2) NOT NULL,
        stripe_payment_intent_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        eligible_at TIMESTAMP NOT NULL,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(partner_id, user_id)
      );
      CREATE INDEX IF NOT EXISTS idx_referral_conversions_partner ON referral_conversions(partner_id);
      CREATE INDEX IF NOT EXISTS idx_referral_conversions_status ON referral_conversions(status);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(50);

      -- Outreach prospecting: candidates for the referral partner program,
      -- found manually or via the YouTube Data API search, before they've
      -- agreed to anything. A prospect becomes a referral_partners row once
      -- they reply positively and an admin converts them.
      CREATE TABLE IF NOT EXISTS outreach_prospects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        channel_type VARCHAR(50) DEFAULT 'other',
        url TEXT,
        contact_email VARCHAR(255),
        audience_size VARCHAR(100),
        source VARCHAR(50) DEFAULT 'manual',
        status VARCHAR(20) DEFAULT 'new',
        notes TEXT,
        referral_partner_id UUID REFERENCES referral_partners(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_outreach_prospects_status ON outreach_prospects(status);
      CREATE INDEX IF NOT EXISTS idx_outreach_prospects_channel_type ON outreach_prospects(channel_type);

      CREATE TABLE IF NOT EXISTS outreach_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL,
        sent_count INTEGER DEFAULT 0,
        failed_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS outreach_sends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES outreach_campaigns(id) ON DELETE CASCADE,
        prospect_id UUID NOT NULL REFERENCES outreach_prospects(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(campaign_id, prospect_id)
      );
      CREATE INDEX IF NOT EXISTS idx_outreach_sends_campaign ON outreach_sends(campaign_id);
    `;

    try {
      // Execute tables creation
      await pool.query(createTablesSQL);
      console.log('✅ Database tables created/verified');

      // Verify critical tables exist
      const criticalTables = ['users', 'email_sequences', 'email_templates', 'scheduled_emails'];
      for (const table of criticalTables) {
        const check = await pool.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
          [table]
        );
        if (check.rows[0].exists) {
          console.log(`  ✅ ${table} table exists`);
        } else {
          console.warn(`  ⚠️ ${table} table NOT found`);
        }
      }
    } catch (tableError) {
      console.error('❌ Error creating tables:', tableError.message);
      throw tableError;
    }

    // Initialize settings
    await SettingsController.initializeTable();
    await SettingsController.initializeDefaults();
    console.log('✅ Settings initialized');

    // Initialize Twitter service from DB credentials
    try {
      const twitterSettings = {};
      const twResult = await pool.query(`SELECT key, value FROM settings WHERE key LIKE 'twitter_%'`);
      twResult.rows.forEach(r => { twitterSettings[r.key] = r.value; });
      if (twitterSettings.twitter_api_key && twitterSettings.twitter_api_secret &&
          twitterSettings.twitter_access_token && twitterSettings.twitter_access_secret) {
        const twitterService = require('./services/twitterService');
        const twitterScheduler = require('./services/twitterScheduler');
        const ok = twitterService.reinitializeWithSettings(twitterSettings);
        if (ok) {
          console.log('✅ Twitter service initialized from DB');
          // Auto-restart scheduler if it was running before
          const schedResult = await pool.query(`SELECT key, value FROM settings WHERE key IN ('twitter_scheduler_enabled','twitter_scheduler_times')`);
          const schedSettings = {};
          schedResult.rows.forEach(r => { schedSettings[r.key] = r.value; });
          if (schedSettings.twitter_scheduler_enabled === 'true' && schedSettings.twitter_scheduler_times) {
            const times = JSON.parse(schedSettings.twitter_scheduler_times);
            twitterScheduler.startMultipleDailyPostings(times);
            console.log(`✅ Twitter scheduler auto-restarted (${times.join(', ')})`);
          }
        } else console.log('ℹ️ Twitter credentials in DB but init failed');
      } else {
        console.log('ℹ️ Twitter not configured — add credentials in Settings');
      }
    } catch (twErr) {
      console.warn('⚠️ Twitter service init failed (non-blocking):', twErr.message);
    }

    // Initialize Quora service (content generator — no scheduler)
    try {
      await quoraService.loadSettings();
      console.log('✅ Quora content generator initialized');
    } catch (quoraErr) {
      console.warn('⚠️ Quora service init failed (non-blocking):', quoraErr.message);
    }

    // Initialize Medium service and auto-start scheduler if configured
    try {
      const mediumConfigured = await mediumService.loadSettings();
      if (mediumConfigured) {
        console.log('✅ Medium service initialized');
        if (mediumService.credentials.autoPosting) {
          mediumService.startScheduler();
          console.log('✅ Medium auto-posting scheduler started');
        }
      } else {
        console.log('ℹ️ Medium not configured — add Integration Token in Settings');
      }
    } catch (mediumErr) {
      console.warn('⚠️ Medium service init failed (non-blocking):', mediumErr.message);
    }

    // Seed Instagram + Cloudinary credentials into settings table
    try {
      const igCreds = [
        ['instagram_access_token', 'EAAU3XCOp3KUBRoOIU9qICc0sab6MxejleB3JxyuXfPRsLjCCHpHxYTfpGouFPfo8EEH5aqhmLaZAiDjnN42qZBRCBwZCPeQMFJBFVCyC18yZBgiq6uF46Rxjlxaxt6I1U9sm8WPk5oNtGdxRk4KHMw0YQZCKZBzvukJUJzVn2IOzpZAvi40xHr9XfMftaYxyNNC'],
        ['instagram_account_id', '17841477818287005'],
        ['cloudinary_cloud_name', 'djb1xbhts'],
        ['cloudinary_api_key', '141873827238578'],
        ['cloudinary_api_secret', '4EUJQe2Jtk1NaatdWmzpq-6tk84'],
      ];
      for (const [key, value] of igCreds) {
        await pool.query(
          `INSERT INTO settings (key, value, type) VALUES ($1, $2, 'text') ON CONFLICT (key) DO UPDATE SET value = $2`,
          [key, value]
        );
      }
    } catch (seedErr) {
      console.warn('⚠️ Instagram credentials seed failed:', seedErr.message);
    }

    // Initialize Instagram service
    try {
      const instagramConfigured = await instagramService.loadSettings();
      if (instagramConfigured) {
        console.log('✅ Instagram service initialized');
      } else {
        console.log('ℹ️ Instagram not configured — add credentials in Settings');
      }
    } catch (igErr) {
      console.warn('⚠️ Instagram service init failed (non-blocking):', igErr.message);
    }

    // Initialize Pinterest service and auto-start scheduler if configured
    try {
      const pinterestConfigured = await pinterestService.loadSettings();
      if (pinterestConfigured) {
        console.log('✅ Pinterest service initialized');
        if (pinterestService.credentials.autoPosting) {
          pinterestService.startScheduler();
          console.log('✅ Pinterest auto-posting scheduler started');
        }
      } else {
        console.log('ℹ️ Pinterest not configured — add credentials in Settings');
      }
    } catch (pinterestErr) {
      console.warn('⚠️ Pinterest service init failed (non-blocking):', pinterestErr.message);
    }

    // Initialize LinkedIn service and auto-start scheduler if configured
    try {
      const linkedinConfigured = await linkedinService.loadSettings();
      if (linkedinConfigured) {
        console.log('✅ LinkedIn service initialized');
        if (linkedinService.credentials.autoPosting) {
          linkedinService.startScheduler();
          console.log('✅ LinkedIn auto-posting scheduler started');
        }
      } else {
        console.log('ℹ️ LinkedIn not configured — add credentials in Settings');
      }
    } catch (linkedinErr) {
      console.warn('⚠️ LinkedIn service init failed (non-blocking):', linkedinErr.message);
    }

    // Initialize Reddit service and auto-start scheduler if configured
    try {
      const redditConfigured = await redditService.loadSettings();
      if (redditConfigured) {
        console.log('✅ Reddit service initialized');
        if (redditService.credentials.autoPosting) {
          redditService.startScheduler();
          console.log('✅ Reddit auto-posting scheduler started');
        }
      } else {
        console.log('ℹ️ Reddit not configured — add credentials in Settings');
      }
    } catch (redditErr) {
      console.warn('⚠️ Reddit service init failed (non-blocking):', redditErr.message);
    }

    // Ensure password reset + magic login columns exist (idempotent migration)
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(64),
        ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS magic_login_token VARCHAR(64),
        ADD COLUMN IF NOT EXISTS magic_login_expires TIMESTAMPTZ
    `).catch(err => console.warn('⚠️ Migration warning:', err.message));

    // Email engagement tracking (SendGrid event webhook lands here)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS email_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scheduled_email_id UUID,
        user_id UUID,
        template_id UUID,
        sequence_name VARCHAR(255),
        day INTEGER,
        event_type VARCHAR(50) NOT NULL,
        email VARCHAR(255),
        url TEXT,
        sg_message_id VARCHAR(255),
        event_timestamp TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE email_events ADD COLUMN IF NOT EXISTS day INTEGER;
      CREATE INDEX IF NOT EXISTS idx_email_events_template ON email_events(template_id);
      CREATE INDEX IF NOT EXISTS idx_email_events_type ON email_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_email_events_scheduled_email ON email_events(scheduled_email_id);
    `).catch(err => console.warn('⚠️ Migration warning:', err.message));

    // Affiliate partner link registry: one row per partner/program, referenced
    // by slug from hack content, Partner Deals, and emails via the
    // /api/affiliate/go/:slug redirect, so approving a new affiliate program
    // is a single admin edit instead of a content change everywhere it's
    // mentioned.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS affiliate_partners (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug VARCHAR(100) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        fallback_url TEXT,
        affiliate_url TEXT,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS affiliate_clicks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        partner_slug VARCHAR(100) NOT NULL,
        source_page TEXT,
        used_affiliate_link BOOLEAN,
        clicked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_slug ON affiliate_clicks(partner_slug);
    `).catch(err => console.warn('⚠️ Migration warning:', err.message));

    await affiliateController.seedAffiliatePartners().catch(err => {
      console.warn('⚠️ Error seeding affiliate partners:', err.message);
    });

    // Tracks which one-off broadcast templates each user has already received,
    // so the same broadcast is never sent to the same user twice.
    await pool.query(`
      CREATE TABLE IF NOT EXISTS broadcast_sends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        template_id VARCHAR(100) NOT NULL,
        sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, template_id)
      );
      CREATE INDEX IF NOT EXISTS idx_broadcast_sends_template ON broadcast_sends(template_id);
    `).catch(err => console.warn('⚠️ Migration warning:', err.message));

    // Seed default email sequence (first run), then sync templates from code
    await emailSequenceService.seedEmailSequence().catch(err => {
      console.warn('⚠️ Error seeding email templates:', err.message);
    });
    await emailSequenceService.updateEmailTemplates().catch(err => {
      console.warn('⚠️ Error updating email templates:', err.message);
    });

    // Seed Feature Spotlight (free->paid nurture) sequence, then sync from code
    await emailSequenceService.seedFeatureSpotlightSequence().catch(err => {
      console.warn('⚠️ Error seeding Feature Spotlight templates:', err.message);
    });
    await emailSequenceService.updateFeatureSpotlightTemplates().catch(err => {
      console.warn('⚠️ Error updating Feature Spotlight templates:', err.message);
    });

    // Seed travel hacks if database is empty (skip in production for faster startup)
    if (process.env.SKIP_SEED !== 'true') {
      await seedTravelHacks().catch(err => {
        console.warn('⚠️ Error seeding travel hacks:', err.message);
      });

      // Seed community discussions if none exist
      await seedCommunityDiscussions().catch(err => {
        console.warn('⚠️ Error seeding community discussions:', err.message);
      });
    } else {
      console.log('⏭️ Skipping seed data (SKIP_SEED=true)');
    }

    // Seed partner deals if table is empty
    try {
      const dealsCount = await pool.query(`SELECT COUNT(*) FROM partner_deals`);
      if (parseInt(dealsCount.rows[0].count) === 0) {
        const deals = [
          ['Wise Travel Card', 'Send money abroad at the real exchange rate. No hidden fees. Perfect for travel.', 'travel_card', 'No FX Fees', 'https://wise.com/invite/ih/michaelh2041', '', true, 1],
          ['Airalo eSIM', 'Stay connected in 200+ countries with affordable data eSIMs. No roaming charges.', 'esim', 'Up to 70% cheaper', 'https://www.airalo.com/?irclickid=ref-travelsmarter', '', true, 2],
          ['SafetyWing Travel Insurance', 'Flexible travel medical insurance for nomads and travelers. From $45.08/month.', 'insurance', 'From $45/month', 'https://safetywing.com/?referenceID=travelsmarter', '', true, 3],
          ['NordVPN', 'Stay secure on public WiFi. Access geo-restricted deals. 68% off with our link.', 'vpn', '68% OFF', 'https://nordvpn.com/special/travelsmarter/', '', true, 4],
          ['Booking.com', 'Book hotels, apartments and more. Genius members save up to 20% instantly.', 'hotels', 'Up to 20% OFF', 'https://www.booking.com/index.html?aid=2311236', '', true, 5],
          ['Rentalcars.com', 'Compare car rental deals from 900+ companies worldwide. Best price guarantee.', 'car_rental', 'Best Price Guarantee', 'https://www.rentalcars.com/?affiliateCode=travelsmarter', '', true, 6],
          ['Priority Pass', 'Access 1,300+ airport lounges worldwide. Free drinks, food and WiFi.', 'flights', '10% OFF membership', 'https://www.prioritypass.com/en/affiliate/travelsmarter', '', true, 7],
          ['Away Luggage', 'Premium hardshell carry-on luggage with built-in battery. Built for smart travelers.', 'luggage', '$20 OFF first order', 'https://www.awaytravel.com/travelsmarter', '', true, 8],
        ];
        for (const [title, description, category, badge, url, logo, verified, order] of deals) {
          await pool.query(
            `INSERT INTO partner_deals (title, description, category, discount_badge, affiliate_url, logo_url, is_verified, sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [title, description, category, badge, url, logo, verified, order]
          );
        }
        console.log('✅ Partner deals seeded (8 deals)');
      }
    } catch (err) {
      console.warn('⚠️ Partner deals seed failed:', err.message);
    }

    console.log('✅ App initialization complete');
  } catch (error) {
    console.error('❌ Error during app initialization:', error);
  }
}

// Daily flight price check at 06:00 UTC
function scheduleDailyFlightCheck() {
  const now = new Date();
  const next = new Date();
  next.setUTCHours(6, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  const delay = next - now;
  setTimeout(() => {
    runDailyPriceCheck().catch(e => console.error('[FlightAlerts] Cron error:', e));
    setInterval(() => {
      runDailyPriceCheck().catch(e => console.error('[FlightAlerts] Cron error:', e));
    }, 24 * 60 * 60 * 1000);
  }, delay);
  console.log(`[FlightAlerts] Daily check scheduled in ${Math.round(delay/3600000)}h`);
}
scheduleDailyFlightCheck();

// Start server IMMEDIATELY (non-blocking DB init)
const PORT = process.env.PORT || 5000;

// Start listening FIRST - don't wait for DB initialization
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 TravelSmarter API Server Running  ║
║   Port: ${PORT}                         ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
║   Database: ${process.env.DB_NAME}                      ║
╚════════════════════════════════════════╝
  `);

  // Email sequence scheduler - runs every hour to send pending emails
  console.log('📧 Email sequence scheduler started (runs every hour)');
  setInterval(async () => {
    try {
      await emailSequenceService.sendPendingEmails();
    } catch (error) {
      console.error('❌ Error in email sequence scheduler:', error);
    }
  }, 60 * 60 * 1000);

  // Hack update scheduler - durable check against the database, not an in-memory
  // timer. A plain setInterval(14 days) resets to zero on every deploy/restart,
  // so on an actively-developed app it could go months without ever firing.
  // Instead, check on boot and periodically whether 14 days have passed since
  // the last *completed* run (per hack_update_logs), and run if so.
  console.log('🤖 Hack update scheduler started (durable, checks every 6h, runs biweekly)');
  const HACK_UPDATE_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;
  async function maybeRunHackUpdate() {
    try {
      const result = await pool.query(
        `SELECT completed_at FROM hack_update_logs WHERE stage = 'completed' ORDER BY completed_at DESC LIMIT 1`
      );
      const lastRun = result.rows[0]?.completed_at;
      const dueAt = lastRun ? new Date(lastRun).getTime() + HACK_UPDATE_INTERVAL_MS : 0;
      if (Date.now() >= dueAt) {
        console.log('🤖 Hack update is due — running now...');
        await hackUpdateService.runHackUpdateCycle();
      } else {
        console.log(`🤖 Hack update not due yet. Next run: ${new Date(dueAt).toISOString()}`);
      }
    } catch (error) {
      console.error('❌ Error in hack update scheduler:', error);
    }
  }
  maybeRunHackUpdate();
  setInterval(maybeRunHackUpdate, 6 * 60 * 60 * 1000); // re-check every 6h

  // Referral commission eligibility — flips 'pending' conversions to
  // 'eligible' once their 14-day refund/chargeback hold has passed, so the
  // admin dashboard can see what's actually payable.
  console.log('💸 Referral eligibility scheduler started (runs every 6h)');
  const referralService = require('./services/referralService');
  setInterval(async () => {
    try {
      const count = await referralService.processEligibility();
      if (count > 0) console.log(`💸 ${count} referral conversion(s) marked eligible for payout`);
    } catch (error) {
      console.error('❌ Error in referral eligibility scheduler:', error);
    }
  }, 6 * 60 * 60 * 1000);
});

// Initialize app in background (non-blocking)
initializeApp().catch(error => {
  console.error('❌ Error during app initialization (background):', error);
  // Don't exit - server is already running and can serve requests
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  app.close(() => {
    pool.end(() => {
      process.exit(0);
    });
  });
});

module.exports = app;
