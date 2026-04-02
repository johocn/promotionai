# PromotionAI 开发指南

本文档介绍如何开始开发PromotionAI项目。

## 🚀 开发环境设置

### 1. 安装依赖

运行以下命令安装所有服务的依赖：

```bash
./install-dependencies.sh
```

或者手动为每个服务安装依赖：

```bash
# 安装根目录依赖
npm install

# 为每个服务安装依赖
cd src/api-gateway && npm install
cd ../collector && npm install
cd ../ai-processor && npm install
cd ../publisher && npm install
cd ../tracker && npm install
cd ../..  # 返回根目录
```

### 2. 配置环境变量

复制环境变量模板并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置以下内容：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=promotionai_dev
DB_USER=dev_user
DB_PASSWORD=dev_password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# AI服务配置（可选，用于启用AI功能）
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo

# 安全配置
JWT_SECRET=your_secure_jwt_secret_here
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

### 3. 初始化数据库

运行数据库初始化脚本：

```bash
node scripts/init-db.js
```

运行数据库迁移脚本：

```bash
node scripts/migrate.js
```

### 4. 启动开发环境

使用启动脚本：

```bash
./start-dev-env.sh
```

或单独启动各个服务：

```bash
# 在不同的终端窗口中运行
cd src/api-gateway && npm run dev
cd src/collector && npm run dev
cd src/ai-processor && npm run dev
cd src/publisher && npm run dev
cd src/tracker && npm run dev
```

## 🏗️ 项目结构

```
PromotionAI/
├── docs/                           # 文档
├── src/                            # 源代码
│   ├── api-gateway/               # API网关 - 端口 3000
│   ├── collector/                 # 资讯采集 - 端口 3001
│   ├── ai-processor/              # AI处理 - 端口 3002
│   ├── publisher/                 # 内容分发 - 端口 3003
│   └── tracker/                   # 追踪服务 - 端口 3004
├── config/                        # 配置文件
├── scripts/                       # 脚本
├── docker/                        # Docker配置
└── logs/                          # 日志
```

## 🛠️ 开发任务

### 任务优先级

根据项目规划，开发任务按以下优先级进行：

#### 1. 核心功能开发
- [ ] 完善资讯采集服务
- [ ] 开发AI内容生成功能
- [ ] 实现内容分发服务
- [ ] 完善追踪和分析功能

#### 2. 安全与合规
- [ ] 内容合规检测机制
- [ ] 金融/健康领域合规规则
- [ ] 平台政策适配

#### 3. 质量控制
- [ ] 人工复核工作台
- [ ] A/B测试框架
- [ ] 质量评估体系

#### 4. 监控与运维
- [ ] 系统监控指标
- [ ] 告警通知机制
- [ ] 性能优化

## 🧪 测试

### 连接性测试
```bash
node scripts/test-connectivity.js
```

### API测试
每个服务都有健康检查端点：
- API网关: `http://localhost:3000/health`
- 采集服务: `http://localhost:3001/health`
- AI处理: `http://localhost:3002/health`
- 分发服务: `http://localhost:3003/health`
- 追踪服务: `http://localhost:3004/health`

## 🔧 配置说明

### 采集服务配置
- `COLLECTOR_INTERVAL_MINUTES`: 采集间隔（分钟）
- `MAX_CONCURRENT_REQUESTS`: 最大并发请求数

### AI处理配置
- `AI_TEMPERATURE`: AI生成温度参数（0-1）
- `AI_MAX_TOKENS`: 最大token数

### 分发服务配置
- `PUBLISH_DELAY_SECONDS`: 发布延迟（秒）
- `MAX_PUBLISH_RETRIES`: 最大重试次数

## 🚀 部署

### Docker部署
```bash
docker-compose up -d
```

### 生产环境部署
1. 更新环境变量为生产环境配置
2. 运行生产环境迁移
3. 构建Docker镜像
4. 部署到生产环境

## 📞 支持

如需帮助，请参考文档或联系开发团队。