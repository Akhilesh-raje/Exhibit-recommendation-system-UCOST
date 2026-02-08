#!/usr/bin/env node

/**
 * Tesseract OCR Bundling Script
 * Downloads and prepares Tesseract OCR for bundling
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { createWriteStream } = require('fs');

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

const TESSERACT_VERSION = '5.3.0';
const TESSERACT_URL = `https://github.com/UB-Mannheim/tesseract/releases/download/v${TESSERACT_VERSION}/tesseract-ocr-w64-setup-${TESSERACT_VERSION}.exe`;
const TARGET_DIR = path.join(__dirname, '../resources/tesseract');

/**
 * Check if Tesseract is installed locally
 */
function checkLocalTesseract() {
  try {
    const version = execSync('tesseract --version', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    if (version.includes('tesseract')) {
      const tesseractPath = execSync('where tesseract', {
        encoding: 'utf-8',
        stdio: 'pipe',
        shell: true
      }).trim().split('\n')[0];
      
      log('✅ Found local Tesseract installation', 'green');
      log(`   Path: ${tesseractPath}`, 'cyan');
      
      // Find tessdata directory
      const installDir = path.dirname(tesseractPath);
      const tessdataPath = path.join(installDir, 'tessdata');
      
      return {
        found: true,
        path: tesseractPath,
        tessdata: tessdataPath,
        installDir: installDir
      };
    }
  } catch (error) {
    // Tesseract not in PATH
  }
  
  // Check common installation paths
  const commonPaths = [
    'C:\\Program Files\\Tesseract-OCR',
    'C:\\Program Files (x86)\\Tesseract-OCR',
    process.env.LOCALAPPDATA + '\\Programs\\Tesseract-OCR'
  ];
  
  for (const installPath of commonPaths) {
    const tesseractExe = path.join(installPath, 'tesseract.exe');
    if (fs.existsSync(tesseractExe)) {
      log('✅ Found Tesseract in common location', 'green');
      log(`   Path: ${tesseractExe}`, 'cyan');
      
      return {
        found: true,
        path: tesseractExe,
        tessdata: path.join(installPath, 'tessdata'),
        installDir: installPath
      };
    }
  }
  
  return { found: false };
}

/**
 * Copy Tesseract to bundle directory
 */
function copyTesseract(localTesseract) {
  log('Copying Tesseract to bundle directory...', 'blue');
  
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }
  
  // Copy tesseract.exe
  const destExe = path.join(TARGET_DIR, 'tesseract.exe');
  fs.copyFileSync(localTesseract.path, destExe);
  log('  ✅ Copied tesseract.exe', 'green');
  
  // Copy required DLLs
  const dlls = ['gdi32.dll', 'leptonica-*.dll'];
  const installDir = localTesseract.installDir;
  
  // Copy all DLLs from Tesseract directory
  try {
    const files = fs.readdirSync(installDir);
    for (const file of files) {
      if (file.endsWith('.dll')) {
        const src = path.join(installDir, file);
        const dest = path.join(TARGET_DIR, file);
        fs.copyFileSync(src, dest);
        log(`  ✅ Copied ${file}`, 'green');
      }
    }
  } catch (error) {
    log(`  ⚠️  Warning: Could not copy all DLLs: ${error.message}`, 'yellow');
  }
  
  // Copy tessdata if exists
  if (fs.existsSync(localTesseract.tessdata)) {
    const destTessdata = path.join(TARGET_DIR, 'tessdata');
    if (!fs.existsSync(destTessdata)) {
      fs.mkdirSync(destTessdata, { recursive: true });
    }
    
    // Copy language data files
    try {
      const tessdataFiles = fs.readdirSync(localTesseract.tessdata);
      for (const file of tessdataFiles) {
        if (file.endsWith('.traineddata')) {
          const src = path.join(localTesseract.tessdata, file);
          const dest = path.join(destTessdata, file);
          fs.copyFileSync(src, dest);
          log(`  ✅ Copied ${file}`, 'green');
        }
      }
    } catch (error) {
      log(`  ⚠️  Warning: Could not copy tessdata: ${error.message}`, 'yellow');
    }
  }
  
  log('✅ Tesseract copying complete', 'green');
}

/**
 * Setup Tesseract for bundling
 */
async function setupTesseract() {
  try {
    log('\n🔍 Checking for local Tesseract installation...', 'cyan');
    
    const localTesseract = checkLocalTesseract();
    
    if (localTesseract.found) {
      copyTesseract(localTesseract);
      log('\n✅ Tesseract bundling setup complete!', 'green');
      log(`Tesseract location: ${TARGET_DIR}`, 'cyan');
      log('\nNote: Tesseract will be bundled with the installer', 'yellow');
      return {
        success: true,
        tesseractPath: TARGET_DIR,
        bundled: true
      };
    } else {
      log('\n⚠️  Tesseract not found locally', 'yellow');
      log('Options:', 'yellow');
      log('1. Install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki', 'cyan');
      log('2. Run this script again to bundle it', 'cyan');
      log('3. Or Tesseract will need to be installed separately by users', 'cyan');
      
      return {
        success: true,
        tesseractPath: TARGET_DIR,
        bundled: false,
        note: 'Tesseract needs to be installed separately or bundled manually'
      };
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, 'red');
    return {
      success: false,
      error: error.message
    };
  }
}

// Run if called directly
if (require.main === module) {
  setupTesseract().then(result => {
    process.exit(result.success ? 0 : 1);
  });
} else {
  module.exports = { setupTesseract, checkLocalTesseract, copyTesseract };
}

