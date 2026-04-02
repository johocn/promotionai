#!/bin/bash
# install-dependencies.sh - 简化版依赖安装脚本

echo "📦 开始安装 PromotionAI 项目依赖..."

# 安装根目录依赖
echo "📦 安装根目录依赖..."
cd /home/admin/.openclaw/workspace/PromotionAI
npm install --save axios dotenv moment node-cron pg redis uuid winston

# 为每个服务安装基本依赖
SERVICES=("api-gateway" "collector" "ai-processor" "publisher" "tracker")

for service in "${SERVICES[@]}"; do
    echo "📦 安装 $service 服务依赖..."
    cd "src/$service"
    
    # 更新package.json以使用正确的依赖
    if [ "$service" = "api-gateway" ]; then
        npm install express cors helmet express-rate-limit express-validator axios jsonwebtoken jwks-rsa dotenv winston prom-client http-proxy-middleware
    elif [ "$service" = "collector" ]; then
        npm install express axios cheerio "rss-parser" node-cron puppeteer pg redis dotenv winston moment url "valid-url"
    elif [ "$service" = "ai-processor" ]; then
        npm install express openai axios pg redis dotenv winston moment lodash zod node-cache
    elif [ "$service" = "publisher" ]; then
        npm install express axios pg redis dotenv winston moment node-cron shortid crypto
    elif [ "$service" = "tracker" ]; then
        npm install express mongoose mongodb pg redis dotenv winston moment uuid shortid "user-agents"
    fi
    
    cd ../..
done

echo "✅ 所有依赖安装完成！"
echo ""
echo "🔍 接下来可以运行："
echo "   1. 配置环境变量: cp .env.example .env # 然后编辑 .env 文件"
echo "   2. 初始化数据库: node scripts/init-db.js"
echo "   3. 运行迁移脚本: node scripts/migrate.js"
echo "   4. 启动开发环境: ./start-dev-env.sh"