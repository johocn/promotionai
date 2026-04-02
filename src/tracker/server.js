// src/tracker/server.js
require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const redis = require('redis');
const winston = require('winston');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');
const shortid = require('shortid');
const useragent = require('user-agents');

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
    new winston.transports.File({ filename: 'logs/tracker-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/tracker-combined.log' })
  ]
});

// 初始化Express应用
const app = express();
const PORT = process.env.TRACKER_PORT || 3004;

// 启用请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 中间件 - 解析用户代理和IP
app.use((req, res, next) => {
  // 获取真实IP
  req.realIp = req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null);
  
  // 解析用户代理
  req.userAgentInfo = new useragent(req.headers['user-agent']);
  
  // 记录请求日志
  logger.info(`${req.method} ${req.path}`, {
    ip: req.realIp,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });
  
  next();
});

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
    
    // 创建追踪相关表
    await dbClient.query(`
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
    `);
    
    // 初始化默认归因模型
    await dbClient.query(`
      INSERT INTO attribution_models (name, description, weights, is_default) 
      VALUES 
        ('last_click', '最后一次点击归因', '{"last_click": 1.0}', true),
        ('first_click', '第一次点击归因', '{"first_click": 1.0}', false),
        ('linear', '线性归因', '{"first": 0.2, "middle": 0.6, "last": 0.2}', false),
        ('time_decay', '时间衰减归因', '{"recent": 0.5, "older": 0.5}', false)
      ON CONFLICT (name) DO NOTHING;
    `);
    
    logger.info('Tracking tables created/verified');
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

// 生成短链接
function generateShortCode() {
  return shortid.generate().substring(0, 8).toLowerCase();
}

// 解析设备信息
function parseDeviceInfo(userAgentStr) {
  try {
    const ua = new useragent(userAgentStr);
    return {
      browser: ua.browser,
      browserVersion: ua.version,
      os: ua.os,
      device: ua.device,
      platform: ua.platform,
      mobile: ua.mobile,
      tablet: ua.tablet,
      pc: ua.pc
    };
  } catch (error) {
    logger.error('Error parsing device info:', error);
    return {};
  }
}

// 获取地理位置信息（模拟）
function getLocationInfo(ipAddress) {
  // 这里可以集成真实的IP地理位置服务
  // 暂时返回模拟数据
  return {
    country: 'CN',
    region: 'Shanghai',
    city: 'Shanghai',
    latitude: 31.2304,
    longitude: 121.4737,
    isp: 'ISP Provider'
  };
}

// 创建追踪链接
async function createTrackingLink(originalUrl, options = {}) {
  const {
    campaign_id,
    content_id,
    ai_content_id,
    channel,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_term,
    utm_content,
    expires_at,
    tags = []
  } = options;
  
  // 生成唯一的短代码
  let shortCode;
  let isUnique = false;
  let attempts = 0;
  
  while (!isUnique && attempts < 10) {
    shortCode = generateShortCode();
    const checkQuery = 'SELECT COUNT(*) as count FROM tracking_links WHERE short_code = $1';
    const checkResult = await dbClient.query(checkQuery, [shortCode]);
    
    if (parseInt(checkResult.rows[0].count) === 0) {
      isUnique = true;
    }
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Unable to generate unique short code');
  }
  
  const uuid = uuidv4();
  const query = `
    INSERT INTO tracking_links 
    (uuid, short_code, original_url, campaign_id, content_id, ai_content_id, channel, 
     utm_source, utm_medium, utm_campaign, utm_term, utm_content, expires_at, tags)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING id, uuid, short_code
  `;
  
  const values = [
    uuid,
    shortCode,
    originalUrl,
    campaign_id || null,
    content_id || null,
    ai_content_id || null,
    channel || null,
    utm_source || null,
    utm_medium || null,
    utm_campaign || null,
    utm_term || null,
    utm_content || null,
    expires_at || null,
    `{${tags.join(',')}}`
  ];
  
  const result = await dbClient.query(query, values);
  return result.rows[0];
}

// 记录用户会话
async function recordUserSession(trackingLinkId, req) {
  const sessionId = uuidv4();
  
  // 提取UTM参数
  const utmParams = {};
  const queryParams = req.query;
  Object.keys(queryParams).forEach(key => {
    if (key.startsWith('utm_')) {
      utmParams[key] = queryParams[key];
    }
  });
  
  // 解析设备信息
  const deviceInfo = parseDeviceInfo(req.headers['user-agent']);
  
  // 获取地理位置信息
  const geoLocation = getLocationInfo(req.realIp);
  
  const query = `
    INSERT INTO user_sessions 
    (session_id, tracking_link_id, ip_address, user_agent, referrer, utm_params, device_info, geo_location)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id
  `;
  
  const values = [
    sessionId,
    trackingLinkId,
    req.realIp,
    req.headers['user-agent'] || '',
    req.headers['referer'] || req.headers['referrer'] || '',
    JSON.stringify(utmParams),
    JSON.stringify(deviceInfo),
    JSON.stringify(geoLocation)
  ];
  
  const result = await dbClient.query(query, values);
  return { sessionId, sessionRecordId: result.rows[0].id };
}

// 记录用户事件
async function recordUserEvent(sessionId, eventType, eventData, req) {
  const uuid = uuidv4();
  const query = `
    INSERT INTO user_events 
    (uuid, session_id, event_type, event_data, page_url, element_id, element_class, 
     scroll_depth, time_on_page, is_conversion_related, timestamp)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id
  `;
  
  const values = [
    uuid,
    sessionId,
    eventType,
    JSON.stringify(eventData || {}),
    req.url,
    eventData?.elementId || null,
    eventData?.elementClass || null,
    eventData?.scrollDepth || null,
    eventData?.timeOnPage || null,
    eventData?.isConversionRelated || false,
    new Date()
  ];
  
  const result = await dbClient.query(query, values);
  return result.rows[0].id;
}

// 记录转化
async function recordConversion(sessionId, conversionType, value, conversionData, channel = null) {
  const uuid = uuidv4();
  const query = `
    INSERT INTO conversions 
    (uuid, session_id, conversion_type, value, conversion_data, channel)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `;
  
  const values = [
    uuid,
    sessionId,
    conversionType,
    value || 0,
    JSON.stringify(conversionData || {}),
    channel || null
  ];
  
  const result = await dbClient.query(query, values);
  
  // 更新会话为已转化
  await dbClient.query(
    'UPDATE user_sessions SET is_converted = true, conversion_data = $1 WHERE session_id = $2',
    [JSON.stringify(conversionData || {}), sessionId]
  );
  
  // 更新追踪链接的统计数据
  await updateTrackingLinkStats(result.rows[0].id);
  
  return result.rows[0].id;
}

// 更新追踪链接统计
async function updateTrackingLinkStats(conversionId) {
  try {
    // 这里可以实现更复杂的统计更新逻辑
    // 例如：更新点击次数、转化次数、转化率等
  } catch (error) {
    logger.error('Error updating tracking link stats:', error);
  }
}

// API路由
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'Tracking Service',
    version: '1.0.0',
    checks: {
      database: dbClient ? 'connected' : 'disconnected',
      redis: redisClient ? 'connected' : 'disconnected'
    }
  });
});

// 创建追踪链接
app.post('/api/tracking-links', async (req, res) => {
  try {
    const {
      original_url,
      campaign_id,
      content_id,
      ai_content_id,
      channel,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      expires_at,
      tags = []
    } = req.body;
    
    if (!original_url) {
      return res.status(400).json({
        success: false,
        error: 'Original URL is required'
      });
    }
    
    const trackingLink = await createTrackingLink(original_url, {
      campaign_id,
      content_id,
      ai_content_id,
      channel,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      expires_at,
      tags
    });
    
    const fullUrl = `${process.env.TRACKING_DOMAIN || req.get('host')}/${trackingLink.short_code}`;
    
    res.json({
      success: true,
      data: {
        ...trackingLink,
        full_url: fullUrl,
        original_url
      }
    });
  } catch (error) {
    logger.error('Error creating tracking link:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取追踪链接详情
app.get('/api/tracking-links/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let query, params;
    // 检查ID是数字还是UUID/shortcode
    if (/^[0-9]+$/.test(id)) {
      query = 'SELECT * FROM tracking_links WHERE id = $1';
      params = [id];
    } else if (id.length <= 20) {
      query = 'SELECT * FROM tracking_links WHERE short_code = $1';
      params = [id];
    } else {
      query = 'SELECT * FROM tracking_links WHERE uuid = $1';
      params = [id];
    }
    
    const result = await dbClient.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tracking link not found'
      });
    }
    
    const link = result.rows[0];
    
    // 获取该链接的详细统计信息
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT us.session_id) as total_sessions,
        COUNT(ue.id) as total_events,
        COUNT(DISTINCT c.id) as total_conversions,
        COALESCE(SUM(c.value), 0) as total_value,
        CASE 
          WHEN COUNT(DISTINCT us.session_id) > 0 
          THEN ROUND(COUNT(DISTINCT c.id)::DECIMAL * 100 / COUNT(DISTINCT us.session_id), 2)
          ELSE 0 
        END as conversion_rate,
        AVG(us.session_duration) as avg_session_duration,
        AVG(us.pages_per_session) as avg_pages_per_session,
        MIN(us.created_at) as first_seen,
        MAX(us.created_at) as last_seen
      FROM tracking_links tl
      LEFT JOIN user_sessions us ON tl.id = us.tracking_link_id
      LEFT JOIN user_events ue ON us.session_id = ue.session_id
      LEFT JOIN conversions c ON us.session_id = c.session_id
      WHERE tl.id = $1
    `;
    
    const statsResult = await dbClient.query(statsQuery, [link.id]);
    
    res.json({
      success: true,
      data: {
        ...link,
        stats: statsResult.rows[0]
      }
    });
  } catch (error) {
    logger.error('Error fetching tracking link:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取追踪链接列表
app.get('/api/tracking-links', async (req, res) => {
  try {
    const { 
      campaign_id, 
      content_id, 
      ai_content_id,
      channel, 
      limit = 20, 
      offset = 0,
      order = 'created_at',
      direction = 'DESC'
    } = req.query;
    
    let query = 'SELECT * FROM tracking_links';
    const params = [];
    let paramIndex = 1;
    
    const conditions = [];
    if (campaign_id) {
      conditions.push(`campaign_id = $${paramIndex}`);
      params.push(campaign_id);
      paramIndex++;
    }
    
    if (content_id) {
      conditions.push(`content_id = $${paramIndex}`);
      params.push(content_id);
      paramIndex++;
    }
    
    if (ai_content_id) {
      conditions.push(`ai_content_id = $${paramIndex}`);
      params.push(ai_content_id);
      paramIndex++;
    }
    
    if (channel) {
      conditions.push(`channel = $${paramIndex}`);
      params.push(channel);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // 添加排序
    const validOrders = ['created_at', 'updated_at'];
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
    logger.error('Error fetching tracking links:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 短链接重定向端点
app.get('/:shortCode', async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    // 查找追踪链接
    const linkQuery = 'SELECT * FROM tracking_links WHERE short_code = $1 AND is_active = true';
    const linkResult = await dbClient.query(linkQuery, [shortCode]);
    
    if (linkResult.rows.length === 0) {
      return res.status(404).send('Tracking link not found or inactive');
    }
    
    const trackingLink = linkResult.rows[0];
    
    // 检查是否过期
    if (trackingLink.expires_at && new Date(trackingLink.expires_at) < new Date()) {
      return res.status(410).send('This tracking link has expired');
    }
    
    // 记录用户会话
    const sessionInfo = await recordUserSession(trackingLink.id, req);
    
    // 记录页面浏览事件
    await recordUserEvent(sessionInfo.sessionId, 'page_view', {
      originalUrl: trackingLink.original_url,
      referrer: req.headers['referer'] || req.headers['referrer'] || 'direct',
      shortCode: trackingLink.short_code
    }, req);
    
    // 重定向到原始URL
    res.redirect(302, trackingLink.original_url);
  } catch (error) {
    logger.error('Error in redirect handler:', error);
    res.status(500).send('Internal server error');
  }
});

// 记录自定义事件
app.post('/api/events', async (req, res) => {
  try {
    const { session_id, event_type, event_data, page_url } = req.body;
    
    if (!session_id || !event_type) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and event type are required'
      });
    }
    
    // 验证会话是否存在
    const sessionCheckQuery = 'SELECT id FROM user_sessions WHERE session_id = $1';
    const sessionCheckResult = await dbClient.query(sessionCheckQuery, [session_id]);
    
    if (sessionCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    const eventId = await recordUserEvent(session_id, event_type, event_data, {
      ...req,
      url: page_url || req.url
    });
    
    res.json({
      success: true,
      data: { event_id: eventId }
    });
  } catch (error) {
    logger.error('Error recording event:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 记录转化事件
app.post('/api/conversions', async (req, res) => {
  try {
    const { session_id, conversion_type, value, conversion_data, channel } = req.body;
    
    if (!session_id || !conversion_type) {
      return res.status(400).json({
        success: false,
        error: 'Session ID and conversion type are required'
      });
    }
    
    // 验证会话是否存在
    const sessionCheckQuery = 'SELECT id FROM user_sessions WHERE session_id = $1';
    const sessionCheckResult = await dbClient.query(sessionCheckQuery, [session_id]);
    
    if (sessionCheckResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    const conversionId = await recordConversion(session_id, conversion_type, value, conversion_data, channel);
    
    res.json({
      success: true,
      data: { conversion_id: conversionId }
    });
  } catch (error) {
    logger.error('Error recording conversion:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取会话详情
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    let query, params;
    // 检查是UUID还是普通session ID
    if (sessionId.length > 20) {
      query = 'SELECT * FROM user_sessions WHERE session_id = $1';
      params = [sessionId];
    } else {
      query = 'SELECT * FROM user_sessions WHERE session_id = $1';
      params = [sessionId];
    }
    
    const sessionResult = await dbClient.query(query, params);
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    const session = sessionResult.rows[0];
    
    // 获取该会话的事件
    const eventsQuery = 'SELECT * FROM user_events WHERE session_id = $1 ORDER BY timestamp ASC LIMIT 50';
    const eventsResult = await dbClient.query(eventsQuery, [sessionId]);
    
    // 获取该会话的转化
    const conversionsQuery = 'SELECT * FROM conversions WHERE session_id = $1';
    const conversionsResult = await dbClient.query(conversionsQuery, [sessionId]);
    
    res.json({
      success: true,
      data: {
        ...session,
        events: eventsResult.rows,
        conversions: conversionsResult.rows
      }
    });
  } catch (error) {
    logger.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取统计报告
app.get('/api/reports', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      channel, 
      campaign_id,
      content_id,
      ai_content_id,
      limit = 100
    } = req.query;
    
    // 基础统计查询
    let baseQuery = `
      SELECT 
        COUNT(DISTINCT us.session_id) as total_sessions,
        COUNT(ue.id) as total_events,
        COUNT(DISTINCT c.id) as total_conversions,
        COALESCE(SUM(c.value), 0) as total_value,
        CASE 
          WHEN COUNT(DISTINCT us.session_id) > 0 
          THEN ROUND(COUNT(DISTINCT c.id)::DECIMAL * 100 / COUNT(DISTINCT us.session_id), 2)
          ELSE 0 
        END as conversion_rate,
        AVG(us.session_duration) as avg_session_duration,
        AVG(us.pages_per_session) as avg_pages_per_session
      FROM tracking_links tl
      LEFT JOIN user_sessions us ON tl.id = us.tracking_link_id
      LEFT JOIN user_events ue ON us.session_id = ue.session_id
      LEFT JOIN conversions c ON us.session_id = c.session_id
    `;
    
    const params = [];
    let paramIndex = 1;
    let whereClause = '';
    
    if (start_date || end_date || channel || campaign_id || content_id || ai_content_id) {
      whereClause = 'WHERE ';
      const conditions = [];
      
      if (start_date) {
        conditions.push(`us.first_touch >= $${paramIndex}`);
        params.push(new Date(start_date));
        paramIndex++;
      }
      
      if (end_date) {
        conditions.push(`us.first_touch <= $${paramIndex}`);
        params.push(new Date(end_date));
        paramIndex++;
      }
      
      if (channel) {
        conditions.push(`tl.channel = $${paramIndex}`);
        params.push(channel);
        paramIndex++;
      }
      
      if (campaign_id) {
        conditions.push(`tl.campaign_id = $${paramIndex}`);
        params.push(campaign_id);
        paramIndex++;
      }
      
      if (content_id) {
        conditions.push(`tl.content_id = $${paramIndex}`);
        params.push(content_id);
        paramIndex++;
      }
      
      if (ai_content_id) {
        conditions.push(`tl.ai_content_id = $${paramIndex}`);
        params.push(ai_content_id);
        paramIndex++;
      }
      
      whereClause += conditions.join(' AND ');
    }
    
    baseQuery += whereClause;
    
    const reportResult = await dbClient.query(baseQuery, params);
    
    // 按渠道细分统计
    let channelBreakdownQuery = `
      SELECT 
        tl.channel,
        COUNT(DISTINCT us.session_id) as sessions,
        COUNT(DISTINCT c.id) as conversions,
        COALESCE(SUM(c.value), 0) as value,
        CASE 
          WHEN COUNT(DISTINCT us.session_id) > 0 
          THEN ROUND(COUNT(DISTINCT c.id)::DECIMAL * 100 / COUNT(DISTINCT us.session_id), 2)
          ELSE 0 
        END as conversion_rate
      FROM tracking_links tl
      LEFT JOIN user_sessions us ON tl.id = us.tracking_link_id
      LEFT JOIN conversions c ON us.session_id = c.session_id
    `;
    
    if (whereClause) {
      channelBreakdownQuery += ' ' + whereClause;
    }
    
    channelBreakdownQuery += ' GROUP BY tl.channel ORDER BY sessions DESC LIMIT $' + paramIndex;
    params.push(parseInt(limit));
    
    const channelResult = await dbClient.query(channelBreakdownQuery, params);
    
    // 按时间趋势统计
    let timeTrendQuery = `
      SELECT 
        DATE_TRUNC('day', us.first_touch) as date,
        COUNT(DISTINCT us.session_id) as sessions,
        COUNT(DISTINCT c.id) as conversions,
        CASE 
          WHEN COUNT(DISTINCT us.session_id) > 0 
          THEN ROUND(COUNT(DISTINCT c.id)::DECIMAL * 100 / COUNT(DISTINCT us.session_id), 2)
          ELSE 0 
        END as conversion_rate
      FROM tracking_links tl
      LEFT JOIN user_sessions us ON tl.id = us.tracking_link_id
      LEFT JOIN conversions c ON us.session_id = c.session_id
    `;
    
    if (whereClause) {
      timeTrendQuery += ' ' + whereClause.replace('WHERE', 'AND');
    }
    
    timeTrendQuery += ' GROUP BY DATE_TRUNC(\'day\', us.first_touch) ORDER BY date DESC LIMIT 30';
    
    const timeTrendResult = await dbClient.query(timeTrendQuery, params.slice(0, -1)); // 移除最后添加的limit参数
    
    res.json({
      success: true,
      data: {
        summary: reportResult.rows[0],
        channel_breakdown: channelResult.rows,
        time_trends: timeTrendResult.rows,
        filters_applied: {
          start_date,
          end_date,
          channel,
          campaign_id,
          content_id,
          ai_content_id
        }
      }
    });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取设备和地理位置统计
app.get('/api/analytics/devices', async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      channel, 
      campaign_id,
      limit = 20
    } = req.query;
    
    let query = `
      SELECT 
        us.device_info->>'browser' as browser,
        us.device_info->>'os' as os,
        us.device_info->>'device' as device,
        us.geo_location->>'country' as country,
        us.geo_location->>'region' as region,
        COUNT(DISTINCT us.session_id) as sessions,
        COUNT(DISTINCT c.id) as conversions,
        CASE 
          WHEN COUNT(DISTINCT us.session_id) > 0 
          THEN ROUND(COUNT(DISTINCT c.id)::DECIMAL * 100 / COUNT(DISTINCT us.session_id), 2)
          ELSE 0 
        END as conversion_rate
      FROM user_sessions us
      LEFT JOIN tracking_links tl ON us.tracking_link_id = tl.id
      LEFT JOIN conversions c ON us.session_id = c.session_id
    `;
    
    const params = [];
    let paramIndex = 1;
    let whereClause = '';
    
    if (start_date || end_date || channel || campaign_id) {
      whereClause = 'WHERE ';
      const conditions = [];
      
      if (start_date) {
        conditions.push(`us.first_touch >= $${paramIndex}`);
        params.push(new Date(start_date));
        paramIndex++;
      }
      
      if (end_date) {
        conditions.push(`us.first_touch <= $${paramIndex}`);
        params.push(new Date(end_date));
        paramIndex++;
      }
      
      if (channel) {
        conditions.push(`tl.channel = $${paramIndex}`);
        params.push(channel);
        paramIndex++;
      }
      
      if (campaign_id) {
        conditions.push(`tl.campaign_id = $${paramIndex}`);
        params.push(campaign_id);
        paramIndex++;
      }
      
      whereClause += conditions.join(' AND ');
    }
    
    query += whereClause + ` 
      GROUP BY 
        us.device_info->>'browser',
        us.device_info->>'os', 
        us.device_info->>'device',
        us.geo_location->>'country',
        us.geo_location->>'region'
      HAVING COUNT(DISTINCT us.session_id) > 0
      ORDER BY sessions DESC 
      LIMIT $${paramIndex}
    `;
    
    params.push(parseInt(limit));
    
    const result = await dbClient.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    logger.error('Error fetching device analytics:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 初始化服务
async function initialize() {
  try {
    await initDb();
    await initRedis();
    
    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`Tracker server running on port ${PORT}`);
      console.log(`🚀 Tracking service is running on http://localhost:${PORT}`);
      console.log(`🏥 Health check at http://localhost:${PORT}/health`);
      console.log(`💡 Create tracking links: POST /api/tracking-links`);
      console.log(`📊 View reports: GET /api/reports`);
      console.log(`📈 View device analytics: GET /api/analytics/devices`);
    });
  } catch (error) {
    logger.error('Failed to initialize tracker service:', error);
  }
}

initialize();

module.exports = app;