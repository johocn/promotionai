# PromotionAI 后端服务端口配置

## 📋 服务端口总览

| 服务名称 | 内部端口 | 外部端口 | 说明 | API 前缀 |
|---------|---------|---------|------|---------|
| **API 网关** | 3030 | 3030 | 统一入口、认证、路由 | `/api` |
| **资讯采集** | 3031 | 3031 | 资讯爬虫、RSS 订阅 | `/collector` |
| **AI 处理** | 3032 | 3032 | 内容生成、质量评估 | `/ai-processor` |
| **渠道分发** | 3033 | 3033 | 多渠道发布 | `/publisher` |
| **埋点追踪** | 3034 | 3034 | 链接生成、数据分析 | `/tracker` |

---

## 🔧 配置文件

### 1. 环境变量 (`.env`)

```bash
# 应用配置
NODE_ENV=production
PORT=3030

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=promotionai_user
DB_PASSWORD=Moto2024!Mast
DB_NAME=promotionai

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# 服务端口配置
COLLECTOR_PORT=3031
AI_PROCESSOR_PORT=3032
PUBLISHER_PORT=3033
TRACKER_PORT=3034
```

### 2. Docker Compose 端口映射

```yaml
services:
  api-gateway:
    ports:
      - "3030:3000"  # 外部 3030 → 容器内 3000
  
  collector:
    ports:
      - "3031:3000"  # 外部 3031 → 容器内 3000
  
  ai-processor:
    ports:
      - "3032:3000"  # 外部 3032 → 容器内 3000
  
  publisher:
    ports:
      - "3033:3000"  # 外部 3033 → 容器内 3000
  
  tracker:
    ports:
      - "3034:3000"  # 外部 3034 → 容器内 3000
```

---

## 🌐 API 路由配置

### API 网关路由表 (`src/api-gateway/server.js`)

```javascript
// 代理配置
const proxyConfig = {
  '/api/collector': {
    target: 'http://localhost:3031',
    changeOrigin: true,
    pathRewrite: { '^/api/collector': '' }
  },
  '/api/ai-processor': {
    target: 'http://localhost:3032',
    changeOrigin: true,
    pathRewrite: { '^/api/ai-processor': '' }
  },
  '/api/publisher': {
    target: 'http://localhost:3033',
    changeOrigin: true,
    pathRewrite: { '^/api/publisher': '' }
  },
  '/api/tracker': {
    target: 'http://localhost:3034',
    changeOrigin: true,
    pathRewrite: { '^/api/tracker': '' }
  }
};
```

---

## 📡 各服务详细配置

### 1️⃣ API 网关 (3030)

**文件**: `src/api-gateway/server.js`

**主要功能**:
- 统一认证（JWT）
- 请求限流
- 路由分发
- 日志记录
- 监控指标

**关键端点**:
```
GET  /health              # 健康检查
GET  /metrics             # Prometheus 指标
POST /api/auth/login      # 用户登录
GET  /api/auth/profile    # 获取用户信息

# 代理到各微服务
/api/collector/*          # → http://localhost:3031
/api/ai-processor/*       # → http://localhost:3032
/api/publisher/*          # → http://localhost:3033
/api/tracker/*            # → http://localhost:3034
```

---

### 2️⃣ 资讯采集服务 (3031)

**文件**: `src/collector/server.js`

**主要功能**:
- 网站爬虫
- RSS 订阅处理
- 数据清洗
- 定时采集

**API 端点**:
```
GET  /sources             # 获取数据源列表
POST /sources             # 添加数据源
PUT  /sources/:id         # 更新数据源
DELETE /sources/:id       # 删除数据源

GET  /tasks               # 获取采集任务
POST /tasks/execute       # 执行采集任务
GET  /tasks/:id/results   # 获取采集结果

GET  /news                # 获取采集的资讯
POST /news/:id/process    # 发送到 AI 处理
```

---

### 3️⃣ AI 处理服务 (3032)

**文件**: `src/ai-processor/server.js`

**主要功能**:
- 文案生成
- 风格适配
- 质量评估
- 合规检查

**API 端点**:
```
POST /generate            # 生成内容
GET  /content/:id         # 获取生成内容
POST /content/:id/quality # 质量评估
POST /content/:id/review  # 人工复核

GET  /styles              # 获取文案风格模板
GET  /platforms           # 获取目标平台配置
```

---

### 4️⃣ 渠道分发服务 (3033)

**文件**: `src/publisher/server.js`

**主要功能**:
- 多渠道发布
- 账号管理
- 发布调度
- 状态追踪

**API 端点**:
```
GET  /accounts            # 获取渠道账号
POST /accounts            # 添加渠道账号
PUT  /accounts/:id        # 更新账号配置

POST /publish             # 发布内容
GET  /publish/:id/status  # 获取发布状态
GET  /schedule            # 获取发布计划
POST /schedule            # 创建发布计划
```

---

### 5️⃣ 埋点追踪服务 (3034)

**文件**: `src/tracker/server.js`

**主要功能**:
- 短链接生成
- 行为追踪
- 数据分析
- 转化归因

**API 端点**:
```
POST /links               # 生成追踪链接
GET  /links/:code         # 获取链接信息
GET  /links/:code/stats   # 获取统计数据

POST /events              # 上报用户事件
GET  /sessions/:id        # 获取会话详情
GET  /conversions         # 获取转化数据
GET  /analytics           # 获取分析报告
```

---

## 🔗 前后端对接配置

### 前端 API 配置 (`web-admin/.env.development`)

```bash
# API 基础 URL
VITE_API_BASE_URL=http://localhost:3030/api

# 认证配置
VITE_AUTH_ENDPOINT=/auth/login
VITE_TOKEN_KEY=promotionai_token

# 超时配置
VITE_REQUEST_TIMEOUT=30000
```

### 前端请求封装 (`web-admin/src/api/request.ts`)

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3030/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 Token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('promotionai_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 - 处理错误
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Token 过期，跳转登录
      localStorage.removeItem('promotionai_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 🚀 启动命令

### 开发环境（同时启动所有服务）

```bash
cd /home/admin/.openclaw/workspace/promotionai

# 方式 1: 使用 npm 脚本
npm run dev

# 方式 2: 手动启动各个服务
npm run start:api-gateway
npm run start:collector
npm run start:ai-processor
npm run start:publisher
npm run start:tracker
```

### 生产环境（Docker Compose）

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f api-gateway
docker-compose logs -f collector
```

---

## 🔍 端口检查命令

```bash
# 检查端口占用
netstat -tlnp | grep -E '3030|3031|3032|3033|3034'

# 或使用 ss 命令
ss -tlnp | grep -E '3030|3031|3032|3033|3034'

# 测试服务连通性
curl http://localhost:3030/health
curl http://localhost:3031/health
curl http://localhost:3032/health
curl http://localhost:3033/health
curl http://localhost:3034/health
```

---

## 🛡️ 安全配置

### CORS 配置

```javascript
// API 网关 CORS 配置
app.use(cors({
  origin: [
    'http://localhost:3030',      // 前端开发
    'http://localhost:3031',      // 采集服务
    'http://localhost:3032',      // AI 服务
    'http://localhost:3033',      // 分发服务
    'http://localhost:3034',      // 追踪服务
    'https://www.joyogo.com'      // 生产域名
  ],
  credentials: true
}));
```

### 限流配置

```javascript
// API 限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 最多 100 个请求
  message: '请求过于频繁，请稍后再试'
});

app.use('/api/', limiter);
```

---

## 📊 监控与日志

### 日志文件位置

```
/home/admin/.openclaw/workspace/promotionai/logs/
├── api-gateway-error.log
├── api-gateway-combined.log
├── collector-error.log
├── collector-combined.log
├── ai-processor-error.log
├── ai-processor-combined.log
├── publisher-error.log
├── publisher-combined.log
├── tracker-error.log
└── tracker-combined.log
```

### 监控端点

```
GET http://localhost:3030/metrics    # Prometheus 指标
GET http://localhost:3030/health     # 健康检查
```

---

## ⚠️ 常见问题

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3030
lsof -i :3031

# 杀死进程
kill -9 <PID>

# 或修改端口配置
export PORT=3040
```

### 服务无法启动

```bash
# 检查 Node.js 版本
node --version

# 重新安装依赖
npm install

# 查看错误日志
tail -f logs/api-gateway-error.log
```

### 跨域问题

确保前端请求的 URL 与 API 网关的 CORS 配置匹配，检查浏览器控制台的 CORS 错误信息。

---

**最后更新**: 2026-04-13  
**版本**: v1.1
