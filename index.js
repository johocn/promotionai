// index.js - PromotionAI 项目的入口文件
require('dotenv').config();

console.log('🚀 PromotionAI - 智能促销系统');
console.log('📖 正在启动中...');

// 导出各个服务的启动函数
module.exports = {
  apiGateway: require('./src/api-gateway/server'),
  collector: require('./src/collector/server'),
  aiProcessor: require('./src/ai-processor/server'),
  publisher: require('./src/publisher/server'),
  tracker: require('./src/tracker/server')
};

console.log('✅ PromotionAI 项目模块加载完成');
console.log('🔧 要启动开发环境，请运行: npm run dev');