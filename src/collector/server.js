// src/collector/server.js
// ========== 全局修复 undici webidl File 不存在问题 ==========
if (typeof File === 'undefined') {
 const { File: UndiciFile } = require('undici');
 global.File = UndiciFile;
}

if (typeof Blob === 'undefined') {
 const { Blob: UndiciBlob } = require('undici');
 global.Blob = UndiciBlob;
}

if (typeof FormData === 'undefined') {
 const { FormData: UndiciFormData } = require('undici');
 global.FormData = UndiciFormData;
}
// ==========================================================

require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const cron = require('node-cron');
const { Client } = require('pg');
const redis = require('redis');
const winston = require('winston');
const moment = require('moment');
const validUrl = require('valid-url');
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
    new winston.transports.File({ filename: 'logs/collector-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/collector-combined.log' })
  ]
});

// 初始化Express应用
const app = express();
const PORT = process.env.COLLECTOR_PORT || 3031;

// 启用请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 初始化数据库连接
let dbClient;
async function initDb() {
  try {
    // 使用SQLite进行开发，PostgreSQL用于生产
    if (process.env.NODE_ENV === 'production') {
      dbClient = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
      });
      await dbClient.connect();
      logger.info('Connected to PostgreSQL database');
    } else {
      // 为开发环境创建一个简单的内存数据库或使用SQLite
      const { Pool } = require('pg');
      dbClient = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'promotionai_dev',
        user: process.env.DB_USER || 'dev_user',
        password: process.env.DB_PASSWORD || 'dev_password',
      });
      logger.info('Connected to development database');
    }
    
    // 创建必要的表
    await dbClient.query(`
      CREATE TABLE IF NOT EXISTS news_sources (
        id SERIAL PRIMARY KEY,
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
    `);
    logger.info('Database tables created/verified');
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

// RSS解析器
const rssParser = new Parser();

// 内容提取器类，支持多种方式
class ContentExtractor {
  static async extractFromRSS(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PromotionAI Bot/1.0)'
        },
        timeout: 10000
      });
      
      const feed = await rssParser.parseString(response.data);
      return {
        type: 'rss',
        items: feed.items.map(item => ({
          title: item.title,
          content: item.contentSnippet || item.content || item.description,
          link: item.link,
          pubDate: item.pubDate,
          source: feed.title,
          guid: item.guid || item.id
        }))
      };
    } catch (error) {
      logger.error(`RSS parsing failed for ${url}:`, error.message);
      return null;
    }
  }
  
  static async extractFromHTML(url) {
    try {
      // 使用axios获取HTML内容
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PromotionAI Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      
      // 尝试获取主要内容
      const selectors = [
        'article', '.content', '#content', '.post', '.entry-content',
        '.article-content', '.main-content', 'main', '.post-content'
      ];
      
      let mainContent = '';
      for (const selector of selectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          mainContent = element.text().trim();
          if (mainContent.length > 100) break; // 找到足够长的内容就停止
        }
      }
      
      // 如果没有找到合适的选择器，使用body
      if (!mainContent) {
        mainContent = $('body').text().substring(0, 2000);
      }
      
      // 提取标题
      let title = $('title').text().trim() || url;
      const titleElement = $('h1').first();
      if (titleElement.length > 0 && titleElement.text().length > 0) {
        title = titleElement.text().trim();
      }
      
      // 提取描述
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || 
                         mainContent.substring(0, 500);
      
      // 提取发布时间
      const pubDate = $('time').attr('datetime') || 
                     $('time').attr('pubdate') || 
                     $('meta[property="article:published_time"]').attr('content') || 
                     null;
      
      return {
        type: 'html',
        article: {
          title: title || url,
          content: mainContent,
          description: description,
          url: url,
          pubDate: pubDate
        }
      };
    } catch (error) {
      logger.error(`HTML extraction failed for ${url}:`, error.message);
      return null;
    }
  }
  
  static async extractPageContent(url) {
    // 首先尝试RSS解析
    let result = await this.extractFromRSS(url);
    if (result) {
      return result;
    }
    
    // 如果RSS失败，尝试HTML解析
    result = await this.extractFromHTML(url);
    if (result) {
      return result;
    }
    
    throw new Error(`Failed to extract content from ${url}`);
  }
}

// 保存新闻到数据库
async function saveNews(newsItem) {
  try {
    // 检查是否已存在
    const checkQuery = 'SELECT id FROM collected_news WHERE source_url = $1';
    const checkResult = await dbClient.query(checkQuery, [newsItem.url || newsItem.link]);
    
    if (checkResult.rows.length > 0) {
      logger.info(`News already exists: ${newsItem.title}`);
      return checkResult.rows[0].id;
    }
    
    const uuid = uuidv4();
    const query = `
      INSERT INTO collected_news 
      (uuid, title, content, source_url, source_name, category, published_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    
    const values = [
      uuid,
      newsItem.title,
      newsItem.content,
      newsItem.url || newsItem.link,
      newsItem.source || newsItem.source_name,
      newsItem.category || 'general',
      newsItem.pubDate ? new Date(newsItem.pubDate) : new Date()
    ];
    
    const result = await dbClient.query(query, values);
    
    if (result.rows.length > 0) {
      logger.info(`Saved news: ${newsItem.title}`);
      return result.rows[0].id;
    }
  } catch (error) {
    logger.error('Error saving news:', error);
    throw error;
  }
}

// 分析新闻趋势和情感
async function analyzeNews(newsItem) {
  try {
    // 这里可以集成情感分析和关键词提取
    // 简单的模拟实现
    const analysis = {
      sentiment_score: Math.random() * 2 - 1, // -1 to 1
      keywords: [],
      is_trending: false,
      tags: []
    };
    
    // 简单关键词提取（实际应用中应使用NLP库）
    const content = newsItem.content || newsItem.description || '';
    const words = content.toLowerCase().match(/\b(\w+)\b/g) || [];
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should']);
    
    const filteredWords = words.filter(word => word.length > 4 && !commonWords.has(word)).slice(0, 10);
    analysis.keywords = [...new Set(filteredWords)];
    
    // 简单趋势判断（实际应用中应使用更复杂的算法）
    const trendingKeywords = ['urgent', 'breaking', 'important', 'significant', 'major', 'crucial'];
    analysis.is_trending = trendingKeywords.some(keyword => 
      content.toLowerCase().includes(keyword)
    );
    
    // 根据标题和内容判断标签
    const title = newsItem.title.toLowerCase();
    if (title.includes('finance') || title.includes('money') || title.includes('stock')) {
      analysis.tags.push('finance');
    }
    if (title.includes('health') || title.includes('medical') || title.includes('wellness')) {
      analysis.tags.push('health');
    }
    
    return analysis;
  } catch (error) {
    logger.error('Error analyzing news:', error);
    return {
      sentiment_score: 0,
      keywords: [],
      is_trending: false,
      tags: []
    };
  }
}

// 更新新闻分析结果
async function updateNewsAnalysis(newsId, analysis) {
  try {
    const query = `
      UPDATE collected_news 
      SET sentiment_score = $1, keywords = $2, is_trending = $3, tags = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
    `;
    
    await dbClient.query(query, [
      analysis.sentiment_score,
      `{${analysis.keywords.join(',')}}`,
      analysis.is_trending,
      `{${analysis.tags.join(',')}}`,
      newsId
    ]);
  } catch (error) {
    logger.error('Error updating news analysis:', error);
  }
}

// 采集任务
async function runCollectionTask() {
  try {
    logger.info('Starting collection task...');
    
    // 从数据库获取活跃的新闻源
    const sourcesResult = await dbClient.query(
      'SELECT * FROM news_sources WHERE active = true'
    );
    
    if (sourcesResult.rows.length === 0) {
      logger.info('No active news sources found');
      return;
    }
    
    let processedCount = 0;
    let savedCount = 0;
    
    for (const source of sourcesResult.rows) {
      logger.info(`Processing source: ${source.name} (${source.url})`);
      
      try {
        const extractionResult = await ContentExtractor.extractPageContent(source.url);
        
        if (extractionResult.type === 'rss') {
          // 处理RSS项
          for (const item of extractionResult.items) {
            // 检查是否已存在于缓存中
            const cacheKey = `news:${item.link}`;
            const cached = await redisClient.get(cacheKey);
            
            if (!cached) {
              const newsId = await saveNews({
                ...item,
                source_name: source.name,
                category: source.category
              });
              
              if (newsId) {
                // 分析新闻
                const analysis = await analyzeNews(item);
                await updateNewsAnalysis(newsId, analysis);
                savedCount++;
                
                // 设置缓存，避免重复采集
                await redisClient.setex(cacheKey, 3600, '1'); // 缓存1小时
              }
            }
            processedCount++;
          }
        } else if (extractionResult.type === 'html') {
          // 处理HTML页面
          const cacheKey = `news:${extractionResult.article.url}`;
          const cached = await redisClient.get(cacheKey);
          
          if (!cached) {
            const newsId = await saveNews({
              ...extractionResult.article,
              source_name: source.name,
              category: source.category
            });
            
            if (newsId) {
              // 分析新闻
              const analysis = await analyzeNews(extractionResult.article);
              await updateNewsAnalysis(newsId, analysis);
              savedCount++;
              
              // 设置缓存
              await redisClient.setex(cacheKey, 3600, '1');
            }
          }
          processedCount++;
        }
      } catch (error) {
        logger.error(`Error processing source ${source.name}:`, error);
      }
    }
    
    logger.info(`Collection task completed. Processed: ${processedCount}, Saved: ${savedCount}`);
  } catch (error) {
    logger.error('Collection task failed:', error);
  }
}

// API路由

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'News Collector',
    version: '1.0.0',
    checks: {
      database: dbClient ? 'connected' : 'disconnected',
      redis: redisClient ? 'connected' : 'disconnected'
    }
  });
});

// 获取采集的新闻
app.get('/api/news', async (req, res) => {
  try {
    const { 
      category, 
      limit = 20, 
      offset = 0, 
      processed, 
      trending,
      order = 'created_at',
      direction = 'DESC'
    } = req.query;
    
    let query = 'SELECT * FROM collected_news';
    const params = [];
    let paramIndex = 1;
    
    const conditions = [];
    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    if (processed !== undefined) {
      conditions.push(`processed = $${paramIndex}`);
      params.push(processed === 'true');
      paramIndex++;
    }
    
    if (trending !== undefined) {
      conditions.push(`is_trending = $${paramIndex}`);
      params.push(trending === 'true');
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    // 添加排序
    const validOrders = ['created_at', 'published_at', 'sentiment_score'];
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
    logger.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取新闻详情
app.get('/api/news/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let query, params;
    // 检查ID是数字还是UUID
    if (/^[0-9]+$/.test(id)) {
      // 数字ID
      query = 'SELECT * FROM collected_news WHERE id = $1';
      params = [id];
    } else {
      // UUID
      query = 'SELECT * FROM collected_news WHERE uuid = $1';
      params = [id];
    }
    
    const result = await dbClient.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'News not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching news by ID:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 手动触发采集
app.post('/api/collect', async (req, res) => {
  try {
    await runCollectionTask();
    res.json({
      success: true,
      message: 'Collection task completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Manual collection failed:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 添加新闻源
app.post('/api/sources', async (req, res) => {
  try {
    const { name, url, category } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({
        success: false,
        error: 'Name and URL are required'
      });
    }
    
    if (!validUrl.isUri(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL'
      });
    }
    
    // 检查是否已存在相同URL的源
    const checkQuery = 'SELECT id FROM news_sources WHERE url = $1';
    const checkResult = await dbClient.query(checkQuery, [url]);
    
    if (checkResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'News source with this URL already exists'
      });
    }
    
    const query = `
      INSERT INTO news_sources (name, url, category)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    
    const result = await dbClient.query(query, [name, url, category]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'News source added successfully'
    });
  } catch (error) {
    logger.error('Error adding news source:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取新闻源列表
app.get('/api/sources', async (req, res) => {
  try {
    const { active, category } = req.query;
    
    let query = 'SELECT * FROM news_sources';
    const params = [];
    let paramIndex = 1;
    
    const conditions = [];
    if (active !== undefined) {
      conditions.push(`active = $${paramIndex}`);
      params.push(active === 'true');
      paramIndex++;
    }
    
    if (category) {
      conditions.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await dbClient.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    logger.error('Error fetching news sources:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 更新新闻源
app.put('/api/sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, category, active } = req.body;
    
    // 构建更新查询
    const updates = [];
    const params = [];
    let paramIndex = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      params.push(name);
      paramIndex++;
    }
    
    if (url !== undefined) {
      updates.push(`url = $${paramIndex}`);
      params.push(url);
      paramIndex++;
    }
    
    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    
    if (active !== undefined) {
      updates.push(`active = $${paramIndex}`);
      params.push(active);
      paramIndex++;
    }
    
    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    
    if (updates.length === 1) { // 只有updated_at
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    const query = `UPDATE news_sources SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    params.push(id);
    
    const result = await dbClient.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'News source not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'News source updated successfully'
    });
  } catch (error) {
    logger.error('Error updating news source:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 删除新闻源
app.delete('/api/sources/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = 'DELETE FROM news_sources WHERE id = $1 RETURNING *';
    const result = await dbClient.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'News source not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'News source deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting news source:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取统计信息
app.get('/api/stats', async (req, res) => {
  try {
    // 获取新闻统计
    const newsStatsQuery = `
      SELECT 
        COUNT(*) as total_news,
        COUNT(CASE WHEN processed = true THEN 1 END) as processed,
        COUNT(CASE WHEN ai_processed = true THEN 1 END) as ai_processed,
        COUNT(CASE WHEN is_trending = true THEN 1 END) as trending,
        COUNT(DISTINCT category) as categories_count
      FROM collected_news
    `;
    const newsStatsResult = await dbClient.query(newsStatsQuery);
    
    // 获取新闻源统计
    const sourcesStatsQuery = `
      SELECT 
        COUNT(*) as total_sources,
        COUNT(CASE WHEN active = true THEN 1 END) as active_sources
      FROM news_sources
    `;
    const sourcesStatsResult = await dbClient.query(sourcesStatsQuery);
    
    // 按类别统计新闻
    const categoryStatsQuery = `
      SELECT 
        category,
        COUNT(*) as count
      FROM collected_news
      GROUP BY category
      ORDER BY count DESC
    `;
    const categoryStatsResult = await dbClient.query(categoryStatsQuery);
    
    res.json({
      success: true,
      data: {
        news: newsStatsResult.rows[0],
        sources: sourcesStatsResult.rows[0],
        categories: categoryStatsResult.rows
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

// 启动定时任务
const COLLECTION_INTERVAL = process.env.COLLECTOR_INTERVAL_MINUTES || 30;
logger.info(`Setting up collection task to run every ${COLLECTION_INTERVAL} minutes`);

cron.schedule(`*/${COLLECTION_INTERVAL} * * * *`, async () => {
  await runCollectionTask();
});

// 初始化服务
async function initialize() {
  try {
    await initDb();
    await initRedis();
    
    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`Collector server running on port ${PORT}`);
      console.log(`🚀 News Collector service is running on http://localhost:${PORT}`);
      console.log(`🏥 Health check at http://localhost:${PORT}/health`);
      console.log(`📊 Stats available at http://localhost:${PORT}/api/stats`);
      console.log(`📰 News available at http://localhost:${PORT}/api/news`);
      
      // 立即运行一次采集任务
      setTimeout(async () => {
        await runCollectionTask();
      }, 5000); // 延迟5秒启动首次采集
    });
  } catch (error) {
    logger.error('Failed to initialize collector service:', error);
  }
}

initialize();

module.exports = app;