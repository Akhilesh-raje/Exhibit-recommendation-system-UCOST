#!/usr/bin/env node

/**
 * Convert Logo to Icon
 * Converts the UCOST logo PNG to a proper ICO file for Windows
 */

const fs = require('fs');
const path = require('path');

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
 * Convert PNG to ICO using png-to-ico
 */
async function convertWithLibrary() {
  try {
    const pngToIco = require('png-to-ico');
    
    log('Converting logo to ICO format...', 'blue');
    
    // Read PNG file
    const pngBuffer = fs.readFileSync(LOGO_PATH);
    
    // Convert to ICO (png-to-ico expects buffer or file path)
    // Create multiple sizes by resizing the image
    const icoBuffer = await pngToIco(pngBuffer);
    
    // Write ICO file
    fs.writeFileSync(ICON_PATH, icoBuffer);
    
    const stats = fs.statSync(ICON_PATH);
    log(`✅ Icon created: ${(stats.size / 1024).toFixed(2)} KB`, 'green');
    return true;
  } catch (error) {
    // Try with file path instead
    try {
      const pngToIco = require('png-to-ico');
      const icoBuffer = await pngToIco(LOGO_PATH);
      fs.writeFileSync(ICON_PATH, icoBuffer);
      log(`✅ Icon created: ${(fs.statSync(ICON_PATH).size / 1024).toFixed(2)} KB`, 'green');
      return true;
    } catch (error2) {
      log(`❌ Conversion failed: ${error2.message}`, 'red');
      return false;
    }
  }
}

/**
 * Try ImageMagick as fallback
 */
function convertWithImageMagick() {
  log('Trying ImageMagick...', 'blue');
  
  try {
    const { execSync } = require('child_process');
    execSync(`magick "${LOGO_PATH}" -define icon:auto-resize=256,128,64,48,32,16 "${ICON_PATH}"`, {
      stdio: 'inherit',
      timeout: 30000
    });
    log('✅ Icon created with ImageMagick', 'green');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Copy PNG as temporary solution (won't work but shows intent)
 */
function copyAsPlaceholder() {
  log('⚠️  Creating placeholder - manual conversion needed', 'yellow');
  
  // We can't just copy PNG, but we can create instructions
  log('\n📝 Manual Conversion Instructions:', 'cyan');
  log('1. Go to: https://convertio.co/png-ico/', 'cyan');
  log(`2. Upload: ${LOGO_PATH}`, 'cyan');
  log('3. Set output size: 256x256 (or multiple sizes)', 'cyan');
  log(`4. Download and save as: ${ICON_PATH}`, 'cyan');
  log('\nOR install ImageMagick and run this script again', 'cyan');
  
  return false;
}

/**
 * Main function
 */
async function convertLogo() {
  log('\n🎨 Converting UCOST Logo to Application Icon...', 'bright');
  log('='.repeat(60), 'cyan');
  
  // Check if logo exists
  if (!fs.existsSync(LOGO_PATH)) {
    log(`❌ Logo not found: ${LOGO_PATH}`, 'red');
    return false;
  }
  
  log(`✅ Found logo: ${LOGO_PATH}`, 'green');
  
  // Try png-to-ico library first
  try {
    if (await convertWithLibrary()) {
      log('\n✅ Icon created successfully!', 'green');
      log(`Location: ${ICON_PATH}`, 'cyan');
      return true;
    }
  } catch (error) {
    // Library not installed or failed
  }
  
  // Try ImageMagick
  if (convertWithImageMagick()) {
    return true;
  }
  
  // Fallback to manual instructions
  copyAsPlaceholder();
  return false;
}

// Run if called directly
if (require.main === module) {
  convertLogo().then(success => {
    if (success) {
      log('\n✅ Icon is ready! Update package.json to use it.', 'green');
    }
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  });
} else {
  module.exports = { convertLogo };
}

