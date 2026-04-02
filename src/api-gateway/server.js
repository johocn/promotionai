// src/api-gateway/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const client = require('prom-client');
const axios = require('axios');

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
    new winston.transports.File({ filename: 'logs/api-gateway-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/api-gateway-combined.log' })
  ]
});

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// Prometheus监控指标
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();

// 自定义监控指标
const httpRequestDurationHistogram = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // 0.1 to 10 seconds
});

// 安全中间件
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003', 'http://localhost:3004'],
  credentials: true
}));

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 记录请求日志的中间件
app.use((req, res, next) => {
  const start = Date.now();
  
  // 记录请求
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  
  // 记录响应
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    
    // 记录监控指标
    httpRequestDurationHistogram
      .labels(req.method, req.route ? req.route.path : req.path, statusCode.toString())
      .observe(duration / 1000); // 转换为秒
      
    logger.info(`${req.method} ${req.path} ${statusCode}`, {
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
  });
  
  next();
});

// API速率限制
const limiter = rateLimit({
  windowMs: process.env.API_RATE_WINDOW_MS || 15 * 60 * 1000, // 15分钟
  max: process.env.API_RATE_LIMIT || 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    error: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn(`Invalid token attempt from IP: ${req.ip}`, { userAgent: req.get('User-Agent') });
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// 服务健康检查中间件
const serviceHealthCheck = async (serviceName, serviceUrl) => {
  try {
    const response = await axios.get(`${serviceUrl}/health`, { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    logger.error(`Health check failed for ${serviceName}: ${error.message}`);
    return false;
  }
};

// 注册指标端点
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});

// 健康检查端点
app.get('/health', async (req, res) => {
  // 检查下游服务健康状况
  const services = {
    collector: await serviceHealthCheck('collector', `http://localhost:${process.env.COLLECTOR_PORT || 3001}`),
    aiProcessor: await serviceHealthCheck('ai-processor', `http://localhost:${process.env.AI_PROCESSOR_PORT || 3002}`),
    publisher: await serviceHealthCheck('publisher', `http://localhost:${process.env.PUBLISHER_PORT || 3003}`),
    tracker: await serviceHealthCheck('tracker', `http://localhost:${process.env.TRACKER_PORT || 3004}`)
  };

  const overallStatus = Object.values(services).every(service => service);

  res.status(overallStatus ? 200 : 503).json({
    status: overallStatus ? 'OK' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    service: 'API Gateway',
    version: '1.0.0',
    services: services
  });
});

// 服务发现和代理配置
const createServiceProxy = (targetPort, serviceName) => {
  return createProxyMiddleware({
    target: `http://localhost:${targetPort}`,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/${serviceName}`]: '', // 动态移除前缀
    },
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
      logger.debug(`Proxying ${req.method} ${req.path} to ${serviceName} service`);
      // 添加请求头传递用户信息
      if (req.user) {
        proxyReq.setHeader('x-user-id', req.user.id);
        proxyReq.setHeader('x-user-role', req.user.role);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      logger.debug(`Received response from ${serviceName} service: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${serviceName} service: ${err.message}`, {
        path: req.path,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      res.status(502).json({ 
        error: 'Service temporarily unavailable', 
        service: serviceName,
        timestamp: new Date().toISOString()
      });
    }
  });
};

// 创建服务代理
const serviceProxies = {
  collector: createServiceProxy(process.env.COLLECTOR_PORT || 3001, 'collector'),
  aiProcessor: createServiceProxy(process.env.AI_PROCESSOR_PORT || 3002, 'ai'),
  publisher: createServiceProxy(process.env.PUBLISHER_PORT || 3003, 'publisher'),
  tracker: createServiceProxy(process.env.TRACKER_PORT || 3004, 'tracker')
};

// API路由 - 代理到各个微服务
app.use('/api/collector', authenticateToken, serviceProxies.collector);
app.use('/api/ai', authenticateToken, serviceProxies.aiProcessor);
app.use('/api/publisher', authenticateToken, serviceProxies.publisher);
app.use('/api/tracker', authenticateToken, serviceProxies.tracker);

// 特殊路由 - 用于服务管理和监控
app.get('/api/services/status', authenticateToken, async (req, res) => {
  const services = {
    collector: await serviceHealthCheck('collector', `http://localhost:${process.env.COLLECTOR_PORT || 3001}`),
    aiProcessor: await serviceHealthCheck('ai-processor', `http://localhost:${process.env.AI_PROCESSOR_PORT || 3002}`),
    publisher: await serviceHealthCheck('publisher', `http://localhost:${process.env.PUBLISHER_PORT || 3003}`),
    tracker: await serviceHealthCheck('tracker', `http://localhost:${process.env.TRACKER_PORT || 3004}`)
  };

  res.json({
    timestamp: new Date().toISOString(),
    services: services
  });
});

// 主页路由
app.get('/', (req, res) => {
  res.json({
    message: 'PromotionAI API Gateway',
    version: '1.0.0',
    services: {
      collector: `/api/collector/*`,
      aiProcessor: `/api/ai/*`,
      publisher: `/api/publisher/*`,
      tracker: `/api/tracker/*`
    },
    endpoints: {
      health: '/health',
      metrics: '/metrics',
      'service-status': '/api/services/status'
    },
    timestamp: new Date().toISOString()
  });
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  logger.error(`Unhandled error: ${err.message}`, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    stack: err.stack
  });
  
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404处理
app.use('*', (req, res) => {
  logger.warn(`Route not found: ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// 启动服务器
app.listen(PORT, () => {
  logger.info(`API Gateway server running on port ${PORT}`);
  console.log(`🚀 API Gateway is running on http://localhost:${PORT}`);
  console.log(`📊 Metrics available at http://localhost:${PORT}/metrics`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
  console.log(`📋 Service status at http://localhost:${PORT}/api/services/status`);
});

module.exports = app;