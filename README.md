# PromotionAI - 智能内容营销平台

**PromotionAI** 是一个基于 AI 技术的智能内容营销平台，专注于财经/健康领域的资讯采集、智能处理、多渠道分发和效果追踪。

---

## 🚀 快速开始

```bash
# 克隆项目
git clone git@github.com:johocn/promotionai.git
cd promotionai

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，配置数据库和 AI API 密钥

# 启动开发环境
./start-dev-env.sh
```

**详细指南**: [QUICK_START.md](QUICK_START.md)

---

## 📋 项目概况

### 核心功能

| 模块 | 功能 | 状态 |
|------|------|------|
| **资讯采集** | 多源采集、RSS、智能过滤 | ✅ 完成 |
| **AI 处理** | 文案生成、风格转换、合规检测 | ✅ 完成 |
| **内容分发** | 抖音、小红书、微信公众号 | ✅ 完成 |
| **效果追踪** | 埋点追踪、转化分析 | ✅ 完成 |
| **管理后台** | Vue3 + TypeScript 前端 | ✅ 完成 |

### 技术栈

| 类别 | 技术 |
|------|------|
| **后端** | Node.js + Koa / Python + FastAPI |
| **前端** | Vue 3 + TypeScript + Element Plus |
| **数据库** | PostgreSQL + Redis + MongoDB + PGVector |
| **AI 服务** | OpenAI API / Ollama |
| **部署** | Docker + Docker Compose |

---

## 📁 项目结构

```
promotionai/
├── src/                          # 后端源代码
│   ├── api-gateway/              # API 网关服务 (3000)
│   ├── collector/                # 资讯采集服务 (3001)
│   ├── ai-processor/             # AI 处理服务 (3002)
│   ├── publisher/                # 内容分发服务 (3003)
│   └── tracker/                  # 追踪服务 (3004)
├── web-admin/                    # 前端管理后台
│   ├── src/
│   │   ├── api/                  # API 接口定义
│   │   ├── components/           # 通用组件
│   │   ├── views/                # 页面组件
│   │   ├── router/               # 路由配置
│   │   └── store/                # 状态管理
│   └── package.json
├── docker/                       # Docker 配置
├── docs/                         # 项目文档
├── scripts/                      # 脚本工具
├── README.md                     # 本文件
├── QUICK_START.md                # 快速入门
├── DEPLOYMENT.md                 # 部署指南
├── SERVICE_CONFIG.md             # 服务配置
└── docker-compose.yml            # Docker Compose 配置
```

---

## 📖 文档导航

### 📘 基础文档

| 文档 | 说明 |
|------|------|
| [README.md](README.md) | 项目说明（本文件） |
| [QUICK_START.md](QUICK_START.md) | 快速入门指南 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 部署指南 |
| [SERVICE_CONFIG.md](SERVICE_CONFIG.md) | 服务配置 |
| [PORT_CONFIG.md](PORT_CONFIG.md) | 端口配置 |
| [STARTUP_CHECKLIST.md](STARTUP_CHECKLIST.md) | 启动检查清单 |

### 📚 技术文档 (docs/)

| 文档 | 说明 |
|------|------|
| [docs/INDEX.md](docs/INDEX.md) | 文档索引 |
| [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) | 需求文档 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 架构设计 |
| [docs/DATABASE.md](docs/DATABASE.md) | 数据库设计 |
| [docs/SECURITY.md](docs/SECURITY.md) | 安全实现 |
| [docs/FEATURES.md](docs/FEATURES.md) | 功能概览 |
| [docs/IMPLEMENTATION.md](docs/IMPLEMENTATION.md) | 实施总结 |
| [docs/BRAND_GUIDELINES.md](docs/BRAND_GUIDELINES.md) | 品牌指南 |

### 🛠️ 开发指南 (docs/guides/)

| 文档 | 说明 |
|------|------|
| [docs/guides/git-guide.md](docs/guides/git-guide.md) | Git 使用指南 |
| [docs/guides/development-guide.md](docs/guides/development-guide.md) | 开发指南 |

### 📊 其他文档

| 文档 | 说明 |
|------|------|
| [INTEGRATION_TEST_PLAN.md](INTEGRATION_TEST_PLAN.md) | 集成测试计划 |
| [GIT_COMMIT_REPORT.md](GIT_COMMIT_REPORT.md) | Git 提交报告 |

---

## 🎯 核心特性

### 1. 智能内容生成

- **多风格转换**: 焦虑型、干货型、故事型文案
- **合规检测**: 金融/健康内容自动合规检查
- **质量评估**: 多维度质量评分体系
- **A/B 测试**: 自动化 A/B 测试，优选最佳内容

### 2. 多渠道分发

- **平台支持**: 抖音、小红书、微信公众号
- **内容适配**: 根据平台特点自动调整格式
- **发布调度**: 定时发布、状态跟踪
- **账号管理**: 多账号统一管理

### 3. 效果追踪

- **埋点链接**: 带唯一标识的追踪链接
- **行为记录**: 浏览、点击、停留时长
- **转化追踪**: 完整转化路径追踪
- **跨平台归因**: 用户行为跨平台追踪

### 4. 安全合规

- **内容审核**: 敏感词过滤和违禁词库
- **AI 标识**: 明确标注 AI 生成内容
- **金融合规**: 防止承诺收益、荐股等违规
- **医疗合规**: 避免诊疗建议相关内容

---

## 🔧 配置说明

### 环境变量

```bash
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=promotionai
DB_USER=app_user
DB_PASSWORD=your_password

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# AI 服务配置
OPENAI_API_KEY=your_api_key
OPENAI_MODEL=gpt-4-turbo

# JWT 配置
JWT_SECRET=your_secret_key
```

**详细配置**: [SERVICE_CONFIG.md](SERVICE_CONFIG.md)

### 端口配置

| 服务 | 端口 | API 前缀 | 说明 |
|------|------|---------|------|
| API 网关 | 3030 | `/api` | 统一入口、认证、路由 |
| 资讯采集 | 3031 | `/collector` | 资讯爬虫、RSS 订阅 |
| AI 处理 | 3032 | `/ai-processor` | 内容生成、质量评估 |
| 渠道分发 | 3033 | `/publisher` | 多渠道发布 |
| 埋点追踪 | 3034 | `/tracker` | 链接生成、数据分析 |

**详细配置**: [PORT_CONFIG.md](PORT_CONFIG.md)

---

## 🧪 测试

```bash
# 连接性测试
node scripts/test-connectivity.js

# 数据库迁移
node scripts/migrate.js

# 集成测试
npm run test
```

**测试计划**: [INTEGRATION_TEST_PLAN.md](INTEGRATION_TEST_PLAN.md)

---

## 📊 项目进度

### 已完成 (90%)

- ✅ 需求分析与设计
- ✅ 技术架构设计
- ✅ 数据库设计
- ✅ 5 个后端微服务
- ✅ 前端管理后台
- ✅ Docker 容器化
- ✅ 文档体系

### 待完善 (10%)

- ⏳ 搜索功能优化
- ⏳ Redis 缓存集成
- ⏳ 完整测试用例
- ⏳ CI/CD 流水线

---

## 🤝 贡献指南

### Git 工作流

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

**详细指南**: [docs/guides/git-guide.md](docs/guides/git-guide.md)

---

## 📄 许可证

MIT License

---

## 📞 联系方式

- **GitHub**: https://github.com/johocn/promotionai
- **项目负责人**: OpenClaw AI Assistant

---

**最后更新**: 2026-04-13  
**版本**: v1.0  
**状态**: ✅ 开发完成
