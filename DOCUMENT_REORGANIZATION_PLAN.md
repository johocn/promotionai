# PromotionAI 文档归档计划

**时间**: 2026-04-13 20:58  
**目的**: 合并重复文档，保留最新版本，清理冗余文件

---

## 📊 当前文档分析

### 根目录文档 (20 个)

| 文件名 | 大小 | 状态 | 处理建议 |
|--------|------|------|----------|
| README.md | 5.2K | ✅ 保留 | 主文档 |
| PROJECT_SUMMARY.md | 12K | ⚠️ 重复 | 合并到 README |
| PROJECT_COMPLETION_REPORT.md | 12K | ⚠️ 重复 | 合并到 README |
| PROJECT_COMPLETION_SUMMARY.md | 4.3K | ⚠️ 重复 | 删除 |
| STATUS.md | 4.9K | ⚠️ 重复 | 删除 |
| status.md | 2.1K | ⚠️ 重复 | 删除 |
| TASKLIST.md | 5.3K | ⚠️ 重复 | 合并到 docs/ |
| TASK_PROGRESS.md | 4.5K | ⚠️ 重复 | 合并到 docs/ |
| DEPLOYMENT_GUIDE.md | 3.9K | ✅ 保留 | 部署文档 |
| DEPLOYMENT_STATUS_REPORT.md | 3.6K | ⚠️ 过期 | 删除 |
| UPDATED_DEPLOYMENT_STATUS.md | 4.8K | ⚠️ 过期 | 删除 |
| QUICK_START_GUIDE.md | 3.5K | ✅ 保留 | 快速入门 |
| STARTUP_CHECKLIST.md | 7.2K | ✅ 保留 | 启动清单 |
| CONFIG.md | 3.0K | ⚠️ 重复 | 合并到 SERVICE_CONFIG |
| SERVICE_CONFIG.md | 5.9K | ✅ 保留 | 服务配置 |
| PORT_CONFIG.md | 8.5K | ✅ 保留 | 端口配置 |
| DEVELOPMENT.md | 3.8K | ⚠️ 重复 | 合并到 docs/ |
| INTEGRATION_TEST_PLAN.md | 4.1K | ✅ 保留 | 测试计划 |
| index.md | 1.3K | ⚠️ 重复 | 删除 |
| GIT_COMMIT_REPORT.md | 4.3K | ✅ 保留 | Git 报告（最新） |

### docs 目录文档 (12 个)

| 文件名 | 大小 | 状态 | 处理建议 |
|--------|------|------|----------|
| README.md | 2.2K | ⚠️ 重复 | 删除（根目录已有） |
| overview.md | 1.2K | ⚠️ 重复 | 合并到主文档 |
| structure.md | 2.3K | ⚠️ 重复 | 合并到 README |
| git-setup.md | 1.4K | ⚠️ 重复 | 合并到 docs/guide/ |
| tech-documentation-index.md | 2.5K | ✅ 保留 | 文档索引 |
| financial-health-content-system.md | 66K | ✅ 保留 | 主需求文档 |
| database-design.md | 37K | ✅ 保留 | 数据库设计 |
| security-implementation.md | 56K | ✅ 保留 | 安全实现 |
| complete-feature-overview.md | 7.0K | ✅ 保留 | 功能概览 |
| project-implementation-summary.md | 5.7K | ✅ 保留 | 实施总结 |
| promotionai-brand-guidelines.md | 1.7K | ✅ 保留 | 品牌指南 |

### docs/tech-design 目录

| 子目录 | 内容 | 处理建议 |
|--------|------|----------|
| api-design/ | API 规范 | ✅ 保留 |
| architecture/ | 架构设计 | ✅ 保留 |
| database-design/ | 数据库设计 | ⚠️ 与根目录重复 |

---

## 🗂️ 新文档结构

```
promotionai/
├── README.md                      # 主文档（合并 PROJECT_SUMMARY 等）
├── QUICK_START.md                 # 快速入门（重命名）
├── DEPLOYMENT.md                  # 部署指南（重命名）
├── CONFIGURATION.md               # 配置指南（合并 CONFIG + SERVICE_CONFIG）
├── PORT_CONFIG.md                 # 端口配置
├── STARTUP_CHECKLIST.md           # 启动清单
├── INTEGRATION_TEST_PLAN.md       # 集成测试计划
├── GIT_COMMIT_REPORT.md           # Git 提交报告
│
├── docs/
│   ├── INDEX.md                   # 文档索引（重命名）
│   ├── REQUIREMENTS.md            # 需求文档（主需求）
│   ├── ARCHITECTURE.md            # 架构设计
│   ├── DATABASE.md                # 数据库设计
│   ├── SECURITY.md                # 安全实现
│   ├── API_SPECIFICATION.md       # API 规范
│   ├── FEATURES.md                # 功能概览
│   ├── IMPLEMENTATION.md          # 实施总结
│   ├── BRAND_GUIDELINES.md        # 品牌指南
│   │
│   ├── guides/
│   │   ├── git-guide.md           # Git 使用指南
│   │   └── development-guide.md   # 开发指南
│   │
│   └── tech-design/
│       ├── architecture/          # 架构设计详情
│       ├── api-design/            # API 设计详情
│       └── database-design/       # 数据库设计详情
│
├── src/                           # 源代码
├── web-admin/                     # 前端管理后台
├── docker/                        # Docker 配置
├── scripts/                       # 脚本工具
└── tests/                         # 测试文件
```

---

## 📋 执行步骤

### 步骤 1: 备份当前文档

```bash
cd /home/admin/.openclaw/workspace/promotionai
mkdir -p docs-archive
cp *.md docs-archive/
cp -r docs docs-archive/
```

### 步骤 2: 合并重复文档

**合并到 README.md**:
- PROJECT_SUMMARY.md
- PROJECT_COMPLETION_REPORT.md
- PROJECT_COMPLETION_SUMMARY.md
- structure.md

**删除重复文档**:
- STATUS.md
- status.md
- index.md
- docs/README.md
- docs/overview.md

### 步骤 3: 重命名文档

```bash
mv QUICK_START_GUIDE.md QUICK_START.md
mv DEPLOYMENT_GUIDE.md DEPLOYMENT.md
mv SERVICE_CONFIG.md CONFIGURATION.md
mv docs/tech-documentation-index.md docs/INDEX.md
```

### 步骤 4: 移动文档到 docs/

```bash
mkdir -p docs/guides
mv git-setup.md docs/guides/git-guide.md
mv DEVELOPMENT.md docs/guides/development-guide.md
mv TASKLIST.md docs/TASKLIST.md
mv TASK_PROGRESS.md docs/TASK_PROGRESS.md
```

### 步骤 5: 清理过期文档

```bash
rm -f DEPLOYMENT_STATUS_REPORT.md
rm -f UPDATED_DEPLOYMENT_STATUS.md
rm -f docs-archive/  # 清理备份（确认无误后）
```

---

## ✅ 文档清理清单

### 保留文档 (15 个)

**根目录**:
- [ ] README.md（合并版）
- [ ] QUICK_START.md
- [ ] DEPLOYMENT.md
- [ ] CONFIGURATION.md
- [ ] PORT_CONFIG.md
- [ ] STARTUP_CHECKLIST.md
- [ ] INTEGRATION_TEST_PLAN.md
- [ ] GIT_COMMIT_REPORT.md

**docs 目录**:
- [ ] docs/INDEX.md
- [ ] docs/REQUIREMENTS.md
- [ ] docs/ARCHITECTURE.md
- [ ] docs/DATABASE.md
- [ ] docs/SECURITY.md
- [ ] docs/API_SPECIFICATION.md
- [ ] docs/FEATURES.md
- [ ] docs/IMPLEMENTATION.md
- [ ] docs/BRAND_GUIDELINES.md

### 删除文档 (12 个)

- [ ] PROJECT_SUMMARY.md（内容已合并）
- [ ] PROJECT_COMPLETION_REPORT.md（内容已合并）
- [ ] PROJECT_COMPLETION_SUMMARY.md（重复）
- [ ] STATUS.md（重复）
- [ ] status.md（重复）
- [ ] index.md（重复）
- [ ] docs/README.md（重复）
- [ ] docs/overview.md（重复）
- [ ] DEPLOYMENT_STATUS_REPORT.md（过期）
- [ ] UPDATED_DEPLOYMENT_STATUS.md（过期）
- [ ] CONFIG.md（合并到 CONFIGURATION）
- [ ] DEVELOPMENT.md（移动到 docs/guides/）

---

## 📊 预期效果

### 清理前
- **文档总数**: 32 个
- **重复文档**: ~12 个
- **过期文档**: ~3 个
- **总大小**: ~200KB

### 清理后
- **文档总数**: 20 个
- **重复文档**: 0 个
- **过期文档**: 0 个
- **总大小**: ~150KB
- **减少**: 37.5%

---

## 🎯 文档使用指南

### 新用户阅读顺序

1. **README.md** - 了解项目概况
2. **QUICK_START.md** - 快速开始开发
3. **docs/REQUIREMENTS.md** - 详细了解需求
4. **docs/ARCHITECTURE.md** - 了解技术架构
5. **DEPLOYMENT.md** - 部署到生产环境

### 开发者常用文档

- **CONFIGURATION.md** - 配置服务
- **PORT_CONFIG.md** - 端口配置
- **docs/guides/development-guide.md** - 开发指南
- **docs/guides/git-guide.md** - Git 使用指南
- **INTEGRATION_TEST_PLAN.md** - 测试计划

### 运维人员常用文档

- **DEPLOYMENT.md** - 部署指南
- **STARTUP_CHECKLIST.md** - 启动检查清单
- **docs/SECURITY.md** - 安全配置
- **docs/IMPLEMENTATION.md** - 实施总结

---

**下一步**: 执行文档整理脚本，完成文档结构优化。
