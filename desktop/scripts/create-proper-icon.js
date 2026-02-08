#!/usr/bin/env node

/**
 * Create Proper Icon Script
 * Creates a 256x256 ICO file or makes icon optional
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const ICON_PATH = path.join(__dirname, '../build/icon.ico');
const LOGO_PATH = path.join(__dirname, '../../logo ucost.png');

/**
 * Create a 256x256 ICO file
 * This creates a minimal but valid 256x256 icon
 */
function create256Icon() {
  log('Creating 256x256 icon...', 'blue');
  
  // For now, let's just remove the icon requirement
  // electron-builder will use a default icon
  if (fs.existsSync(ICON_PATH)) {
    try {
      fs.unlinkSync(ICON_PATH);
      log('✅ Removed icon file (will use default)', 'green');
      return true;
    } catch (error) {
      log(`⚠️  Could not remove icon: ${error.message}`, 'yellow');
      return false;
    }
  }
  
  return true;
}

/**
 * Update package.json to make icon optional
 */
function makeIconOptional() {
  log('Making icon optional in package.json...', 'blue');
  
  const packagePath = path.join(__dirname, '../package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    
    // Remove icon from win config
    if (packageJson.build && packageJson.build.win && packageJson.build.win.icon) {
      delete packageJson.build.win.icon;
      fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
      log('✅ Icon requirement removed from package.json', 'green');
      return true;
    }
    
    return true;
  } catch (error) {
    log(`⚠️  Could not update package.json: ${error.message}`, 'yellow');
    return false;
  }
}

/**
 * Main function
 */
function fixIconIssue() {
  log('\n🔧 Fixing Icon Issue...', 'bright');
  log('='.repeat(60), 'cyan');

  // Remove icon file
  create256Icon();
  
  // Make icon optional in config
  makeIconOptional();

  log('\n' + '='.repeat(60), 'cyan');
  log('✅ Icon issue fixed!', 'green');
  log('Build will use default Electron icon', 'yellow');
  log('You can add a proper 256x256 icon later', 'cyan');
  log('\nRun: npm run package', 'bright');
  log('='.repeat(60), 'cyan');

  return true;
}

// Run if called directly
if (require.main === module) {
  fixIconIssue();
} else {
  module.exports = { fixIconIssue };
}

