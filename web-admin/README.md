# PromotionAI Web Admin

PromotionAI 智能营销系统管理后台 - 基于 Vue3 + Vite + Element Plus

## 技术栈

- **框架**: Vue 3.4+
- **构建工具**: Vite 5.4+
- **UI 组件**: Element Plus 2.10+
- **状态管理**: Pinia 2.2+
- **路由**: Vue Router 4.4+
- **HTTP 客户端**: Axios 1.7+
- **图表**: ECharts 5.5+
- **语言**: TypeScript 5.6+

## 快速开始

### 安装依赖

```bash
cd web-admin
npm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:8080

### 生产构建

```bash
npm run build
```

### 预览构建结果

```bash
npm run preview
```

## 项目结构

```
web-admin/
├── src/
│   ├── api/              # API 接口
│   ├── assets/           # 静态资源
│   ├── components/       # 公共组件
│   ├── composables/      # 组合式函数
│   ├── config/           # 配置文件
│   ├── layout/           # 布局组件
│   ├── router/           # 路由配置
│   ├── store/            # 状态管理
│   ├── styles/           # 全局样式
│   ├── types/            # TypeScript 类型
│   ├── utils/            # 工具函数
│   ├── views/            # 页面组件
│   ├── App.vue           # 根组件
│   └── main.ts           # 入口文件
├── .env.development      # 开发环境变量
├── .env.production       # 生产环境变量
├── index.html            # HTML 模板
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript 配置
└── vite.config.ts        # Vite 配置
```

## 功能模块

### 1. 工作台 (Dashboard)
- 数据概览
- 采集趋势图表
- 发布渠道分布
- 最近任务列表

### 2. 资讯采集 (Collector)
- 数据源管理
- 采集任务
- 资讯列表

### 3. AI 处理 (AI Processor)
- 内容生成
- 人工复核
- 质量评估

### 4. 内容分发 (Publisher)
- 账号管理
- 分发任务
- 发布记录

### 5. 效果追踪 (Tracker)
- 追踪链接
- 转化分析
- 统计报告

### 6. 合规审核 (Compliance)
- 内容审核
- 敏感词库

### 7. 系统设置 (System)
- 用户管理
- 角色管理
- 系统配置

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| VITE_APP_TITLE | 应用标题 | PromotionAI 管理后台 |
| VITE_APP_PORT | 开发服务器端口 | 8080 |
| VITE_API_BASE_URL | API 基础地址 | /api |
| VITE_API_GATEWAY_URL | API 网关地址 | http://localhost:3000 |

## 开发规范

### 代码风格
- 使用 TypeScript 编写代码
- 遵循 Vue 3 Composition API 风格
- 使用 ESLint 进行代码检查

### 命名规范
- 组件文件：PascalCase (如 `UserProfile.vue`)
- 工具函数：camelCase (如 `formatDate.ts`)
- 常量：UPPER_SNAKE_CASE (如 `API_BASE_URL`)

### Git 提交规范
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 重构代码
test: 测试相关
chore: 构建/工具链相关
```

## 默认登录账号

- 用户名：`admin`
- 密码：`admin123`

## License

MIT
