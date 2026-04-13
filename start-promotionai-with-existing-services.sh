#!/bin/bash
# start-promotionai-with-existing-services.sh
# 使用现有数据库和 Redis 服务启动 PromotionAI 服务

echo "🚀 启动 PromotionAI 服务 (使用现有数据库和 Redis)..."
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

if ! command -v redis-cli &> /dev/null; then
    echo "⚠️  Redis 客户端 (redis-cli) 未安装，但将继续运行"
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

# 检查现有 Redis 连接
echo "🔗 检查现有 Redis 连接..."
if ! redis-cli -h localhost -p 6379 ping > /dev/null 2>&1; then
    echo "❌ 无法连接到现有 Redis 服务 (localhost:6379)"
    echo "💡 请确保 Redis 服务正在运行"
    exit 1
fi

echo "✅ 成功连接到现有 Redis 服务"

# 检查 mo 数据库是否存在
echo "🔍 检查 mo 数据库是否存在..."
DB_EXISTS=$(PGPASSWORD="${DB_PASSWORD:-postgres}" psql -h localhost -p 5432 -U "${DB_USER:-postgres}" -d postgres -t -c "SELECT 1 FROM pg_database WHERE datname = 'mo';" | tr -d ' \t\n\r')

if [ "$DB_EXISTS" != "1" ]; then
    echo "⚠️  mo 数据库不存在，正在创建..."
    ./init-mo-db.sh
else
    echo "✅ mo 数据库已存在"
fi

# 检查 mo_user 是否存在
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
export REDIS_PORT=6379
export REDIS_PASSWORD=${REDIS_PASSWORD}
export NODE_ENV=production

echo "🔧 环境变量配置完成"

# 检查端口可用性（只需要检查应用端口，不需要检查数据库和 Redis 端口）
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

echo "🔍 检查应用端口可用性..."
REQUIRED_PORTS=(3030 3031 3032 3033 3034)
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

# 不再启动 Redis 容器，直接使用现有 Redis 服务
echo "💡 使用现有 Redis 服务 (localhost:6379)，跳过 Redis 容器启动"

# 使用 Docker Compose 启动服务（不包含 Redis）
echo "🐳 使用 Docker Compose 启动服务（使用现有数据库和 Redis）..."
docker compose -f docker-compose.with-existing-redis.yml up -d

# 等待服务启动
echo "⏱️  等待服务启动..."
sleep 20

echo "✅ 所有服务已启动！"

# 显示服务状态
echo ""
echo "📋 服务状态："
docker compose -f docker-compose.with-existing-redis.yml ps

echo ""
echo "🌐 访问地址："
echo "   API 网关：http://localhost:3030"
echo "   资讯采集：http://localhost:3031"
echo "   AI 处理：http://localhost:3032"
echo "   渠道分发：http://localhost:3033"
echo "   埋点追踪：http://localhost:3034"

echo ""
echo "🔧 如需停止服务：docker compose -f docker-compose.with-existing-redis.yml down"
echo ""
echo "📊 服务使用现有数据库 (localhost:5432) 和现有 Redis (localhost:6379)"
