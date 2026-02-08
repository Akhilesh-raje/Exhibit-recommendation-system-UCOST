#!/usr/bin/env node

/**
 * Setup All Bundles Script
 * Runs all bundling scripts to prepare for installation
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

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

async function runScript(scriptName, description) {
  log(`\n${description}...`, 'bright');
  log('='.repeat(60), 'cyan');
  
  try {
    const scriptPath = path.join(__dirname, scriptName);
    if (!fs.existsSync(scriptPath)) {
      log(`⚠️  Script not found: ${scriptName}`, 'yellow');
      return { success: false, skipped: true };
    }
    
    execSync(`node "${scriptPath}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    log(`✅ ${description} completed`, 'green');
    return { success: true };
  } catch (error) {
    log(`⚠️  ${description} had issues: ${error.message}`, 'yellow');
    return { success: false, error: error.message };
  }
}

async function setupAllBundles() {
  log('\n🚀 Setting Up All Bundles for Installation', 'bright');
  log('='.repeat(60), 'cyan');
  
  const results = {
    python: null,
    models: null,
    tesseract: null
  };
  
  // Setup Python
  results.python = await runScript('bundle-python.js', 'Setting up Python bundle');
  
  // Setup Models
  results.models = await runScript('bundle-models.js', 'Setting up ML models bundle');
  
  // Setup Tesseract
  results.tesseract = await runScript('bundle-tesseract.js', 'Setting up Tesseract bundle');
  
  // Complete setup (install pip, verify resources)
  log('\n🔧 Completing setup...', 'bright');
  try {
    const { completeSetup } = require('./complete-setup');
    await completeSetup();
  } catch (error) {
    log(`⚠️  Complete setup had issues: ${error.message}`, 'yellow');
  }
  
  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('SETUP SUMMARY', 'bright');
  log('='.repeat(60), 'cyan');
  
  const allSuccess = Object.values(results).every(r => r && (r.success || r.skipped));
  
  for (const [name, result] of Object.entries(results)) {
    if (result) {
      if (result.success) {
        log(`✅ ${name}: Ready`, 'green');
      } else if (result.skipped) {
        log(`⚠️  ${name}: Skipped (not found)`, 'yellow');
      } else {
        log(`❌ ${name}: Failed`, 'red');
      }
    }
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  
  if (allSuccess) {
    log('✅ All bundles ready! You can now build the installer.', 'green');
    log('\nNext steps:', 'yellow');
    log('1. npm run build', 'cyan');
    log('2. npm run package', 'cyan');
  } else {
    log('⚠️  Some bundles had issues, but you can still build.', 'yellow');
    log('Missing bundles will be handled on first run.', 'yellow');
  }
  
  return allSuccess;
}

// Run if called directly
if (require.main === module) {
  setupAllBundles().then(success => {
    process.exit(success ? 0 : 0); // Exit 0 even with warnings
  }).catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
} else {
  module.exports = { setupAllBundles };
}

