const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const pool = require('./config/database');
const emailSequenceService = require('./services/emailSequenceService');
const hackUpdateService = require('./services/hackUpdateService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const dealsRoutes = require('./routes/dealsRoutes');
const hacksRoutes = require('./routes/hacksRoutes');
const dealFiltersRoutes = require('./routes/dealFiltersRoutes');
const communityRoutes = require('./routes/communityRoutes');
const adminRoutes = require('./routes/adminRoutes');
const promoRoutes = require('./routes/promoRoutes');
const contactRoutes = require('./routes/contactRoutes');

// Email template routes
const emailTemplateRoutes = require('./routes/emailTemplateRoutes');

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/hacks', hacksRoutes);
app.use('/api/user/deal-filters', dealFiltersRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/admin', adminRoutes);
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
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@travelsmarterapp.com',
        subject: `TravelSmarter Contact: ${topicLabel} - ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nTopic: ${topicLabel}\n\nMessage:\n${message}`
      });

      // Send confirmation to user
      try {
        await sgMail.send({
          to: email,
          from: process.env.SENDGRID_FROM_EMAIL || 'noreply@travelsmarterapp.com',
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
      INSERT INTO hacks (module_id, title, description, category, difficulty) VALUES
      (1, 'Book Flights on Tuesday', 'Airlines typically release sales on Tuesday mornings. Search and book on Tuesday-Thursday for best prices, saving up to 30%.', 'Pricing', 'easy'),
      (1, 'Use Incognito Mode', 'Clear cookies or use incognito mode when searching for flights to avoid price increases from repeated searches.', 'Tricks', 'easy'),
      (1, 'Fly on Off-Peak Days', 'Fly mid-week (Tuesday-Thursday) instead of weekends. Mid-week flights are 15-25% cheaper on average.', 'Timing', 'easy'),
      (1, 'Set Price Alerts', 'Use Google Flights, Hopper, or Kayak alerts to track prices. Book when you see a 20%+ drop from historical average.', 'Tools', 'easy'),
      (1, 'Fly Into Nearby Airports', 'Instead of flying into major hubs, fly into secondary airports 1-2 hours away for 30-50% savings.', 'Strategy', 'medium'),
      (1, 'Use Budget Airlines Strategically', 'Budget airlines are cheap but add fees. Use them for short flights or when layovers work with your schedule.', 'Strategy', 'medium'),
      (2, 'Maximize Travel Rewards', 'Use credit cards with 2-5% travel rewards. A $5,000 flight earns $100-250 in rewards or points.', 'Rewards', 'easy'),
      (2, 'Sign-Up Bonuses', 'New card sign-up bonuses often give 50,000+ miles worth $500-1,000. Worth opening a card for planned travel.', 'Bonuses', 'medium'),
      (2, 'Transfer Points to Airlines', 'Credit card points transfer to airlines at better rates than airline direct purchases. 1 point = 1.5-2 miles often.', 'Strategy', 'medium'),
      (2, 'No Foreign Transaction Fees', 'Get a card with no foreign transaction fees. Regular cards charge 2-3% on every international purchase.', 'Banking', 'easy'),
      (2, 'Travel Insurance Included', 'Premium cards include trip cancellation, lost luggage, and emergency medical coverage worth $500-5,000.', 'Protection', 'easy'),
      (2, 'Priority Pass Lounges', 'Premium travel cards include Priority Pass membership for airport lounge access (saves $30-50 per visit).', 'Perks', 'medium'),
      (2, 'Airline Status Matching', 'New elite cardholders can match status on another airline. Matches last 1-2 years, saving thousands in upgrades.', 'Status', 'hard'),
      (3, 'Book Direct for Loyalty Points', 'Booking direct on hotel websites earns more loyalty points than booking through Expedia/Booking.com.', 'Loyalty', 'easy'),
      (3, 'Negotiate Room Upgrades', 'Arrive early and politely ask about upgrades. Mention loyalty status or special occasions. 40%+ success rate.', 'Strategy', 'easy'),
      (3, 'Off-Season Travel', 'Travel during shoulder seasons (March-May, September-November) for 30-50% hotel discounts.', 'Timing', 'easy'),
      (3, 'Hotel Price Match Guarantees', 'Book hotels that offer price matching. If you find lower prices within 24-48 hours, they match and give discount.', 'Tools', 'medium'),
      (3, 'Use Hotel Loyalty Elites', 'Join hotel loyalty programs (free). Accumulate status to get free nights, room upgrades, and late checkout.', 'Loyalty', 'easy'),
      (3, 'AAA and Corporate Discounts', 'AAA members get 10% off most hotels. Corporate/government employees can save 20% with employee discounts.', 'Discounts', 'easy'),
      (3, 'Book Packages with Flights', 'Flight+Hotel packages sometimes cost less than booking separately. Compare bundled prices carefully.', 'Bundles', 'medium'),
      (4, 'Avoid Peak Travel Seasons', 'Avoid school holidays, summer (June-August), and December holidays. Travel in shoulder seasons saves 40-60%.', 'Timing', 'easy'),
      (4, 'Fly on Holidays', 'Thanksgiving, Christmas day, and New Year''s Day have fewer travelers. Book these dates for cheaper flights.', 'Timing', 'medium'),
      (4, 'Book 1-3 Months Ahead', 'Sweet spot for booking is 1-3 months before travel. Earlier = uncertain prices, later = more expensive.', 'Strategy', 'easy'),
      (4, 'Red-Eye Flights Save Money', 'Late night and early morning flights are 20-40% cheaper and less crowded. Trade sleep for savings.', 'Strategy', 'medium'),
      (4, 'Travel Tuesday-Thursday', 'These days have lowest fares. Avoid Friday-Sunday for best prices on flights and hotels.', 'Timing', 'easy'),
      (4, 'Check Fare Calendars', 'Use Google Flights, Kayak, or Skyscanner''s calendar view to find cheapest travel dates at a glance.', 'Tools', 'easy'),
      (5, 'Use Public Transit to Airports', 'Public transportation to airports costs $5-15. Parking and rideshares cost $15-50. Save $30-100 each trip.', 'Savings', 'easy'),
      (5, 'Arrive 2 Hours Early (Domestic)', 'Arrive 2 hours early for domestic flights to avoid stress and potentially make missed flights due to delays.', 'Efficiency', 'easy'),
      (5, 'TSA PreCheck and CLEAR', 'TSA PreCheck ($78/5 years) gets you to security in 5 minutes. CLEAR ($179/year) bypasses security lines entirely.', 'Speed', 'medium'),
      (5, 'Lounge Access Strategies', 'Get lounge access via airline status, credit cards, or loyalty memberships rather than $30 day passes.', 'Perks', 'medium'),
      (5, 'Airport WiFi Free Workarounds', 'Use airline/lounge WiFi, credit card WiFi passes, or mobile hotspot. Most paid airport WiFi isn''t worth it.', 'Hacks', 'easy'),
      (5, 'Transfer During Layovers', 'Stay in airport if layover is under 2 hours. Don''t go through immigration/customs unless 3+ hour layover.', 'Strategy', 'medium'),
      (6, 'Visit Underrated Destinations', 'Skip expensive tourist hotspots. Visit lesser-known destinations 50% cheaper with better experiences.', 'Strategy', 'medium'),
      (6, 'Eastern Europe & Southeast Asia', 'These regions offer 10x value: $10/day food, $5/night hostels, $0.50 beers. Stretch travel budget 10x further.', 'Budget', 'easy'),
      (6, 'Shoulder Season Travel', 'March-May and September-November offer perfect weather and 40% lower prices than peak season.', 'Timing', 'easy'),
      (6, 'Digital Nomad Hotspots', 'Portugal, Mexico, Thailand, Vietnam have cheap long-term rentals ($300-500/month) perfect for extended stays.', 'Strategy', 'medium'),
      (7, 'Book Through Costco Travel', 'Costco members get 30-50% discounts on car rentals. Membership pays for itself on one rental.', 'Discounts', 'easy'),
      (7, 'Decline Rental Insurance', 'Your credit card or auto insurance covers rentals. Decline rental company insurance and save $15-30/day.', 'Savings', 'easy'),
      (7, 'Pick Up at Offsite Locations', 'Rental cars are cheaper at offsite, non-airport locations. Save $20-50/day by picking up downtown.', 'Strategy', 'easy'),
      (7, 'Autoslash for Price Monitoring', 'Book rentals early through Autoslash. If prices drop, it automatically rebooking at lower rates.', 'Tools', 'medium'),
      (8, 'Use Couchsurfing', 'Free homestays with locals. Better than hotels: authentic experiences, local knowledge, free breakfast.', 'Accommodation', 'medium'),
      (8, 'Workaway & Volunteer Programs', 'Exchange labor (4-6 hours/day) for free accommodation. Work with animals, farms, hostels, or startups.', 'Accommodation', 'medium'),
      (8, 'Join Facebook Travel Groups', 'Join destination-specific Facebook groups. Locals give free tips, recommendations, and sometimes offer couches.', 'Community', 'easy'),
      (8, 'Meetup Travel Groups', 'Meetup.com has free travel group meetups in your city. Connect with other travelers, share tips, travel buddies.', 'Community', 'easy'),
      (8, 'Travel Blogs & YouTube Channels', 'Follow travel bloggers for destination guides. They find the best hidden spots, budget hacks, and travel timing.', 'Research', 'easy'),
      (8, 'Travel Forums & Reddit', 'r/travel, r/solotravel, r/budgettravel have millions of travelers. Ask questions, get real advice from experienced travelers.', 'Research', 'easy'),
      (8, 'Hospitality Exchanges', 'Use Hospitality Club or Global Freeloaders for free homestays. Similar to Couchsurfing but with different communities.', 'Accommodation', 'medium'),
      (9, 'Notify Bank Before Travel', 'Tell your bank your travel dates. Without notice, purchases abroad trigger fraud blocks and card declines.', 'Banking', 'easy'),
      (9, 'Avoid Airport Money Exchange', 'Airport currency exchange has 5-10% markup. Use ATMs to withdraw local currency at real exchange rates.', 'Money', 'easy'),
      (9, 'Use ATMs, Not Credit Cards', 'ATM withdrawals cost $2-3 but give real exchange rates. Credit cards charge 3-4% foreign transaction fees.', 'Strategy', 'easy'),
      (9, 'Get No-Fee International Card', 'Use cards with no foreign transaction fees. Capital One 360, Charles Schwab, or Wise cards work worldwide.', 'Banking', 'medium'),
      (9, 'Wise (formerly TransferWise)', 'Transfer money internationally at real mid-market rates with minimal fees. Perfect for extended international travel.', 'Tools', 'medium'),
      (10, 'Credit Card Coverage Included', 'Premium travel credit cards include trip cancellation, emergency medical, and lost baggage insurance automatically.', 'Insurance', 'easy'),
      (10, 'Annual vs Single Trip Policies', 'Annual travel insurance ($200-300) is cheaper than single trip ($50 per trip) if you travel 5+ times/year.', 'Strategy', 'medium'),
      (10, 'Comprehensive Coverage Matters', 'Get coverage for: trip cancellation, medical emergencies, evacuation, lost baggage. Don''t skip any category.', 'Planning', 'medium'),
      (10, 'Buy Insurance Within 14 Days', 'Many policies won''t cover pre-existing conditions unless bought within 14 days of initial trip booking.', 'Timing', 'easy'),
      (10, 'Read the Fine Print', 'Insurance claims get denied on technicalities. Understand what''s covered, deductibles, and claim process before travel.', 'Planning', 'hard'),
      (11, 'Visa-Free Travel List', 'Check which countries you can visit visa-free. EU, Mexico, Canada are visa-free for US/EU citizens.', 'Planning', 'easy'),
      (11, 'Visa on Arrival', 'Many countries (Thailand, Vietnam, Turkey) offer visa-on-arrival. Cheaper than pre-applying at embassies.', 'Strategy', 'easy'),
      (11, 'Digital Nomad Visas', 'Countries like Portugal, Estonia, and Mexico now offer 1-year digital nomad visas for remote workers.', 'Visas', 'medium'),
      (11, 'Plan Extended Stays Legally', 'Instead of visa runs, apply for long-term visas. Student, work, or residence visas allow 1-5 years legally.', 'Planning', 'hard'),
      (11, 'Passport Strength Matters', 'Strong passports (US, EU, Singapore) get visa-free access to 190+ countries. Renew early if approaching expiry.', 'Planning', 'easy'),
      (12, 'Airbnb Entire Homes are Better', 'Entire homes are often cheaper than hotel rooms and include kitchens (save 60% on food costs).', 'Strategy', 'easy'),
      (12, 'Long-Term Airbnb Discounts', 'Stays over 28 days get 20-40% discounts automatically. Perfect for month-long explorations.', 'Discounts', 'easy'),
      (12, 'Hostels with Private Rooms', 'Hostels charge $20-40/night for private rooms with community vibes. Cheaper and more social than hotels.', 'Accommodation', 'easy'),
      (12, 'House Swapping', 'Swap homes with someone traveling to your city. Free accommodation worldwide through HomeExchange.com.', 'Accommodation', 'medium'),
      (12, 'Serviced Apartments', 'Serviced apartments in Eastern Europe and SE Asia cost $15-30/night with kitchens and laundry.', 'Budget', 'medium'),
      (13, 'Get City Tourist Cards', 'Most cities have tourist cards with unlimited public transit + attractions. Often save 40-60% vs individual tickets.', 'Savings', 'easy'),
      (13, 'Buy Transport Passes Upfront', 'Weekly/monthly passes cost 40-50% less than daily tickets. Buy at beginning of stay.', 'Strategy', 'easy'),
      (13, 'Walk & Bike Instead', 'Walking and biking cost nothing, improve fitness, and help you discover hidden gems tourists miss.', 'Health', 'easy'),
      (13, 'Overnight Buses Save Hotel', 'Sleep on buses/trains overnight. Save $50-100 on accommodation while making progress on your journey.', 'Strategy', 'medium'),
      (13, 'Ride-Share Splitting', 'Share Uber/Grab rides with other travelers you meet. Split cost 50/50 and make friends.', 'Social', 'easy'),
      (14, 'Comparison Shop Always', 'Use Kayak, Google Flights, Skyscanner to compare all booking sites. Prices vary by $50-200 for same flight.', 'Strategy', 'easy'),
      (14, 'Book Flights and Hotels Separately', 'Booking separately is usually 10-20% cheaper than packages. Book hotel separately for better cancellation.', 'Strategy', 'easy'),
      (14, 'Use Cashback Sites', 'Rakuten, TopCashback give 5-10% cashback on bookings. Every $1,000 spent earns $50-100 cashback.', 'Savings', 'easy'),
      (14, 'Clear Cookies and Compare', 'Websites track your searches and increase prices. Use incognito/private mode or clear cookies before final booking.', 'Tricks', 'easy'),
      (14, 'Flexible Date Flexibility Pays', 'Being flexible with dates saves $500+ on flights. Shift travel by even 1-2 days to find cheaper flights.', 'Strategy', 'medium'),
      (15, 'Eat Where Locals Eat', 'Avoid touristy restaurants. Eat at local markets, street food stalls, and non-tourist areas. Save 70% on food.', 'Strategy', 'easy'),
      (15, 'Lunch Specials Over Dinner', 'Lunch menus are 30-50% cheaper than dinner at same restaurants. Eat your main meal at lunch.', 'Timing', 'easy'),
      (15, 'Street Food is Safe & Cheap', 'Street food is usually $1-3 per meal, freshly cooked, and safer than you think. Ask locals where to eat.', 'Budget', 'easy'),
      (15, 'Cook Your Own Meals', 'Airbnbs with kitchens let you cook meals for $2-5. Buy groceries at local markets, not tourist shops.', 'Budget', 'easy'),
      (15, 'Happy Hour & Set Menus', 'Many restaurants have 4-8pm happy hours with 50% off drinks and appetizers. Eat light happy hour meals.', 'Timing', 'easy'),
      (16, 'EU VAT Refunds', 'Non-EU residents get 15-25% VAT refunds on purchases over €50-100. Claim at airport before departure.', 'Money', 'medium'),
      (16, 'Shop Duty-Free on Exit', 'Duty-free shopping on exit is actually duty-free (tax-free). Cheaper for alcohol, perfume, electronics.', 'Strategy', 'easy'),
      (16, 'Outlet Malls Outside Cities', 'Outlet malls outside major cities have 40-60% discounts vs downtown boutiques. Worth the day trip.', 'Shopping', 'easy'),
      (16, 'Local Markets vs Tourist Shops', 'Markets have 50-70% cheaper prices than tourist shops selling same items. Always negotiate at markets.', 'Strategy', 'easy'),
      (16, 'Timing Sales & Seasons', 'Shop during sales (January, July) for 40-70% discounts. Avoid shopping during peak seasons (June, December).', 'Timing', 'easy')
    `;

    await pool.query(hacksSql);
    console.log('✅ Successfully seeded 87 travel hacks!');
  } catch (error) {
    console.error('Error seeding hacks:', error.message);
    throw error;
  }
}

// Initialize database tables and settings on startup
async function initializeApp() {
  try {
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- Create index for module lookups
      CREATE INDEX IF NOT EXISTS idx_hacks_module_id ON hacks(module_id);

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
        value_currency VARCHAR(10) DEFAULT 'EUR',
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

    // Seed default email sequence
    await emailSequenceService.seedEmailSequence().catch(err => {
      console.warn('⚠️ Error seeding email templates:', err.message);
    });

    // Seed travel hacks if database is empty
    await seedTravelHacks().catch(err => {
      console.warn('⚠️ Error seeding travel hacks:', err.message);
    });

    console.log('✅ App initialization complete');
  } catch (error) {
    console.error('❌ Error during app initialization:', error);
  }
}

// Start server
const PORT = process.env.PORT || 5000;

initializeApp().then(() => {
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

    // Hack update scheduler - runs biweekly (every 14 days) to search for and update hacks
    console.log('🤖 Hack update scheduler started (runs biweekly)');
    setInterval(async () => {
      try {
        await hackUpdateService.runHackUpdateCycle();
      } catch (error) {
        console.error('❌ Error in hack update scheduler:', error);
      }
    }, 14 * 24 * 60 * 60 * 1000); // 14 days

    // Run hack update immediately on startup (optional - comment out to skip)
    // Uncomment next line to run immediately on server start
    // hackUpdateService.runHackUpdateCycle().catch(err => console.error('Initial hack update failed:', err));
  });
}).catch(error => {
  console.error('Failed to initialize app:', error);
  process.exit(1);
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
