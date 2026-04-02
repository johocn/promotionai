#!/bin/bash
# start-promotionai-services.sh
# 按照指定端口启动PromotionAI服务

echo "🚀 启动 PromotionAI 服务到指定端口..."

# 设置环境变量
export DB_HOST=localhost
export DB_PORT=5435  # 使用备用端口
export DB_NAME=promotionai_prod
export DB_USER=prod_user
export DB_PASSWORD=prod_password
export REDIS_HOST=localhost
export REDIS_PORT=6381  # 使用备用端口
export NODE_ENV=production

echo "🔧 配置环境变量完成"

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "❌ 端口 $port 已被占用"
        return 1
    else
        echo "✅ 端口 $port 可用"
        return 0
    fi
}

# 检查所有需要的端口
echo "🔍 检查端口可用性..."
REQUIRED_PORTS=(3010 3011 3012 3013 3014 3015 5435 6381)
ALL_AVAILABLE=true

for port in "${REQUIRED_PORTS[@]}"; do
    if ! check_port $port; then
        ALL_AVAILABLE=false
    fi
done

if [ "$ALL_AVAILABLE" = false ]; then
    echo "⚠️  有些端口被占用，可能需要停止其他服务"
    echo "💡 建议先停止占用端口的服务，然后重新运行此脚本"
    exit 1
fi

echo "✅ 所需端口均可用，开始启动服务..."

# 启动数据库和缓存
echo "🐘 启动 PostgreSQL 数据库 (端口 5435)..."
docker run -d \
  --name promotionai-postgres \
  -e POSTGRES_DB=$DB_NAME \
  -e POSTGRES_USER=$DB_USER \
  -e POSTGRES_PASSWORD=$DB_PASSWORD \
  -p 5435:5432 \
  -v promotionai_postgres_data:/var/lib/postgresql/data \
  postgres:15

echo "💾 启动 Redis 缓存 (端口 6381)..."
docker run -d \
  --name promotionai-redis \
  -p 6381:6379 \
  -v promotionai_redis_data:/data \
  redis:7-alpine \
  redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru

# 等待数据库启动
echo "⏱️  等待数据库启动..."
sleep 10

# 启动各个服务
echo "🔗 启动 API 网关 (端口 3010)..."
docker run -d \
  --name promotionai-api-gateway \
  --link promotionai-postgres \
  --link promotionai-redis \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5435 \
  -e DB_NAME=$DB_NAME \
  -e DB_USER=$DB_USER \
  -e DB_PASSWORD=$DB_PASSWORD \
  -e REDIS_HOST=host.docker.internal \
  -e REDIS_PORT=6381 \
  -e NODE_ENV=$NODE_ENV \
  -e PORT=3000 \
  -p 3010:3000 \
  --network host \
  promotionai-api-gateway-test

echo "📥 启动资讯采集服务 (端口 3011)..."
docker run -d \
  --name promotionai-collector \
  --link promotionai-postgres \
  --link promotionai-redis \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5435 \
  -e DB_NAME=$DB_NAME \
  -e DB_USER=$DB_USER \
  -e DB_PASSWORD=$DB_PASSWORD \
  -e REDIS_HOST=host.docker.internal \
  -e REDIS_PORT=6381 \
  -e NODE_ENV=$NODE_ENV \
  -e PORT=3000 \
  -p 3011:3000 \
  --network host \
  promotionai-collector-test

echo "🤖 启动AI处理服务 (端口 3012)..."
docker run -d \
  --name promotionai-ai-processor \
  --link promotionai-postgres \
  --link promotionai-redis \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5435 \
  -e DB_NAME=$DB_NAME \
  -e DB_USER=$DB_USER \
  -e DB_PASSWORD=$DB_PASSWORD \
  -e REDIS_HOST=host.docker.internal \
  -e REDIS_PORT=6381 \
  -e NODE_ENV=$NODE_ENV \
  -e PORT=3000 \
  -p 3012:3000 \
  --network host \
  promotionai-ai-processor-test

echo "📤 启动内容分发服务 (端口 3013)..."
docker run -d \
  --name promotionai-publisher \
  --link promotionai-postgres \
  --link promotionai-redis \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5435 \
  -e DB_NAME=$DB_NAME \
  -e DB_USER=$DB_USER \
  -e DB_PASSWORD=$DB_PASSWORD \
  -e REDIS_HOST=host.docker.internal \
  -e REDIS_PORT=6381 \
  -e NODE_ENV=$NODE_ENV \
  -e PORT=3000 \
  -p 3013:3000 \
  --network host \
  promotionai-publisher-test

echo "👁️ 启动追踪服务 (端口 3014)..."
docker run -d \
  --name promotionai-tracker \
  --link promotionai-postgres \
  --link promotionai-redis \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5435 \
  -e DB_NAME=$DB_NAME \
  -e DB_USER=$DB_USER \
  -e DB_PASSWORD=$DB_PASSWORD \
  -e REDIS_HOST=host.docker.internal \
  -e REDIS_PORT=6381 \
  -e NODE_ENV=$NODE_ENV \
  -e PORT=3000 \
  -p 3014:3000 \
  --network host \
  promotionai-tracker-test

echo "✅ 所有服务已启动！"

# 显示服务状态
echo ""
echo "📋 服务状态："
docker ps --filter name=promotionai

echo ""
echo "🌐 访问地址："
echo "   API网关 (moapi): http://www.joyogo.com/moapi -> http://localhost:3010"
echo "   健康检查 (mojk): http://www.joyogo.com/mojk -> http://localhost:3015"
echo "   资讯采集 (mozx): http://www.joyogo.com/mozx -> http://localhost:3011"
echo "   AI处理 (moai): http://www.joyogo.com/moai -> http://localhost:3012"
echo "   内容分发 (monr): http://www.joyogo.com/monr -> http://localhost:3013"
echo "   追踪服务 (mozz): http://www.joyogo.com/mozz -> http://localhost:3014"

echo ""
echo "💡 提示：请确保nginx配置已更新以将路径映射到相应的本地端口"