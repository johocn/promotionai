// src/publisher/server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const { Client } = require('pg');
const redis = require('redis');
const winston = require('winston');
const moment = require('moment');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

// 初始化日志
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    }),
    new winston.transports.File({ filename: 'logs/publisher-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/publisher-combined.log' })
  ]
});

// 初始化Express应用
const app = express();
const PORT = process.env.PUBLISHER_PORT || 3003;

// 启用请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 初始化数据库连接
let dbClient;
async function initDb() {
  try {
    if (process.env.NODE_ENV === 'production') {
      dbClient = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      });
    } else {
      dbClient = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'promotionai_dev',
        user: process.env.DB_USER || 'dev_user',
        password: process.env.DB_PASSWORD || 'dev_password',
      });
    }
    
    await dbClient.connect();
    logger.info('Connected to database');
    
    // 创建分发相关表
    await dbClient.query(`
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
      CREATE INDEX IF NOT EXISTS idx_distribution_account ON content_distribution(channel_account_id);
      CREATE INDEX IF NOT EXISTS idx_distribution_uuid ON content_distribution(uuid);
      CREATE INDEX IF NOT EXISTS idx_channel_accounts_platform ON channel_accounts(platform);
      CREATE INDEX IF NOT EXISTS idx_channel_accounts_active ON channel_accounts(is_active);
    `);
    logger.info('Distribution tables created/verified');
  } catch (err) {
    logger.error('Database connection error:', err);
  }
}

// 初始化Redis连接
let redisClient;
async function initRedis() {
  try {
    redisClient = redis.createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD
    });
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });
    
    await redisClient.connect();
    logger.info('Connected to Redis');
  } catch (err) {
    logger.error('Redis connection error:', err);
  }
}

// 平台适配器基类
class PlatformAdapter {
  constructor(name, config) {
    this.name = name;
    this.config = config;
  }
  
  async validateAccount(account) {
    throw new Error('validateAccount method must be implemented');
  }
  
  async publishContent(content, account) {
    throw new Error('publishContent method must be implemented');
  }
  
  async getStats(distributionRecord) {
    throw new Error('getStats method must be implemented');
  }
  
  async updateAccessToken(account) {
    // 更新访问令牌的通用方法
    return account;
  }
}

// 抖音平台适配器
class DouyinAdapter extends PlatformAdapter {
  constructor(config) {
    super('douyin', config);
  }
  
  async validateAccount(account) {
    logger.info(`Validating Douyin account: ${account.account_name}`);
    // 在实际实现中，这里会调用抖音API验证账号
    try {
      // 模拟API调用
      const isValid = true; // 实际中需要通过API验证
      return {
        valid: isValid,
        details: { 
          platformUserId: account.account_id || `dy_${Math.random().toString(36).substr(2, 9)}`,
          accountType: 'personal', // 或 'enterprise'
          followers: Math.floor(Math.random() * 100000)
        }
      };
    } catch (error) {
      logger.error(`Douyin account validation failed: ${error.message}`);
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  async publishContent(content, account) {
    logger.info(`Publishing to Douyin account: ${account.account_name}`);
    try {
      // 实际实现中，这里会调用抖音API发布内容
      // 模拟API调用
      const postId = `dy_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      // 模拟发布结果
      return {
        success: true,
        postId: postId,
        publishTime: new Date(),
        platformSpecific: {
          awemeId: `aweme_${postId}`,
          shareUrl: `https://www.iesdouyin.com/share/video/${postId}/`,
          status: 'success'
        },
        costs: {
          tokens: 150, // 模拟API调用消耗
          time: 2000 // 毫秒
        }
      };
    } catch (error) {
      logger.error(`Douyin publish failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        publishTime: new Date()
      };
    }
  }
  
  async getStats(distributionRecord) {
    // 模拟获取统计数据
    return {
      impressions: Math.floor(Math.random() * 100000) + 1000,
      clicks: Math.floor(Math.random() * 5000) + 50,
      likes: Math.floor(Math.random() * 10000) + 100,
      comments: Math.floor(Math.random() * 1000) + 10,
      shares: Math.floor(Math.random() * 500) + 5,
      saves: Math.floor(Math.random() * 800) + 20,
      updateTime: new Date(),
      engagement_rate: parseFloat(((Math.random() * 15) + 1).toFixed(2)) // 1-16%
    };
  }
}

// 小红书平台适配器
class XiaohongshuAdapter extends PlatformAdapter {
  constructor(config) {
    super('xiaohongshu', config);
  }
  
  async validateAccount(account) {
    logger.info(`Validating Xiaohongshu account: ${account.account_name}`);
    try {
      // 模拟API调用
      return {
        valid: true,
        details: { 
          platformUserId: account.account_id || `xhs_${Math.random().toString(36).substr(2, 9)}`,
          accountType: 'personal',
          followers: Math.floor(Math.random() * 500000)
        }
      };
    } catch (error) {
      logger.error(`Xiaohongshu account validation failed: ${error.message}`);
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  async publishContent(content, account) {
    logger.info(`Publishing to Xiaohongshu account: ${account.account_name}`);
    try {
      // 模拟发布过程
      const postId = `xhs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      return {
        success: true,
        postId: postId,
        publishTime: new Date(),
        platformSpecific: {
          noteId: `note_${postId}`,
          shareUrl: `https://www.xiaohongshu.com/explore/${postId}`,
          status: 'success'
        },
        costs: {
          tokens: 120,
          time: 1500
        }
      };
    } catch (error) {
      logger.error(`Xiaohongshu publish failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        publishTime: new Date()
      };
    }
  }
  
  async getStats(distributionRecord) {
    return {
      impressions: Math.floor(Math.random() * 80000) + 500,
      clicks: Math.floor(Math.random() * 4000) + 40,
      likes: Math.floor(Math.random() * 8000) + 80,
      collects: Math.floor(Math.random() * 2000) + 20,
      shares: Math.floor(Math.random() * 1000) + 10,
      comments: Math.floor(Math.random() * 1500) + 15,
      updateTime: new Date(),
      engagement_rate: parseFloat(((Math.random() * 12) + 2).toFixed(2)) // 2-14%
    };
  }
}

// 微信公众号平台适配器
class WechatAdapter extends PlatformAdapter {
  constructor(config) {
    super('wechat', config);
  }
  
  async validateAccount(account) {
    logger.info(`Validating WeChat account: ${account.account_name}`);
    try {
      return {
        valid: true,
        details: { 
          platformUserId: account.account_id || `wx_${Math.random().toString(36).substr(2, 9)}`,
          accountType: 'subscription', // 或 'service'
          subscribers: Math.floor(Math.random() * 1000000)
        }
      };
    } catch (error) {
      logger.error(`WeChat account validation failed: ${error.message}`);
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  async publishContent(content, account) {
    logger.info(`Publishing to WeChat account: ${account.account_name}`);
    try {
      const postId = `wx_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      return {
        success: true,
        postId: postId,
        publishTime: new Date(),
        platformSpecific: {
          articleId: `article_${postId}`,
          url: `https://mp.weixin.qq.com/s/${postId}`,
          status: 'success'
        },
        costs: {
          tokens: 200,
          time: 3000
        }
      };
    } catch (error) {
      logger.error(`WeChat publish failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        publishTime: new Date()
      };
    }
  }
  
  async getStats(distributionRecord) {
    return {
      reads: Math.floor(Math.random() * 100000) + 100,
      likes: Math.floor(Math.random() * 10000) + 10,
      forwards: Math.floor(Math.random() * 5000) + 5,
      comments: Math.floor(Math.random() * 3000) + 3,
      updateTime: new Date(),
      open_rate: parseFloat(((Math.random() * 30) + 5).toFixed(2)) // 5-35%
    };
  }
}

// 微博平台适配器
class WeiboAdapter extends PlatformAdapter {
  constructor(config) {
    super('weibo', config);
  }
  
  async validateAccount(account) {
    logger.info(`Validating Weibo account: ${account.account_name}`);
    try {
      return {
        valid: true,
        details: { 
          platformUserId: account.account_id || `wb_${Math.random().toString(36).substr(2, 9)}`,
          accountType: 'personal',
          followers: Math.floor(Math.random() * 2000000)
        }
      };
    } catch (error) {
      logger.error(`Weibo account validation failed: ${error.message}`);
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  async publishContent(content, account) {
    logger.info(`Publishing to Weibo account: ${account.account_name}`);
    try {
      const postId = `wb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      return {
        success: true,
        postId: postId,
        publishTime: new Date(),
        platformSpecific: {
          postId: `post_${postId}`,
          url: `https://weibo.com/${postId}`,
          status: 'success'
        },
        costs: {
          tokens: 100,
          time: 1200
        }
      };
    } catch (error) {
      logger.error(`Weibo publish failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        publishTime: new Date()
      };
    }
  }
  
  async getStats(distributionRecord) {
    return {
      impressions: Math.floor(Math.random() * 500000) + 1000,
      clicks: Math.floor(Math.random() * 20000) + 200,
      likes: Math.floor(Math.random() * 50000) + 500,
      retweets: Math.floor(Math.random() * 10000) + 100,
      comments: Math.floor(Math.random() * 8000) + 80,
      forwards: Math.floor(Math.random() * 15000) + 150,
      updateTime: new Date(),
      engagement_rate: parseFloat(((Math.random() * 8) + 1).toFixed(2)) // 1-9%
    };
  }
}

// 平台适配器注册
const adapters = {
  douyin: new DouyinAdapter(),
  xiaohongshu: new XiaohongshuAdapter(),
  wechat: new WechatAdapter(),
  weibo: new WeiboAdapter()
};

// 生成追踪链接
function generateTrackingLink(contentId, channelId, platform) {
  const trackingId = `${contentId}_${channelId}_${platform}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  return `${process.env.SHORT_LINK_BASE_URL || 'https://track.promotionai.local'}/${trackingId}`;
}

// 根据平台调整内容
function adjustContentForPlatform(content, platform, aiContentStyle) {
  let adjustedContent = content;
  
  switch (platform) {
    case 'douyin':
      // 抖音内容调整
      if (adjustedContent.length > 600) {
        adjustedContent = adjustedContent.substring(0, 550) + '... 更多精彩内容请查看原文';
      }
      // 添加热门话题标签
      if (aiContentStyle === 'benefit' || aiContentStyle === 'anxiety') {
        adjustedContent += '\n\n#好物推荐 #种草 #实用技巧 #涨知识';
      }
      break;
    case 'xiaohongshu':
      // 小红书内容调整
      if (adjustedContent.length > 1000) {
        adjustedContent = adjustedContent.substring(0, 950) + '... 更多内容请查看原文';
      }
      // 添加小红书风格标签
      adjustedContent += '\n\n#好物种草 #测评 #经验分享 #避坑指南';
      break;
    case 'wechat':
      // 微信公众号内容调整
      if (adjustedContent.length > 2000) {
        adjustedContent = adjustedContent.substring(0, 1950) + '... 查看完整内容';
      }
      break;
    case 'weibo':
      // 微博内容调整（限制140字符）
      if (adjustedContent.length > 140) {
        adjustedContent = adjustedContent.substring(0, 135) + '...';
      }
      adjustedContent += ' [原文链接]';
      break;
  }
  
  return adjustedContent;
}

// 发布内容
async function publishContent(distributionRecord) {
  try {
    // 获取AI生成的内容
    const aiContentQuery = `
      SELECT * FROM ai_generated_content WHERE id = $1
    `;
    const aiContentResult = await dbClient.query(aiContentQuery, [distributionRecord.ai_content_id]);
    
    if (aiContentResult.rows.length === 0) {
      throw new Error(`AI content with id ${distributionRecord.ai_content_id} not found`);
    }
    
    const aiContent = aiContentResult.rows[0];
    
    // 获取渠道账号信息
    const accountQuery = `
      SELECT * FROM channel_accounts WHERE id = $1
    `;
    const accountResult = await dbClient.query(accountQuery, [distributionRecord.channel_account_id]);
    
    if (accountResult.rows.length === 0) {
      throw new Error(`Channel account with id ${distributionRecord.channel_account_id} not found`);
    }
    
    const account = accountResult.rows[0];
    
    // 检查账号是否激活
    if (!account.is_active) {
      throw new Error(`Account ${account.account_name} is not active`);
    }
    
    // 获取对应的平台适配器
    const adapter = adapters[account.platform];
    if (!adapter) {
      throw new Error(`No adapter found for platform: ${account.platform}`);
    }
    
    // 验证账号
    const validation = await adapter.validateAccount(account);
    if (!validation.valid) {
      throw new Error(`Account validation failed for ${account.account_name}: ${validation.error || 'Invalid account'}`);
    }
    
    // 生成追踪链接
    const trackingLink = generateTrackingLink(distributionRecord.id, account.id, account.platform);
    
    // 准备发布内容
    let publishContent = aiContent.generated_content;
    let publishTitle = aiContent.generated_content.substring(0, 100) + '...';
    
    // 根据平台调整内容格式
    publishContent = adjustContentForPlatform(publishContent, account.platform, aiContent.content_style);
    
    // 添加追踪链接到内容末尾
    if (account.platform !== 'weibo') { // 微博字符限制严格，不添加追踪链接
      publishContent += `\n\n更多信息请访问: ${trackingLink}`;
    }
    
    // 执行发布
    const publishResult = await adapter.publishContent(
      {
        title: publishTitle,
        content: publishContent,
        mediaUrls: distributionRecord.media_urls || []
      },
      account
    );
    
    // 更新分发记录
    const updateQuery = `
      UPDATE content_distribution 
      SET publish_status = $1, 
          publish_result = $2, 
          tracking_link = $3,
          updated_at = CURRENT_TIMESTAMP,
          failure_reason = NULL
      WHERE id = $4
    `;
    
    await dbClient.query(updateQuery, [
      publishResult.success ? 'published' : 'failed',
      JSON.stringify(publishResult),
      trackingLink,
      distributionRecord.id
    ]);
    
    // 更新账号最后发布时间
    await dbClient.query(
      'UPDATE channel_accounts SET last_published_at = CURRENT_TIMESTAMP WHERE id = $1',
      [distributionRecord.channel_account_id]
    );
    
    if (publishResult.success) {
      logger.info(`Content published successfully to ${account.platform}: ${publishResult.postId}`);
      
      // 记录发布成功事件到Redis
      await redisClient.setex(
        `publish_success:${distributionRecord.uuid}`, 
        86400, // 24小时
        JSON.stringify({
          timestamp: new Date().toISOString(),
          platform: account.platform,
          postId: publishResult.postId
        })
      );
    } else {
      logger.error(`Failed to publish content to ${account.platform}: ${publishResult.error}`);
    }
    
    return { success: publishResult.success, result: publishResult };
  } catch (error) {
    logger.error(`Failed to publish content: ${error.message}`);
    
    // 更新分发记录为失败状态
    const updateQuery = `
      UPDATE content_distribution 
      SET publish_status = 'failed', 
          publish_result = $1,
          failure_reason = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    
    await dbClient.query(updateQuery, [
      JSON.stringify({ error: error.message }),
      error.message,
      distributionRecord.id
    ]);
    
    return { success: false, error: error.message };
  }
}

// 处理定时发布任务
async function handleScheduledPublications() {
  try {
    logger.info('Checking for scheduled publications...');
    
    const query = `
      SELECT * FROM content_distribution 
      WHERE publish_status = 'scheduled' 
        AND scheduled_time <= NOW()
        AND retry_count < max_retries
      ORDER BY priority DESC, scheduled_time ASC
      LIMIT 50
    `;
    
    const result = await dbClient.query(query);
    
    for (const record of result.rows) {
      logger.info(`Processing scheduled publication: ${record.id} (Priority: ${record.priority})`);
      await publishContent(record);
    }
    
    logger.info(`Scheduled publications check completed. Processed ${result.rows.length} items.`);
  } catch (error) {
    logger.error('Error handling scheduled publications:', error);
  }
}

// 重试失败的发布任务
async function handleFailedPublications() {
  try {
    logger.info('Checking for failed publications to retry...');
    
    const query = `
      SELECT * FROM content_distribution 
      WHERE publish_status = 'failed' 
        AND retry_count < max_retries
        AND updated_at < NOW() - INTERVAL '30 minutes'  -- 至少30分钟前失败的才重试
      ORDER BY updated_at ASC
      LIMIT 20
    `;
    
    const result = await dbClient.query(query);
    
    for (const record of result.rows) {
      logger.info(`Retrying failed publication: ${record.id} (Retry: ${record.retry_count + 1}/${record.max_retries})`);
      
      // 增加重试计数
      await dbClient.query(
        'UPDATE content_distribution SET retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [record.id]
      );
      
      await publishContent(record);
    }
    
    logger.info(`Failed publications retry check completed. Retried ${result.rows.length} items.`);
  } catch (error) {
    logger.error('Error handling failed publications:', error);
  }
}

// API路由
app.use(express.json());

// 健康检查
app.get('/health', async (req, res) => {
  // 检查下游服务健康状况
  const checks = {
    database: dbClient ? 'connected' : 'disconnected',
    redis: redisClient ? 'connected' : 'disconnected',
    adapters: Object.keys(adapters)
  };
  
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Content Publisher',
    version: '1.0.0',
    supported_platforms: Object.keys(adapters),
    checks: checks
  });
});

// 添加渠道账号
app.post('/api/accounts', async (req, res) => {
  try {
    const { platform, account_name, account_id, access_token, settings, tags = [] } = req.body;
    
    if (!platform || !account_name) {
      return res.status(400).json({
        success: false,
        error: 'Platform and account_name are required'
      });
    }
    
    // 验证平台是否支持
    if (!adapters[platform]) {
      return res.status(400).json({
        success: false,
        error: `Platform ${platform} is not supported. Supported platforms: ${Object.keys(adapters).join(', ')}`
      });
    }
    
    // 验证账号
    const mockAccount = { platform, account_name, account_id, access_token };
    const validation = await adapters[platform].validateAccount(mockAccount);
    
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Account validation failed',
        details: validation
      });
    }
    
    const uuid = uuidv4();
    const query = `
      INSERT INTO channel_accounts 
      (uuid, platform, account_name, account_id, access_token, refresh_token, settings, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, uuid, platform, account_name, is_active, created_at
    `;
    
    const result = await dbClient.query(query, [
      uuid, 
      platform, 
      account_name, 
      account_id, 
      access_token, 
      req.body.refresh_token || null, 
      settings || '{}',
      `{${tags.join(',')}}`
    ]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Account added successfully'
    });
  } catch (error) {
    logger.error('Error adding account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取渠道账号列表
app.get('/api/accounts', async (req, res) => {
  try {
    const { platform, active, tags, limit = 20, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM channel_accounts';
    const params = [];
    let paramIndex = 1;
    
    const conditions = [];
    if (platform) {
      conditions.push(`platform = $${paramIndex}`);
      params.push(platform);
      paramIndex++;
    }
    
    if (active !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(active === 'true');
      paramIndex++;
    }
    
    if (tags) {
      const tagList = tags.split(',');
      conditions.push(`tags && ARRAY[${tagList.map((_, i) => `$${paramIndex + i}`).join(', ')}]`);
      tagList.forEach(tag => {
        params.push(tag.trim());
        paramIndex++;
      });
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await dbClient.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        next_offset: parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching accounts:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新渠道账号
app.put('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { account_name, access_token, refresh_token, is_active, settings } = req.body;
    
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (account_name !== undefined) {
      updates.push(`account_name = $${paramIndex}`);
      params.push(account_name);
      paramIndex++;
    }
    
    if (access_token !== undefined) {
      updates.push(`access_token = $${paramIndex}`);
      params.push(access_token);
      paramIndex++;
    }
    
    if (refresh_token !== undefined) {
      updates.push(`refresh_token = $${paramIndex}`);
      params.push(refresh_token);
      paramIndex++;
    }
    
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      params.push(is_active);
      paramIndex++;
    }
    
    if (settings !== undefined) {
      updates.push(`settings = $${paramIndex}`);
      params.push(JSON.stringify(settings));
      paramIndex++;
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updates.length <= 1) { // 只有updated_at
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    const query = `UPDATE channel_accounts SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);
    
    const result = await dbClient.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Account updated successfully'
    });
  } catch (error) {
    logger.error('Error updating account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除渠道账号
app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM channel_accounts WHERE id = $1 RETURNING *';
    const result = await dbClient.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Account deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting account:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 创建内容分发任务
app.post('/api/distribute', async (req, res) => {
  try {
    const {
      ai_content_id,
      channel_account_ids,
      publish_time = null, // null for immediate, or ISO date string for scheduled
      title,
      content,
      media_urls = [],
      priority = 1,
      tags = [],
      max_retries = 3
    } = req.body;
    
    if (!ai_content_id || !channel_account_ids || channel_account_ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'AI content ID and at least one channel account ID are required'
      });
    }
    
    if (priority < 1 || priority > 10) {
      return res.status(400).json({
        success: false,
        error: 'Priority must be between 1 and 10'
      });
    }
    
    if (max_retries < 1 || max_retries > 10) {
      return res.status(400).json({
        success: false,
        error: 'Max retries must be between 1 and 10'
      });
    }
    
    const results = [];
    
    for (const accountId of channel_account_ids) {
      // 检查账号是否存在
      const accountQuery = 'SELECT * FROM channel_accounts WHERE id = $1';
      const accountResult = await dbClient.query(accountQuery, [accountId]);
      
      if (accountResult.rows.length === 0) {
        results.push({
          account_id: accountId,
          success: false,
          error: 'Account not found'
        });
        continue;
      }
      
      const account = accountResult.rows[0];
      if (!account.is_active) {
        results.push({
          account_id: accountId,
          success: false,
          error: 'Account is not active'
        });
        continue;
      }
      
      // 创建分发记录
      const status = publish_time ? 'scheduled' : 'pending';
      const scheduleTime = publish_time ? new Date(publish_time) : null;
      const uuid = uuidv4();
      
      const insertQuery = `
        INSERT INTO content_distribution
        (uuid, ai_content_id, channel_account_id, title, content, media_urls, 
         publish_status, scheduled_time, priority, tags, max_retries)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, uuid, publish_status, scheduled_time, priority
      `;
      
      const insertResult = await dbClient.query(insertQuery, [
        uuid,
        ai_content_id,
        accountId,
        title || '', // 从AI内容生成默认标题
        content || '', // 从AI内容填充
        `{${media_urls.join(',')}}`,
        status,
        scheduleTime,
        priority,
        `{${tags.join(',')}}`,
        max_retries
      ]);
      
      const distributionRecord = insertResult.rows[0];
      
      // 如果是立即发布，则直接处理
      if (!publish_time) {
        const publishResult = await publishContent(distributionRecord);
        results.push({
          account_id: accountId,
          distribution_id: distributionRecord.id,
          distribution_uuid: distributionRecord.uuid,
          success: publishResult.success,
          priority: distributionRecord.priority,
          ...(publishResult.success ? { result: publishResult.result } : { error: publishResult.error })
        });
      } else {
        results.push({
          account_id: accountId,
          distribution_id: distributionRecord.id,
          distribution_uuid: distributionRecord.uuid,
          success: true,
          status: 'scheduled',
          scheduled_time: distributionRecord.scheduled_time,
          priority: distributionRecord.priority
        });
      }
    }
    
    res.json({
      success: true,
      data: results,
      summary: {
        total_attempts: channel_account_ids.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    logger.error('Error creating distribution:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取分发记录
app.get('/api/distribution', async (req, res) => {
  try {
    const { 
      ai_content_id, 
      channel_account_id, 
      publish_status, 
      platform,
      limit = 20, 
      offset = 0,
      order = 'created_at',
      direction = 'DESC'
    } = req.query;
    
    let query = 'SELECT * FROM content_distribution';
    const params = [];
    let paramIndex = 1;
    
    const conditions = [];
    if (ai_content_id) {
      conditions.push(`ai_content_id = $${paramIndex}`);
      params.push(ai_content_id);
      paramIndex++;
    }
    
    if (channel_account_id) {
      conditions.push(`channel_account_id = $${paramIndex}`);
      params.push(channel_account_id);
      paramIndex++;
    }
    
    if (publish_status) {
      conditions.push(`publish_status = $${paramIndex}`);
      params.push(publish_status);
      paramIndex++;
    }
    
    if (platform) {
      // 需要JOIN来获取平台信息
      query = `SELECT cd.*, ca.platform FROM content_distribution cd 
               JOIN channel_accounts ca ON cd.channel_account_id = ca.id`;
      conditions.push(`ca.platform = $${paramIndex}`);
      params.push(platform);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // 添加排序
    const validOrders = ['created_at', 'updated_at', 'publish_time', 'scheduled_time', 'priority'];
    const validDirections = ['ASC', 'DESC'];
    const orderBy = validOrders.includes(order) ? order : 'created_at';
    const orderDir = validDirections.includes(direction.toUpperCase()) ? direction.toUpperCase() : 'DESC';
    
    query += ` ORDER BY ${orderBy} ${orderDir} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await dbClient.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        next_offset: parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching distribution records:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取单个分发记录详情
app.get('/api/distribution/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let query, params;
    // 检查ID是数字还是UUID
    if (/^[0-9]+$/.test(id)) {
      // 数字ID
      query = 'SELECT * FROM content_distribution WHERE id = $1';
      params = [id];
    } else {
      // UUID
      query = 'SELECT * FROM content_distribution WHERE uuid = $1';
      params = [id];
    }
    
    const result = await dbClient.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Distribution record not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching distribution record:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 重新发布失败的内容
app.post('/api/distribute/:id/retry', async (req, res) => {
  try {
    const { id } = req.params;
    
    let query, params;
    // 检查ID是数字还是UUID
    if (/^[0-9]+$/.test(id)) {
      query = 'SELECT * FROM content_distribution WHERE id = $1';
      params = [id];
    } else {
      query = 'SELECT * FROM content_distribution WHERE uuid = $1';
      params = [id];
    }
    
    const result = await dbClient.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Distribution record not found'
      });
    }
    
    const record = result.rows[0];
    if (record.publish_status !== 'failed') {
      return res.status(400).json({
        success: false,
        error: 'Only failed distributions can be retried'
      });
    }
    
    if (record.retry_count >= record.max_retries) {
      return res.status(400).json({
        success: false,
        error: 'Maximum retry attempts reached'
      });
    }
    
    // 增加重试计数并更新状态为pending
    await dbClient.query(
      'UPDATE content_distribution SET publish_status = \'pending\', retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [record.id]
    );
    
    // 重新获取更新后的记录
    const updatedResult = await dbClient.query('SELECT * FROM content_distribution WHERE id = $1', [record.id]);
    const updatedRecord = updatedResult.rows[0];
    
    // 立即尝试发布
    const publishResult = await publishContent(updatedRecord);
    
    res.json({
      success: publishResult.success,
      data: {
        id: updatedRecord.id,
        uuid: updatedRecord.uuid,
        result: publishResult,
        retry_count: updatedRecord.retry_count
      }
    });
  } catch (error) {
    logger.error('Error retrying distribution:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取分发统计
app.get('/api/stats', async (req, res) => {
  try {
    // 获取总体统计
    const totalQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN publish_status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN publish_status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN publish_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN publish_status = 'scheduled' THEN 1 END) as scheduled
      FROM content_distribution
    `;
    const totalResult = await dbClient.query(totalQuery);
    
    // 按平台统计
    const platformQuery = `
      SELECT 
        ca.platform,
        COUNT(cd.id) as total,
        COUNT(CASE WHEN cd.publish_status = 'published' THEN 1 END) as published,
        COUNT(CASE WHEN cd.publish_status = 'failed' THEN 1 END) as failed
      FROM content_distribution cd
      JOIN channel_accounts ca ON cd.channel_account_id = ca.id
      GROUP BY ca.platform
    `;
    const platformResult = await dbClient.query(platformQuery);
    
    // 按状态统计
    const statusQuery = `
      SELECT 
        publish_status,
        COUNT(*) as count
      FROM content_distribution
      GROUP BY publish_status
    `;
    const statusResult = await dbClient.query(statusQuery);
    
    // 获取成功率
    const successRateQuery = `
      SELECT 
        platform,
        ROUND(
          (COUNT(CASE WHEN publish_status = 'published' THEN 1 END) * 100.0 / COUNT(*)), 
          2
        ) as success_rate
      FROM content_distribution cd
      JOIN channel_accounts ca ON cd.channel_account_id = ca.id
      GROUP BY ca.platform
    `;
    const successRateResult = await dbClient.query(successRateQuery);
    
    res.json({
      success: true,
      data: {
        overview: totalResult.rows[0],
        by_platform: platformResult.rows,
        by_status: statusResult.rows,
        success_rates: successRateResult.rows,
        summary: {
          total_accounts: (await dbClient.query('SELECT COUNT(*) FROM channel_accounts')).rows[0].count,
          active_accounts: (await dbClient.query('SELECT COUNT(*) FROM channel_accounts WHERE is_active = true')).rows[0].count
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 创建发布模板
app.post('/api/templates', async (req, res) => {
  try {
    const { name, platform, template_content, variables, is_active = true, created_by } = req.body;
    
    if (!name || !platform || !template_content) {
      return res.status(400).json({
        success: false,
        error: 'Name, platform, and template_content are required'
      });
    }
    
    const query = `
      INSERT INTO publishing_templates
      (name, platform, template_content, variables, is_active, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const result = await dbClient.query(query, [
      name,
      platform,
      template_content,
      JSON.stringify(variables || []),
      is_active,
      created_by
    ]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Template created successfully'
    });
  } catch (error) {
    logger.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取发布模板
app.get('/api/templates', async (req, res) => {
  try {
    const { platform, is_active, limit = 20, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM publishing_templates';
    const params = [];
    let paramIndex = 1;
    
    const conditions = [];
    if (platform) {
      conditions.push(`platform = $${paramIndex}`);
      params.push(platform);
      paramIndex++;
    }
    
    if (is_active !== undefined) {
      conditions.push(`is_active = $${paramIndex}`);
      params.push(is_active === 'true');
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC LIMIT $' + paramIndex + ' OFFSET $' + (paramIndex + 1);
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await dbClient.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        next_offset: parseInt(offset) + parseInt(limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 启动定时任务检查定时发布
cron.schedule('*/5 * * * *', async () => {
  await handleScheduledPublications();
});

// 启动定时任务重试失败的发布
cron.schedule('*/10 * * * *', async () => {
  await handleFailedPublications();
});

// 初始化服务
async function initialize() {
  try {
    await initDb();
    await initRedis();
    
    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`Publisher server running on port ${PORT}`);
      console.log(`🚀 Content Publisher service is running on http://localhost:${PORT}`);
      console.log(`🏥 Health check at http://localhost:${PORT}/health`);
      console.log(`📊 Stats available at http://localhost:${PORT}/api/stats`);
      console.log(`📋 Accounts management: GET/POST /api/accounts`);
      console.log(`💡 Supported platforms: ${Object.keys(adapters).join(', ')}`);
      
      // 启动后立即检查一次定时发布
      setTimeout(async () => {
        await handleScheduledPublications();
        await handleFailedPublications();
      }, 10000); // 延迟10秒执行首次检查
    });
  } catch (error) {
    logger.error('Failed to initialize publisher service:', error);
  }
}

initialize();

module.exports = app;