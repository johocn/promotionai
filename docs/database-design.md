# PostgreSQL数据库设计规范

_基于PostgreSQL的PromotionAI数据存储与管理_

---

## 一、数据库架构设计

### 1.1 数据库选型
- **PostgreSQL 15**: 主数据库，支持JSONB和向量扩展
- **Redis 7.0**: 缓存数据库，存储会话和热点数据  
- **MongoDB 6.0**: 文档数据库，存储日志和非结构化数据
- **PGVector**: 向量数据库（PostgreSQL扩展），存储AI模型向量数据

### 1.2 数据库架构图
```
┌─────────────────────────────────────────────────────────────────┐
│                        应用层                                   │
├─────────────────────────────────────────────────────────────────┤
│                    API服务                                      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ PostgreSQL主库  │ │    Redis缓存    │ │   MongoDB      │
│   (读写分离)    │ │   (集群模式)    │ │   (副本集)      │
│   主库 ←→ 从库   │ │                 │ │                 │
│   (高可用)      │ │                 │ │                 │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   读库负载均衡   │ │   缓存集群     │ │   文档存储     │
│   (读写分离)    │ │   (分片)       │ │   (分片)       │
└─────────────────┘ └─────────────────┘ └─────────────────┘
                                    │
                                    ▼
                           ┌─────────────────┐
                           │   PGVector      │
                           │   (向量检索)    │
                           │   (AI向量存储)  │
                           └─────────────────┘
```

### 1.3 PostgreSQL特性优势
- **JSONB支持**: 原生JSON数据类型，支持索引和查询
- **扩展性**: 丰富的扩展生态系统（pgvector, pg_stat_statements等）
- **并发控制**: MVCC多版本并发控制
- **全文搜索**: 内置全文搜索功能
- **地理信息**: PostGIS扩展支持地理空间数据
- **安全性**: 强大的访问控制和加密功能

---

## 二、PostgreSQL表结构设计

### 2.1 核心表结构

#### 2.1.1 用户表 (users)
```sql
-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 用户表
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20),
  password_hash TEXT NOT NULL,
  nickname VARCHAR(100),
  avatar_url TEXT,
  gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'unknown')) DEFAULT 'unknown',
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'banned')) DEFAULT 'active',
  role VARCHAR(20) CHECK (role IN ('admin', 'editor', 'user')) DEFAULT 'user',
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_login_ip INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- 检查约束
  CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT check_phone_format CHECK (phone IS NULL OR phone ~* '^[0-9+\-\s()]+$')
);

-- 创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_deleted_at ON users(deleted_at) WHERE deleted_at IS NOT NULL;

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

#### 2.1.2 资讯内容表 (news_content)
```sql
-- 资讯内容表
CREATE TABLE news_content (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  source VARCHAR(100) NOT NULL,
  category VARCHAR(20) CHECK (category IN ('financial', 'health')) NOT NULL,
  keywords JSONB, -- 使用JSONB类型支持索引查询
  author VARCHAR(100),
  publish_time TIMESTAMP WITH TIME ZONE,
  crawl_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) CHECK (status IN ('pending', 'processed', 'published', 'rejected')) DEFAULT 'pending',
  ai_processed BOOLEAN DEFAULT FALSE,
  compliance_status VARCHAR(20) CHECK (compliance_status IN ('pass', 'fail', 'pending')) DEFAULT 'pending',
  manual_review_required BOOLEAN DEFAULT FALSE,
  manual_review_status VARCHAR(20) CHECK (manual_review_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewer_id BIGINT,
  review_time TIMESTAMP WITH TIME ZONE,
  compliance_disclaimer TEXT,
  metrics JSONB, -- 存储统计数据：浏览量、点赞数等
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- 外键约束
  CONSTRAINT fk_news_content_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX idx_news_content_category_status ON news_content(category, status);
CREATE INDEX idx_news_content_crawl_time ON news_content(crawl_time);
CREATE INDEX idx_news_content_publish_time ON news_content(publish_time);
CREATE INDEX idx_news_content_ai_processed ON news_content(ai_processed);
CREATE INDEX idx_news_content_created_at ON news_content(created_at);
CREATE INDEX idx_news_content_deleted_at ON news_content(deleted_at) WHERE deleted_at IS NOT NULL;

-- GIN索引用于JSONB字段查询
CREATE INDEX idx_news_content_keywords ON news_content USING GIN(keywords);
CREATE INDEX idx_news_content_metrics ON news_content USING GIN(metrics);

-- 全文搜索索引
CREATE INDEX idx_news_content_search ON news_content USING GIN(to_tsvector('chinese', title || ' ' || COALESCE(content, '')));

-- 更新时间触发器
CREATE TRIGGER update_news_content_updated_at 
    BEFORE UPDATE ON news_content 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

#### 2.1.3 AI生成内容表 (ai_content)
```sql
-- AI生成内容表
CREATE TABLE ai_content (
  id BIGSERIAL PRIMARY KEY,
  original_content_id BIGINT NOT NULL,
  platform VARCHAR(50) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  hashtags JSONB,
  style_template VARCHAR(100),
  quality_score NUMERIC(5,2),
  engagement_prediction JSONB,
  compliance_status VARCHAR(20) CHECK (compliance_status IN ('pass', 'fail', 'pending')) DEFAULT 'pending',
  manual_review_required BOOLEAN DEFAULT FALSE,
  manual_review_status VARCHAR(20) CHECK (manual_review_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewer_id BIGINT,
  review_time TIMESTAMP WITH TIME ZONE,
  publish_status VARCHAR(20) CHECK (publish_status IN ('draft', 'scheduled', 'published', 'failed')) DEFAULT 'draft',
  publish_time TIMESTAMP WITH TIME ZONE,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  channel_specific_config JSONB,
  metrics JSONB, -- 存储发布后的指标数据
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- 外键约束
  CONSTRAINT fk_ai_content_original FOREIGN KEY (original_content_id) REFERENCES news_content(id),
  CONSTRAINT fk_ai_content_reviewer FOREIGN KEY (reviewer_id) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX idx_ai_content_original ON ai_content(original_content_id);
CREATE INDEX idx_ai_content_platform ON ai_content(platform);
CREATE INDEX idx_ai_content_status ON ai_content(publish_status);
CREATE INDEX idx_ai_content_scheduled_time ON ai_content(scheduled_time);
CREATE INDEX idx_ai_content_created_at ON ai_content(created_at);
CREATE INDEX idx_ai_content_deleted_at ON ai_content(deleted_at) WHERE deleted_at IS NOT NULL;

-- GIN索引用于JSONB字段
CREATE INDEX idx_ai_content_hashtags ON ai_content USING GIN(hashtags);
CREATE INDEX idx_ai_content_engagement_prediction ON ai_content USING GIN(engagement_prediction);
CREATE INDEX idx_ai_content_channel_config ON ai_content USING GIN(channel_specific_config);
CREATE INDEX idx_ai_content_metrics ON ai_content USING GIN(metrics);

-- 更新时间触发器
CREATE TRIGGER update_ai_content_updated_at 
    BEFORE UPDATE ON ai_content 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

#### 2.1.4 渠道分发表 (channel_distribution)
```sql
-- 渠道分发表
CREATE TABLE channel_distribution (
  id BIGSERIAL PRIMARY KEY,
  ai_content_id BIGINT NOT NULL,
  channel VARCHAR(50) NOT NULL,
  channel_content_id VARCHAR(100),
  status VARCHAR(20) CHECK (status IN ('pending', 'publishing', 'published', 'failed', 'deleted')) DEFAULT 'pending',
  error_message TEXT,
  publish_attempts INTEGER DEFAULT 0,
  last_attempt_time TIMESTAMP WITH TIME ZONE,
  published_url TEXT,
  tracking_link TEXT,
  engagement_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- 外键约束
  CONSTRAINT fk_channel_distribution_ai_content FOREIGN KEY (ai_content_id) REFERENCES ai_content(id)
);

-- 创建索引
CREATE INDEX idx_channel_distribution_ai_content ON channel_distribution(ai_content_id);
CREATE INDEX idx_channel_distribution_channel ON channel_distribution(channel);
CREATE INDEX idx_channel_distribution_status ON channel_distribution(status);
CREATE INDEX idx_channel_distribution_created_at ON channel_distribution(created_at);

-- GIN索引用于JSONB字段
CREATE INDEX idx_channel_distribution_engagement_metrics ON channel_distribution USING GIN(engagement_metrics);

-- 更新时间触发器
CREATE TRIGGER update_channel_distribution_updated_at 
    BEFORE UPDATE ON channel_distribution 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

#### 2.1.5 用户行为追踪表 (user_behavior)
```sql
-- 用户行为追踪表
CREATE TABLE user_behavior (
  id BIGSERIAL PRIMARY KEY,
  content_id BIGINT NOT NULL,
  channel_id VARCHAR(100) NOT NULL,
  session_id VARCHAR(100),
  event_type VARCHAR(50) CHECK (event_type IN ('view', 'click', 'like', 'share', 'comment', 'buy')) NOT NULL,
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_anonymous_id VARCHAR(100),
  device_info JSONB,
  location_info JSONB,
  referrer TEXT,
  converted BOOLEAN DEFAULT FALSE,
  conversion_amount NUMERIC(10,2),
  session_duration INTEGER, -- 会话时长(秒)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  CONSTRAINT fk_user_behavior_content FOREIGN KEY (content_id) REFERENCES ai_content(id)
);

-- 创建索引
CREATE INDEX idx_user_behavior_content_channel ON user_behavior(content_id, channel_id);
CREATE INDEX idx_user_behavior_event_type ON user_behavior(event_type);
CREATE INDEX idx_user_behavior_event_timestamp ON user_behavior(event_timestamp);
CREATE INDEX idx_user_behavior_user_anonymous ON user_behavior(user_anonymous_id);
CREATE INDEX idx_user_behavior_session ON user_behavior(session_id);
CREATE INDEX idx_user_behavior_created_at ON user_behavior(created_at);

-- GIN索引用于JSONB字段
CREATE INDEX idx_user_behavior_device_info ON user_behavior USING GIN(device_info);
CREATE INDEX idx_user_behavior_location_info ON user_behavior USING GIN(location_info);

-- 为频繁查询创建复合索引
CREATE INDEX idx_user_behavior_time_type_content ON user_behavior(event_timestamp, event_type, content_id);
```

#### 2.1.6 AI向量存储表 (ai_vectors)
```sql
-- 创建pgvector扩展（需要预先安装）
-- CREATE EXTENSION IF NOT EXISTS vector;

-- AI向量存储表
CREATE TABLE ai_vectors (
  id BIGSERIAL PRIMARY KEY,
  content_id BIGINT NOT NULL,
  vector_embedding vector(1536), -- 假设使用OpenAI的embedding维度
  content_type VARCHAR(50),
  similarity_threshold REAL DEFAULT 0.8,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  CONSTRAINT fk_ai_vectors_content FOREIGN KEY (content_id) REFERENCES ai_content(id)
);

-- 创建索引 - 使用HNSW索引进行高效的向量相似度搜索
CREATE INDEX idx_ai_vectors_embedding ON ai_vectors USING hnsw (vector_embedding vector_cosine_ops);

-- 更新时间触发器
CREATE TRIGGER update_ai_vectors_updated_at 
    BEFORE UPDATE ON ai_vectors 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 安全合规表

#### 2.2.1 敏感词库表 (sensitive_words)
```sql
-- 敏感词库表
CREATE TABLE sensitive_words (
  id BIGSERIAL PRIMARY KEY,
  word VARCHAR(100) NOT NULL,
  category VARCHAR(50) CHECK (category IN ('financial', 'health', 'general', 'platform_rule')),
  level VARCHAR(20) CHECK (level IN ('warning', 'forbidden')) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 创建索引
CREATE INDEX idx_sensitive_words_word ON sensitive_words(word);
CREATE INDEX idx_sensitive_words_category ON sensitive_words(category);
CREATE INDEX idx_sensitive_words_level ON sensitive_words(level);
CREATE INDEX idx_sensitive_words_deleted_at ON sensitive_words(deleted_at) WHERE deleted_at IS NOT NULL;

-- 更新时间触发器
CREATE TRIGGER update_sensitive_words_updated_at 
    BEFORE UPDATE ON sensitive_words 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

#### 2.2.2 人工复核队列表 (manual_review_queue)
```sql
-- 人工复核队列表
CREATE TABLE manual_review_queue (
  id BIGSERIAL PRIMARY KEY,
  content_id BIGINT NOT NULL,
  review_type VARCHAR(50) CHECK (review_type IN ('compliance', 'quality', 'data_accuracy', 'financial', 'medical')) NOT NULL,
  reason TEXT,
  priority VARCHAR(20) CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  assigned_to BIGINT,
  status VARCHAR(20) CHECK (status IN ('pending', 'in_progress', 'completed', 'escalated')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  reviewer_notes TEXT,
  feedback_score NUMERIC(3,2),
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- 外键约束
  CONSTRAINT fk_manual_review_content FOREIGN KEY (content_id) REFERENCES ai_content(id),
  CONSTRAINT fk_manual_review_assignee FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- 创建索引
CREATE INDEX idx_manual_review_content ON manual_review_queue(content_id);
CREATE INDEX idx_manual_review_type ON manual_review_queue(review_type);
CREATE INDEX idx_manual_review_status ON manual_review_queue(status);
CREATE INDEX idx_manual_review_priority ON manual_review_queue(priority);
CREATE INDEX idx_manual_review_assigned_to ON manual_review_queue(assigned_to);
CREATE INDEX idx_manual_review_due_date ON manual_review_queue(due_date);
CREATE INDEX idx_manual_review_created_at ON manual_review_queue(created_at);

-- 更新时间触发器
CREATE TRIGGER update_manual_review_queue_updated_at 
    BEFORE UPDATE ON manual_review_queue 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

#### 2.2.3 内容安全检测表 (content_safety_check)
```sql
-- 内容安全检测表
CREATE TABLE content_safety_check (
  id BIGSERIAL PRIMARY KEY,
  content_id BIGINT NOT NULL,
  check_type VARCHAR(50) CHECK (check_type IN ('financial', 'medical', 'platform_rule', 'copyright', 'brand_safety')) NOT NULL,
  check_result VARCHAR(20) CHECK (check_result IN ('pass', 'warning', 'block', 'escalate')) NOT NULL,
  detected_issues JSONB,
  severity_level VARCHAR(20) CHECK (severity_level IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  checker_engine VARCHAR(100),
  manual_review_required BOOLEAN DEFAULT FALSE,
  resolved_status VARCHAR(20) CHECK (resolved_status IN ('pending', 'resolved', 'ignored')) DEFAULT 'pending',
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- 外键约束
  CONSTRAINT fk_content_safety_check_content FOREIGN KEY (content_id) REFERENCES ai_content(id)
);

-- 创建索引
CREATE INDEX idx_content_safety_check_content ON content_safety_check(content_id);
CREATE INDEX idx_content_safety_check_type ON content_safety_check(check_type);
CREATE INDEX idx_content_safety_check_result ON content_safety_check(check_result);
CREATE INDEX idx_content_safety_check_severity ON content_safety_check(severity_level);
CREATE INDEX idx_content_safety_check_timestamp ON content_safety_check(check_timestamp);

-- GIN索引用于JSONB字段
CREATE INDEX idx_content_safety_check_issues ON content_safety_check USING GIN(detected_issues);

-- 更新时间触发器
CREATE TRIGGER update_content_safety_check_updated_at 
    BEFORE UPDATE ON content_safety_check 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 三、PostgreSQL高级特性应用

### 3.1 JSONB查询优化
```sql
-- JSONB查询示例
-- 查询包含特定关键词的内容
SELECT * FROM news_content 
WHERE keywords @> '["理财", "基金"]'::jsonb;

-- 查询特定指标大于阈值的内容
SELECT * FROM ai_content 
WHERE (metrics->>'engagement_rate')::numeric > 0.1;

-- 模糊搜索JSONB字段中的文本
SELECT * FROM user_behavior 
WHERE device_info->>'platform' ILIKE '%ios%';
```

### 3.2 全文搜索配置
```sql
-- 创建中文全文搜索配置（需要安装zhparser扩展）
-- CREATE EXTENSION zhparser;
-- 
-- CREATE TEXT SEARCH CONFIGURATION chinese (PARSER = zhparser);
-- ALTER TEXT SEARCH CONFIGURATION chinese ADD MAPPING FOR n,v,a,i,e,l WITH simple;

-- 使用内置英语配置进行中文搜索（基本支持）
CREATE INDEX idx_news_content_fulltext ON news_content 
USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- 全文搜索查询示例
SELECT *, ts_rank_cd(to_tsvector('english', title || ' ' || COALESCE(content, '')), plainto_tsquery('english', '理财')) AS rank
FROM news_content 
WHERE to_tsvector('english', title || ' ' || COALESCE(content, '')) @@ plainto_tsquery('english', '理财')
ORDER BY rank DESC;
```

### 3.3 向量相似度搜索
```sql
-- 向量相似度搜索示例
-- 查找与给定向量最相似的记录
SELECT id, content_id, 
       (vector_embedding <=> '[0.1,0.2,0.3,...,0.9]') AS distance
FROM ai_vectors 
ORDER BY vector_embedding <=> '[0.1,0.2,0.3,...,0.9]' 
LIMIT 10;

-- 计算两个向量的余弦相似度
SELECT id, content_id,
       1 - (vector_embedding <=> target_vector) AS cosine_similarity
FROM ai_vectors
CROSS JOIN (SELECT '[0.1,0.2,0.3,...,0.9]'::vector AS target_vector) t
ORDER BY cosine_similarity DESC
LIMIT 10;
```

### 3.4 分区表策略
```sql
-- 用户行为表按时间分区
CREATE TABLE user_behavior_partitioned (
  id BIGSERIAL,
  content_id BIGINT NOT NULL,
  channel_id VARCHAR(100) NOT NULL,
  session_id VARCHAR(100),
  event_type VARCHAR(50) CHECK (event_type IN ('view', 'click', 'like', 'share', 'comment', 'buy')) NOT NULL,
  event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_anonymous_id VARCHAR(100),
  device_info JSONB,
  location_info JSONB,
  referrer TEXT,
  converted BOOLEAN DEFAULT FALSE,
  conversion_amount NUMERIC(10,2),
  session_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id, event_timestamp),
  CONSTRAINT fk_user_behavior_content_partitioned FOREIGN KEY (content_id) REFERENCES ai_content(id)
) PARTITION BY RANGE (event_timestamp);

-- 创建月度分区
CREATE TABLE user_behavior_2026_01 PARTITION OF user_behavior_partitioned
FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE user_behavior_2026_02 PARTITION OF user_behavior_partitioned
FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE user_behavior_2026_03 PARTITION OF user_behavior_partitioned
FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- 为分区表创建索引
CREATE INDEX idx_user_behavior_partitioned_content_channel ON user_behavior_partitioned(content_id, channel_id);
CREATE INDEX idx_user_behavior_partitioned_event_type ON user_behavior_partitioned(event_type);
CREATE INDEX idx_user_behavior_partitioned_device_info ON user_behavior_partitioned USING GIN(device_info);
```

### 3.5 性能优化配置
```sql
-- PostgreSQL性能优化配置示例
-- 这些配置应该在 postgresql.conf 中设置

/*
# 内存配置
shared_buffers = 2GB                    # 约为系统内存的 25%
effective_cache_size = 6GB             # 约为系统内存的 75%
work_mem = 16MB                        # 每个操作的内存
maintenance_work_mem = 512MB           # 维护操作内存

# WAL 配置
wal_buffers = 16MB                     # WAL 缓冲区
checkpoint_completion_target = 0.9     # 检查点完成目标
max_wal_size = 4GB                     # 最大 WAL 大小
min_wal_size = 1GB                     # 最小 WAL 大小

# 并发配置
max_connections = 200                  # 最大连接数
random_page_cost = 1.1                 # 随机页面成本 (SSD: 1.1, HDD: 4.0)
effective_io_concurrency = 200         # I/O 并发数

# 查询优化
default_statistics_target = 1000       # 统计目标
constraint_exclusion = on              # 约束排除
cursor_tuple_fraction = 0.1            # 游标元组比例
*/

-- 查询计划分析
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) 
SELECT * FROM news_content 
WHERE category = 'financial' AND status = 'published'
ORDER BY created_at DESC LIMIT 20;
```

---

## 四、数据安全与合规

### 4.1 行级安全策略
```sql
-- 启用行级安全
ALTER TABLE ai_content ENABLE ROW LEVEL SECURITY;

-- 创建行级安全策略
CREATE POLICY ai_content_owner_policy ON ai_content
FOR ALL TO app_user
USING (reviewer_id = current_setting('app.current_user_id')::BIGINT);

-- 对于管理员用户，绕过行级安全
CREATE POLICY ai_content_admin_policy ON ai_content
FOR ALL TO admin_user
USING (true);
```

### 4.2 字段级加密
```sql
-- 创建加密函数
CREATE OR REPLACE FUNCTION encrypt_field(data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_field(encrypted_data TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(encrypted_data, current_setting('app.encryption_key'));
END;
$$ LANGUAGE plpgsql;

-- 对敏感字段进行加密存储
ALTER TABLE users ADD COLUMN phone_encrypted TEXT;
UPDATE users SET phone_encrypted = encrypt_field(phone) WHERE phone IS NOT NULL;
ALTER TABLE users DROP COLUMN phone;
```

### 4.3 审计日志
```sql
-- 创建审计日志表
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  operation VARCHAR(10) CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')) NOT NULL,
  user_id BIGINT,
  row_id BIGINT,
  old_values JSONB,
  new_values JSONB,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  changed_by INET DEFAULT inet_client_addr()
);

-- 创建审计触发器函数
CREATE OR REPLACE FUNCTION audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
  old_values JSONB;
  new_values JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    old_values := to_jsonb(OLD.*);
    INSERT INTO audit_log (table_name, operation, user_id, row_id, old_values)
    VALUES (TG_TABLE_NAME, TG_OP, current_setting('app.current_user_id')::BIGINT, OLD.id, old_values);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_values := to_jsonb(OLD.*);
    new_values := to_jsonb(NEW.*);
    INSERT INTO audit_log (table_name, operation, user_id, row_id, old_values, new_values)
    VALUES (TG_TABLE_NAME, TG_OP, current_setting('app.current_user_id')::BIGINT, NEW.id, old_values, new_values);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    new_values := to_jsonb(NEW.*);
    INSERT INTO audit_log (table_name, operation, user_id, row_id, new_values)
    VALUES (TG_TABLE_NAME, TG_OP, current_setting('app.current_user_id')::BIGINT, NEW.id, new_values);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 为关键表添加审计触发器
CREATE TRIGGER audit_users_trigger
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

CREATE TRIGGER audit_ai_content_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ai_content
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

---

## 五、监控与维护

### 5.1 性能监控查询
```sql
-- 数据库性能监控查询

-- 慢查询分析
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  stddev_time
FROM pg_stat_statements 
ORDER BY total_time DESC 
LIMIT 10;

-- 表膨胀分析
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_table_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
  n_tup_ins + n_tup_upd + n_tup_del as writes,
  n_tup_upd as updates
FROM pg_stat_user_tables
ORDER BY pg_table_size(schemaname||'.'||tablename) DESC;

-- 索引使用率分析
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### 5.2 备份策略
```bash
#!/bin/bash
# PostgreSQL备份脚本

BACKUP_DIR="/backup/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="promotionai_db"
DB_USER="backup_user"

# 创建备份目录
mkdir -p $BACKUP_DIR/daily

# 全量备份
pg_dump -U $DB_USER -h localhost -d $DB_NAME --format=custom --compress=9 \
  --file=$BACKUP_DIR/daily/full_$DATE.backup

# 增量备份（基于WAL日志）
pg_recvlogical -U $DB_USER -h localhost -d $DB_NAME \
  --slot backup_slot --create-slot --plugin test_decoding

# 验证备份
pg_restore --list $BACKUP_DIR/daily/full_$DATE.backup > /dev/null
if [ $? -eq 0 ]; then
  echo "Backup verification successful: $BACKUP_DIR/daily/full_$DATE.backup"
else
  echo "Backup verification failed: $BACKUP_DIR/daily/full_$DATE.backup"
  exit 1
fi

# 压缩备份
gzip $BACKUP_DIR/daily/full_$DATE.backup

# 清理过期备份（保留30天）
find $BACKUP_DIR -name "*.backup.gz" -mtime +30 -delete
```

### 5.3 连接池配置
```javascript
// Node.js PostgreSQL连接池配置
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'app_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'promotionai_db',
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === 'true',
  
  // 连接池配置
  min: 2,           // 最小连接数
  max: 20,          // 最大连接数
  idleTimeoutMillis: 30000,  // 空闲连接超时
  connectionTimeoutMillis: 2000, // 连接超时
  
  // 其他配置
  application_name: 'PromotionAI',
  statement_timeout: 60000,   // 语句超时60秒
  query_timeout: 30000        // 查询超时30秒
});

// 连接池事件监听
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = pool;
```

---

## 六、部署与运维

### 6.1 Docker配置
```dockerfile
# PostgreSQL Dockerfile
FROM postgres:15

# 设置环境变量
ENV POSTGRES_DB=promotionai_db
ENV POSTGRES_USER=app_user
ENV POSTGRES_PASSWORD=secure_password

# 复制初始化脚本
COPY init-scripts/ /docker-entrypoint-initdb.d/

# 安装pgvector扩展（如果使用向量功能）
RUN apt-get update && apt-get install -y postgresql-15-vector

# 暴露端口
EXPOSE 5432

# 启动PostgreSQL
CMD ["postgres"]
```

#### 6.1.1 初始化脚本
```sql
-- init-scripts/01_extensions.sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- 如果使用向量功能
-- CREATE EXTENSION IF NOT EXISTS "vector";
```

### 6.2 Docker Compose配置
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    container_name: promotionai-postgres
    environment:
      POSTGRES_DB: promotionai_db
      POSTGRES_USER: app_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-scripts:/docker-entrypoint-initdb.d
      - ./backup:/backup
    networks:
      - promotionai-network
    restart: always
    command: >
      postgres
      -c shared_buffers=2GB
      -c effective_cache_size=6GB
      -c work_mem=16MB
      -c maintenance_work_mem=512MB
      -c wal_buffers=16MB
      -c checkpoint_completion_target=0.9
      -c max_wal_size=4GB
      -c min_wal_size=1GB
      -c max_connections=200
      -c random_page_cost=1.1
      -c effective_io_concurrency=200
      -c default_statistics_target=1000

  redis:
    image: redis:7-alpine
    container_name: promotionai-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - promotionai-network
    restart: always
    command: redis-server --appendonly yes --maxmemory 2gb --maxmemory-policy allkeys-lru

  mongodb:
    image: mongo:6.0
    container_name: promotionai-mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: secure_password
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    networks:
      - promotionai-network
    restart: always

volumes:
  postgres_data:
  redis_data:
  mongodb_data:

networks:
  promotionai-network:
    driver: bridge
```

### 6.3 迁移脚本管理
```javascript
// migration/migrate.js
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

class DatabaseMigration {
  constructor(connectionString) {
    this.connectionString = connectionString;
  }

  async runMigrations() {
    const client = new Client(this.connectionString);
    await client.connect();

    try {
      // 确保迁移记录表存在
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 获取已执行的迁移
      const executedMigrations = await client.query(
        'SELECT name FROM migrations ORDER BY id'
      );
      const executedNames = executedMigrations.rows.map(row => row.name);

      // 获取迁移文件
      const migrationDir = path.join(__dirname, 'sql');
      const files = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));
      const sortedFiles = files.sort();

      // 执行未执行的迁移
      for (const file of sortedFiles) {
        if (!executedNames.includes(file)) {
          console.log(`Executing migration: ${file}`);
          
          const sql = fs.readFileSync(path.join(migrationDir, file), 'utf8');
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
          await client.query('COMMIT');
          
          console.log(`Completed migration: ${file}`);
        }
      }
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', error);
      throw error;
    } finally {
      await client.end();
    }
  }
}

module.exports = DatabaseMigration;
```

---

## 七、性能优化建议

### 7.1 查询优化技巧
```sql
-- 1. 使用适当的索引
-- 为经常查询的列创建索引
CREATE INDEX CONCURRENTLY idx_news_content_category_created_at 
ON news_content(category, created_at) WHERE status = 'published';

-- 2. 避免SELECT *
-- 好的做法
SELECT id, title, created_at FROM news_content WHERE category = 'financial';

-- 避免的做法
SELECT * FROM news_content WHERE category = 'financial';

-- 3. 使用EXISTS代替IN（当只需要存在性检查时）
-- 好的做法
SELECT * FROM ai_content ac 
WHERE EXISTS (
  SELECT 1 FROM channel_distribution cd 
  WHERE cd.ai_content_id = ac.id AND cd.status = 'published'
);

-- 避免的做法
SELECT * FROM ai_content ac 
WHERE ac.id IN (
  SELECT ai_content_id FROM channel_distribution 
  WHERE status = 'published'
);

-- 4. 使用CTE优化复杂查询
WITH recent_publications AS (
  SELECT ai_content_id, channel, status
  FROM channel_distribution
  WHERE created_at >= NOW() - INTERVAL '7 days'
),
engagement_stats AS (
  SELECT 
    content_id,
    COUNT(*) as view_count,
    AVG(session_duration) as avg_duration
  FROM user_behavior
  WHERE event_type = 'view'
  GROUP BY content_id
)
SELECT 
  ac.title,
  rp.channel,
  es.view_count,
  es.avg_duration
FROM ai_content ac
JOIN recent_publications rp ON ac.id = rp.ai_content_id
LEFT JOIN engagement_stats es ON ac.id = es.content_id
ORDER BY es.view_count DESC NULLS LAST;
```

### 7.2 分区表优化
```sql
-- 为大表创建时间分区
-- 用户行为表按月分区（适用于大数据量场景）
CREATE TABLE user_behavior_time_partitioned (
  id BIGSERIAL,
  content_id BIGINT NOT NULL,
  channel_id VARCHAR(100) NOT NULL,
  session_id VARCHAR(100),
  event_type VARCHAR(50) NOT NULL,
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  user_anonymous_id VARCHAR(100),
  device_info JSONB,
  location_info JSONB,
  referrer TEXT,
  converted BOOLEAN DEFAULT FALSE,
  conversion_amount NUMERIC(10,2),
  session_duration INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  PRIMARY KEY (id, event_timestamp),
  CONSTRAINT chk_event_type CHECK (event_type IN ('view', 'click', 'like', 'share', 'comment', 'buy'))
) PARTITION BY RANGE (event_timestamp);

-- 创建月度分区
DO $$ 
DECLARE
  year_val INTEGER;
  month_val INTEGER;
BEGIN
  FOR year_val IN 2026..2027 LOOP
    FOR month_val IN 1..12 LOOP
      EXECUTE format('
        CREATE TABLE user_behavior_y%s_m%s PARTITION OF user_behavior_time_partitioned
        FOR VALUES FROM (%L) TO (%L)',
        year_val, month_val,
        format('%s-%s-01', year_val, lpad(month_val::text, 2, '0')),
        format('%s-%s-01', year_val, lpad((month_val + 1)::text, 2, '0'))
      );
    END LOOP;
  END LOOP;
END $$;
```

### 7.3 监控告警配置
```sql
-- 创建监控视图
CREATE VIEW db_monitoring_stats AS
SELECT 
  -- 连接统计
  count(*) as total_connections,
  count(*) FILTER (WHERE state = 'active') as active_connections,
  count(*) FILTER (WHERE state = 'idle') as idle_connections,
  -- 缓冲区命中率
  round(
    (sum(blks_hit) * 100.0 / nullif(sum(blks_hit + blks_read), 0)
  ), 2) as cache_hit_ratio,
  -- 表统计
  count(tablename) as total_tables,
  sum(n_tup_ins + n_tup_upd + n_tup_del) as total_operations
FROM pg_stat_database 
WHERE datname = current_database()
UNION ALL
SELECT 
  -- 索引使用率
  count(*) as total_indexes,
  count(*) FILTER (WHERE idx_scan > 0) as used_indexes,
  round(
    (count(*) FILTER (WHERE idx_scan > 0) * 100.0 / nullif(count(*), 0)
  ), 2) as index_usage_ratio,
  0, 0
FROM pg_stat_user_indexes;
```

## 八、总结

PostgreSQL作为PromotionAI系统的核心数据存储，提供了强大的功能特性：

1. **高级数据类型**: JSONB支持半结构化数据存储
2. **扩展生态**: 丰富的扩展支持（pgvector、全文搜索等）
3. **分区表**: 大数据量场景的性能优化
4. **安全特性**: 行级安全、字段加密、审计日志
5. **并发控制**: MVCC提供高并发性能
6. **全文搜索**: 内置全文搜索能力
7. **监控工具**: 完善的性能监控和分析工具

通过合理的表设计、索引策略、分区方案和性能优化，PostgreSQL能够为PromotionAI系统提供稳定、高效、安全的数据存储服务。

---