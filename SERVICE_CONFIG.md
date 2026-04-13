# PromotionAI 服务配置文档

## 服务架构概述

PromotionAI服务现在配置为通过反向代理暴露在www.joyogo.com域名下，通过不同的路径访问不同的服务。

## 服务端口映射

### 内部服务端口
- **API网关**: `3010` - 主入口点，处理所有API请求
- **资讯采集**: `3011` - 处理资讯采集相关功能
- **AI处理**: `3012` - 处理AI文案生成相关功能
- **内容分发**: `3013` - 处理内容分发相关功能
- **追踪服务**: `3014` - 处理追踪和分析相关功能
- **健康检查**: `3015` - 提供系统健康状态检查

### 外部访问路径（通过nginx反向代理）
- **API网关**: `www.joyogo.com/moapi` → `http://localhost:3010`
- **健康检查**: `www.joyogo.com/mojk` → `http://localhost:3015`
- **资讯采集**: `www.joyogo.com/mozx` → `http://localhost:3011`
- **AI处理**: `www.joyogo.com/moai` → `http://localhost:3012`
- **内容分发**: `www.joyogo.com/monr` → `http://localhost:3013`
- **追踪服务**: `www.joyogo.com/mozz` → `http://localhost:3014`

## 服务依赖关系

```
Internet
  ↓
www.joyogo.com
  ↓
nginx (反向代理)
  ↓
┌─────────────────┐
│   API网关       │ ← 端口 3010
│  (统一入口)     │
└─────────────────┘
         ↓
┌─────────────────┐ ┌─────────────────┐
│   资讯采集      │ │   AI处理        │
│   (端口 3011)   │ │  (端口 3012)    │
└─────────────────┘ └─────────────────┘
         ↓                   ↓
┌─────────────────┐ ┌─────────────────┐
│   内容分发      │ │   追踪服务      │
│   (端口 3013)   │ │  (端口 3014)    │
└─────────────────┘ └─────────────────┘
         ↓                   ↓
    ┌─────────────┐    ┌─────────────┐
    │ PostgreSQL  │    │    Redis    │
    │  (端口5435) │    │  (端口6381) │
    └─────────────┘    └─────────────┘
```

## 服务功能说明

### 1. API网关 (端口 3010)
- **路径**: `/moapi`
- **功能**: 
  - 统一API入口
  - 认证和授权
  - 请求路由
  - 限流控制
  - 日志记录

### 2. 健康检查 (端口 3015)
- **路径**: `/mojk`
- **功能**:
  - 系统健康状态检查
  - 各服务可用性监控
  - 性能指标汇总

### 3. 资讯采集 (端口 3011)
- **路径**: `/mozx`
- **功能**:
  - 多源资讯采集
  - RSS订阅处理
  - 数据清洗和格式化
  - 采集任务调度

### 4. AI处理 (端口 3012)
- **路径**: `/moai`
- **功能**:
  - AI文案生成
  - 多种风格转换
  - 合规性检查
  - A/B测试支持

### 5. 内容分发 (端口 3013)
- **路径**: `/monr`
- **功能**:
  - 多平台内容发布
  - 账号管理
  - 发布状态追踪
  - 错误重试机制

### 6. 追踪服务 (端口 3014)
- **路径**: `/mozz`
- **功能**:
  - 短链接生成
  - 用户行为追踪
  - 转化路径分析
  - 统计报告生成

## Nginx配置

nginx需要配置反向代理规则，将外部路径映射到内部端口：

```nginx
server {
    listen 80;
    server_name www.joyogo.com;

    # API网关服务 - /moapi 路径
    location /moapi {
        proxy_pass http://localhost:3010;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查服务 - /mojk 路径
    location /mojk {
        proxy_pass http://localhost:3015;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 资讯采集服务 - /mozx 路径
    location /mozx {
        proxy_pass http://localhost:3011;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # AI处理服务 - /moai 路径
    location /moai {
        proxy_pass http://localhost:3012;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 内容分发服务 - /monr 路径
    location /monr {
        proxy_pass http://localhost:3013;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 追踪服务 - /mozz 路径
    location /mozz {
        proxy_pass http://localhost:3014;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 启动说明

使用以下命令启动服务：

```bash
./start-promotionai-services.sh
```

## 监控和维护

- **服务状态**: `docker ps --filter name=promotionai`
- **日志查看**: `docker logs <container_name>`
- **健康检查**: 访问 `http://www.joyogo.com/mojk`

## 注意事项

1. 确保nginx配置正确，将路径映射到内部端口
2. 配置DNS或hosts文件，使www.joyogo.com指向服务器IP
3. 确保防火墙允许80端口访问
4. 监控内部端口3010-3015的使用情况# PromotionAI 项目启动配置

## 项目概述
PromotionAI 是一个基于AI技术的智能内容营销平台，专注于财经/健康领域的资讯采集、智能处理、多渠道分发和效果追踪。

## 目录结构
```
PromotionAI/
├── docs/                           # 文档目录
│   ├── financial-health-content-system.md    # 主需求方案
│   ├── overview.md                  # 项目概览
│   ├── security-implementation.md   # 安全实现方案
│   └── ...
├── src/                            # 源代码目录
│   ├── collector/                   # 资讯采集服务
│   ├── ai-processor/               # AI处理服务  
│   ├── publisher/                  # 内容分发服务
│   ├── tracker/                    # 埋点追踪服务
│   └── api-gateway/                # API网关服务
├── tests/                          # 测试目录
├── config/                         # 配置目录
│   ├── project.json                 # 项目配置
│   ├── database.json                # 数据库配置
│   ├── security.json                # 安全配置
│   └── monitoring.json              # 监控配置
├── data/                           # 数据目录
├── logs/                           # 日志目录
├── docker/                         # Docker配置
│   ├── docker-compose.yml           # Docker Compose配置
│   ├── collector.Dockerfile         # 采集服务Dockerfile
│   ├── ai-processor.Dockerfile      # AI处理服务Dockerfile
│   └── ...
├── scripts/                        # 脚本目录
│   ├── deploy.sh                    # 部署脚本
│   ├── backup.sh                    # 备份脚本
│   └── monitor.sh                   # 监控脚本
├── README.md                       # 项目说明
├── package.json                    # Node.js包配置
└── startup.sh                      # 项目启动脚本
```

## 环境配置

### 3.1 系统要求
- **操作系统**: Linux (Ubuntu 20.04+ / CentOS 8+)
- **内存**: ≥ 8GB RAM
- **存储**: ≥ 100GB 硬盘空间
- **Node.js**: ≥ 18.0.0
- **Docker**: ≥ 20.0.0
- **Docker Compose**: ≥ 2.0.0

### 3.2 环境变量配置
```bash
# .env 配置示例
NODE_ENV=production
PORT=3000

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=app_user
DB_PASSWORD=secure_password
DB_NAME=promotionai_db
DB_SSL=false
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# AI服务配置
OPENAI_API_KEY=sk-your-api-key
OPENAI_MODEL=gpt-4-turbo

# 消息队列配置
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_USERNAME=guest
RABBITMQ_PASSWORD=guest

# 监控配置
PROMETHEUS_ENABLED=true
GRAFANA_URL=http://localhost:3000

# 安全配置
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key-here