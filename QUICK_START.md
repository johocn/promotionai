# PromotionAI 快速启动指南

## 概述

本指南将帮助您快速启动 PromotionAI 服务，服务端口配置为 3030-3034。

## 服务端口映射

| 服务名称 | 端口 | API 前缀 | 说明 |
|---------|------|---------|------|
| **API 网关** | 3030 | `/api` | 统一入口、认证、路由 |
| **资讯采集** | 3031 | `/collector` | 资讯爬虫、RSS 订阅 |
| **AI 处理** | 3032 | `/ai-processor` | 内容生成、质量评估 |
| **渠道分发** | 3033 | `/publisher` | 多渠道发布 |
| **埋点追踪** | 3034 | `/tracker` | 链接生成、数据分析 |

## 启动步骤

### 1. 确认现有服务

首先，确认现有的数据库和 Redis 服务正在运行：

```bash
# 检查 PostgreSQL 是否运行
psql -h localhost -p 5432 -U postgres -c "SELECT version();" 

# 检查 Redis 是否运行
redis-cli -h localhost -p 6379 ping
```

### 2. 初始化数据库

如果数据库不存在，使用现有数据库创建：

```bash
# 确保脚本有执行权限
chmod +x init-mo-db.sh

# 初始化数据库
./init-mo-db.sh
```

### 3. 配置环境变量

复制并配置环境变量文件：

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和 AI API 密钥
```

### 4. 启动 PromotionAI 服务

运行启动脚本来启动所有服务：

```bash
# 确保脚本有执行权限
chmod +x start-promotionai-with-existing-services.sh

# 启动服务
./start-promotionai-with-existing-services.sh
```

### 5. 验证服务状态

检查所有服务是否正常运行：

```bash
# 查看 Docker 容器状态
docker ps --filter name=promotionai

# 检查特定服务日志
docker logs promotionai-api-gateway
```

## 访问服务

启动完成后，您可以通过以下 URL 访问服务：

1. **API 网关**: http://localhost:3030
2. **资讯采集**: http://localhost:3031
3. **AI 处理**: http://localhost:3032
4. **渠道分发**: http://localhost:3033
5. **埋点追踪**: http://localhost:3034

## 健康检查

要验证所有服务是否正常运行：

```bash
# 检查 API 网关健康状态
curl http://localhost:3030/health

# 检查各服务健康状态
curl http://localhost:3031/health
curl http://localhost:3032/health
curl http://localhost:3033/health
curl http://localhost:3034/health
```

## 停止服务

如需停止所有服务：

```bash
# 停止所有 PromotionAI 相关容器
docker stop $(docker ps -q --filter name=promotionai)

# 或者删除容器
docker rm $(docker ps -aq --filter name=promotionai)

# 或使用 Docker Compose
docker compose -f docker-compose.with-existing-redis.yml down
```

## 故障排除

### 端口被占用
如果遇到端口被占用的错误，请确保没有其他服务占用 3030-3034 端口：

```bash
# 检查端口占用
lsof -i :3030
lsof -i :3031
lsof -i :3032
lsof -i :3033
lsof -i :3034
```

### 服务无法启动
检查 Docker 是否正常运行：
```bash
sudo systemctl status docker
```

### 数据库连接失败
确认 PostgreSQL 服务运行在 localhost:5432 端口：
```bash
psql -h localhost -p 5432 -U postgres -c "SELECT version();"
```

### Redis 连接失败
确认 Redis 服务运行在 localhost:6379 端口：
```bash
redis-cli -h localhost -p 6379 ping
```

## 环境要求

- Docker
- Docker Compose
- PostgreSQL (运行在 5432 端口)
- Redis (运行在 6379 端口)
- Node.js 18+

## 支持

如需进一步支持，请参考：
- [PORT_CONFIG.md](PORT_CONFIG.md) - 端口配置详情
- [SERVICE_CONFIG.md](SERVICE_CONFIG.md) - 服务配置
- [DEPLOYMENT.md](DEPLOYMENT.md) - 部署指南
