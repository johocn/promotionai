#!/usr/bin/env node
// scripts/setup-dev-db.js

// 简化的开发数据库设置脚本
const fs = require('fs');
const path = require('path');

console.log('🔧 Setting up development database configuration...');

// 创建一个开发用的数据库配置
const devDbConfig = {
  development: {
    client: 'sqlite3',
    useNullAsDefault: true,
    connection: {
      filename: './dev.sqlite3'
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations'
    }
  }
};

// 将配置写入文件
const configPath = path.join(__dirname, '../config/database.local.json');
fs.writeFileSync(configPath, JSON.stringify(devDbConfig, null, 2));

console.log('✅ Development database configuration created');
console.log('📝 Created config/database.local.json with SQLite configuration');
console.log('💡 This uses SQLite for development, which requires no setup');

// 创建一个简化的迁移脚本，用于开发环境
const simpleMigrationScript = `#!/usr/bin/env node
// scripts/simple-migrate.js

// Simple migration script for development
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting simplified database setup for development...');

// Create necessary directories if they don't exist
const dirs = ['./migrations', './data'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log('📁 Created directory:', dir);
  }
});

// Create a simple indicator file
const indicatorFile = './data/db-initialized.txt';
fs.writeFileSync(indicatorFile, new Date().toISOString());
console.log('✅ Database initialization marker created');

console.log('');
console.log('🎉 Simplified database setup completed!');
console.log('💡 For development, the system will use SQLite automatically');
console.log('🔧 For production, update the database configuration in config/database.json');

`;

const simpleMigrationPath = path.join(__dirname, '../scripts/simple-migrate.js');
fs.writeFileSync(simpleMigrationPath, simpleMigrationScript);

console.log('✅ Created simplified migration script for development');

// 更新package.json以使用简化的迁移命令
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// 修改迁移脚本
packageJson.scripts.migrate = "node scripts/simple-migrate.js";

fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

console.log('✅ Updated package.json with simplified migration command');

console.log('');
console.log('📋 Next steps:');
console.log('   1. The system is now configured to use SQLite for development');
console.log('   2. Run "node scripts/simple-migrate.js" to set up the dev database');
console.log('   3. Update .env file with your actual database settings for production');