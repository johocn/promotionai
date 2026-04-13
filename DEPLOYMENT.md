# PromotionAI 部署指南

## 部署架构

PromotionAI采用微服务架构，包含5个核心服务，支持容器化部署。

## 环境要求

### 生产环境最低配置
- **CPU**: 4核以上
- **内存**: 16GB以上
- **存储**: 100GB以上可用空间
- **网络**: 稳定的互联网连接
- **操作系统**: Linux (Ubuntu 18.04+ / CentOS 7+)

### 依赖组件
- **Docker**: 20.0+
- **Docker Compose**: 2.0+
- **PostgreSQL**: 15.0+
- **Redis**: 7.0+

## 部署步骤

### 1. 环境准备
```bash
# 克隆代码仓库
git clone git@github.com:johocn/promotionai.git
cd promotionai

# 安装Docker (如果未安装)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
sudo systemctl enable docker
sudo systemctl start docker

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. 配置环境变量
```bash
# 复制环境配置文件
cp .env.example .env
vi .env  # 根据实际情况修改配置
```

关键配置项说明：
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` - 数据库连接配置
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis连接配置
- `OPENAI_API_KEY` - OpenAI API密钥（可选，不设置则AI功能受限）
- `JWT_SECRET` - JWT密钥，用于认证
- `ENCRYPTION_KEY` - 数据加密密钥

### 3. 启动服务
```bash
# 构建并启动所有服务
docker-compose up -d

# 检查服务状态
docker-compose ps
```

### 4. 初始化数据库
```bash
# 运行数据库迁移
docker-compose exec api-gateway node /app/scripts/migrate.js
```

## 服务端口映射

- **API网关**: 3000 (外部访问端口)
- **资讯采集**: 3001 (内部服务)
- **AI处理**: 3002 (内部服务)
- **内容分发**: 3003 (内部服务)
- **追踪服务**: 3004 (内部服务)
- **PostgreSQL**: 5432 (内部服务)
- **Redis**: 6379 (内部服务)

## 监控和维护

### 服务状态检查
```bash
# 检查所有服务健康状态
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health

# 查看服务日志
docker-compose logs -f <service-name>
```

### 性能监控
- **指标收集**: Prometheus (端口 9090，通过docker-compose配置)
- **可视化**: Grafana (端口 3000，通过docker-compose配置)
- **应用指标**: http://localhost:3000/metrics

### 数据备份
```bash
# 备份数据库
docker-compose exec postgres pg_dump -U dev_user -d promotionai_dev > backup.sql

# 备份Redis数据
docker-compose exec redis redis-cli BGSAVE
```

## 故障排除

### 常见问题
1. **服务启动失败**: 检查端口冲突和依赖服务状态
2. **数据库连接失败**: 检查数据库服务是否正常运行
3. **API网关无法访问下游服务**: 检查网络配置和防火墙设置

### 日志位置
- **应用日志**: `./logs/` 目录下按服务分类
- **Docker日志**: 通过 `docker-compose logs` 命令查看

## 安全配置

### 认证和授权
- 所有API访问都需要JWT令牌
- 实施速率限制防止滥用
- 输入验证防止注入攻击

### 数据安全
- 敏感数据加密存储
- 传输过程使用HTTPS
- 定期安全扫描

## 扩容和维护

### 水平扩容
```bash
# 扩容某个服务的实例数
docker-compose up -d --scale <service>=<count>
```

### 版本升级
```bash
# 拉取最新代码
git pull origin main

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d
```

## 回滚策略

如遇重大问题，可使用以下步骤回滚：
```bash
# 停止当前服务
docker-compose down

# 恢复到上一个稳定版本
git checkout <previous-commit-hash>

# 重新构建和启动
docker-compose build
docker-compose up -d
```

## 联系支持

如需技术支持，请联系开发团队或参阅官方文档。