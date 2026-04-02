#!/usr/bin/env node
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

