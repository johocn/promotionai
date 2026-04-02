#!/usr/bin/env node
// scripts/migrate.js

require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  console.log('🚀 Starting database migrations...');

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'dev_user',
    password: process.env.DB_PASSWORD || 'dev_password',
    database: process.env.DB_NAME || 'promotionai_dev'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 创建迁移历史表
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_history (
        id SERIAL PRIMARY KEY,
        migration_name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 检查迁移是否已执行
    async function isMigrationApplied(migrationName) {
      const result = await client.query(
        'SELECT 1 FROM migration_history WHERE migration_name = $1',
        [migrationName]
      );
      return result.rowCount > 0;
    }

    // 记录迁移执行
    async function markMigrationAsApplied(migrationName) {
      await client.query(
        'INSERT INTO migration_history (migration_name) VALUES ($1)',
        [migrationName]
      );
    }

    // 1. 用户表迁移
    if (!(await isMigrationApplied('001_create_users_table'))) {
      console.log('   Running migration: 001_create_users_table');
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          role VARCHAR(50) DEFAULT 'user',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      `);
      await markMigrationAsApplied('001_create_users_table');
      console.log('   ✅ Migration 001 completed');
    } else {
      console.log('   📋 Migration 001 already applied');
    }

    // 2. 敏感词库表迁移
    if (!(await isMigrationApplied('002_create_sensitive_words_table'))) {
      console.log('   Running migration: 002_create_sensitive_words_table');
      await client.query(`
        CREATE TABLE IF NOT EXISTS sensitive_words (
          id SERIAL PRIMARY KEY,
          word VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL, -- financial, health, general
          severity VARCHAR(20) DEFAULT 'medium', -- low, medium, high
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_sensitive_words_word ON sensitive_words(word);
        CREATE INDEX IF NOT EXISTS idx_sensitive_words_category ON sensitive_words(category);
        
        -- 插入一些示例敏感词
        INSERT INTO sensitive_words (word, category, severity, description) VALUES
        ('承诺收益', 'financial', 'high', '金融领域禁止承诺收益'),
        ('稳赚不赔', 'financial', 'high', '金融领域禁止承诺收益'),
        ('内部消息', 'financial', 'high', '金融领域禁止暗示内部消息'),
        ('治疗', 'health', 'high', '健康领域禁止声称治疗功效'),
        ('根治', 'health', 'high', '健康领域禁止声称根治'),
        ('特效', 'health', 'medium', '健康领域慎用特效等词汇'),
        ('最', 'general', 'medium', '广告法限制使用极限词汇'),
        ('第一', 'general', 'medium', '广告法限制使用极限词汇'),
        ('国家级', 'general', 'high', '广告法限制使用绝对化用语');
      `);
      await markMigrationAsApplied('002_create_sensitive_words_table');
      console.log('   ✅ Migration 002 completed');
    } else {
      console.log('   📋 Migration 002 already applied');
    }

    // 3. 内容安全检测表迁移
    if (!(await isMigrationApplied('003_create_content_safety_check_table'))) {
      console.log('   Running migration: 003_create_content_safety_check_table');
      await client.query(`
        CREATE TABLE IF NOT EXISTS content_safety_check (
          id SERIAL PRIMARY KEY,
          content_id INTEGER, -- reference to ai_generated_content.id or collected_news.id
          content_type VARCHAR(50), -- ai_generated, collected_news
          original_content TEXT,
          detected_issues JSONB, -- array of detected issues
          risk_level VARCHAR(20), -- safe, warning, risky, blocked
          reviewed_by INTEGER, -- user id who reviewed
          review_status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected
          review_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          reviewed_at TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_content_safety_check_content ON content_safety_check(content_id, content_type);
        CREATE INDEX IF NOT EXISTS idx_content_safety_check_risk ON content_safety_check(risk_level);
        CREATE INDEX IF NOT EXISTS idx_content_safety_check_status ON content_safety_check(review_status);
      `);
      await markMigrationAsApplied('003_create_content_safety_check_table');
      console.log('   ✅ Migration 003 completed');
    } else {
      console.log('   📋 Migration 003 already applied');
    }

    // 4. 人工复核队列表迁移
    if (!(await isMigrationApplied('004_create_manual_review_queue_table'))) {
      console.log('   Running migration: 004_create_manual_review_queue_table');
      await client.query(`
        CREATE TABLE IF NOT EXISTS manual_review_queue (
          id SERIAL PRIMARY KEY,
          content_id INTEGER,
          content_type VARCHAR(50),
          content_title VARCHAR(500),
          content_body TEXT,
          priority VARCHAR(20) DEFAULT 'normal', -- low, normal, high, urgent
          assigned_to INTEGER, -- user id
          status VARCHAR(20) DEFAULT 'pending', -- pending, in_progress, completed, rejected
          reason VARCHAR(100), -- why it needs review
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          assigned_at TIMESTAMP,
          completed_at TIMESTAMP,
          reviewer_notes TEXT
        );
        
        CREATE INDEX IF NOT EXISTS idx_review_queue_status ON manual_review_queue(status);
        CREATE INDEX IF NOT EXISTS idx_review_queue_assigned ON manual_review_queue(assigned_to);
        CREATE INDEX IF NOT EXISTS idx_review_queue_priority ON manual_review_queue(priority);
      `);
      await markMigrationAsApplied('004_create_manual_review_queue_table');
      console.log('   ✅ Migration 004 completed');
    } else {
      console.log('   📋 Migration 004 already applied');
    }

    // 5. A/B测试表迁移
    if (!(await isMigrationApplied('005_create_ab_testing_tables'))) {
      console.log('   Running migration: 005_create_ab_testing_tables');
      await client.query(`
        CREATE TABLE IF NOT EXISTS ab_tests (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          status VARCHAR(20) DEFAULT 'draft', -- draft, running, paused, completed
          start_date TIMESTAMP,
          end_date TIMESTAMP,
          sample_size INTEGER DEFAULT 1000,
          traffic_percentage DECIMAL(5,2) DEFAULT 50.00, -- percentage of traffic for test
          winner_variant_id INTEGER, -- variant that won
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS ab_test_variants (
          id SERIAL PRIMARY KEY,
          test_id INTEGER REFERENCES ab_tests(id),
          name VARCHAR(255) NOT NULL, -- e.g., "Control", "Variant A", "Variant B"
          content TEXT NOT NULL, -- the actual content variation
          style VARCHAR(100), -- the style of this variant
          weight DECIMAL(5,2) DEFAULT 50.00, -- traffic allocation percentage
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS ab_test_results (
          id SERIAL PRIMARY KEY,
          test_id INTEGER REFERENCES ab_tests(id),
          variant_id INTEGER REFERENCES ab_test_variants(id),
          metric_name VARCHAR(100) NOT NULL, -- conversion_rate, engagement_rate, etc.
          metric_value DECIMAL(10,4), -- the measured value
          sample_size INTEGER, -- number of samples
          confidence_level DECIMAL(5,2), -- confidence in result
          is_winner BOOLEAN DEFAULT false,
          recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
        CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test ON ab_test_variants(test_id);
        CREATE INDEX IF NOT EXISTS idx_ab_test_results_test ON ab_test_results(test_id);
      `);
      await markMigrationAsApplied('005_create_ab_testing_tables');
      console.log('   ✅ Migration 005 completed');
    } else {
      console.log('   📋 Migration 005 already applied');
    }

    // 6. 爆款内容学习表迁移
    if (!(await isMigrationApplied('006_create_trending_content_tables'))) {
      console.log('   Running migration: 006_create_trending_content_tables');
      await client.query(`
        CREATE TABLE IF NOT EXISTS trending_content (
          id SERIAL PRIMARY KEY,
          original_content_id INTEGER,
          ai_content_id INTEGER,
          content_type VARCHAR(50), -- news, ai_generated
          title VARCHAR(500),
          content TEXT,
          platform VARCHAR(100), -- douyin, xiaohongshu, wechat
          performance_metrics JSONB, -- views, likes, shares, comments, saves
          engagement_rate DECIMAL(8,4), -- calculated engagement rate
          trend_score DECIMAL(8,4), -- overall trend score
          is_trending BOOLEAN DEFAULT false,
          discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          peak_date DATE
        );
        
        CREATE TABLE IF NOT EXISTS content_patterns (
          id SERIAL PRIMARY KEY,
          pattern_name VARCHAR(255) NOT NULL,
          pattern_type VARCHAR(100), -- keyword, phrase, structure, style
          pattern_value TEXT NOT NULL,
          frequency INTEGER DEFAULT 1,
          effectiveness_score DECIMAL(5,4), -- 0.0000 to 1.0000
          category VARCHAR(100), -- finance, health, lifestyle, etc.
          is_active BOOLEAN DEFAULT true,
          discovered_from_content INTEGER[], -- array of content IDs that contributed to this pattern
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_trending_content_trend ON trending_content(is_trending);
        CREATE INDEX IF NOT EXISTS idx_trending_content_platform ON trending_content(platform);
        CREATE INDEX IF NOT EXISTS idx_content_patterns_type ON content_patterns(pattern_type);
        CREATE INDEX IF NOT EXISTS idx_content_patterns_category ON content_patterns(category);
      `);
      await markMigrationAsApplied('006_create_trending_content_tables');
      console.log('   ✅ Migration 006 completed');
    } else {
      console.log('   📋 Migration 006 already applied');
    }

    // 7. 用户行为追踪表迁移
    if (!(await isMigrationApplied('007_create_user_behavior_tables'))) {
      console.log('   Running migration: 007_create_user_behavior_tables');
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_behavior (
          id SERIAL PRIMARY KEY,
          user_id INTEGER, -- can be null for anonymous users
          session_id VARCHAR(100) NOT NULL,
          action_type VARCHAR(100) NOT NULL, -- view_content, like_content, share_content, comment, etc.
          action_target_id INTEGER, -- the content id that was acted upon
          action_target_type VARCHAR(50), -- content type
          action_details JSONB, -- additional action-specific data
          ip_address INET,
          user_agent TEXT,
          referrer TEXT,
          duration_seconds INTEGER, -- how long the action took
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_user_behavior_user ON user_behavior(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_behavior_session ON user_behavior(session_id);
        CREATE INDEX IF NOT EXISTS idx_user_behavior_action ON user_behavior(action_type);
        CREATE INDEX IF NOT EXISTS idx_user_behavior_target ON user_behavior(action_target_id, action_target_type);
        
        -- Create materialized view for quick analytics
        CREATE MATERIALIZED VIEW IF NOT EXISTS user_behavior_summary AS
        SELECT
          DATE_TRUNC('day', created_at) as day,
          action_type,
          COUNT(*) as action_count,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT session_id) as unique_sessions
        FROM user_behavior
        GROUP BY DATE_TRUNC('day', created_at), action_type;
        
        CREATE INDEX IF NOT EXISTS idx_behavior_summary_day ON user_behavior_summary(day);
      `);
      await markMigrationAsApplied('007_create_user_behavior_tables');
      console.log('   ✅ Migration 007 completed');
    } else {
      console.log('   📋 Migration 007 already applied');
    }

    // 8. 系统配置表迁移
    if (!(await isMigrationApplied('008_create_system_config_table'))) {
      console.log('   Running migration: 008_create_system_config_table');
      await client.query(`
        CREATE TABLE IF NOT EXISTS system_config (
          id SERIAL PRIMARY KEY,
          config_key VARCHAR(255) UNIQUE NOT NULL,
          config_value TEXT,
          config_type VARCHAR(50) DEFAULT 'string', -- string, json, boolean, number
          description TEXT,
          is_sensitive BOOLEAN DEFAULT false, -- if true, value should not be exposed in logs
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Insert default configurations
        INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
        ('ai_generation.enabled', 'true', 'boolean', 'Enable AI content generation'),
        ('content_moderation.enabled', 'true', 'boolean', 'Enable automatic content moderation'),
        ('daily_generation_limit', '100', 'number', 'Max AI generations per day'),
        ('ab_testing.enabled', 'true', 'boolean', 'Enable A/B testing'),
        ('tracking.enabled', 'true', 'boolean', 'Enable user tracking'),
        ('data_retention.days', '365', 'number', 'How many days to retain user data'),
        ('compliance.check_enabled', 'true', 'boolean', 'Enable compliance checking'),
        ('notification.email_enabled', 'true', 'boolean', 'Enable email notifications'),
        ('security.rate_limiting_enabled', 'true', 'boolean', 'Enable API rate limiting');
      `);
      await markMigrationAsApplied('008_create_system_config_table');
      console.log('   ✅ Migration 008 completed');
    } else {
      console.log('   📋 Migration 008 already applied');
    }

    console.log('\n🎉 All migrations completed successfully!');
    
    // 显示迁移摘要
    const summary = await client.query('SELECT migration_name FROM migration_history ORDER BY executed_at');
    console.log('\n📋 Migration Summary:');
    summary.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.migration_name}`);
    });

  } catch (err) {
    console.error('❌ Error running migrations:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migrations
if (require.main === module) {
  runMigrations().catch(console.error);
}

module.exports = runMigrations;