#!/bin/bash
# scripts/init-db.js

const { Client } = require('pg');
require('dotenv').config();

async function initDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'dev_user',
    password: process.env.DB_PASSWORD || 'dev_password',
    database: 'postgres' // Connect to default postgres database first
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL');

    const dbName = process.env.DB_NAME || 'promotionai_dev';
    
    // Check if database exists
    const dbExists = await client.query(
      'SELECT 1 FROM pg_catalog.pg_database WHERE datname = $1',
      [dbName]
    );

    if (dbExists.rowCount === 0) {
      // Create database
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created`);
    } else {
      console.log(`Database ${dbName} already exists`);
    }

    // Connect to the new database
    const newClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'dev_user',
      password: process.env.DB_PASSWORD || 'dev_password',
      database: dbName
    });

    await newClient.connect();
    console.log(`Connected to ${dbName}`);

    // Create extensions
    await newClient.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('UUID extension created');

    // Create tables for news sources
    await newClient.query(`
      CREATE TABLE IF NOT EXISTS news_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        category VARCHAR(100),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('news_sources table created');

    // Create tables for collected news
    await newClient.query(`
      CREATE TABLE IF NOT EXISTS collected_news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        source_url TEXT NOT NULL,
        source_name VARCHAR(255),
        category VARCHAR(100),
        published_at TIMESTAMP,
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT false,
        ai_processed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('collected_news table created');

    // Create indexes
    await newClient.query(`
      CREATE INDEX IF NOT EXISTS idx_collected_news_processed ON collected_news(processed);
      CREATE INDEX IF NOT EXISTS idx_collected_news_category ON collected_news(category);
    `);
    console.log('Indexes created');

    // Create AI content tables
    await newClient.query(`
      CREATE TABLE IF NOT EXISTS ai_generated_content (
        id SERIAL PRIMARY KEY,
        original_content_id INTEGER,
        original_content TEXT,
        generated_content TEXT,
        content_style VARCHAR(100),
        target_platform VARCHAR(100),
        quality_score DECIMAL(3,2),
        compliance_status VARCHAR(20) DEFAULT 'pending',
        ai_model VARCHAR(100),
        usage_tokens INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('ai_generated_content table created');

    await newClient.query(`
      CREATE TABLE IF NOT EXISTS content_quality_feedback (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES ai_generated_content(id),
        user_id VARCHAR(100),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        feedback_text TEXT,
        is_effective BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('content_quality_feedback table created');

    // Create channel distribution tables
    await newClient.query(`
      CREATE TABLE IF NOT EXISTS channel_accounts (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(100) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        account_id VARCHAR(255),
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('channel_accounts table created');

    await newClient.query(`
      CREATE TABLE IF NOT EXISTS content_distribution (
        id SERIAL PRIMARY KEY,
        ai_content_id INTEGER REFERENCES ai_generated_content(id),
        channel_account_id INTEGER REFERENCES channel_accounts(id),
        title VARCHAR(500),
        content TEXT,
        media_urls TEXT[],
        publish_status VARCHAR(50) DEFAULT 'pending',
        publish_time TIMESTAMP,
        scheduled_time TIMESTAMP,
        publish_result JSONB,
        tracking_link VARCHAR(255),
        stats JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('content_distribution table created');

    // Create tracking tables
    await newClient.query(`
      CREATE TABLE IF NOT EXISTS tracking_links (
        id SERIAL PRIMARY KEY,
        short_code VARCHAR(20) UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        campaign_id VARCHAR(100),
        content_id INTEGER,
        channel VARCHAR(100),
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        utm_term VARCHAR(100),
        utm_content VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      );
    `);
    console.log('tracking_links table created');

    await newClient.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        tracking_link_id INTEGER REFERENCES tracking_links(id),
        ip_address INET,
        user_agent TEXT,
        referrer TEXT,
        utm_params JSONB,
        first_touch TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_touch TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        page_views INTEGER DEFAULT 1,
        is_converted BOOLEAN DEFAULT false,
        conversion_data JSONB
      );
    `);
    console.log('user_sessions table created');

    await newClient.query(`
      CREATE TABLE IF NOT EXISTS user_events (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) REFERENCES user_sessions(session_id),
        event_type VARCHAR(100) NOT NULL,
        event_data JSONB,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        page_url TEXT,
        element_id VARCHAR(255),
        scroll_depth INTEGER,
        time_on_page INTEGER
      );
    `);
    console.log('user_events table created');

    await newClient.query(`
      CREATE TABLE IF NOT EXISTS conversions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) REFERENCES user_sessions(session_id),
        conversion_type VARCHAR(100),
        value DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'CNY',
        conversion_data JSONB,
        occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('conversions table created');

    // Create indexes for tracking tables
    await newClient.query(`
      CREATE INDEX IF NOT EXISTS idx_tracking_links_code ON tracking_links(short_code);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_id ON user_sessions(session_id);
      CREATE INDEX IF NOT EXISTS idx_user_events_session ON user_events(session_id);
      CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_conversions_session ON conversions(session_id);
      CREATE INDEX IF NOT EXISTS idx_distribution_status ON content_distribution(publish_status);
      CREATE INDEX IF NOT EXISTS idx_distribution_schedule ON content_distribution(scheduled_time);
      CREATE INDEX IF NOT EXISTS idx_distribution_content ON content_distribution(ai_content_id);
      CREATE INDEX IF NOT EXISTS idx_ai_content_original ON ai_generated_content(original_content_id);
      CREATE INDEX IF NOT EXISTS idx_ai_content_style ON ai_generated_content(content_style);
      CREATE INDEX IF NOT EXISTS idx_ai_content_platform ON ai_generated_content(target_platform);
      CREATE INDEX IF NOT EXISTS idx_ai_content_compliance ON ai_generated_content(compliance_status);
    `);
    console.log('Additional indexes created');

    console.log('\n✅ Database initialization completed successfully!');
    console.log(`\n📊 Tables created in database: ${dbName}`);
    console.log('\n📋 Table Summary:');
    console.log('   - News Collection: news_sources, collected_news');
    console.log('   - AI Processing: ai_generated_content, content_quality_feedback');
    console.log('   - Content Distribution: channel_accounts, content_distribution');
    console.log('   - Tracking & Analytics: tracking_links, user_sessions, user_events, conversions');

  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    await client.end();
  }
}

// Run initialization
if (require.main === module) {
  initDatabase().catch(console.error);
}

module.exports = initDatabase;