# 数据库设计规范

## 1. 数据库架构设计

### 1.1 数据库选型
- **MySQL 8.0**: 主数据库，存储核心业务数据
- **Redis 7.0**: 缓存数据库，存储会话和热点数据
- **MongoDB 6.0**: 文档数据库，存储日志和非结构化数据
- **PGVector**: 向量数据库，存储AI模型向量数据

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
│   MySQL主库     │ │    Redis缓存    │ │   MongoDB      │
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

## 2. MySQL数据库设计

### 2.1 核心表结构

#### 2.1.1 用户表 (users)
```sql
CREATE TABLE users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '用户ID',
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  email VARCHAR(100) NOT NULL UNIQUE COMMENT '邮箱',
  phone VARCHAR(20) COMMENT '手机号',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  nickname VARCHAR(100) COMMENT '昵称',
  avatar_url VARCHAR(500) COMMENT '头像URL',
  gender ENUM('male', 'female', 'unknown') DEFAULT 'unknown' COMMENT '性别',
  status ENUM('active', 'inactive', 'banned') DEFAULT 'active' COMMENT '状态',
  role ENUM('admin', 'editor', 'user') DEFAULT 'user' COMMENT '角色',
  last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
  last_login_ip VARCHAR(45) COMMENT '最后登录IP',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '软删除时间',
  
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
```

#### 2.1.2 资讯内容表 (news_content)
```sql
CREATE TABLE news_content (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '内容ID',
  title VARCHAR(500) NOT NULL COMMENT '标题',
  content LONGTEXT COMMENT '内容',
  source VARCHAR(100) NOT NULL COMMENT '来源',
  category ENUM('financial', 'health') NOT NULL COMMENT '分类',
  keywords JSON COMMENT '关键词',
  author VARCHAR(100) COMMENT '作者',
  publish_time TIMESTAMP COMMENT '发布时间',
  crawl_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '采集时间',
  status ENUM('pending', 'processed', 'published', 'rejected') DEFAULT 'pending' COMMENT '状态',
  ai_processed BOOLEAN DEFAULT FALSE COMMENT 'AI处理标识',
  compliance_status ENUM('pass', 'fail', 'pending') DEFAULT 'pending' COMMENT '合规状态',
  manual_review_required BOOLEAN DEFAULT FALSE COMMENT '是否需要人工复核',
  manual_review_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '人工复核状态',
  reviewer_id BIGINT UNSIGNED COMMENT '审核员ID',
  review_time TIMESTAMP NULL COMMENT '审核时间',
  compliance_disclaimer TEXT COMMENT '合规声明',
  view_count INT UNSIGNED DEFAULT 0 COMMENT '浏览量',
  like_count INT UNSIGNED DEFAULT 0 COMMENT '点赞数',
  share_count INT UNSIGNED DEFAULT 0 COMMENT '分享数',
  comment_count INT UNSIGNED DEFAULT 0 COMMENT '评论数',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at TIMESTAMP NULL COMMENT '软删除时间',
  
  INDEX idx_category_status (category, status),
  INDEX idx_crawl_time (crawl_time),
  INDEX idx_publish_time (publish_time),
  INDEX idx_ai_processed (ai_processed),
  FULLTEXT idx_title_content (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='资讯内容表';
```

#### 2.1.3 AI生成内容表 (ai_content)
```sql
CREATE TABLE ai_content (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT 'AI内容ID',
  original_content_id BIGINT UNSIGNED NOT NULL COMMENT '原始内容ID',
  platform VARCHAR(50) NOT NULL COMMENT '平台名称',
  title VARCHAR(500) NOT NULL COMMENT '标题',
  content TEXT COMMENT '内容',
  hashtags JSON COMMENT '标签',
  style_template VARCHAR(100) COMMENT '风格模板',
  quality_score DECIMAL(5,2) COMMENT '质量评分',
  engagement_prediction JSON COMMENT '互动预测',
  compliance_status ENUM('pass', 'fail', 'pending') DEFAULT 'pending' COMMENT '合规状态',
  manual_review_required BOOLEAN DEFAULT FALSE COMMENT '是否需要人工复核',
  manual_review_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '人工复核状态',
  reviewer_id BIGINT UNSIGNED COMMENT '审核员ID',
  review_time TIMESTAMP NULL COMMENT '审核时间',
  publish_status ENUM('draft', 'scheduled', 'published', 'failed') DEFAULT 'draft' COMMENT '发布状态',
  publish_time TIMESTAMP NULL COMMENT '发布时间',
  scheduled_time TIMESTAMP NULL COMMENT '计划发布时间',
  channel_specific_config JSON COMMENT '渠道特定配置',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_original_content (original_content_id),
  INDEX idx_platform (platform),
  INDEX idx_status (publish_status),
  INDEX idx_scheduled_time (scheduled_time),
  FOREIGN KEY (original_content_id) REFERENCES news_content(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI生成内容表';
```

#### 2.1.4 渠道分发表 (channel_distribution)
```sql
CREATE TABLE channel_distribution (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '分发ID',
  ai_content_id BIGINT UNSIGNED NOT NULL COMMENT 'AI内容ID',
  channel VARCHAR(50) NOT NULL COMMENT '渠道名称',
  channel_content_id VARCHAR(100) COMMENT '渠道内容ID',
  status ENUM('pending', 'publishing', 'published', 'failed', 'deleted') DEFAULT 'pending' COMMENT '分发状态',
  error_message TEXT COMMENT '错误信息',
  publish_attempts INT DEFAULT 0 COMMENT '发布尝试次数',
  last_attempt_time TIMESTAMP NULL COMMENT '最后尝试时间',
  published_url VARCHAR(500) COMMENT '发布链接',
  tracking_link VARCHAR(500) COMMENT '追踪链接',
  engagement_metrics JSON COMMENT '互动指标',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_ai_content_channel (ai_content_id, channel),
  INDEX idx_status (status),
  INDEX idx_channel (channel),
  FOREIGN KEY (ai_content_id) REFERENCES ai_content(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='渠道分发表';
```

#### 2.1.5 用户行为追踪表 (user_behavior)
```sql
CREATE TABLE user_behavior (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY COMMENT '行为ID',
  content_id BIGINT UNSIGNED NOT NULL COMMENT '内容ID',
  channel_id VARCHAR(100) NOT NULL COMMENT '渠道ID',
  session_id VARCHAR(100) COMMENT '会话ID',
  event_type ENUM('view', 'click', 'like', 'share', 'comment', 'buy') NOT NULL COMMENT '事件类型',
  event_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '事件时间戳',
  user_anonymous_id VARCHAR(100) COMMENT '用户匿名ID',
  device_info JSON COMMENT '设备信息',
  location_info JSON COMMENT '位置信息',
  referrer VARCHAR(500) COMMENT '来源',
  converted BOOLEAN DEFAULT FALSE COMMENT '是否转化',
  conversion_amount DECIMAL(10,2) COMMENT '转化金额',
  session_duration INT COMMENT '会话时长(秒)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  INDEX idx_content_channel (content_id, channel_id),
  INDEX idx_event_type (event_type),
  INDEX idx_event_time (event_timestamp),
  INDEX idx_user_anonymous (user_anonymous_id),
  INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户行为追踪表';
```

#### 2.1.6 AI模型向量表 (ai_vectors)
```sql
-- 该表将在PGVector中创建
-- CREATE TABLE ai_vectors (
--   id BIGINT PRIMARY KEY,
--   content_id BIGINT,
--   vector_embedding vector(1536), -- 假设使用OpenAI的embedding维度
--   content_type VARCHAR(50),
--   similarity_threshold FLOAT DEFAULT 0.8,
--   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );
```

### 2.2 数据库优化策略

#### 2.2.1 索引优化
```sql
-- 复合索引策略
-- 用户表: (status, created_at) 用于按状态和时间查询
-- 内容表: (category, status, crawl_time) 用于分类查询
-- AI内容表: (platform, publish_status, scheduled_time) 用于发布管理
-- 行为表: (content_id, channel_id, event_timestamp) 用于行为分析

-- 唯一索引
ALTER TABLE users ADD UNIQUE INDEX uk_email (email);
ALTER TABLE users ADD UNIQUE INDEX uk_username (username);

-- 普通索引
ALTER TABLE news_content ADD INDEX idx_category_status_time (category, status, crawl_time);
ALTER TABLE ai_content ADD INDEX idx_platform_status_schedule (platform, publish_status, scheduled_time);
ALTER TABLE user_behavior ADD INDEX idx_content_channel_time (content_id, channel_id, event_timestamp);
```

#### 2.2.2 分区策略
```sql
-- 用户行为表按时间分区
ALTER TABLE user_behavior PARTITION BY RANGE (UNIX_TIMESTAMP(created_at)) (
  PARTITION p202601 VALUES LESS THAN (UNIX_TIMESTAMP('2026-02-01')),
  PARTITION p202602 VALUES LESS THAN (UNIX_TIMESTAMP('2026-03-01')),
  PARTITION p202603 VALUES LESS THAN (UNIX_TIMESTAMP('2026-04-01')),
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

### 2.3 数据安全策略

#### 2.3.1 敏感数据加密
```sql
-- 创建加密函数示例
DELIMITER $$
CREATE FUNCTION encrypt_sensitive_data(data TEXT) 
RETURNS TEXT
READS SQL DATA
DETERMINISTIC
BEGIN
  RETURN AES_ENCRYPT(data, SHA2('encryption_key_here', 256));
END$$

CREATE FUNCTION decrypt_sensitive_data(encrypted_data TEXT)
RETURNS TEXT
READS SQL DATA
DETERMINISTIC
BEGIN
  RETURN AES_DECRYPT(encrypted_data, SHA2('encryption_key_here', 256));
END$$
DELIMITER ;
```

#### 2.3.2 数据脱敏
```sql
-- 创建视图进行数据脱敏
CREATE VIEW users_safe_view AS
SELECT 
  id,
  username,
  CONCAT(LEFT(email, 3), '***', SUBSTRING(email, LOCATE('@', email))) AS email_masked,
  CASE 
    WHEN LENGTH(phone) = 11 THEN CONCAT(LEFT(phone, 3), '****', RIGHT(phone, 4))
    ELSE phone
  END AS phone_masked,
  status,
  role,
  created_at,
  updated_at
FROM users;
```

## 3. Redis设计

### 3.1 缓存策略
```javascript
// Redis键命名规范
const redisKeys = {
  // 用户相关
  userSession: (userId) => `user:session:${userId}`,
  userInfo: (userId) => `user:info:${userId}`,
  userPermissions: (userId) => `user:perms:${userId}`,
  
  // 内容相关
  contentDetail: (contentId) => `content:detail:${contentId}`,
  contentList: (category, page) => `content:list:${category}:${page}`,
  aiContent: (aiContentId) => `ai:content:${aiContentId}`,
  
  // 缓存控制
  cacheLock: (key) => `lock:${key}`,
  cacheStats: (key) => `stats:${key}`,
  
  // 频率限制
  rateLimit: (ip, endpoint) => `rate:${ip}:${endpoint}`,
  dailyLimit: (userId) => `limit:daily:${userId}`,
  
  // 临时数据
  tempData: (key) => `temp:${key}`,
  jobQueue: (queueName) => `queue:${queueName}`
};

// 缓存TTL策略
const cacheTTL = {
  userSession: 3600,        // 1小时
  userInfo: 1800,           // 30分钟
  contentDetail: 3600,      // 1小时
  contentList: 600,         // 10分钟
  aiContent: 1800,          // 30分钟
  rateLimit: 3600,          // 1小时
  tempData: 300             // 5分钟
};
```

### 3.2 缓存更新策略
```javascript
// 缓存更新策略
const cacheUpdateStrategy = {
  // 写穿策略 (Write Through)
  writeThrough: async (key, data) => {
    // 先写数据库
    await writeToDatabase(key, data);
    // 再写缓存
    await redis.setex(key, cacheTTL[key], JSON.stringify(data));
  },
  
  // 写回策略 (Write Back) - 适用于高写入场景
  writeBack: async (key, data) => {
    // 先写缓存
    await redis.setex(key, cacheTTL[key], JSON.stringify(data));
    // 异步写数据库
    process.nextTick(async () => {
      await writeToDatabase(key, data);
    });
  },
  
  // 失效策略 (Cache Aside) - 读多写少场景
  cacheAside: {
    read: async (key) => {
      // 先读缓存
      let data = await redis.get(key);
      if (!data) {
        // 缓存未命中，读数据库
        data = await readFromDatabase(key);
        if (data) {
          // 写入缓存
          await redis.setex(key, cacheTTL[key], JSON.stringify(data));
        }
      }
      return JSON.parse(data);
    },
    
    write: async (key, data) => {
      // 先写数据库
      await writeToDatabase(key, data);
      // 删除缓存（让下次读取重新加载）
      await redis.del(key);
    }
  }
};
```

## 4. MongoDB设计

### 4.1 日志集合设计
```javascript
// 应用日志集合
const appLogsSchema = {
  _id: ObjectId,
  timestamp: ISODate,
  level: String,        // 'debug', 'info', 'warn', 'error'
  service: String,      // 服务名称
  traceId: String,      // 链路追踪ID
  spanId: String,       // 调用链ID
  userId: String,       // 用户ID
  operation: String,    // 操作名称
  method: String,       // HTTP方法
  url: String,          // 请求URL
  userAgent: String,    // 用户代理
  ip: String,           // IP地址
  request: Object,      // 请求参数
  response: Object,     // 响应结果
  error: Object,        // 错误信息
  duration: Number,     // 执行时长(ms)
  createdAt: ISODate
};

// 创建索引
db.app_logs.createIndex({ "timestamp": -1 });
db.app_logs.createIndex({ "service": 1, "timestamp": -1 });
db.app_logs.createIndex({ "userId": 1, "timestamp": -1 });
db.app_logs.createIndex({ "level": 1, "timestamp": -1 });
```

### 4.2 配置管理集合
```javascript
// 系统配置集合
const systemConfigs = {
  _id: ObjectId,
  configKey: String,    // 配置键名
  configValue: Object,  // 配置值
  valueType: String,    // 值类型
  description: String,  // 描述
  category: String,     // 分类
  editable: Boolean,    // 是否可编辑
  version: Number,      // 版本号
  createdBy: String,    // 创建者
  updatedBy: String,    // 更新者
  createdAt: ISODate,   // 创建时间
  updatedAt: ISODate    // 更新时间
};
```

## 5. 数据同步策略

### 5.1 主从同步
- **MySQL主从复制**: 异步复制，读写分离
- **Redis主从复制**: 数据同步，高可用
- **MongoDB副本集**: 自动故障转移

### 5.2 跨库事务
```javascript
// 分布式事务处理
const distributedTransaction = {
  // 使用两阶段提交协议
  twoPhaseCommit: async (operations) => {
    const transactionId = generateTransactionId();
    
    try {
      // 阶段1: 准备阶段
      for (const op of operations) {
        await op.prepare(transactionId);
      }
      
      // 阶段2: 提交阶段
      for (const op of operations) {
        await op.commit(transactionId);
      }
      
    } catch (error) {
      // 回滚所有操作
      for (const op of operations) {
        await op.rollback(transactionId);
      }
      throw error;
    }
  }
};
```

## 6. 数据备份与恢复

### 6.1 备份策略
```bash
# MySQL备份脚本
#!/bin/bash
BACKUP_DIR="/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)

# 全量备份
mysqldump -u root -p --all-databases --single-transaction > $BACKUP_DIR/full_$DATE.sql

# 增量备份（基于binlog）
mysqlbinlog --start-datetime="$(date -d '1 hour ago' '+%Y-%m-%d %H:%M:%S')" /var/log/mysql/mysql-bin.log > $BACKUP_DIR/incremental_$DATE.sql

# 压缩备份文件
tar -czf $BACKUP_DIR/backup_$DATE.tar.gz -C $BACKUP_DIR/ .
rm $BACKUP_DIR/*.sql  # 删除原始文件
```

### 6.2 恢复策略
```javascript
// 数据恢复流程
const recoveryProcess = {
  // 1. 确认灾难范围
  assessDamage: async () => {
    const damageReport = {
      affectedServices: [],
      dataLossExtent: 'partial/complete',
      recoveryWindow: 'hours/days'
    };
    return damageReport;
  },
  
  // 2. 选择恢复点
  selectRecoveryPoint: (recoveryTimeObjective, recoveryPointObjective) => {
    // 根据RTO和RPO选择最合适的备份点
    return determineOptimalRecoveryPoint(recoveryTimeObjective, recoveryPointObjective);
  },
  
  // 3. 执行恢复
  executeRecovery: async (recoveryPoint) => {
    // 恢复MySQL
    await restoreMySQL(recoveryPoint.mysqlBackup);
    
    // 恢复Redis
    await restoreRedis(recoveryPoint.redisBackup);
    
    // 恢复MongoDB
    await restoreMongoDB(recoveryPoint.mongodbBackup);
    
    // 验证数据完整性
    await verifyDataIntegrity();
  },
  
  // 4. 验证与切换
  verifyAndSwitch: async () => {
    // 验证服务可用性
    await verifyServiceAvailability();
    
    // 切换到恢复后的系统
    await switchToRecoveredSystem();
  }
};
```

## 7. 性能监控

### 7.1 数据库性能指标
- **查询性能**: 慢查询率、平均响应时间
- **连接性能**: 连接数、等待时间
- **存储性能**: IOPS、吞吐量
- **内存性能**: 缓冲池命中率、内存使用率

### 7.2 监控配置
```yaml
# MySQL监控配置
mysql_monitoring:
  queries:
    slow_query_rate: "SELECT COUNT(*) FROM mysql.slow_log WHERE start_time > NOW() - INTERVAL 1 MINUTE"
    connections: "SHOW STATUS LIKE 'Threads_connected'"
    innodb_buffer_hit: "SHOW STATUS LIKE 'Innodb_buffer_pool_read_requests'"
  thresholds:
    slow_query_per_minute: 10
    connection_usage_rate: 0.8
    buffer_hit_rate: 0.95

# Redis监控配置
redis_monitoring:
  metrics:
    memory_usage: "info memory | grep used_memory_human"
    connected_clients: "info clients | grep connected_clients"
    hit_rate: "info stats | grep keyspace_hits"
  alerts:
    memory_usage_high: 0.85
    client_connections_high: 0.9
    hit_rate_low: 0.8
```

---