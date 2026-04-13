# PromotionAI 服务配置文档

## 服务架构概述

PromotionAI 服务配置为本地运行，通过端口 3030-3034 提供 API 服务。

## 服务端口映射

### 服务端口
| 服务名称 | 端口 | API 前缀 | 说明 |
|---------|------|---------|------|
| **API 网关** | 3030 | `/api` | 统一入口、认证、路由 |
| **资讯采集** | 3031 | `/collector` | 资讯爬虫、RSS 订阅 |
| **AI 处理** | 3032 | `/ai-processor` | 内容生成、质量评估 |
| **渠道分发** | 3033 | `/publisher` | 多渠道发布 |
| **埋点追踪** | 3034 | `/tracker` | 链接生成、数据分析 |

## 服务依赖关系

```
┌─────────────────┐
│   API 网关       │ ← 端口 3030
│  (统一入口)     │
└─────────────────┘
         ↓
┌─────────────────┐ ┌─────────────────┐
│   资讯采集      │ │   AI 处理        │
│   (端口 3031)   │ │  (端口 3032)    │
└─────────────────┘ └─────────────────┘
         ↓                   ↓
┌─────────────────┐ ┌─────────────────┐
│   渠道分发      │ │   埋点追踪      │
│   (端口 3033)   │ │  (端口 3034)    │
└─────────────────┘ └─────────────────┘
         ↓                   ↓
    ┌─────────────┐    ┌─────────────┐
    │ PostgreSQL  │    │    Redis    │
    │  (5432)     │    │  (6379)     │
    └─────────────┘    └─────────────┘
```

## 环境变量配置

### 核心配置

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

## 服务详细说明

### 1. API 网关 (3030)

**职责**:
- 统一认证（JWT）
- 请求限流
- 路由分发
- 日志记录

**关键配置**:
```javascript
{
  PORT: 3030,
  JWT_SECRET: 'your_jwt_secret',
  API_RATE_LIMIT: 100,
  COLLECTOR_PORT: 3031,
  AI_PROCESSOR_PORT: 3032,
  PUBLISHER_PORT: 3033,
  TRACKER_PORT: 3034
}
```

### 2. 资讯采集服务 (3031)

**职责**:
- 网站爬虫
- RSS 订阅
- 数据清洗

**关键配置**:
```javascript
{
  COLLECTOR_PORT: 3031,
  COLLECTOR_INTERVAL_MINUTES: 30
}
```

### 3. AI 处理服务 (3032)

**职责**:
- 文案生成
- 风格适配
- 质量评估

**关键配置**:
```javascript
{
  AI_PROCESSOR_PORT: 3032,
  OPENAI_API_KEY: 'your_key',
  AI_TEMPERATURE: 0.7
}
```

### 4. 渠道分发服务 (3033)

**职责**:
- 多渠道发布
- 账号管理
- 发布调度

**关键配置**:
```javascript
{
  PUBLISHER_PORT: 3033,
  PUBLISH_DELAY_SECONDS: 5
}
```

### 5. 埋点追踪服务 (3034)

**职责**:
- 短链接生成
- 行为追踪
- 数据分析

**关键配置**:
```javascript
{
  TRACKER_PORT: 3034,
  TRACKING_DOMAIN: 'track.joyogo.com'
}
```

## 启动方式

### Docker Compose 启动

```bash
cd /home/admin/.openclaw/workspace/promotionai

# 启动所有服务
docker compose -f docker-compose.with-existing-redis.yml up -d

# 查看服务状态
docker compose -f docker-compose.with-existing-redis.yml ps

# 查看日志
docker compose -f docker-compose.with-existing-redis.yml logs -f
```

### 停止服务

```bash
docker compose -f docker-compose.with-existing-redis.yml down
```

## 健康检查

```bash
# 检查 API 网关
curl http://localhost:3030/health

# 检查各服务
curl http://localhost:3031/health
curl http://localhost:3032/health
curl http://localhost:3033/health
curl http://localhost:3034/health
```

## 安全配置

### JWT 认证
- Token 有效期：24 小时
- 刷新 Token 有效期：7 天

### 限流配置
- 默认限制：100 请求/15 分钟
- 可配置：`API_RATE_LIMIT` 和 `API_RATE_WINDOW_MS`

### CORS 配置
允许的来源：
- `http://localhost:3030`
- `https://www.joyogo.com`

---

**最后更新**: 2026-04-13  
**版本**: v1.1
