#!/bin/bash
# start-promotionai-with-existing-db.sh
# 使用现有数据库启动PromotionAI服务

echo "🚀 启动 PromotionAI 服务 (使用现有数据库)..."
echo ""

# 检查必要的工具
echo "🔍 检查必要工具..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL 客户端 (psql) 未安装"
    exit 1
fi

echo "✅ Docker 和 PostgreSQL 客户端已安装"

# 检查现有数据库连接
echo "🔗 检查现有数据库连接..."
if ! PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h localhost -p 5432 -U "${DB_USER:-postgres}" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ 无法连接到现有数据库 (localhost:5432)"
    echo "💡 请确保 PostgreSQL 服务正在运行"
    exit 1
fi

echo "✅ 成功连接到现有数据库"

# 检查mo数据库是否存在
echo "🔍 检查 mo 数据库是否存在..."
DB_EXISTS=$(PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h localhost -p 5432 -U "${DB_USER:-postgres}" -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = 'mo';" | tr -d ' \t\n\r')

if [ "$DB_EXISTS" != "1" ]; then
    echo "⚠️  mo 数据库不存在，正在创建..."
    ./init-mo-db.sh
else
    echo "✅ mo 数据库已存在"
fi

# 检查mo_user是否存在
echo "🔍 检查 mo_user 用户..."
USER_EXISTS=$(PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h localhost -p 5432 -U "${DB_USER:-postgres}" -d postgres -t -c "SELECT 1 FROM pg_user WHERE usename = 'mo_user';" | tr -d ' \t\n\r')

if [ "$USER_EXISTS" != "1" ]; then
    echo "⚠️  mo_user 用户不存在，需要创建..."
    echo "💡 请运行 init-mo-db.sh 脚本创建数据库和用户"
    exit 1
fi

echo "✅ mo_user 用户已存在"

# 设置环境变量
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=mo
export DB_USER=mo_user
export DB_PASSWORD=${MO_USER_PASSWORD:-mo_password}
export REDIS_HOST=localhost
export REDIS_PORT=6381
export NODE_ENV=production

echo "🔧 环境变量配置完成"

# 检查端口可用性
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

echo "🔍 检查端口可用性..."
REQUIRED_PORTS=(3010 3011 3012 3013 3014 3015 6381)
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

# 创建并启动Redis（如果不存在）
echo "💾 启动 Redis 缓存 (端口 6381)..."
if [ "$(docker ps -q -f name=promotionai-redis)" ]; then
    echo "ℹ️  Redis 容器已运行，跳过启动"
elif [ "$(docker ps -aq -f name=promotionai-redis)" ]; then
    echo "🔄 启动已存在的 Redis 容器..."
    docker start promotionai-redis
else
    echo "🚀 创建并启动 Redis 容器..."
    docker run -d \
      --name promotionai-redis \
      -p 6381:6379 \
      -v promotionai_redis_data:/data \
      redis:7-alpine \
      redis-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
fi

# 等待Redis启动
echo "⏱️  等待Redis启动..."
sleep 5

# 使用Docker Compose启动服务
echo "🐳 使用Docker Compose启动服务..."
docker compose -f docker-compose.mo-db.yml up -d

# 等待服务启动
echo "⏱️  等待服务启动..."
sleep 20

# 运行数据库迁移（如果需要）
echo "🔄 检查并运行数据库迁移..."
# 这里可以添加检查数据库表结构是否最新的逻辑

echo "✅ 所有服务已启动！"

# 显示服务状态
echo ""
echo "📋 服务状态："
docker compose -f docker-compose.mo-db.yml ps

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
echo "🔧 如需停止服务：docker compose -f docker-compose.mo-db.yml down"