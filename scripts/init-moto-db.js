#!/usr/bin/env node
/**
 * PromotionAI 数据库初始化脚本
 * 用于在现有 moto 数据库中创建所需的表结构
 */

const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

async function initDatabase() {
  console.log('🔧 开始初始化 PromotionAI 数据库...\n');
  console.log(`📊 数据库配置:`);
  console.log(`   Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log(`   User: ${process.env.DB_USER}\n`);

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'moto_user',
    password: process.env.DB_PASSWORD || 'Moto2024!Mast',
    database: process.env.DB_NAME || 'moto'
  });

  try {
    await client.connect();
    console.log('✅ 成功连接到 PostgreSQL 数据库\n');

    // 创建扩展
    console.log('📦 创建数据库扩展...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await client.query('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
    console.log('✅ 扩展创建完成：uuid-ossp, pg_trgm\n');

    // 1. 创建资讯采集相关表
    console.log('📰 创建资讯采集表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS news_sources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        category VARCHAR(100),
        rss_feed_url TEXT,
        scrape_interval_minutes INTEGER DEFAULT 30,
        active BOOLEAN DEFAULT true,
        last_scraped_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ news_sources - 数据源配置表');

    await client.query(`
      CREATE TABLE IF NOT EXISTS collected_news (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT,
        summary TEXT,
        source_url TEXT NOT NULL UNIQUE,
        source_name VARCHAR(255),
        source_id INTEGER REFERENCES news_sources(id),
        category VARCHAR(100),
        tags TEXT[],
        published_at TIMESTAMP,
        extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        processed BOOLEAN DEFAULT false,
        ai_processed BOOLEAN DEFAULT false,
        quality_score DECIMAL(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ collected_news - 采集资讯表');

    // 2. 创建 AI 处理相关表
    console.log('\n🤖 创建 AI 处理表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_generated_content (
        id SERIAL PRIMARY KEY,
        original_content_id INTEGER REFERENCES collected_news(id),
        original_content TEXT,
        generated_content TEXT NOT NULL,
        content_style VARCHAR(100),
        target_platform VARCHAR(100),
        content_type VARCHAR(50),
        quality_score DECIMAL(3,2),
        compliance_status VARCHAR(20) DEFAULT 'pending',
        compliance_result JSONB,
        ai_model VARCHAR(100),
        usage_tokens INTEGER,
        prompt_template TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ ai_generated_content - AI 生成内容表');

    await client.query(`
      CREATE TABLE IF NOT EXISTS content_quality_feedback (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES ai_generated_content(id) ON DELETE CASCADE,
        user_id VARCHAR(100),
        user_name VARCHAR(255),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        feedback_text TEXT,
        is_effective BOOLEAN,
        improvement_suggestions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ content_quality_feedback - 质量反馈表');

    await client.query(`
      CREATE TABLE IF NOT EXISTS content_review (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES ai_generated_content(id) ON DELETE CASCADE,
        reviewer_id VARCHAR(100),
        reviewer_name VARCHAR(255),
        review_status VARCHAR(20) DEFAULT 'pending',
        review_comments TEXT,
        approved_at TIMESTAMP,
        rejected_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ content_review - 内容审核表');

    // 3. 创建渠道分发相关表
    console.log('\n📤 创建渠道分发表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS channel_accounts (
        id SERIAL PRIMARY KEY,
        platform VARCHAR(100) NOT NULL,
        account_name VARCHAR(255) NOT NULL,
        account_id VARCHAR(255),
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        daily_publish_limit INTEGER DEFAULT 10,
        published_today INTEGER DEFAULT 0,
        last_reset_date DATE,
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ channel_accounts - 渠道账号表');

    await client.query(`
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
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        tracking_link VARCHAR(255),
        stats JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ content_distribution - 内容分发记录表');

    await client.query(`
      CREATE TABLE IF NOT EXISTS publish_schedule (
        id SERIAL PRIMARY KEY,
        channel_account_id INTEGER REFERENCES channel_accounts(id),
        ai_content_id INTEGER REFERENCES ai_generated_content(id),
        scheduled_time TIMESTAMP NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ publish_schedule - 发布计划表');

    // 4. 创建埋点追踪相关表
    console.log('\n📊 创建埋点追踪表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS tracking_links (
        id SERIAL PRIMARY KEY,
        short_code VARCHAR(20) UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        campaign_id VARCHAR(100),
        content_id INTEGER REFERENCES ai_generated_content(id),
        distribution_id INTEGER REFERENCES content_distribution(id),
        channel VARCHAR(100),
        utm_source VARCHAR(100),
        utm_medium VARCHAR(100),
        utm_campaign VARCHAR(100),
        utm_term VARCHAR(100),
        utm_content VARCHAR(100),
        click_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true
      )
    `);
    console.log('   ✅ tracking_links - 追踪链接表');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) UNIQUE NOT NULL,
        tracking_link_id INTEGER REFERENCES tracking_links(id),
        ip_address INET,
        user_agent TEXT,
        referrer TEXT,
        device_type VARCHAR(50),
        browser_type VARCHAR(50),
        os_type VARCHAR(50),
        location_country VARCHAR(100),
        location_city VARCHAR(100),
        utm_params JSONB,
        first_touch TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_touch TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        page_views INTEGER DEFAULT 1,
        is_converted BOOLEAN DEFAULT false,
        conversion_data JSONB
      )
    `);
    console.log('   ✅ user_sessions - 用户会话表');

    await client.query(`
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
      )
    `);
    console.log('   ✅ user_events - 用户行为事件表');

    await client.query(`
      CREATE TABLE IF NOT EXISTS conversions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(100) REFERENCES user_sessions(session_id),
        conversion_type VARCHAR(100),
        value DECIMAL(10,2),
        currency VARCHAR(3) DEFAULT 'CNY',
        conversion_data JSONB,
        occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ conversions - 转化数据表');

    // 5. 创建系统管理相关表
    console.log('\n⚙️ 创建系统管理表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nickname VARCHAR(255),
        avatar_url TEXT,
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ users - 用户表');

    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL,
        role_display_name VARCHAR(100),
        permissions JSONB DEFAULT '[]',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ roles - 角色表');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, role_id)
      )
    `);
    console.log('   ✅ user_roles - 用户角色关联表');

    await client.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        setting_type VARCHAR(20) DEFAULT 'string',
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ system_settings - 系统设置表');

    // 6. 创建合规管理相关表
    console.log('\n🛡️ 创建合规管理表...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sensitive_keywords (
        id SERIAL PRIMARY KEY,
        keyword VARCHAR(255) NOT NULL,
        category VARCHAR(50),
        severity VARCHAR(20) DEFAULT 'medium',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ sensitive_keywords - 敏感词库表');

    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_logs (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES ai_generated_content(id),
        check_type VARCHAR(50),
        check_result JSONB,
        violations_found INTEGER DEFAULT 0,
        action_taken VARCHAR(50),
        checked_by VARCHAR(100),
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✅ compliance_logs - 合规检查日志表');

    // 创建索引
    console.log('\n📑 创建索引...');
    
    // 资讯采集索引
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collected_news_processed ON collected_news(processed)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collected_news_category ON collected_news(category)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_collected_news_published ON collected_news(published_at DESC)`);
    console.log('   ✅ 资讯采集索引');

    // AI 处理索引
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_content_original ON ai_generated_content(original_content_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_content_style ON ai_generated_content(content_style)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_content_platform ON ai_generated_content(target_platform)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_ai_content_compliance ON ai_generated_content(compliance_status)`);
    console.log('   ✅ AI 处理索引');

    // 分发索引
    await client.query(`CREATE INDEX IF NOT EXISTS idx_distribution_status ON content_distribution(publish_status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_distribution_schedule ON content_distribution(scheduled_time)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_distribution_content ON content_distribution(ai_content_id)`);
    console.log('   ✅ 分发索引');

    // 追踪索引
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tracking_links_code ON tracking_links(short_code)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_sessions_id ON user_sessions(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_events_session ON user_events(session_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversions_session ON conversions(session_id)`);
    console.log('   ✅ 追踪索引');

    // 系统索引
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sensitive_keywords_active ON sensitive_keywords(keyword) WHERE is_active = true`);
    console.log('   ✅ 系统索引');

    // 插入初始数据
    console.log('\n🌱 插入初始数据...');
    
    // 插入默认角色
    await client.query(`
      INSERT INTO roles (role_name, role_display_name, permissions, description)
      VALUES 
        ('admin', '系统管理员', '["all"]', '拥有所有权限的系统管理员'),
        ('editor', '内容编辑', '["content:read", "content:write", "content:review"]', '可以编辑和审核内容'),
        ('viewer', '查看者', '["content:read"]', '只能查看内容')
      ON CONFLICT (role_name) DO NOTHING
    `);
    console.log('   ✅ 默认角色已创建');

    // 插入默认系统设置
    await client.query(`
      INSERT INTO system_settings (setting_key, setting_value, setting_type, description)
      VALUES 
        ('app_name', 'PromotionAI', 'string', '应用名称'),
        ('app_version', '1.0.0', 'string', '应用版本'),
        ('collector_interval', '30', 'number', '采集间隔（分钟）'),
        ('ai_model', 'gpt-4-turbo', 'string', '默认 AI 模型'),
        ('default_content_style', 'professional', 'string', '默认内容风格')
      ON CONFLICT (setting_key) DO NOTHING
    `);
    console.log('   ✅ 系统设置已初始化');

    // 获取表列表
    const tables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);

    console.log('\n' + '='.repeat(60));
    console.log('✅ 数据库初始化完成！');
    console.log('='.repeat(60));
    console.log(`\n📊 数据库：${process.env.DB_NAME}`);
    console.log(`📑 创建的表数量：${tables.rows.length}`);
    console.log('\n📋 表列表:');
    tables.rows.forEach((row, i) => {
      console.log(`   ${i + 1}. ${row.tablename}`);
    });

    console.log('\n🎯 模块分类:');
    console.log('   📰 资讯采集：news_sources, collected_news');
    console.log('   🤖 AI 处理：ai_generated_content, content_quality_feedback, content_review');
    console.log('   📤 渠道分发：channel_accounts, content_distribution, publish_schedule');
    console.log('   📊 埋点追踪：tracking_links, user_sessions, user_events, conversions');
    console.log('   ⚙️ 系统管理：users, roles, user_roles, system_settings');
    console.log('   🛡️ 合规管理：sensitive_keywords, compliance_logs');

    console.log('\n✨ 下一步:');
    console.log('   1. 创建管理员账号 (访问 /admin/setup)');
    console.log('   2. 配置数据源 (news_sources)');
    console.log('   3. 配置渠道账号 (channel_accounts)');
    console.log('   4. 启动服务进行联调测试');
    console.log('');

  } catch (err) {
    console.error('\n❌ 数据库初始化失败:', err.message);
    if (err.code) {
      console.error(`   错误码：${err.code}`);
    }
    if (err.detail) {
      console.error(`   详情：${err.detail}`);
    }
    throw err;
  } finally {
    await client.end();
  }
}

// 运行初始化
if (require.main === module) {
  initDatabase().catch((err) => {
    console.error('初始化失败:', err);
    process.exit(1);
  });
}

module.exports = initDatabase;
