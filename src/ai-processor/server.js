// src/ai-processor/server.js
require('dotenv').config();
const express = require('express');
const { OpenAI } = require('openai');
const { Client } = require('pg');
const redis = require('redis');
const winston = require('winston');
const moment = require('moment');
const _ = require('lodash');
const NodeCache = require('node-cache');

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
    new winston.transports.File({ filename: 'logs/ai-processor-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/ai-processor-combined.log' })
  ]
});

// 初始化Express应用
const app = express();
const PORT = process.env.AI_PROCESSOR_PORT || 3002;

// 启用请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 初始化OpenAI客户端
let openai;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
  logger.info('OpenAI client initialized');
} else {
  logger.warn('OpenAI API key not configured, using mock AI functionality');
}

// 初始化数据库连接
let dbClient;
async function initDb() {
  try {
    // 使用连接池进行生产环境配置，开发环境使用简单连接
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
    
    // 创建AI内容相关表
    await dbClient.query(`
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
    `);
    logger.info('AI content tables created/verified');
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

// 内容风格模板
const CONTENT_STYLES = {
  anxiety: {
    name: '焦虑型',
    prompt: `你是一个专业的营销文案撰写师。请将以下内容改写成能够引起读者焦虑情绪的营销文案，促使他们产生购买或行动欲望。要求：
    1. 强调不采取行动的后果和风险
    2. 使用紧迫性语言
    3. 突出机会稍纵即逝的感觉
    4. 保持内容真实，不得夸大或虚假宣传
    5. 符合金融/健康领域合规要求
    6. 避免直接承诺收益或效果，使用"可能"、"或许"等词语
    7. 重点关注用户痛点，引发共鸣
    
    原内容: `,
    compliance_check: ['避免承诺收益', '避免夸大疗效', '使用"可能"等限定词']
  },
  dry_goods: {
    name: '干货型',
    prompt: `你是一个专业的知识分享者。请将以下内容整理成结构清晰、信息丰富的干货型文案，要求：
    1. 提供实用的技巧、方法或知识点
    2. 使用清晰的结构（如分点、列表、步骤等）
    3. 语言简洁明了，直击要点
    4. 保持专业性和准确性
    5. 符合金融/健康领域合规要求
    6. 提供具体可操作的建议
    7. 适当使用数据支撑观点
    
    原内容: `,
    compliance_check: ['确保信息准确', '避免误导性陈述', '标注信息来源']
  },
  story: {
    name: '故事型',
    prompt: `你是一个优秀的故事讲述者。请将以下内容改编成引人入胜的故事型文案，要求：
    1. 加入人物、情节、场景等故事元素
    2. 引发读者情感共鸣
    3. 在故事中自然植入产品/服务信息
    4. 保持故事真实可信
    5. 符合金融/健康领域合规要求
    6. 故事应有明确的起承转合
    7. 结尾要有明确的行动指引
    
    原内容: `,
    compliance_check: ['故事真实性', '避免过度渲染', '明确广告标识']
  },
  benefit: {
    name: '利益型',
    prompt: `你是一个专业的营销文案撰写师。请将以下内容改写成强调用户利益的营销文案，要求：
    1. 明确告诉用户能得到什么好处
    2. 使用具体的数据和事实支撑
    3. 强调解决问题的能力
    4. 保持内容真实，不得夸大或虚假宣传
    5. 符合金融/健康领域合规要求
    6. 突出独特卖点和竞争优势
    7. 使用有力的动词激发行动
    
    原内容: `,
    compliance_check: ['避免虚假宣传', '确保利益点真实可实现', '标注风险提示']
  },
  comparison: {
    name: '对比型',
    prompt: `你是一个专业的营销文案撰写师。请将以下内容改写成对比型文案，通过对比突出优势，要求：
    1. 设置对比参照物（传统方法/竞争对手/不使用产品的情况）
    2. 突出使用产品/服务的优势
    3. 使用具体数据和事实进行对比
    4. 保持客观公正，避免恶意贬低竞品
    5. 符合金融/健康领域合规要求
    6. 强调差异化价值
    7. 提供选择的理由
    
    原内容: `,
    compliance_check: ['避免恶意竞争', '确保对比客观真实', '不贬低竞品']
  }
};

// 平台适配规则
const PLATFORM_RULES = {
  douyin: {
    name: '抖音',
    max_length: 600,
    style_tips: '短小精悍，开头吸引注意力，多用疑问句和感叹句，结合热门话题标签',
    hashtags: ['#好物推荐', '#种草', '#测评', '#实用技巧', '#涨知识'],
    optimal_length: 300
  },
  xiaohongshu: {
    name: '小红书',
    max_length: 1000,
    style_tips: '生活化语言，注重体验分享，搭配精美图片描述，使用大量emoji',
    hashtags: ['#好物种草', '#测评', '#经验分享', '#避坑指南', '#神仙好物'],
    optimal_length: 600
  },
  wechat: {
    name: '微信公众号',
    max_length: 2000,
    style_tips: '详细阐述，逻辑清晰，适合深度内容，可加入更多背景信息',
    hashtags: [],
    optimal_length: 1200
  },
  weibo: {
    name: '微博',
    max_length: 140,
    style_tips: '简洁有力，适合快速传播，多用网络流行语，结合热点话题',
    hashtags: ['#今日话题', '#热议', '#热门'],
    optimal_length: 100
  }
};

// 内容分类规则
const CONTENT_CATEGORIES = {
  finance: {
    name: '金融理财',
    keywords: ['理财', '投资', '基金', '股票', '收益', '风险', '财务', '资产', '财富'],
    compliance_rules: [
      { pattern: /承诺.*收益|稳赚|保本|零风险/, message: '金融内容不得承诺收益或保证安全' },
      { pattern: /推荐.*股票|荐股|内幕消息/, message: '不得进行个股推荐或传播内幕消息' },
      { pattern: /收益率.*[>≥].*15%/, message: '收益率表述需谨慎，避免过高预期' }
    ]
  },
  health: {
    name: '健康养生',
    keywords: ['健康', '养生', '营养', '保健', '治疗', '康复', '体检', '疾病', '养生'],
    compliance_rules: [
      { pattern: /治疗.*疾病|治愈|根治|疗效/, message: '健康内容不得声称治疗功效' },
      { pattern: /医生推荐|专家推荐/, message: '需有真实依据，不得虚构专家推荐' },
      { pattern: /药|药物|药品/, message: '保健品不可称为药品' },
      { pattern: /神奇|特效|神医/, message: '避免夸大宣传' }
    ]
  },
  education: {
    name: '教育培训',
    keywords: ['教育', '培训', '学习', '考试', '课程', '辅导', '技能', '提升', '成长'],
    compliance_rules: [
      { pattern: /保证.*通过|包过/, message: '不得保证通过考试' },
      { pattern: /权威认证|官方授权/, message: '需有真实认证依据' }
    ]
  },
  technology: {
    name: '科技数码',
    keywords: ['科技', '数码', '手机', '电脑', '软件', '互联网', '创新', '智能'],
    compliance_rules: [
      { pattern: /最好|第一|唯一/, message: '避免绝对化用语' },
      { pattern: /专利|独家/, message: '需有真实依据' }
    ]
  }
};

// 合规检查函数
function complianceCheck(content, category = 'general', customRules = []) {
  const checks = {
    financial: [
      { pattern: /承诺.*收益|稳赚|保本|零风险/i, message: '不得承诺投资收益' },
      { pattern: /推荐.*股票|荐股|内部消息/i, message: '不得进行个股推荐' },
      { pattern: /收益率.*[>≥].*10%/i, message: '收益率表述需谨慎' }
    ],
    health: [
      { pattern: /治疗.*疾病|治愈|根治/i, message: '不得声称治疗功效' },
      { pattern: /医生推荐|专家推荐/i, message: '需有真实依据' },
      { pattern: /药|药物|药品/i, message: '保健品不可称为药品' }
    ],
    general: [
      { pattern: /最.*的|第一|首选|唯一/i, message: '避免绝对化用语' },
      { pattern: /国家级|世界级|最高级/i, message: '避免极限用语' },
      { pattern: /100%有效|绝对安全|永不/i, message: '避免绝对化表述' },
      { pattern: /领导品牌|行业第一/i, message: '需有证明材料' }
    ]
  };

  const allChecks = [
    ...(checks[category] || []), 
    ...checks.general,
    ...customRules
  ];
  
  const violations = [];
  const suggestions = [];

  allChecks.forEach(check => {
    if (check.pattern.test(content)) {
      violations.push(check.message);
      if (check.suggestion) {
        suggestions.push(check.suggestion);
      }
    }
  });

  return {
    isCompliant: violations.length === 0,
    violations: violations,
    suggestions: suggestions
  };
}

// 内容质量评估函数
function evaluateContentQuality(generatedContent, originalContent) {
  // 评估内容质量的多个维度
  const qualityMetrics = {
    relevance: 0, // 相关性
    readability: 0, // 可读性
    engagement: 0, // 参与度潜力
    originality: 0, // 原创性
    clarity: 0 // 清晰度
  };

  // 相关性评估：检查生成内容是否与原内容主题相关
  const originalWords = originalContent.toLowerCase().split(/\W+/).filter(Boolean);
  const generatedWords = generatedContent.toLowerCase().split(/\W+/).filter(Boolean);
  
  const commonWords = originalWords.filter(word => generatedWords.includes(word));
  qualityMetrics.relevance = Math.min(10, Math.round((commonWords.length / Math.max(originalWords.length, 1)) * 10));

  // 可读性评估：基于句子长度和复杂度
  const sentences = generatedContent.match(/[^\.!?]+[\.!?]+/g) || [generatedContent];
  const avgSentenceLength = generatedContent.length / Math.max(sentences.length, 1);
  qualityMetrics.readability = avgSentenceLength > 20 ? 6 : 8; // 长句降低可读性

  // 参与度潜力：检查是否包含行动号召、疑问句等
  const callToAction = /(试试|了解|查看|购买|点击|立即|马上|现在)/.test(generatedContent);
  const questions = generatedContent.match(/\?/g)?.length || 0;
  qualityMetrics.engagement = (callToAction ? 3 : 0) + Math.min(5, questions * 2);

  // 原创性：检查重复内容
  const repeatedPhrases = generatedContent.match(/(.{5,}).*\1/) ? 1 : 0;
  qualityMetrics.originality = repeatedPhrases ? 3 : 8;

  // 清晰度：基于标点符号使用和句子结构
  const punctuationRatio = (generatedContent.match(/[,.!?;]/g)?.length || 0) / Math.max(generatedContent.length / 100, 1);
  qualityMetrics.clarity = Math.min(10, Math.round(punctuationRatio * 15));

  // 计算综合得分
  const totalScore = Object.values(qualityMetrics).reduce((sum, score) => sum + score, 0);
  const averageScore = totalScore / Object.keys(qualityMetrics).length;

  return {
    score: parseFloat(averageScore.toFixed(2)),
    metrics: qualityMetrics,
    feedback: generateQualityFeedback(qualityMetrics)
  };
}

// 生成质量反馈
function generateQualityFeedback(metrics) {
  const feedback = [];
  
  if (metrics.relevance < 6) {
    feedback.push("内容与原始主题关联度较低，建议加强主题一致性");
  }
  
  if (metrics.readability < 6) {
    feedback.push("句子过长或结构复杂，影响阅读体验，建议简化表达");
  }
  
  if (metrics.engagement < 5) {
    feedback.push("缺乏互动元素，建议增加提问或行动号召");
  }
  
  if (metrics.originality < 6) {
    feedback.push("内容原创性不足，建议增加独特视角或个性化表达");
  }
  
  if (metrics.clarity < 6) {
    feedback.push("表达不够清晰，建议优化标点使用和句子结构");
  }
  
  return feedback;
}

// 使用OpenAI生成内容（或模拟）
async function generateContentWithAI(prompt, options = {}) {
  if (!openai) {
    // 模拟AI生成，返回模拟内容
    logger.warn('Using mock AI generation');
    return {
      content: `[模拟AI生成内容] ${prompt.substring(0, 100)}... [此为模拟内容，实际需配置OpenAI API]`,
      model: 'mock-model',
      tokens: 50,
      processingTime: 100
    };
  }

  try {
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
      messages: [
        { role: 'system', content: '你是一个专业的营销文案撰写师，擅长根据不同平台和风格要求创作高质量的营销内容。请确保内容符合相关法规要求，不包含任何违法不良信息。' },
        { role: 'user', content: prompt }
      ],
      temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
      max_tokens: parseInt(process.env.AI_MAX_TOKENS || '1000'),
      ...options
    });

    const processingTime = Date.now() - startTime;
    const content = response.choices[0]?.message?.content?.trim();
    const usage = response.usage;

    return {
      content: content,
      model: response.model,
      tokens: usage.total_tokens,
      processingTime: processingTime
    };
  } catch (error) {
    logger.error('AI generation error:', error);
    throw error;
  }
}

// AI内容生成API
app.use(express.json());

// 生成AI内容
app.post('/api/generate', async (req, res) => {
  try {
    const { 
      original_content, 
      style = 'dry_goods', 
      target_platform = 'douyin',
      category = 'general',
      enhance_keywords = [],
      uuid = null
    } = req.body;

    if (!original_content) {
      return res.status(400).json({
        success: false,
        error: 'Original content is required'
      });
    }

    // 选择合适的风格模板
    const selectedStyle = CONTENT_STYLES[style];
    if (!selectedStyle) {
      return res.status(400).json({
        success: false,
        error: `Unsupported style: ${style}`
      });
    }

    // 选择平台规则
    const platformRules = PLATFORM_RULES[target_platform];
    
    // 选择内容分类规则
    const categoryRules = CONTENT_CATEGORIES[category] || CONTENT_CATEGORIES.general;

    // 构建提示词
    let prompt = selectedStyle.prompt + original_content;
    
    // 添加平台适配规则
    if (platformRules) {
      prompt += `\n\n平台要求: ${platformRules.style_tips}`;
      if (platformRules.max_length) {
        prompt += `，内容长度不超过${platformRules.max_length}字符`;
      }
    }

    // 添加关键词强化
    if (enhance_keywords.length > 0) {
      prompt += `\n\n请重点突出以下关键词: ${enhance_keywords.join(', ')}`;
    }

    // 添加分类特定要求
    if (categoryRules) {
      prompt += `\n\n内容分类: ${categoryRules.name}`;
      if (categoryRules.keywords.some(kw => original_content.toLowerCase().includes(kw))) {
        prompt += `，请注意遵守此类别的特殊合规要求`;
      }
    }

    // 记录开始时间用于性能测量
    const startTime = Date.now();
    
    // 生成AI内容
    const aiResult = await generateContentWithAI(prompt);
    const generationTime = Date.now() - startTime;
    
    // 进行合规检查
    const compliance = complianceCheck(aiResult.content, category, categoryRules?.compliance_rules || []);

    // 评估内容质量
    const quality = evaluateContentQuality(aiResult.content, original_content);

    // 生成唯一UUID（如果没有提供）
    const contentUuid = uuid || require('uuid').v4();

    // 保存到数据库
    const insertQuery = `
      INSERT INTO ai_generated_content 
      (uuid, original_content, generated_content, content_style, target_platform, quality_score, 
       compliance_status, ai_model, usage_tokens, generation_time_ms, category, tags)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `;
    
    const insertResult = await dbClient.query(insertQuery, [
      contentUuid,
      original_content,
      aiResult.content,
      style,
      target_platform,
      quality.score,
      compliance.isCompliant ? 'compliant' : 'non_compliant',
      aiResult.model,
      aiResult.tokens,
      generationTime,
      category,
      `{${enhance_keywords.join(',')}}`
    ]);

    res.json({
      success: true,
      data: {
        id: insertResult.rows[0].id,
        uuid: contentUuid,
        original_content: original_content,
        generated_content: aiResult.content,
        content_style: style,
        target_platform: target_platform,
        ai_model: aiResult.model,
        usage_tokens: aiResult.tokens,
        generation_time_ms: generationTime,
        quality_score: quality.score,
        quality_metrics: quality.metrics,
        compliance_status: compliance.isCompliant ? 'compliant' : 'non_compliant',
        compliance_violations: compliance.violations,
        content_category: category,
        enhance_keywords: enhance_keywords,
        processing_time: aiResult.processingTime
      }
    });
  } catch (error) {
    logger.error('Content generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取AI生成的内容
app.get('/api/content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let query, params;
    // 检查ID是数字还是UUID
    if (/^[0-9]+$/.test(id)) {
      // 数字ID
      query = 'SELECT * FROM ai_generated_content WHERE id = $1';
      params = [id];
    } else {
      // UUID
      query = 'SELECT * FROM ai_generated_content WHERE uuid = $1';
      params = [id];
    }
    
    const result = await dbClient.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching AI content:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取AI生成内容列表
app.get('/api/content', async (req, res) => {
  try {
    const { 
      style, 
      platform, 
      compliance_status, 
      category,
      limit = 20, 
      offset = 0,
      order = 'created_at',
      direction = 'DESC'
    } = req.query;
    
    let query = 'SELECT * FROM ai_generated_content';
    const params = [];
    let paramIndex = 1;
    
    const conditions = [];
    if (style) {
      conditions.push(`content_style = $${paramIndex}`);
      params.push(style);
      paramIndex++;
    }
    
    if (platform) {
      conditions.push(`target_platform = $${paramIndex}`);
      params.push(platform);
      paramIndex++;
    }
    
    if (compliance_status) {
      conditions.push(`compliance_status = $${paramIndex}`);
      params.push(compliance_status);
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
    
    // 添加排序
    const validOrders = ['created_at', 'quality_score', 'generation_time_ms'];
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
    logger.error('Error fetching AI content list:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 提交内容质量反馈
app.post('/api/feedback', async (req, res) => {
  try {
    const { content_id, user_id, rating, feedback_text, is_effective, feedback_source = 'manual' } = req.body;
    
    if (!content_id || !user_id || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Content ID, user ID, and valid rating (1-5) are required'
      });
    }
    
    const query = `
      INSERT INTO content_quality_feedback 
      (content_id, user_id, rating, feedback_text, is_effective, feedback_source)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    
    const result = await dbClient.query(query, [content_id, user_id, rating, feedback_text, is_effective, feedback_source]);
    
    // 更新主内容的有效性评分
    if (typeof is_effective === 'boolean') {
      // 计算平均反馈评分
      const avgRatingQuery = `
        SELECT AVG(rating) as avg_rating, COUNT(*) as feedback_count
        FROM content_quality_feedback 
        WHERE content_id = $1
      `;
      const avgRatingResult = await dbClient.query(avgRatingQuery, [content_id]);
      
      const avgRating = avgRatingResult.rows[0].avg_rating;
      const feedbackCount = parseInt(avgRatingResult.rows[0].feedback_count);
      
      // 更新有效性状态和评分
      const updateContentQuery = `
        UPDATE ai_generated_content 
        SET is_effective = $1, effectiveness_score = $2
        WHERE id = $3
      `;
      await dbClient.query(updateContentQuery, [
        feedbackCount >= 3 && avgRating >= 4, // 如果有足够的反馈且平均评分高，则认为有效
        avgRating,
        content_id
      ]);
    }
    
    res.json({
      success: true,
      data: { id: result.rows[0].id },
      message: 'Feedback submitted successfully'
    });
  } catch (error) {
    logger.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取内容质量统计
app.get('/api/stats', async (req, res) => {
  try {
    // 获取内容风格分布
    const styleStatsQuery = `
      SELECT content_style, COUNT(*) as count
      FROM ai_generated_content
      GROUP BY content_style
    `;
    const styleStats = await dbClient.query(styleStatsQuery);
    
    // 获取平台分布
    const platformStatsQuery = `
      SELECT target_platform, COUNT(*) as count
      FROM ai_generated_content
      GROUP BY target_platform
    `;
    const platformStats = await dbClient.query(platformStatsQuery);
    
    // 获取合规状态统计
    const complianceStatsQuery = `
      SELECT compliance_status, COUNT(*) as count
      FROM ai_generated_content
      GROUP BY compliance_status
    `;
    const complianceStats = await dbClient.query(complianceStatsQuery);
    
    // 获取内容类别统计
    const categoryStatsQuery = `
      SELECT category, COUNT(*) as count
      FROM ai_generated_content
      GROUP BY category
    `;
    const categoryStats = await dbClient.query(categoryStatsQuery);
    
    // 获取平均质量评分
    const avgRatingQuery = `
      SELECT AVG(rating) as avg_rating
      FROM content_quality_feedback
    `;
    const avgRatingResult = await dbClient.query(avgRatingQuery);
    const avgRating = avgRatingResult.rows[0].avg_rating;
    
    // 获取平均生成时间
    const avgTimeQuery = `
      SELECT AVG(generation_time_ms) as avg_time
      FROM ai_generated_content
    `;
    const avgTimeResult = await dbClient.query(avgTimeQuery);
    const avgTime = avgTimeResult.rows[0].avg_time;
    
    // 获取有效性统计
    const effectivenessStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_effective = true THEN 1 END) as effective_count,
        AVG(effectiveness_score) as avg_effectiveness
      FROM ai_generated_content
    `;
    const effectivenessStats = await dbClient.query(effectivenessStatsQuery);

    res.json({
      success: true,
      data: {
        content_overview: {
          total_generated: (await dbClient.query('SELECT COUNT(*) FROM ai_generated_content')).rows[0].count,
          total_feedback: (await dbClient.query('SELECT COUNT(*) FROM content_quality_feedback')).rows[0].count,
          avg_generation_time_ms: avgTime ? parseFloat(avgTime).toFixed(0) : null,
          avg_quality_score: avgRating ? parseFloat(avgRating).toFixed(2) : null
        },
        style_distribution: styleStats.rows,
        platform_distribution: platformStats.rows,
        compliance_status: complianceStats.rows,
        category_distribution: categoryStats.rows,
        effectiveness_stats: {
          total_content: effectivenessStats.rows[0].total,
          effective_content: effectivenessStats.rows[0].effective_count,
          avg_effectiveness_score: effectivenessStats.rows[0].avg_effectiveness ? parseFloat(effectivenessStats.rows[0].avg_effectiveness).toFixed(2) : null,
          effectiveness_rate: effectivenessStats.rows[0].total > 0 ? 
            parseFloat((effectivenessStats.rows[0].effective_count / effectivenessStats.rows[0].total * 100).toFixed(2)) : 0
        }
      }
    });
  } catch (error) {
    logger.error('Stats retrieval error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 创建A/B测试
app.post('/api/ab-tests', async (req, res) => {
  try {
    const { original_content_id, variants_config } = req.body;
    
    if (!original_content_id || !variants_config || !Array.isArray(variants_config) || variants_config.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Original content ID and at least 2 variants configuration are required'
      });
    }
    
    if (variants_config.length > 3) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 3 variants allowed for A/B testing'
      });
    }
    
    // 为每个变体生成内容
    const variantIds = [];
    
    for (const config of variants_config) {
      const { style, target_platform, category = 'general', enhance_keywords = [] } = config;
      
      // 生成AI内容
      const contentData = {
        original_content_id: original_content_id,
        style: style,
        target_platform: target_platform,
        category: category,
        enhance_keywords: enhance_keywords
      };
      
      // 这里应该调用生成API，为简化我们直接插入空内容占位
      const insertQuery = `
        INSERT INTO ai_generated_content 
        (original_content_id, original_content, content_style, target_platform, category, tags)
        VALUES ($1, 'PLACEHOLDER_CONTENT', $2, $3, $4, $5)
        RETURNING id
      `;
      
      const result = await dbClient.query(insertQuery, [
        original_content_id,
        style,
        target_platform,
        category,
        `{${enhance_keywords.join(',')}}`
      ]);
      
      variantIds.push(result.rows[0].id);
    }
    
    // 创建A/B测试记录
    let testInsertQuery = `
      INSERT INTO content_a_b_tests (original_content_id`;
    const testValues = [original_content_id];
    let paramIndex = 2;
    
    // 根据变体数量动态构建查询
    for (let i = 0; i < variantIds.length; i++) {
      testInsertQuery += `, variant_${i+1}_id`;
      testValues.push(variantIds[i]);
    }
    
    testInsertQuery += `) VALUES ($1`;
    for (let i = 0; i < variantIds.length; i++) {
      testInsertQuery += `, $${i + 2}`;
    }
    testInsertQuery += `) RETURNING id`;
    
    const testResult = await dbClient.query(testInsertQuery, testValues);
    
    res.json({
      success: true,
      data: {
        test_id: testResult.rows[0].id,
        original_content_id: original_content_id,
        variant_ids: variantIds,
        status: 'created',
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('A/B test creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 获取A/B测试详情
app.get('/api/ab-tests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const query = `
      SELECT * FROM content_a_b_tests 
      WHERE id = $1
    `;
    const result = await dbClient.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'A/B test not found'
      });
    }
    
    const test = result.rows[0];
    
    // 获取变体详情
    const variants = [];
    for (let i = 1; i <= 3; i++) {
      const variantId = test[`variant_${i}_id`];
      if (variantId) {
        const variantQuery = 'SELECT * FROM ai_generated_content WHERE id = $1';
        const variantResult = await dbClient.query(variantQuery, [variantId]);
        if (variantResult.rows.length > 0) {
          variants.push({
            position: i,
            ...variantResult.rows[0]
          });
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        ...test,
        variants: variants
      }
    });
  } catch (error) {
    logger.error('A/B test fetch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'AI Processor',
    version: '1.0.0',
    ai_configured: !!openai,
    checks: {
      database: dbClient ? 'connected' : 'disconnected',
      redis: redisClient ? 'connected' : 'disconnected'
    }
  });
});

// 获取可用的风格和平台
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    data: {
      styles: Object.keys(CONTENT_STYLES).map(key => ({
        key: key,
        name: CONTENT_STYLES[key].name
      })),
      platforms: Object.keys(PLATFORM_RULES).map(key => ({
        key: key,
        name: PLATFORM_RULES[key].name
      })),
      categories: Object.keys(CONTENT_CATEGORIES).map(key => ({
        key: key,
        name: CONTENT_CATEGORIES[key].name
      }))
    }
  });
});

// 初始化服务
async function initialize() {
  try {
    await initDb();
    await initRedis();
    
    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`AI Processor server running on port ${PORT}`);
      console.log(`🚀 AI Processor service is running on http://localhost:${PORT}`);
      console.log(`🏥 Health check at http://localhost:${PORT}/health`);
      console.log(`💡 AI generation endpoint: POST /api/generate`);
      console.log(`📋 Available configs: GET /api/config`);
      console.log(`📊 Stats available: GET /api/stats`);
      
      if (!openai) {
        console.log(`⚠️  Warning: OpenAI not configured. Set OPENAI_API_KEY to enable AI features.`);
      }
    });
  } catch (error) {
    logger.error('Failed to initialize AI processor service:', error);
  }
}

initialize();

module.exports = app;