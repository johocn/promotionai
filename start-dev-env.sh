#!/bin/bash
# start-dev-env.sh

# PromotionAI 开发环境启动脚本

set -e  # 遇到错误立即退出

echo "🚀 Starting PromotionAI Development Environment..."

# 检查必要的环境变量
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found. Creating from example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "   Created .env from .env.example - please update with your actual values"
    else
        echo "   ERROR: Neither .env nor .env.example found"
        exit 1
    fi
fi

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

echo "✅ Node.js and npm are available"

# 安装根目录依赖
echo "📦 Installing root dependencies..."
npm install

# 为每个服务安装依赖
SERVICES=("api-gateway" "collector" "ai-processor" "publisher" "tracker")

for service in "${SERVICES[@]}"; do
    echo "📦 Installing dependencies for $service service..."
    cd "src/$service"
    npm install
    cd ../..
done

# 初始化数据库
echo "🗄️  Initializing database..."
node scripts/init-db.js

# 运行数据库迁移
echo "🔄 Running database migrations..."
node scripts/migrate.js

# 启动开发环境
echo "🏗️  Starting development services..."

# 启动各个服务（在后台运行）
echo "   Starting API Gateway..."
cd src/api-gateway && npm run dev > ../../logs/api-gateway.log 2>&1 & 
API_PID=$!
cd ../..

echo "   Starting News Collector..."
cd src/collector && npm run dev > ../../logs/collector.log 2>&1 &
COLLECTOR_PID=$!
cd ../..

echo "   Starting AI Processor..."
cd src/ai-processor && npm run dev > ../../logs/ai-processor.log 2>&1 &
AI_PID=$!
cd ../..

echo "   Starting Content Publisher..."
cd src/publisher && npm run dev > ../../logs/publisher.log 2>&1 &
PUBLISHER_PID=$!
cd ../..

echo "   Starting Tracking Service..."
cd src/tracker && npm run dev > ../../logs/tracker.log 2>&1 &
TRACKER_PID=$!
cd ../..

# 等待服务启动
echo "⏳ Waiting for services to start..."
sleep 10

# 检查服务是否正常运行
echo "🔍 Checking service health..."

check_service() {
    local port=$1
    local name=$2
    if curl -sf http://localhost:$port/health > /dev/null 2>&1; then
        echo "   ✅ $name is healthy"
    else
        echo "   ❌ $name is not responding"
    fi
}

check_service $(grep -o 'PORT.*=' .env | grep -o '[0-9]*' | head -n1 || echo 3000) "API Gateway"
check_service $(grep -o 'COLLECTOR_PORT.*=' .env | grep -o '[0-9]*' || echo 3001) "Collector"
check_service $(grep -o 'AI_PROCESSOR_PORT.*=' .env | grep -o '[0-9]*' || echo 3002) "AI Processor"
check_service $(grep -o 'PUBLISHER_PORT.*=' .env | grep -o '[0-9]*' || echo 3003) "Publisher"
check_service $(grep -o 'TRACKER_PORT.*=' .env | grep -o '[0-9]*' || echo 3004) "Tracker"

echo ""
echo "🎉 PromotionAI Development Environment Started Successfully!"
echo ""
echo "🔗 Services:"
echo "   API Gateway: http://localhost:$(grep -o 'PORT.*=[0-9]*' .env | cut -d'=' -f2 || echo 3000)"
echo "   Collector: http://localhost:$(grep -o 'COLLECTOR_PORT.*=[0-9]*' .env | cut -d'=' -f2 || echo 3001)"
echo "   AI Processor: http://localhost:$(grep -o 'AI_PROCESSOR_PORT.*=[0-9]*' .env | cut -d'=' -f2 || echo 3002)"
echo "   Publisher: http://localhost:$(grep -o 'PUBLISHER_PORT.*=[0-9]*' .env | cut -d'=' -f2 || echo 3003)"
echo "   Tracker: http://localhost:$(grep -o 'TRACKER_PORT.*=[0-9]*' .env | cut -d'=' -f2 || echo 3004)"
echo ""
echo "📊 Health Checks:"
echo "   API Gateway: http://localhost:$(grep -o 'PORT.*=[0-9]*' .env | cut -d'=' -f2 || echo 3000)/health"
echo "   Collector: http://localhost:$(grep -o 'COLLECTOR_PORT.*=[0-9]*' .env | cut -d'=' -f2 || echo 3001)/health"
echo "   AI Processor: http://localhost:$(grep -o 'AI_PROCESSOR_PORT.*=[0-9]*' .env | cut -d'=' -f2 || echo 3002)/health"
echo "   Publisher: http://localhost:$(grep -o 'PUBLISHER_PORT.*=[0-9]*' .env | cut -d'=' -f2 || echo 3003)/health"
echo "   Tracker: http://localhost:$(grep -o 'TRACKER_PORT.*=[0-9]*' .env | cut -d'=' -f2 || echo 3004)/health"
echo ""
echo "📋 Management:"
echo "   View logs: tail -f logs/*.log"
echo "   Stop services: kill $API_PID $COLLECTOR_PID $AI_PID $PUBLISHER_PID $TRACKER_PID"
echo ""

# 保持脚本运行
echo "Press Ctrl+C to stop all services..."
trap "echo 'Stopping all services...'; kill $API_PID $COLLECTOR_PID $AI_PID $PUBLISHER_PID $TRACKER_PID 2>/dev/null; exit 0" INT TERM

# 等待信号
wait $API_PID $COLLECTOR_PID $AI_PID $PUBLISHER_PID $TRACKER_PID 2>/dev/null