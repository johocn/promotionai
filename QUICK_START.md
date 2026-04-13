# PromotionAI 快速启动指南

## 概述

本指南将帮助您快速启动PromotionAI服务，服务将通过www.joyogo.com域名的不同路径访问。

## 服务映射

通过www.joyogo.com域名访问的服务：

- **API网关**: `www.joyogo.com/moapi` → 内部端口 `3010`
- **健康检查**: `www.joyogo.com/mojk` → 内部端口 `3015`
- **资讯采集**: `www.joyogo.com/mozx` → 内部端口 `3011`
- **AI处理**: `www.joyogo.com/moai` → 内部端口 `3012`
- **内容分发**: `www.joyogo.com/monr` → 内部端口 `3013`
- **追踪服务**: `www.joyogo.com/mozz` → 内部端口 `3014`

## 启动步骤

### 1. 确认现有服务

首先，确认现有的数据库和Redis服务正在运行：

```bash
# 检查PostgreSQL是否运行
psql -h localhost -p 5432 -U postgres -c "SELECT version();" 

# 检查Redis是否运行
redis-cli -h localhost -p 6379 ping
```

### 2. 初始化数据库

如果"mo"数据库不存在，使用现有数据库创建新的"mo"数据库：

```bash
# 确保脚本有执行权限
chmod +x init-mo-db.sh

# 初始化mo数据库
./init-mo-db.sh
```

### 3. 配置nginx反向代理

将nginx配置应用到您的nginx服务器：

```bash
# 复nginx配置到nginx目录
sudo cp nginx-config.conf /etc/nginx/sites-available/promotionai.conf

# 创建软链接启用站点
sudo ln -s /etc/nginx/sites-available/promotionai.conf /etc/nginx/sites-enabled/

# 测试nginx配置
sudo nginx -t

# 重启nginx
sudo systemctl reload nginx
```

### 4. 启动PromotionAI服务

运行启动脚本来启动所有服务，连接到现有的数据库和Redis：

```bash
# 确保脚本有执行权限
chmod +x start-promotionai-with-existing-services.sh

# 启动服务
./start-promotionai-with-existing-services.sh
```

### 5. 验证服务状态

检查所有服务是否正常运行：

```bash
# 查看Docker容器状态
docker ps --filter name=promotionai

# 检查特定服务日志
docker logs promotionai-api-gateway
```

## 访问服务

启动完成后，您可以通过以下URL访问服务：

1. **API网关**: http://www.joyogo.com/moapi
2. **健康检查**: http://www.joyogo.com/mojk
3. **资讯采集**: http://www.joyogo.com/mozx
4. **AI处理**: http://www.joyogo.com/moai
5. **内容分发**: http://www.joyogo.com/monr
6. **追踪服务**: http://www.joyogo.com/mozz

## 健康检查

要验证所有服务是否正常运行，可以访问健康检查端点：

```bash
curl http://www.joyogo.com/mojk
```

## 停止服务

如需停止所有服务：

```bash
# 偂止所有PromotionAI相关容器
docker stop $(docker ps -q --filter name=promotionai)

# 或者删除容器
docker rm $(docker ps -aq --filter name=promotionai)
```

## 故障排除

### 端口被占用
如果遇到端口被占用的错误，请确保没有其他服务占用3010-3015端口。

### 服务无法启动
检查Docker是否正常运行：
```bash
sudo systemctl status docker
```

### 数据库连接失败
确认PostgreSQL服务运行在localhost:5432端口：
```bash
psql -h localhost -p 5432 -U postgres -c "SELECT version();"
```

### Redis连接失败
确认Redis服务运行在localhost:6379端口：
```bash
redis-cli -h localhost -p 6379 ping
```

### nginx配置错误
检查nginx配置语法：
```bash
sudo nginx -t
```

## 环境要求

- Docker
- PostgreSQL (运行在5432端口)
- Redis (运行在6379端口)
- nginx
- 服务器上配置了www.joyogo.com域名

## 支持

如需进一步支持，请参考SERVICE_CONFIG.md文档或联系开发团队。