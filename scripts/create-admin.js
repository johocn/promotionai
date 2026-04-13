#!/usr/bin/env node
/**
 * 创建管理员账号脚本
 */

const { Client } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: './.env' });

async function createAdmin() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'promotionai_user',
    password: process.env.DB_PASSWORD || 'Moto2024!Mast',
    database: process.env.DB_NAME || 'promotionai'
  });

  try {
    await client.connect();
    console.log('✅ 已连接到数据库\n');

    // 默认管理员账号
    const username = 'admin';
    const email = 'admin@promotionai.local';
    const password = 'Admin@2026!Promo';
    
    // 简单密码哈希（实际生产环境应使用 bcrypt）
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

    // 检查是否已存在
    const existing = await client.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  管理员账号已存在');
      console.log('   用户名：admin');
      console.log('   邮箱：admin@promotionai.local');
      console.log('   密码：Admin@2026!Promo');
      return;
    }

    // 创建管理员用户
    await client.query(
      `INSERT INTO users (username, email, password_hash, nickname, role, is_active)
       VALUES ($1, $2, $3, $4, $5, true)`,
      [username, email, passwordHash, '系统管理员', 'admin']
    );

    // 关联管理员角色
    const userResult = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    const userId = userResult.rows[0].id;
    
    const roleResult = await client.query('SELECT id FROM roles WHERE role_name = $1', ['admin']);
    const roleId = roleResult.rows[0].id;

    await client.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
      [userId, roleId]
    );

    console.log('✅ 管理员账号创建成功！\n');
    console.log('='.repeat(50));
    console.log('📋 登录信息:');
    console.log('   用户名：admin');
    console.log('   邮箱：admin@promotionai.local');
    console.log('   密码：Admin@2026!Promo');
    console.log('='.repeat(50));
    console.log('\n⚠️  请妥善保管密码，首次登录后建议修改！\n');

  } catch (err) {
    console.error('❌ 创建管理员失败:', err.message);
    throw err;
  } finally {
    await client.end();
  }
}

createAdmin().catch(console.error);
