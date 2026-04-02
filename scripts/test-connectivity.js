// scripts/test-connectivity.js

require('dotenv').config();
const { Client } = require('pg');
const redis = require('redis');

async function testConnectivity() {
  console.log('🔍 Testing service connectivity...\n');

  let allTestsPassed = true;

  // Test PostgreSQL connection
  try {
    console.log('🧪 Testing PostgreSQL connection...');
    const dbClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'dev_user',
      password: process.env.DB_PASSWORD || 'dev_password',
      database: process.env.DB_NAME || 'promotionai_dev'
    });

    await dbClient.connect();
    const result = await dbClient.query('SELECT NOW() as timestamp, version() as version');
    console.log(`   ✅ PostgreSQL connected successfully`);
    console.log(`   📅 Timestamp: ${result.rows[0].timestamp.toISOString()}`);
    console.log(`   🔢 Version: ${result.rows[0].version.split(' ')[0]}`);
    await dbClient.end();
  } catch (err) {
    console.error(`   ❌ PostgreSQL connection failed: ${err.message}`);
    allTestsPassed = false;
  }

  // Test Redis connection
  try {
    console.log('\n🧪 Testing Redis connection...');
    const redisClient = redis.createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD
    });

    redisClient.on('error', (err) => {
      console.error(`   ❌ Redis Client Error: ${err.message}`);
    });

    await redisClient.connect();
    await redisClient.set('connectivity-test', 'ok', { EX: 60 }); // Set a test key
    const value = await redisClient.get('connectivity-test');
    console.log(`   ✅ Redis connected successfully`);
    console.log(`   🏷️  Test key/value: connectivity-test/${value}`);
    await redisClient.disconnect();
  } catch (err) {
    console.error(`   ❌ Redis connection failed: ${err.message}`);
    allTestsPassed = false;
  }

  // Test basic service endpoints
  const services = [
    { name: 'API Gateway', port: process.env.PORT || 3000, path: '/health' },
    { name: 'Collector', port: process.env.COLLECTOR_PORT || 3001, path: '/health' },
    { name: 'AI Processor', port: process.env.AI_PROCESSOR_PORT || 3002, path: '/health' },
    { name: 'Publisher', port: process.env.PUBLISHER_PORT || 3003, path: '/health' },
    { name: 'Tracker', port: process.env.TRACKER_PORT || 3004, path: '/health' }
  ];

  console.log('\n🧪 Testing service endpoints...');
  const axios = (await import('axios')).default;

  for (const service of services) {
    try {
      const url = `http://localhost:${service.port}${service.path}`;
      const response = await axios.get(url, { timeout: 5000 });
      
      if (response.status === 200) {
        console.log(`   ✅ ${service.name} (${url}): ${response.status} OK`);
      } else {
        console.log(`   ⚠️  ${service.name} (${url}): ${response.status} (not running)`);
      }
    } catch (err) {
      console.log(`   ❌ ${service.name} (${url}): Unreachable (${err.code || err.message})`);
    }
  }

  console.log('\n---');
  if (allTestsPassed) {
    console.log('🎉 All connectivity tests passed!');
  } else {
    console.log('⚠️  Some connectivity tests failed.');
  }

  return allTestsPassed;
}

// Run tests
if (require.main === module) {
  testConnectivity().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
  });
}

module.exports = testConnectivity;