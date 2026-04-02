# PromotionAI 项目启动配置

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