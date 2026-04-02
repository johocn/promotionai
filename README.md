# PromotionAI - 智能促销系统

**PromotionAI** 是一个基于AI技术的智能内容营销平台，专注于财经/健康领域的资讯采集、智能处理、多渠道分发和效果追踪。

## 🚀 项目结构

```
PromotionAI/
├── docs/                           # 文档目录
│   ├── financial-health-content-system.md      # 主需求文档
│   ├── tech-design/                # 技术设计
│   └── ...
├── src/                            # 源代码
│   ├── api-gateway/               # API网关服务
│   ├── collector/                 # 资讯采集服务
│   ├── ai-processor/              # AI处理服务
│   ├── publisher/                 # 内容分发服务
│   └── tracker/                   # 追踪服务
├── config/                        # 配置文件
├── scripts/                       # 脚本
│   ├── init-db.js                 # 初始化数据库
│   ├── migrate.js                 # 数据库迁移
│   └── test-connectivity.js       # 连接测试
├── docker/                        # Docker配置
├── logs/                          # 日志文件
├── .env.example                   # 环境变量示例
├── docker-compose.yml             # Docker Compose配置
├── package.json                   # 项目配置
├── start-dev-env.sh               # 开发环境启动脚本
└── README.md                      # 项目说明
```

## 🏗️ 核心服务

### 1. API网关服务 (端口: 3000)
- 统一入口管理
- 认证授权
- 速率限制
- 请求路由
- 监控指标

### 2. 资讯采集服务 (端口: 3001)
- 多源资讯采集
- RSS/HTML内容提取
- 数据清洗和存储
- 定时采集任务

### 3. AI处理服务 (端口: 3002)
- 智能文案生成
- 多风格转换 (焦虑型、干货型、故事型)
- 合规性检查
- 质量评估

### 4. 内容分发服务 (端口: 3003)
- 多渠道发布 (抖音、小红书、微信)
- 账号管理
- 定时发布
- 发布状态追踪

### 5. 追踪服务 (端口: 3004)
- 埋点追踪
- 转化分析
- UTM参数支持
- 统计报告

## 🛠️ 技术栈

| 类别 | 技术栈 |
|------|--------|
| **后端** | Node.js + Express/Koa |
| **数据库** | PostgreSQL + Redis + MongoDB |
| **AI服务** | OpenAI API / 本地模型 |
| **监控** | Prometheus + 自定义指标 |
| **安全** | JWT + 输入验证 + 合规检查 |
| **部署** | Docker + Docker Compose |

## 🚀 快速开始

### 环境要求
- **Node.js**: >= 18.0.0
- **Docker**: >= 20.0 (可选，用于容器化部署)
- **Redis**: >= 7.0 (用于生产环境，开发环境可选)

### 本地开发环境

1. **克隆项目**
```bash
git clone git@github.com:johocn/promotionai.git
cd promotionai
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库连接、AI API密钥等
```

4. **初始化开发数据库**
```bash
node scripts/simple-migrate.js
```

5. **启动开发环境**
```bash
chmod +x start-dev-env.sh
./start-dev-env.sh
```

### Docker部署

1. **构建并启动所有服务**
```bash
docker-compose up -d
```

2. **查看服务状态**
```bash
docker-compose ps
```

## 📋 API文档

### 认证方式
所有API请求都需要在Header中包含认证Token：
```
Authorization: Bearer <jwt_token>
```

### 主要API端点

#### 资讯采集服务
- `GET /api/news` - 获取采集的资讯
- `POST /api/collect` - 手动触发采集
- `POST /api/sources` - 添加资讯源
- `GET /health` - 健康检查

#### AI处理服务
- `POST /api/generate` - 生成AI内容
- `GET /api/content/:id` - 获取AI生成内容
- `POST /api/feedback` - 提交质量反馈
- `GET /api/stats` - 获取统计信息

#### 内容分发服务
- `POST /api/distribute` - 创建分发任务
- `POST /api/accounts` - 添加渠道账号
- `GET /api/distribution` - 获取分发记录

#### 追踪服务
- `POST /api/tracking-links` - 创建追踪链接
- `GET /api/reports` - 获取统计报告
- `POST /api/conversions` - 记录转化

## 🔧 配置管理

### 环境变量配置
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=promotionai_db
DB_USER=app_user
DB_PASSWORD=secure_password

# AI服务配置
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4-turbo

# 安全配置
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key
```

## 🧪 测试

### 连接性测试
```bash
node scripts/test-connectivity.js
```

### 数据库迁移
```bash
node scripts/migrate.js
```

## 🛡️ 安全规范

### 数据安全
- 传输加密: HTTPS + TLS 1.3
- 存储加密: 字段级加密
- 访问控制: JWT + RBAC

### 内容合规
- 金融合规: 防止承诺收益、荐股等违规内容
- 健康合规: 避免诊疗建议相关内容
- 平台规则: 各平台AI生成内容规则检测

## 📊 监控指标

### 系统指标
- 响应时间: P95 < 500ms
- 可用性: > 99.5%
- 吞吐量: 支持1000+ QPS

### 业务指标
- 采集成功率: > 95%
- AI生成质量: > 85%
- 合规通过率: > 98%
- 转化率提升: > 30%

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 📄 许可证

MIT License