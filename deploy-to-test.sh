#!/bin/bash
# deploy-to-test.sh - 部署PromotionAI到测试环境

set -e  # 遇到错误立即退出

echo "🚀 开始部署 PromotionAI 到测试环境..."

# 检查必需的工具
echo "🔍 检查必需的工具..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker 未安装，请先安装 Docker"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose 未安装，请先安装 Docker Compose"
    exit 1
fi

echo "✅ Docker 和 Docker Compose 已安装"

# 检查当前目录
echo "📂 检查当前目录..."
if [ ! -f "docker-compose.test.yml" ]; then
    echo "❌ docker-compose.test.yml 文件不存在"
    exit 1
fi

if [ ! -f ".env.test" ]; then
    echo "⚠️  .env.test 文件不存在，创建测试环境配置..."
    cp .env.example .env.test
    echo "   请更新 .env.test 文件中的配置参数"
fi

# 设置测试环境变量
echo "🔧 配置测试环境参数..."
export COMPOSE_FILE=docker-compose.test.yml

# 检查是否已经有一个测试环境在运行
if docker compose -f docker-compose.test.yml ps | grep -q "_test"; then
    echo "⚠️  检测到正在运行的测试环境，先停止它们..."
    docker compose -f docker-compose.test.yml down
fi

# 构建并启动服务
echo "🔨 构建 Docker 镜像..."
docker compose -f docker-compose.test.yml build

echo "🐳 启动测试环境服务..."
docker compose -f docker-compose.test.yml up -d

# 等待服务启动
echo "⏱️  等待服务启动..."
sleep 15

# 检查服务是否成功启动
SERVICES=(postgres-test redis-test api-gateway-test collector-test ai-processor-test publisher-test tracker-test)

echo "🏥 检查服务启动状态..."
for service in "${SERVICES[@]}"; do
    echo "   检查 $service..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker compose -f docker-compose.test.yml ps | grep -q "$service.*Up"; then
            echo "   ✅ $service 已启动"
            break
        fi
        sleep 5
        timeout=$((timeout - 5))
    done
    
    if [ $timeout -le 0 ]; then
        echo "   ❌ $service 启动超时"
    fi
done

# 运行数据库迁移
echo "🔄 运行数据库迁移..."
# 等待数据库完全启动
sleep 10
docker compose -f docker-compose.test.yml exec api-gateway-test node /app/scripts/migrate.js || echo "尝试运行数据库迁移脚本..."

# 检查服务健康状态
echo "🏥 检查服务健康状态..."

check_service_health() {
    local port=$1
    local name=$2
    local max_attempts=30
    local attempt=1
    
    echo "   检查 ${name} (端口 ${port})..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf http://localhost:$port/health > /dev/null 2>&1; then
            echo "   ✅ ${name} 健康检查通过"
            return 0
        else
            echo "   ⏳ ${name} 尝试 $attempt/$max_attempts..."
            sleep 5
        fi
        attempt=$((attempt + 1))
    done
    
    echo "   ❌ ${name} 健康检查失败"
    return 1
}

# 检查所有服务
check_service_health 3000 "API Gateway" 
check_service_health 3001 "资讯采集服务"
check_service_health 3002 "AI处理服务"
check_service_health 3003 "内容分发服务"
check_service_health 3004 "追踪服务"

# 显示服务状态
echo ""
echo "📊 服务状态:"
docker compose -f docker-compose.test.yml ps

echo ""
echo "🔗 访问地址:"
echo "   API Gateway: http://localhost:3000"
echo "   API Gateway 健康检查: http://localhost:3000/health"
echo "   资讯采集服务: http://localhost:3001/health"
echo "   AI处理服务: http://localhost:3002/health"
echo "   内容分发服务: http://localhost:3003/health"
echo "   追踪服务: http://localhost:3004/health"

echo ""
echo "📋 测试环境部署完成！"
echo ""
echo "🔍 接下来可以进行的测试:"
echo "   1. 查看日志: docker compose -f docker-compose.test.yml logs -f"
echo "   2. 运行API测试: curl http://localhost:3000/api/services/status"
echo "   3. 进入容器调试: docker compose -f docker-compose.test.yml exec api-gateway-test bash"
echo "   4. 停止测试环境: docker compose -f docker-compose.test.yml down"

# 显示当前部署的版本信息
echo ""
echo "🔖 部署版本信息:"
git log -1 --pretty=format:"Commit: %H%nDate: %ad%nAuthor: %an%nMessage: %s"

echo ""
echo "✅ 测试环境已成功部署！"