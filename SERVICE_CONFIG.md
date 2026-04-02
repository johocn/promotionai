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
4. 监控内部端口3010-3015的使用情况