/**
 * Migration: Create Social Media Tables
 * Creates tables for multi-platform social media automation
 */

const pool = require('../config/database');

async function up() {
  try {
    console.log('🔄 Running migration: Create Social Media Tables...');

    // 1. Social Media Accounts Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_media_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform VARCHAR(50) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        account_data JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(platform, account_name)
      );
      CREATE INDEX IF NOT EXISTS idx_social_accounts_platform ON social_media_accounts(platform);
      CREATE INDEX IF NOT EXISTS idx_social_accounts_active ON social_media_accounts(is_active);
    `);
    console.log('✅ Created social_media_accounts table');

    // 2. Social Media Posts Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_media_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(500),
        content TEXT NOT NULL,
        post_type VARCHAR(50) DEFAULT 'travel_tip',
        source_hack_id UUID REFERENCES hacks(id),
        source_deal_id UUID REFERENCES deals(id),
        image_url VARCHAR(500),
        image_filename VARCHAR(255),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_social_posts_type ON social_media_posts(post_type);
      CREATE INDEX IF NOT EXISTS idx_social_posts_created ON social_media_posts(created_at);
    `);
    console.log('✅ Created social_media_posts table');

    // 3. Post Platforms Table (platform-specific versions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_platforms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES social_media_posts(id) ON DELETE CASCADE,
        platform VARCHAR(50) NOT NULL,
        platform_content TEXT NOT NULL,
        hashtags TEXT[],
        media_ids JSONB DEFAULT '{}',
        character_count INTEGER,
        estimated_engagement_score DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, platform)
      );
      CREATE INDEX IF NOT EXISTS idx_post_platforms_post ON post_platforms(post_id);
      CREATE INDEX IF NOT EXISTS idx_post_platforms_platform ON post_platforms(platform);
    `);
    console.log('✅ Created post_platforms table');

    // 4. Scheduled Posts Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scheduled_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES social_media_posts(id) ON DELETE CASCADE,
        account_id UUID NOT NULL REFERENCES social_media_accounts(id),
        platform VARCHAR(50) NOT NULL,
        scheduled_at TIMESTAMP NOT NULL,
        posted_at TIMESTAMP,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_scheduled_at (scheduled_at, status),
        INDEX idx_platform_status (platform, status)
      );
      CREATE INDEX IF NOT EXISTS idx_scheduled_posts_account ON scheduled_posts(account_id);
    `);
    console.log('✅ Created scheduled_posts table');

    // 5. Post Analytics Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_analytics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        scheduled_post_id UUID REFERENCES scheduled_posts(id),
        platform_post_id VARCHAR(255),
        platform VARCHAR(50),
        likes INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        impressions INTEGER DEFAULT 0,
        engagement_rate DECIMAL(5,2),
        click_through_rate DECIMAL(5,2),
        last_updated TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_platform_post (platform, platform_post_id)
      );
    `);
    console.log('✅ Created post_analytics table');

    // 6. Social Media Config Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_media_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        platform VARCHAR(50) NOT NULL UNIQUE,
        posting_frequency VARCHAR(50) DEFAULT 'daily',
        posting_hours INT[] DEFAULT '{9,14,19}',
        timezone VARCHAR(50) DEFAULT 'UTC',
        max_daily_posts INTEGER DEFAULT 3,
        content_mix JSONB DEFAULT '{"tips":40,"deals":35,"engagement":25}',
        hashtag_strategy JSONB DEFAULT '{}',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created social_media_config table');

    // Initialize default config for each platform
    await pool.query(`
      INSERT INTO social_media_config (platform, posting_frequency, posting_hours, is_active)
      VALUES
        ('twitter', 'multiple_daily', '{9,14,19}', true),
        ('reddit', 'daily', '{18}', false),
        ('pinterest', 'daily', '{20}', false),
        ('instagram', 'daily', '{11,18}', false),
        ('linkedin', 'daily', '{9}', false)
      ON CONFLICT (platform) DO NOTHING;
    `);
    console.log('✅ Initialized platform configurations');

    console.log('✅ Migration completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function down() {
  try {
    console.log('🔄 Rolling back migration...');

    await pool.query(`
      DROP TABLE IF EXISTS post_analytics;
      DROP TABLE IF EXISTS scheduled_posts;
      DROP TABLE IF EXISTS post_platforms;
      DROP TABLE IF EXISTS social_media_posts;
      DROP TABLE IF EXISTS social_media_accounts;
      DROP TABLE IF EXISTS social_media_config;
    `);

    console.log('✅ Rollback completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

module.exports = { up, down };
