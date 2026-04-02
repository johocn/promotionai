#!/bin/bash

# PromotionAI 项目启动脚本
# 用于启动完整的PromotionAI系统

set -e  # 遇到错误立即退出

echo "🚀 Starting PromotionAI System..."

# 检查必要的环境变量
if [ -z "$DB_HOST" ] || [ -z "$REDIS_URL" ] || [ -z "$MONGODB_URI" ]; then
    echo "❌ Environment variables not set. Please set DB_HOST, REDIS_URL, MONGODB_URI"
    exit 1
fi

echo "✅ Environment variables validated"

# 启动数据库服务（如果使用Docker Compose）
if [ -f "docker-compose.yml" ]; then
    echo "🐳 Starting database services..."
    docker-compose up -d postgres redis mongodb
    sleep 10  # 等待数据库启动
fi

# 运行数据库迁移
echo "🔄 Running database migrations..."
npm run migrate

# 启动各个微服务
echo "🏗️ Starting microservices..."

# 启动资讯采集服务
echo "  Starting News Collector Service..."
npm run start:collector &

# 启动AI处理服务
echo "  Starting AI Processor Service..."
npm run start:ai-processor &

# 启动内容分发服务
echo "  Starting Content Publisher Service..."
npm run start:publisher &

# 启动埋点追踪服务
echo "  Starting Tracking Service..."
npm run start:tracker &

# 启动API网关服务
echo "  Starting API Gateway Service..."
npm run start:api-gateway &

# 等待所有后台进程
echo "⏳ Waiting for services to start..."

sleep 15

# 检查服务状态
echo "🔍 Checking service health..."

# 检查API网关是否正常
if curl -f http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ API Gateway is healthy"
else
    echo "❌ API Gateway is not responding"
    exit 1
fi

# 检查数据库连接
echo "📋 Running connectivity tests..."
npm run test:connectivity

# 启动监控服务
echo "📊 Starting monitoring services..."
if [ -f "monitoring/grafana.ini" ]; then
    docker-compose -f monitoring/docker-compose.monitoring.yml up -d
fi

# 显示系统状态
echo ""
echo "🎉 PromotionAI System Started Successfully!"
echo ""
echo "🔗 Services:"
echo "   API Gateway: http://localhost:3000"
echo "   Admin Panel: http://localhost:3000/admin"
echo "   Metrics: http://localhost:3000/metrics"
echo "   Health Check: http://localhost:3000/health"
echo ""
echo "📊 Monitoring:"
echo "   Grafana: http://localhost:3000"
echo "   Prometheus: http://localhost:9090"
echo ""
echo "💡 Management Commands:"
echo "   Stop: npm run stop"
echo "   Restart: npm run restart"
echo "   Logs: npm run logs"
echo "   Status: npm run status"
echo ""

# 保持前台运行
wait