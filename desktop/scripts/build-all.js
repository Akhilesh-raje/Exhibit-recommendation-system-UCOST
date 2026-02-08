#!/usr/bin/env node

/**
 * Build script for desktop app
 * Builds all services and prepares for packaging
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '../..');

console.log('🚀 Building UCOST Discovery Hub Desktop App...\n');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, cwd = projectRoot) {
  try {
    log(`Running: ${command}`, 'blue');
    execSync(command, {
      cwd,
      stdio: 'inherit',
      shell: true
    });
    return true;
  } catch (error) {
    log(`Error: ${error.message}`, 'red');
    return false;
  }
}

async function build() {
  log('\n📦 Step 1: Building Frontend...', 'bright');
  const frontendPath = path.join(projectRoot, 'project/frontend/ucost-discovery-hub');
  if (!fs.existsSync(frontendPath)) {
    log('Frontend directory not found!', 'red');
    return false;
  }
  if (!exec('npm run build', frontendPath)) {
    log('Frontend build failed!', 'red');
    return false;
  }
  log('✅ Frontend built successfully', 'green');

  log('\n📦 Step 2: Building Backend...', 'bright');
  const backendPath = path.join(projectRoot, 'project/backend/backend');
  if (!fs.existsSync(backendPath)) {
    log('Backend directory not found!', 'red');
    return false;
  }
  if (!exec('npm run build', backendPath)) {
    log('Backend build failed!', 'red');
    return false;
  }

  log('🛠️ Generating Prisma Client...', 'bright');
  if (!exec('npx prisma generate', backendPath)) {
    log('Prisma client generation failed!', 'red');
    return false;
  }
  log('✅ Backend built and Prisma client generated successfully', 'green');

  log('\n📦 Step 3: Building Chatbot...', 'bright');
  const chatbotPath = path.join(projectRoot, 'project/chatbot-mini');
  if (!fs.existsSync(chatbotPath)) {
    log('Chatbot directory not found!', 'red');
    return false;
  }
  if (!exec('npm run build', chatbotPath)) {
    log('Chatbot build failed!', 'red');
    return false;
  }
  log('✅ Chatbot built successfully', 'green');

  log('\n✅ All services built successfully!', 'green');
  log('\n📦 Ready for packaging. Run: npm run package', 'bright');
  return true;
}

// Run build
build().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  log(`Fatal error: ${error.message}`, 'red');
  process.exit(1);
});

