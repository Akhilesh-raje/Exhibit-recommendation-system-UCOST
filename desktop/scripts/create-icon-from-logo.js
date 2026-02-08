#!/usr/bin/env node

/**
 * Create Icon from Logo
 * Converts the UCOST logo PNG to a proper ICO file
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const LOGO_PATH = path.join(__dirname, '../../logo ucost.png');
const ICON_PATH = path.join(__dirname, '../build/icon.ico');

/**
 * Check if ImageMagick is available
 */
function hasImageMagick() {
  try {
    execSync('magick -version', { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create ICO using ImageMagick
 */
function createIconWithImageMagick() {
  log('Using ImageMagick to convert logo to ICO...', 'blue');
  
  try {
    // Create ICO with multiple sizes (required for Windows)
    execSync(`magick "${LOGO_PATH}" -define icon:auto-resize=256,128,64,48,32,16 "${ICON_PATH}"`, {
      stdio: 'inherit',
      timeout: 30000
    });
    log('✅ Icon created successfully with ImageMagick', 'green');
    return true;
  } catch (error) {
    log(`❌ ImageMagick conversion failed: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Create ICO using online converter or manual instructions
 */
function createIconManually() {
  log('\n⚠️  ImageMagick not found. Manual conversion needed.', 'yellow');
  log('\nTo create the icon:', 'cyan');
  log('1. Open: https://convertio.co/png-ico/', 'cyan');
  log(`2. Upload: ${LOGO_PATH}`, 'cyan');
  log('3. Set size: 256x256 (or multiple sizes)', 'cyan');
  log('4. Download and save as: desktop/build/icon.ico', 'cyan');
  log('\nOR install ImageMagick:', 'cyan');
  log('  - Download: https://imagemagick.org/script/download.php', 'cyan');
  log('  - Then run this script again', 'cyan');
  
  return false;
}

/**
 * Verify icon file
 */
function verifyIcon() {
  if (!fs.existsSync(ICON_PATH)) {
    return false;
  }
  
  const stats = fs.statSync(ICON_PATH);
  if (stats.size < 1000) {
    log('⚠️  Icon file seems too small, may be invalid', 'yellow');
    return false;
  }
  
  log(`✅ Icon file created: ${(stats.size / 1024).toFixed(2)} KB`, 'green');
  return true;
}

/**
 * Main function
 */
function createIcon() {
  log('\n🎨 Creating Application Icon from Logo...', 'bright');
  log('='.repeat(60), 'cyan');
  
  // Check if logo exists
  if (!fs.existsSync(LOGO_PATH)) {
    log(`❌ Logo not found: ${LOGO_PATH}`, 'red');
    log('Please ensure the logo file exists in the project root', 'yellow');
    return false;
  }
  
  log(`✅ Found logo: ${LOGO_PATH}`, 'green');
  
  // Try ImageMagick first
  if (hasImageMagick()) {
    if (createIconWithImageMagick()) {
      if (verifyIcon()) {
        log('\n✅ Icon created successfully!', 'green');
        log(`Location: ${ICON_PATH}`, 'cyan');
        return true;
      }
    }
  }
  
  // Fallback to manual instructions
  createIconManually();
  return false;
}

// Run if called directly
if (require.main === module) {
  const success = createIcon();
  if (success) {
    log('\n✅ Icon is ready! You can now build the installer.', 'green');
  } else {
    log('\n⚠️  Please create the icon manually or install ImageMagick.', 'yellow');
  }
  process.exit(success ? 0 : 1);
} else {
  module.exports = { createIcon };
}

