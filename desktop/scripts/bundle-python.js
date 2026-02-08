#!/usr/bin/env node

/**
 * Python Bundling Script
 * Downloads and prepares Python embeddable package for bundling
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createWriteStream } = require('fs');
const { pipeline } = require('stream/promises');
const { extract } = require('tar-stream');
const zlib = require('zlib');

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

const PYTHON_VERSION = '3.11.9'; // Python version to bundle
const PYTHON_URL = `https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip`;
const TARGET_DIR = path.join(__dirname, '../resources/python');

/**
 * Download file with progress
 */
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;

    log(`Downloading Python ${PYTHON_VERSION}...`, 'blue');
    log(`URL: ${url}`, 'cyan');
    log(`Destination: ${dest}`, 'cyan');

    protocol.get(url, (response) => {
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
        process.stdout.write(`\rProgress: ${percent}% (${(downloadedSize / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(''); // New line
        log('✅ Download complete', 'green');
        resolve();
      });
    }).on('error', (error) => {
      fs.unlinkSync(dest);
      reject(error);
    });
  });
}

/**
 * Extract ZIP file
 */
async function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    log('Extracting Python...', 'blue');
    
    const AdmZip = require('adm-zip');
    try {
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(destDir, true);
      log('✅ Extraction complete', 'green');
      resolve();
    } catch (error) {
      // Fallback to manual extraction
      try {
        execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, {
          stdio: 'inherit'
        });
        log('✅ Extraction complete', 'green');
        resolve();
      } catch (extractError) {
        reject(extractError);
      }
    }
  });
}

/**
 * Setup Python for bundling
 */
async function setupPython() {
  try {
    // Create target directory
    if (!fs.existsSync(TARGET_DIR)) {
      fs.mkdirSync(TARGET_DIR, { recursive: true });
      log(`Created directory: ${TARGET_DIR}`, 'green');
    }

    const zipPath = path.join(TARGET_DIR, `python-${PYTHON_VERSION}-embed.zip`);

    // Check if already downloaded
    if (fs.existsSync(zipPath)) {
      log('Python package already downloaded', 'yellow');
    } else {
      // Download Python
      await downloadFile(PYTHON_URL, zipPath);
    }

    // Extract if not already extracted
    const pythonExe = path.join(TARGET_DIR, 'python.exe');
    if (!fs.existsSync(pythonExe)) {
      await extractZip(zipPath, TARGET_DIR);
    } else {
      log('Python already extracted', 'yellow');
    }

    // Verify Python works
    log('Verifying Python installation...', 'blue');
    try {
      const version = execSync(`"${pythonExe}" --version`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      }).trim();
      log(`✅ ${version}`, 'green');
    } catch (error) {
      throw new Error('Python verification failed');
    }

    // Create pip installer
    log('Setting up pip...', 'blue');
    const getPipScript = path.join(TARGET_DIR, 'get-pip.py');
    if (!fs.existsSync(getPipScript)) {
      // Download get-pip.py
      const getPipUrl = 'https://bootstrap.pypa.io/get-pip.py';
      await downloadFile(getPipUrl, getPipScript);
    }

    log('\n✅ Python bundling setup complete!', 'green');
    log(`Python location: ${TARGET_DIR}`, 'cyan');
    log('\nNext steps:', 'yellow');
    log('1. Run: python.exe get-pip.py (in the python directory)', 'cyan');
    log('2. Update package.json to include resources/python in extraResources', 'cyan');
    log('3. Rebuild installer', 'cyan');

    return {
      success: true,
      pythonPath: TARGET_DIR,
      pythonExe: pythonExe
    };
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
  setupPython().then(result => {
    process.exit(result.success ? 0 : 1);
  });
} else {
  module.exports = { setupPython };
}

