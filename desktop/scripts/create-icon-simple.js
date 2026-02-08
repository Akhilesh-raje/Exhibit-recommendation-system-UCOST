#!/usr/bin/env node

/**
 * Create Icon from Logo - Simple Version
 * Uses sharp to resize and to-ico to convert
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
 * Convert using sharp and to-ico
 */
async function convertLogo() {
  log('\n🎨 Creating Icon from UCOST Logo...', 'bright');
  log('='.repeat(60), 'cyan');
  
  if (!fs.existsSync(LOGO_PATH)) {
    log(`❌ Logo not found: ${LOGO_PATH}`, 'red');
    return false;
  }
  
  log(`✅ Found logo: ${LOGO_PATH}`, 'green');
  
  try {
    const sharp = require('sharp');
    const toIco = require('to-ico');
    
    log('Resizing logo to multiple sizes...', 'blue');
    
    // Create multiple sizes for ICO (Windows requires this)
    const sizes = [256, 128, 64, 48, 32, 16];
    const buffers = [];
    
    for (const size of sizes) {
      const buffer = await sharp(LOGO_PATH)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      buffers.push(buffer);
      log(`  ✅ Created ${size}x${size}`, 'green');
    }
    
    log('Converting to ICO format...', 'blue');
    const icoBuffer = await toIco(buffers);
    
    fs.writeFileSync(ICON_PATH, icoBuffer);
    
    const stats = fs.statSync(ICON_PATH);
    log(`\n✅ Icon created successfully!`, 'green');
    log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`, 'cyan');
    log(`   Location: ${ICON_PATH}`, 'cyan');
    log(`   Contains: ${sizes.join(', ')}x${sizes.join(', ')} sizes`, 'cyan');
    
    return true;
  } catch (error) {
    log(`❌ Conversion failed: ${error.message}`, 'red');
    log('\n📝 Alternative: Use online converter', 'yellow');
    log('1. Go to: https://convertio.co/png-ico/', 'cyan');
    log(`2. Upload: ${LOGO_PATH}`, 'cyan');
    log('3. Download and save as: desktop/build/icon.ico', 'cyan');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  convertLogo().then(success => {
    if (success) {
      log('\n✅ Icon ready! Building installer will use this icon.', 'green');
    }
    process.exit(success ? 0 : 1);
  }).catch(error => {
    log(`\n❌ Error: ${error.message}`, 'red');
    process.exit(1);
  });
} else {
  module.exports = { convertLogo };
}

