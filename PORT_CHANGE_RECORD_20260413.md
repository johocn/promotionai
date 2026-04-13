# PromotionAI 端口变更记录

## 变更时间
2026-04-13 22:34 GMT+8

## 变更原因
统一服务端口配置，采用更清晰的端口规划和 API 前缀。

## 变更内容

### 原端口配置 (301x)
| 服务名称 | 原端口 | 原 API 前缀 |
|---------|-------|-----------|
| API 网关 | 3010 | /moapi |
| 健康检查 | 3015 | /mojk |
| 资讯采集 | 3011 | /mozx |
| AI 处理 | 3012 | /moai |
| 内容分发 | 3013 | /monr |
| 追踪服务 | 3014 | /mozz |

### 新端口配置 (303x)
| 服务名称 | 新端口 | 新 API 前缀 | 说明 |
|---------|-------|-----------|------|
| API 网关 | 3030 | `/api` | 统一入口、认证、路由 |
| 资讯采集 | 3031 | `/collector` | 资讯爬虫、RSS 订阅 |
| AI 处理 | 3032 | `/ai-processor` | 内容生成、质量评估 |
| 渠道分发 | 3033 | `/publisher` | 多渠道发布 |
| 埋点追踪 | 3034 | `/tracker` | 链接生成、数据分析 |

## 更新文件清单

### 配置文件
- ✅ `docker-compose.with-existing-redis.yml` - Docker Compose 端口映射
- ✅ `.env` - 环境变量配置（已配置为 303x）
- ✅ `nginx-config.conf` - Nginx 反向代理配置

### 文档文件
- ✅ `PORT_CONFIG.md` - 端口配置文档
- ✅ `QUICK_START.md` - 快速启动指南
- ✅ `README.md` - 项目说明
- ✅ `SERVICE_CONFIG.md` - 服务配置文档

### 脚本文件
- ✅ `start-promotionai-with-existing-services.sh` - 启动脚本

## 影响范围

### 需要更新的内容
1. **前端配置** - 如使用硬编码端口，需更新为 3030
2. **API 调用** - 所有 API 请求需使用新端口和路径
3. **Nginx 配置** - 已更新，需重新加载 nginx

### 无需更新的内容
- 数据库连接配置（保持不变）
- Redis 连接配置（保持不变）
- 服务内部通信逻辑

## 迁移步骤

### 1. 停止旧服务
```bash
cd /home/admin/.openclaw/workspace/promotionai
docker compose -f docker-compose.with-existing-redis.yml down
```

### 2. 拉取最新代码
```bash
git pull origin main
```

### 3. 启动新服务
```bash
./start-promotionai-with-existing-services.sh
```

### 4. 验证服务
```bash
# 检查服务状态
docker ps --filter name=promotionai

# 健康检查
curl http://localhost:3030/health
curl http://localhost:3031/health
curl http://localhost:3032/health
curl http://localhost:3033/health
curl http://localhost:3034/health
```

### 5. 更新 Nginx 配置（如使用域名访问）
```bash
sudo cp nginx-config.conf /etc/nginx/sites-available/promotionai.conf
sudo ln -sf /etc/nginx/sites-available/promotionai.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 验证清单

- [ ] 所有服务正常启动
- [ ] 端口 3030-3034 可访问
- [ ] API 网关健康检查通过
- [ ] 各微服务健康检查通过
- [ ] Nginx 配置正确（如使用）
- [ ] 前端连接正常（如已部署）

## 回滚方案

如需回滚到原端口配置 (301x)：

```bash
# 1. 停止服务
docker compose -f docker-compose.with-existing-redis.yml down

# 2. 恢复配置文件
git checkout HEAD~1 docker-compose.with-existing-redis.yml
git checkout HEAD~1 nginx-config.conf
git checkout HEAD~1 start-promotionai-with-existing-services.sh

# 3. 重新启动
./start-promotionai-with-existing-services.sh
```

## 备注

- 端口变更不影响数据库和 Redis 连接
- 服务内部逻辑无需修改
- 主要影响外部访问端口和 API 路径

---

**变更记录人**: AI Assistant  
**审核状态**: ✅ 已完成
