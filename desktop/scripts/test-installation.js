#!/usr/bin/env node

/**
 * Comprehensive Installation Test Script
 * Tests all aspects of the desktop app installation
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: []
};

function recordTest(name, passed, message = '', warning = false) {
  testResults.tests.push({ name, passed, message, warning });
  if (passed) {
    testResults.passed++;
    log(`  ✅ ${name}`, 'green');
  } else if (warning) {
    testResults.warnings++;
    log(`  ⚠️  ${name}: ${message}`, 'yellow');
  } else {
    testResults.failed++;
    log(`  ❌ ${name}: ${message}`, 'red');
  }
}

/**
 * Test Python detection
 */
function testPythonDetection() {
  log('\n📋 Testing Python Detection...', 'bright');
  
  try {
    const { setupPython } = require('./setup-python');
    const result = setupPython({ resourcesPath: null });
    
    if (result && result.pythonExe) {
      recordTest('Python Detection', true, `Found: ${result.pythonExe}`);
      
      // Test Python version
      try {
        const version = execSync(`"${result.pythonExe}" --version`, {
          encoding: 'utf-8',
          stdio: 'pipe'
        }).trim();
        recordTest('Python Version Check', true, version);
      } catch (error) {
        recordTest('Python Version Check', false, error.message);
      }
    } else {
      recordTest('Python Detection', false, 'Python not found');
    }
  } catch (error) {
    recordTest('Python Detection', false, error.message);
  }
}

/**
 * Test file structure
 */
function testFileStructure() {
  log('\n📋 Testing File Structure...', 'bright');
  
  const requiredFiles = [
    'main.js',
    'package.json',
    'src/config.js',
    'src/service-manager.js',
    'src/window-manager.js',
    'requirements/requirements.txt',
    'scripts/setup-python.js',
    'scripts/install-dependencies.js',
    'scripts/verify-installation.js',
    'scripts/post-install.js'
  ];
  
  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, '..', file);
    const exists = fs.existsSync(filePath);
    recordTest(`File: ${file}`, exists, exists ? '' : 'File not found');
  }
}

/**
 * Test service configurations
 */
function testServiceConfigs() {
  log('\n📋 Testing Service Configurations...', 'bright');
  
  try {
    const { getServiceConfig } = require('../src/config');
    const configs = getServiceConfig();
    
    const services = ['backend', 'chatbot', 'embed', 'gemma', 'ocr'];
    for (const serviceName of services) {
      const config = configs[serviceName];
      if (config) {
        recordTest(`Service Config: ${serviceName}`, true, `Port: ${config.port}`);
      } else {
        recordTest(`Service Config: ${serviceName}`, false, 'Config not found');
      }
    }
  } catch (error) {
    recordTest('Service Configurations', false, error.message);
  }
}

/**
 * Test port availability
 */
async function testPortAvailability() {
  log('\n📋 Testing Port Availability...', 'bright');
  
  const ports = [5000, 4321, 8001, 8011, 8088];
  
  for (const port of ports) {
    try {
      const net = require('net');
      const server = net.createServer();
      
      await new Promise((resolve, reject) => {
        server.listen(port, () => {
          server.close(() => resolve());
        });
        server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            reject(new Error('Port in use'));
          } else {
            reject(error);
          }
        });
      });
      
      recordTest(`Port ${port}`, true, 'Available');
    } catch (error) {
      recordTest(`Port ${port}`, false, error.message === 'Port in use' ? 'Port in use' : error.message, true);
    }
  }
}

/**
 * Test service startup (if services can start)
 */
async function testServiceStartup() {
  log('\n📋 Testing Service Startup...', 'bright');
  
  // This would require actually starting services
  // For now, just check if service files exist
  const serviceFiles = [
    '../project/backend/backend/dist/app.js',
    '../project/chatbot-mini/dist/server.js',
    '../project/embed-service/main.py',
    '../gemma/infer/server.py'
  ];
  
  for (const file of serviceFiles) {
    const filePath = path.join(__dirname, '..', file);
    const exists = fs.existsSync(filePath);
    recordTest(`Service File: ${path.basename(file)}`, exists, exists ? '' : 'File not found', !exists);
  }
}

/**
 * Test database initialization
 */
function testDatabaseInit() {
  log('\n📋 Testing Database Initialization...', 'bright');
  
  try {
    const { getDatabaseConfig } = require('../src/config');
    const dbConfig = getDatabaseConfig();
    
    recordTest('Database Config', true, `Path: ${dbConfig.path}`);
    
    // Check if Prisma schema exists
    const prismaPath = path.join(__dirname, '../project/backend/backend/prisma/schema.prisma');
    const prismaExists = fs.existsSync(prismaPath);
    recordTest('Prisma Schema', prismaExists, prismaExists ? '' : 'Schema not found');
  } catch (error) {
    recordTest('Database Initialization', false, error.message);
  }
}

/**
 * Test installer scripts
 */
function testInstallerScripts() {
  log('\n📋 Testing Installer Scripts...', 'bright');
  
  const scripts = [
    'bundle-python.js',
    'bundle-models.js',
    'bundle-tesseract.js',
    'setup-python.js',
    'install-dependencies.js',
    'verify-installation.js',
    'post-install.js'
  ];
  
  for (const script of scripts) {
    const scriptPath = path.join(__dirname, script);
    const exists = fs.existsSync(scriptPath);
    recordTest(`Installer Script: ${script}`, exists, exists ? '' : 'Script not found');
  }
  
  // Check NSIS scripts
  const nsisScripts = [
    '../build/installer.nsh',
    '../build/installer-script.nsh'
  ];
  
  for (const script of nsisScripts) {
    const scriptPath = path.join(__dirname, script);
    const exists = fs.existsSync(scriptPath);
    recordTest(`NSIS Script: ${path.basename(script)}`, exists, exists ? '' : 'Script not found');
  }
}

/**
 * Test error handling
 */
function testErrorHandling() {
  log('\n📋 Testing Error Handling...', 'bright');
  
  try {
    const ErrorHandler = require('../src/error-handler');
    const handler = new ErrorHandler();
    
    recordTest('Error Handler Class', true, 'Error handler available');
    
    // Test error message generation
    const testError = new Error('Python not found');
    const friendly = handler.getUserFriendlyMessage(testError);
    recordTest('Error Message Generation', !!friendly.title, 'User-friendly messages work');
  } catch (error) {
    recordTest('Error Handling', false, error.message);
  }
}

/**
 * Generate test report
 */
function generateReport() {
  log('\n' + '='.repeat(60), 'cyan');
  log('TEST REPORT', 'bright');
  log('='.repeat(60), 'cyan');
  
  log(`\nTotal Tests: ${testResults.tests.length}`, 'bright');
  log(`✅ Passed: ${testResults.passed}`, 'green');
  log(`⚠️  Warnings: ${testResults.warnings}`, 'yellow');
  log(`❌ Failed: ${testResults.failed}`, 'red');
  
  const successRate = ((testResults.passed / testResults.tests.length) * 100).toFixed(1);
  log(`\nSuccess Rate: ${successRate}%`, successRate >= 90 ? 'green' : successRate >= 70 ? 'yellow' : 'red');
  
  if (testResults.failed > 0) {
    log('\nFailed Tests:', 'red');
    for (const test of testResults.tests) {
      if (!test.passed && !test.warning) {
        log(`  - ${test.name}: ${test.message}`, 'red');
      }
    }
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  
  return testResults.failed === 0;
}

/**
 * Run all tests
 */
async function runTests() {
  log('\n🧪 Starting Installation Tests...', 'bright');
  log('='.repeat(60), 'cyan');
  
  testPythonDetection();
  testFileStructure();
  testServiceConfigs();
  await testPortAvailability();
  await testServiceStartup();
  testDatabaseInit();
  testInstallerScripts();
  testErrorHandling();
  
  const allPassed = generateReport();
  
  return allPassed;
}

// Run if called directly
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log(`\n❌ Test execution error: ${error.message}`, 'red');
    process.exit(1);
  });
} else {
  module.exports = { runTests };
}

