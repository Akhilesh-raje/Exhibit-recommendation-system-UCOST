/**
 * Complete Analysis Script for UCOST Desktop App
 * Checks all components, dependencies, configurations, and services
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  if (message === '' || message === undefined || message === null) {
    console.log('');
    return;
  }
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.resolve(__dirname, '../..', filePath);
  const exists = fs.existsSync(fullPath);
  if (exists) {
    log(`  ✓ ${description}`, 'green');
    return true;
  } else {
    log(`  ✗ ${description} - NOT FOUND: ${filePath}`, 'red');
    return false;
  }
}

function checkDirectory(dirPath, description) {
  const fullPath = path.resolve(__dirname, '../..', dirPath);
  const exists = fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  if (exists) {
    const files = fs.readdirSync(fullPath);
    log(`  ✓ ${description} (${files.length} items)`, 'green');
    return true;
  } else {
    log(`  ✗ ${description} - NOT FOUND: ${dirPath}`, 'red');
    return false;
  }
}

function checkPort(port, serviceName) {
  return new Promise((resolve) => {
    const net = require('net');
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => resolve(true));
      server.close();
    });
    server.on('error', () => resolve(false));
  });
}

async function checkService(port, serviceName) {
  const available = await checkPort(port, serviceName);
  if (available) {
    log(`  ✓ Port ${port} (${serviceName}) - Available`, 'green');
    return true;
  } else {
    log(`  ⚠ Port ${port} (${serviceName}) - In Use`, 'yellow');
    return false;
  }
}

async function checkHealth(url, serviceName, silent = false) {
  return new Promise((resolve) => {
    const http = require('http');
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      if (res.statusCode < 500) {
        if (!silent) {
          log(`  ✓ ${serviceName} - Responding (${res.statusCode})`, 'green');
        }
        resolve(true);
      } else {
        if (!silent) {
          log(`  ⚠ ${serviceName} - Error (${res.statusCode})`, 'yellow');
        }
        resolve(false);
      }
    });

    req.on('error', () => {
      if (!silent) {
        log(`  ✗ ${serviceName} - Not responding`, 'red');
      }
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      if (!silent) {
        log(`  ✗ ${serviceName} - Timeout`, 'red');
      }
      resolve(false);
    });

    req.end();
  });
}

async function checkNodeVersion() {
  return new Promise((resolve) => {
    const child = spawn('node', ['--version']);
    let output = '';
    child.stdout.on('data', (data) => output += data.toString());
    child.on('close', (code) => {
      if (code === 0) {
        const version = output.trim();
        const major = parseInt(version.replace('v', '').split('.')[0]);
        if (major >= 18) {
          log(`  ✓ Node.js: ${version} (Required: 18+)`, 'green');
          resolve(true);
        } else {
          log(`  ✗ Node.js: ${version} (Required: 18+)`, 'red');
          resolve(false);
        }
      } else {
        log(`  ✗ Node.js: Not found`, 'red');
        resolve(false);
      }
    });
  });
}

async function checkPythonVersion() {
  return new Promise((resolve) => {
    const child = spawn('python', ['--version']);
    let output = '';
    child.stdout.on('data', (data) => output += data.toString());
    child.stderr.on('data', (data) => output += data.toString());
    child.on('close', (code) => {
      if (code === 0) {
        const version = output.trim();
        const major = parseInt(version.split(' ')[1].split('.')[0]);
        const minor = parseInt(version.split(' ')[1].split('.')[1]);
        if (major > 3 || (major === 3 && minor >= 10)) {
          log(`  ✓ Python: ${version} (Required: 3.10+)`, 'green');
          resolve(true);
        } else {
          log(`  ✗ Python: ${version} (Required: 3.10+)`, 'red');
          resolve(false);
        }
      } else {
        log(`  ✗ Python: Not found`, 'red');
        resolve(false);
      }
    });
  });
}

async function main() {
  log('\n' + '='.repeat(70), 'cyan');
  log('  UCOST Discovery Hub - Complete System Analysis', 'bright');
  log('='.repeat(70) + '\n', 'cyan');

  let allChecks = [];
  let passedChecks = 0;
  let totalChecks = 0;

  // 1. Prerequisites
  log('1. PREREQUISITES', 'magenta');
  log('-'.repeat(70), 'cyan');
  totalChecks++;
  if (await checkNodeVersion()) passedChecks++;
  totalChecks++;
  if (await checkPythonVersion()) passedChecks++;
  log('');

  // 2. Desktop App Structure
  log('2. DESKTOP APP STRUCTURE', 'magenta');
  log('-'.repeat(70), 'cyan');
  const desktopFiles = [
    ['desktop/main.js', 'Main Electron process'],
    ['desktop/package.json', 'Desktop package.json'],
    ['desktop/src/config.js', 'Configuration module'],
    ['desktop/src/service-manager.js', 'Service manager'],
    ['desktop/src/window-manager.js', 'Window manager'],
    ['desktop/src/database-manager.js', 'Database manager'],
    ['desktop/src/frontend-server.js', 'Frontend server'],
    ['desktop/src/logger.js', 'Logger module'],
    ['desktop/src/env-setup.js', 'Environment setup'],
    ['desktop/src/env-validator.js', 'Environment validator'],
    ['desktop/src/prisma-manager.js', 'Prisma manager'],
    ['desktop/src/admin-seeder.js', 'Admin seeder'],
    ['desktop/src/frontend-config.js', 'Frontend config'],
    ['desktop/src/preload.js', 'Preload script'],
    ['desktop/src/splash.html', 'Splash screen'],
    ['desktop/build/icon.ico', 'App icon']
  ];

  desktopFiles.forEach(([file, desc]) => {
    totalChecks++;
    if (checkFile(file, desc)) passedChecks++;
  });
  log('');

  // 3. Service Directories
  log('3. SERVICE DIRECTORIES', 'magenta');
  log('-'.repeat(70), 'cyan');
  const serviceDirs = [
    ['project/backend/backend', 'Backend service'],
    ['project/frontend/ucost-discovery-hub', 'Frontend service'],
    ['project/chatbot-mini', 'Chatbot service'],
    ['project/embed-service', 'Embed service'],
    ['gemma/infer', 'Gemma service'],
    ['project/ocr-engine', 'OCR service']
  ];

  serviceDirs.forEach(([dir, desc]) => {
    totalChecks++;
    if (checkDirectory(dir, desc)) passedChecks++;
  });
  log('');

  // 4. Configuration Files
  log('4. CONFIGURATION FILES', 'magenta');
  log('-'.repeat(70), 'cyan');
  const configFiles = [
    ['project/backend/backend/package.json', 'Backend package.json'],
    ['project/frontend/ucost-discovery-hub/package.json', 'Frontend package.json'],
    ['project/chatbot-mini/package.json', 'Chatbot package.json'],
    ['project/backend/backend/prisma/schema.prisma', 'Prisma schema'],
    ['docs/exhibits.csv', 'Exhibits CSV data']
  ];

  configFiles.forEach(([file, desc]) => {
    totalChecks++;
    if (checkFile(file, desc)) passedChecks++;
  });
  log('');

  // 5. Dependencies
  log('5. DEPENDENCIES', 'magenta');
  log('-'.repeat(70), 'cyan');
  const depDirs = [
    ['desktop/node_modules', 'Desktop dependencies'],
    ['project/backend/backend/node_modules', 'Backend dependencies'],
    ['project/frontend/ucost-discovery-hub/node_modules', 'Frontend dependencies'],
    ['project/chatbot-mini/node_modules', 'Chatbot dependencies']
  ];

  depDirs.forEach(([dir, desc]) => {
    totalChecks++;
    if (checkDirectory(dir, desc)) passedChecks++;
    else {
      log(`    → Run: npm install in ${dir}`, 'yellow');
    }
  });
  log('');

  // 6. Port Availability
  log('6. PORT AVAILABILITY', 'magenta');
  log('-'.repeat(70), 'cyan');
  const ports = [
    [5000, 'Backend'],
    [5173, 'Frontend'],
    [4321, 'Chatbot'],
    [8001, 'Embed'],
    [8011, 'Gemma'],
    [8088, 'OCR']
  ];

  // Check which services are running first (silently)
  const runningServices = new Set();
  const servicesToCheck = [
    ['http://localhost:5000/health', 'Backend'],
    ['http://localhost:4321/health', 'Chatbot'],
    ['http://localhost:8001/health', 'Embed'],
    ['http://localhost:8011/health', 'Gemma'],
    ['http://localhost:8088/api/health', 'OCR']
  ];

  for (const [url, name] of servicesToCheck) {
    const isRunning = await checkHealth(url, name, true); // Silent check
    if (isRunning) {
      runningServices.add(name);
    }
  }

  // Now check ports
  for (const [port, name] of ports) {
    totalChecks++;
    const available = await checkPort(port, name);
    if (available) {
      passedChecks++;
      log(`  ✓ Port ${port} (${name}) - Available`, 'green');
    } else {
      // Port in use - check if it's our service
      if (runningServices.has(name)) {
        passedChecks++; // Count as passed if our service is using it
        log(`  ✓ Port ${port} (${name}) - In Use (Service Running)`, 'green');
      } else {
        log(`  ⚠ Port ${port} (${name}) - In Use (May conflict)`, 'yellow');
      }
    }
  }
  log('');

  // 7. Service Health Checks (if services are running)
  log('7. SERVICE HEALTH CHECKS', 'magenta');
  log('-'.repeat(70), 'cyan');
  log('  Checking if services are running...', 'yellow');
  
  const services = [
    ['http://localhost:5000/health', 'Backend'],
    ['http://localhost:4321/health', 'Chatbot'],
    ['http://localhost:8001/health', 'Embed'],
    ['http://localhost:8011/health', 'Gemma'],
    ['http://localhost:8088/api/health', 'OCR']
  ];

  for (const [url, name] of services) {
    // Don't count as failed if service is not running (optional check)
    const isRunning = await checkHealth(url, name);
    if (isRunning) {
      totalChecks++;
      passedChecks++;
    } else {
      // Service not running is not a failure, just informational
      log(`  ℹ ${name} - Not running (optional)`, 'blue');
    }
  }
  log('');

  // 8. Build Artifacts
  log('8. BUILD ARTIFACTS', 'magenta');
  log('-'.repeat(70), 'cyan');
  const buildArtifacts = [
    ['project/backend/backend/dist', 'Backend build'],
    ['project/frontend/ucost-discovery-hub/dist', 'Frontend build'],
    ['project/chatbot-mini/dist', 'Chatbot build']
  ];

  buildArtifacts.forEach(([dir, desc]) => {
    totalChecks++;
    if (checkDirectory(dir, desc)) {
      passedChecks++;
    } else {
      log(`    → Run: npm run build in parent directory`, 'yellow');
    }
  });
  log('');

  // Summary
  log('='.repeat(70), 'cyan');
  log('  ANALYSIS SUMMARY', 'bright');
  log('='.repeat(70), 'cyan');
  const percentage = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
  log('  Total Checks: ' + totalChecks, 'white');
  log(`  Passed: ${passedChecks}`, 'green');
  log(`  Failed: ${totalChecks - passedChecks}`, 'red');
  log(`  Success Rate: ${percentage}%`, percentage >= 80 ? 'green' : percentage >= 60 ? 'yellow' : 'red');
  log('', 'reset');

  if (percentage === 100) {
    log('  ✓ System is 100% ready!', 'green');
  } else if (percentage >= 80) {
    log('  ⚠ System is mostly ready. Check failed items above.', 'yellow');
  } else {
    log('  ✗ System needs attention. Please fix failed items.', 'red');
  }

  log('\n' + '='.repeat(70) + '\n', 'cyan');

  process.exit(percentage === 100 ? 0 : 1);
}

main().catch((error) => {
  log(`\n[ERROR] Analysis failed: ${error.message}`, 'red');
  process.exit(1);
});

