#!/bin/bash
# init-mo-db.sh
# 初始化mo数据库，用于PromotionAI项目

set -e  # 遌到错误立即退出

echo "🚀 初始化 mo 数据库，用于 PromotionAI 项目..."

# 检查是否提供了数据库连接参数
if [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "⚠️  未设置数据库连接参数，使用默认值"
    export DB_USER="postgres"
    export DB_PASSWORD="postgres"
fi

# 连接现有数据库并创建mo数据库
echo "🔗 连接现有数据库 (localhost:5432)..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U "$DB_USER" -d postgres -c "
SELECT 'Database mo already exists' WHERE EXISTS (SELECT FROM pg_database WHERE datname = 'mo');
"

# 检查数据库是否存在
DB_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U "$DB_USER" -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = 'mo';" | tr -d ' \t\n\r')

if [ "$DB_EXISTS" != "1" ]; then
    echo "🆕 创建 mo 数据库..."
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U "$DB_USER" -d postgres -c "CREATE DATABASE mo;"
    echo "✅ mo 数据库创建成功"
else
    echo "ℹ️  mo 数据库已存在"
fi

# 创建mo用户（如果不存在）
echo "👤 检查或创建 mo_user..."
USER_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U "$DB_USER" -d postgres -t -c "SELECT 1 FROM pg_user WHERE usename = 'mo_user';" | tr -d ' \t\n\r')

if [ "$USER_EXISTS" != "1" ]; then
    echo "🆕 创建 mo_user 用户..."
    PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U "$DB_USER" -d postgres -c "
    CREATE USER mo_user WITH PASSWORD '${MO_USER_PASSWORD:-mo_password}';
    GRANT ALL PRIVILEGES ON DATABASE mo TO mo_user;
    "
    echo "✅ mo_user 用户创建成功"
else
    echo "ℹ️  mo_user 用户已存在"
fi

# 连接到新创建的数据库并设置扩展
echo "🔧 在 mo 数据库中设置扩展..."
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U "$DB_USER" -d mo -c "
CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";
CREATE EXTENSION IF NOT EXISTS \"pgcrypto\";
"

# 创建表结构
echo "🏗️  创建表结构..."

# 资讯采集相关表
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U "$DB_USER" -d mo -c "
CREATE TABLE IF NOT EXISTS news_sources (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  category VARCHAR(100),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collected_news (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  source_url TEXT NOT NULL,
  source_name VARCHAR(255),
  category VARCHAR(100),
  published_at TIMESTAMP,
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN DEFAULT false,
  ai_processed BOOLEAN DEFAULT false,
  is_trending BOOLEAN DEFAULT false,
  sentiment_score DECIMAL(3,2),
  keywords TEXT[],
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collected_news_processed ON collected_news(processed);
CREATE INDEX IF NOT EXISTS idx_collected_news_category ON collected_news(category);
CREATE INDEX IF NOT EXISTS idx_collected_news_uuid ON collected_news(uuid);
CREATE INDEX IF NOT EXISTS idx_collected_news_source_url ON collected_news(source_url);
"

# AI处理相关表
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U "$DB_USER" -d mo -c "
CREATE TABLE IF NOT EXISTS ai_generated_content (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  original_content_id INTEGER,
  original_content TEXT,
  generated_content TEXT,
  content_style VARCHAR(100), -- 焦虑型、干货型、故事型等
  target_platform VARCHAR(100), -- douyin, xiaohongshu, wechat等
  quality_score DECIMAL(3,2), -- 质量评分 0.00-10.00
  compliance_status VARCHAR(20) DEFAULT 'pending', -- pending, compliant, non_compliant
  ai_model VARCHAR(100),
  usage_tokens INTEGER,
  generation_time_ms INTEGER,
  is_effective BOOLEAN DEFAULT FALSE, -- 是否达到转化效果
  effectiveness_score DECIMAL(5,2), -- 效果评分
  category VARCHAR(50), -- 内容类别 (finance, health, etc.)
  tags TEXT[], -- 内容标签
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_quality_feedback (
  id SERIAL PRIMARY KEY,
  content_id INTEGER REFERENCES ai_generated_content(id),
  user_id VARCHAR(100),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5星评分
  feedback_text TEXT,
  is_effective BOOLEAN, -- 是否有效转化
  feedback_source VARCHAR(50) DEFAULT 'manual', -- manual, automated, a_b_test
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_a_b_tests (
  id SERIAL PRIMARY KEY,
  original_content_id INTEGER,
  variant_1_id INTEGER REFERENCES ai_generated_content(id),
  variant_2_id INTEGER REFERENCES ai_generated_content(id),
  variant_3_id INTEGER REFERENCES ai_generated_content(id),
  winner_variant_id INTEGER, -- 最终胜出的变体
  test_status VARCHAR(20) DEFAULT 'running', -- running, completed, paused
  sample_size INTEGER DEFAULT 0,
  variant_1_impressions INTEGER DEFAULT 0,
  variant_2_impressions INTEGER DEFAULT 0,
  variant_3_impressions INTEGER DEFAULT 0,
  variant_1_conversions INTEGER DEFAULT 0,
  variant_2_conversions INTEGER DEFAULT 0,
  variant_3_conversions INTEGER DEFAULT 0,
  variant_1_ctr DECIMAL(5,2), -- 点击率
  variant_2_ctr DECIMAL(5,2),
  variant_3_ctr DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_content_original ON ai_generated_content(original_content_id);
CREATE INDEX IF NOT EXISTS idx_ai_content_style ON ai_generated_content(content_style);
CREATE INDEX IF NOT EXISTS idx_ai_content_platform ON ai_generated_content(target_platform);
CREATE INDEX IF NOT EXISTS idx_ai_content_compliance ON ai_generated_content(compliance_status);
CREATE INDEX IF NOT EXISTS idx_ai_content_uuid ON ai_generated_content(uuid);
CREATE INDEX IF NOT EXISTS idx_ai_content_category ON ai_generated_content(category);
"

# 内容分发相关表
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U "$DB_USER" -d mo -c "
CREATE TABLE IF NOT EXISTS channel_accounts (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  platform VARCHAR(100) NOT NULL, -- douyin, xiaohongshu, wechat, weibo, etc.
  account_name VARCHAR(255) NOT NULL,
  account_id VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{}', -- 平台特定的统计信息
  last_published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_distribution (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  ai_content_id INTEGER REFERENCES ai_generated_content(id),
  channel_account_id INTEGER REFERENCES channel_accounts(id),
  title VARCHAR(500),
  content TEXT,
  media_urls TEXT[], -- 媒体文件URL数组
  publish_status VARCHAR(50) DEFAULT 'pending', -- pending, scheduled, published, failed, canceled
  publish_time TIMESTAMP,
  scheduled_time TIMESTAMP,
  publish_result JSONB, -- 发布结果信息
  tracking_link VARCHAR(255), -- 追踪链接
  stats JSONB DEFAULT '{}', -- 统计数据
  failure_reason TEXT, -- 失败原因
  retry_count INTEGER DEFAULT 0, -- 重试次数
  max_retries INTEGER DEFAULT 3, -- 最大重试次数
  priority INTEGER DEFAULT 1, -- 优先级 (1-10)
  tags TEXT[], -- 分发标签
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS publishing_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  platform VARCHAR(100) NOT NULL,
  template_content TEXT NOT NULL, -- 模板内容，支持变量替换
  variables JSONB DEFAULT '[]', -- 模板变量定义
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_analytics (
  id SERIAL PRIMARY KEY,
  distribution_id INTEGER REFERENCES content_distribution(id),
  platform VARCHAR(100) NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  ctr DECIMAL(5,2), -- 点击率
  engagement_rate DECIMAL(5,2), -- 参与率
  conversion_rate DECIMAL(5,2), -- 转化率
  revenue DECIMAL(10,2), -- 收入
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_distribution_status ON content_distribution(publish_status);
CREATE INDEX IF NOT EXISTS idx_distribution_schedule ON content_distribution(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_distribution_content ON content_distribution(ai_content_id);
CREATE INDEX IF NOT EXISTS idx_distribution_uuid ON content_distribution(uuid);
CREATE INDEX IF NOT EXISTS idx_channel_accounts_platform ON channel_accounts(platform);
CREATE INDEX IF NOT EXISTS idx_channel_accounts_active ON channel_accounts(is_active);
"

# 追踪服务相关表
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U "$DB_USER" -d mo -c "
CREATE TABLE IF NOT EXISTS tracking_links (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  short_code VARCHAR(20) UNIQUE NOT NULL,
  original_url TEXT NOT NULL,
  campaign_id VARCHAR(100),
  content_id INTEGER,
  ai_content_id INTEGER REFERENCES ai_generated_content(id), -- 关联AI生成内容
  channel VARCHAR(100),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  utm_term VARCHAR(100),
  utm_content VARCHAR(100),
  tags TEXT[],
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  stats JSONB DEFAULT '{}', -- 统计数据预聚合
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(100) UNIQUE NOT NULL,
  tracking_link_id INTEGER REFERENCES tracking_links(id),
  ip_address INET,
  user_agent TEXT,
  referrer TEXT,
  utm_params JSONB,
  device_info JSONB, -- 设备信息
  geo_location JSONB, -- 地理位置信息
  first_touch TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_touch TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  page_views INTEGER DEFAULT 1,
  is_converted BOOLEAN DEFAULT false,
  conversion_data JSONB,
  session_duration INTEGER DEFAULT 0, -- 会话时长（秒）
  pages_per_session INTEGER DEFAULT 1,
  bounce_rate DECIMAL(5,2), -- 跳出率
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_events (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  session_id VARCHAR(100) REFERENCES user_sessions(session_id),
  event_type VARCHAR(100) NOT NULL, -- view, click, scroll, form_submit, purchase, etc.
  event_data JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  page_url TEXT,
  element_id VARCHAR(255),
  element_class VARCHAR(255),
  scroll_depth INTEGER, -- percentage scrolled
  time_on_page INTEGER, -- in seconds
  is_conversion_related BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS conversions (
  id SERIAL PRIMARY KEY,
  uuid VARCHAR(36) UNIQUE NOT NULL,
  session_id VARCHAR(100) REFERENCES user_sessions(session_id),
  conversion_type VARCHAR(100), -- signup, purchase, download, etc.
  value DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'CNY',
  conversion_data JSONB,
  attribution_data JSONB, -- 归因数据
  occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  channel VARCHAR(100) -- 转化来源渠道
);

CREATE TABLE IF NOT EXISTS attribution_models (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL, -- first_click, last_click, linear, time_decay, position_based
  description TEXT,
  weights JSONB, -- 归因权重分配
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tracking_links_code ON tracking_links(short_code);
CREATE INDEX IF NOT EXISTS idx_tracking_links_uuid ON tracking_links(uuid);
CREATE INDEX IF NOT EXISTS idx_tracking_links_campaign ON tracking_links(campaign_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_content ON tracking_links(content_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_tracking ON user_sessions(tracking_link_id);
CREATE INDEX IF NOT EXISTS idx_user_events_session ON user_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_events_timestamp ON user_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_conversions_session ON conversions(session_id);
CREATE INDEX IF NOT EXISTS idx_conversions_type ON conversions(conversion_type);
CREATE INDEX IF NOT EXISTS idx_conversions_timestamp ON conversions(occurred_at);
"

# 初始化默认归因模型
PGPASSWORD="$DB_PASSWORD" psql -h localhost -p 5432 -U "$DB_USER" -d mo -c "
INSERT INTO attribution_models (name, description, weights, is_default) 
VALUES 
  ('last_click', '最后一次点击归因', '{\"last_click\": 1.0}', true),
  ('first_click', '第一次点击归因', '{\"first_click\": 1.0}', false),
  ('linear', '线性归因', '{\"first\": 0.2, \"middle\": 0.6, \"last\": 0.2}', false),
  ('time_decay', '时间衰减归因', '{\"recent\": 0.5, \"older\": 0.5}', false)
ON CONFLICT (name) DO NOTHING;
"

echo "✅ mo 数据库初始化完成！"
echo ""
echo "📋 数据库信息："
echo "   数据库名: mo"
echo "   用户: mo_user"
echo "   主机: localhost"
echo "   端口: 5432"
echo ""
echo "💡 接下来可以使用此数据库启动 PromotionAI 服务"