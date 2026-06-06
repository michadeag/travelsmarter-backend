const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const pool = require('./config/database');
const emailSequenceService = require('./services/emailSequenceService');

// Import routes
const authRoutes = require('./routes/authRoutes');
const subscriptionRoutes = require('./routes/subscriptionRoutes');
const dealsRoutes = require('./routes/dealsRoutes');
const hacksRoutes = require('./routes/hacksRoutes');
const adminRoutes = require('./routes/adminRoutes');
const promoRoutes = require('./routes/promoRoutes');

// Safely import email template routes
let emailTemplateRoutes;
try {
  emailTemplateRoutes = require('./routes/emailTemplateRoutes');
  console.log('✅ Email template routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading email template routes:', error.message);
  emailTemplateRoutes = null;
}

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
app.use('/api/admin', adminRoutes);
app.use('/api/promos', promoRoutes);

// Only register email template routes if they loaded successfully
if (emailTemplateRoutes) {
  app.use('/api/email-templates', emailTemplateRoutes);
} else {
  console.warn('⚠️ Email template routes NOT registered due to load error');
}

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

      -- Saved hacks table
      CREATE TABLE IF NOT EXISTS saved_hacks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        module_id INTEGER,
        hack_id INTEGER,
        hack_title VARCHAR(255),
        hack_category VARCHAR(100),
        saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, module_id, hack_id)
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

    // NOTE: Email seeding disabled for now - focus on API endpoints first
    // await emailSequenceService.seedEmailSequence().catch(err => {
    //   console.warn('⚠️ Error seeding email templates:', err.message);
    // });

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

    // NOTE: Email sequence scheduler disabled for now
    // Will be re-enabled once table creation is fixed
    // console.log('📧 Email sequence scheduler started (runs every hour)');
    // setInterval(async () => {
    //   try {
    //     await emailSequenceService.sendPendingEmails();
    //   } catch (error) {
    //     console.error('❌ Error in email sequence scheduler:', error);
    //   }
    // }, 60 * 60 * 1000);
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
