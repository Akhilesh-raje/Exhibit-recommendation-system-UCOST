#!/usr/bin/env node

/**
 * ML Model Bundling Script
 * Downloads and prepares ML models for bundling
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

const MODELS_DIR = path.join(__dirname, '../resources/models');
const GEMMA_MODELS_DIR = path.join(MODELS_DIR, 'gemma');
const OCR_MODELS_DIR = path.join(MODELS_DIR, 'ocr');

/**
 * Download file with progress
 */
async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    
    log(`Downloading: ${path.basename(dest)}...`, 'blue');
    
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        if (totalSize) {
          const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\rProgress: ${percent}%`);
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(''); // New line
        log('✅ Download complete', 'green');
        resolve();
      });
    }).on('error', (error) => {
      if (fs.existsSync(dest)) {
        fs.unlinkSync(dest);
      }
      reject(error);
    });
  });
}

/**
 * Check if models exist locally
 */
function checkLocalModels() {
  const localModels = {
    gemma: {
      faissIndex: path.join(__dirname, '../../gemma/embeddings/faiss.index'),
      meta: path.join(__dirname, '../../gemma/embeddings/meta.json'),
      rows: path.join(__dirname, '../../gemma/embeddings/rows.json')
    },
    ocr: {
      tessdata: path.join(__dirname, '../../project/ocr-engine')
    }
  };

  const found = {};
  
  // Check Gemma models
  if (fs.existsSync(localModels.gemma.faissIndex)) {
    found.gemma = true;
    log('✅ Found local Gemma models', 'green');
  }

  // Check OCR models
  if (fs.existsSync(localModels.ocr.tessdata)) {
    const engData = path.join(localModels.ocr.tessdata, 'eng.traineddata');
    if (fs.existsSync(engData)) {
      found.ocr = true;
      log('✅ Found local OCR models', 'green');
    }
  }

  return { found, localModels };
}

/**
 * Copy local models to bundle directory
 */
function copyLocalModels(localModels) {
  log('Copying local models to bundle directory...', 'blue');

  // Create directories
  if (!fs.existsSync(GEMMA_MODELS_DIR)) {
    fs.mkdirSync(GEMMA_MODELS_DIR, { recursive: true });
  }
  if (!fs.existsSync(OCR_MODELS_DIR)) {
    fs.mkdirSync(OCR_MODELS_DIR, { recursive: true });
  }

  // Copy Gemma models
  if (fs.existsSync(localModels.gemma.faissIndex)) {
    const embeddingsDir = path.dirname(localModels.gemma.faissIndex);
    const gemmaEmbedDir = path.join(GEMMA_MODELS_DIR, 'embeddings');
    
    if (!fs.existsSync(gemmaEmbedDir)) {
      fs.mkdirSync(gemmaEmbedDir, { recursive: true });
    }

    // Copy all embedding files
    const files = ['faiss.index', 'meta.json', 'rows.json'];
    for (const file of files) {
      const src = path.join(embeddingsDir, file);
      const dest = path.join(gemmaEmbedDir, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
        log(`  ✅ Copied ${file}`, 'green');
      }
    }
  }

  // Copy OCR models
  const ocrTessdata = path.join(localModels.ocr.tessdata, 'eng.traineddata');
  if (fs.existsSync(ocrTessdata)) {
    const tessdataDir = path.join(OCR_MODELS_DIR, 'tessdata');
    if (!fs.existsSync(tessdataDir)) {
      fs.mkdirSync(tessdataDir, { recursive: true });
    }
    fs.copyFileSync(ocrTessdata, path.join(tessdataDir, 'eng.traineddata'));
    log('  ✅ Copied OCR models', 'green');
  }

  log('✅ Model copying complete', 'green');
}

/**
 * Setup models for bundling
 */
async function setupModels() {
  try {
    log('\n🔍 Checking for local models...', 'cyan');
    
    const { found, localModels } = checkLocalModels();

    if (found.gemma || found.ocr) {
      copyLocalModels(localModels);
      log('\n✅ Model bundling setup complete!', 'green');
      log(`Models location: ${MODELS_DIR}`, 'cyan');
      log('\nNote: Models will be bundled with the installer', 'yellow');
      return {
        success: true,
        modelsPath: MODELS_DIR,
        gemmaModels: found.gemma,
        ocrModels: found.ocr
      };
    } else {
      log('\n⚠️  No local models found', 'yellow');
      log('Models will need to be downloaded on first run', 'yellow');
      log('Or manually placed in:', 'yellow');
      log(`  - Gemma: ${GEMMA_MODELS_DIR}`, 'cyan');
      log(`  - OCR: ${OCR_MODELS_DIR}`, 'cyan');
      
      return {
        success: true,
        modelsPath: MODELS_DIR,
        gemmaModels: false,
        ocrModels: false,
        note: 'Models will be downloaded on first run'
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
  setupModels().then(result => {
    process.exit(result.success ? 0 : 1);
  });
} else {
  module.exports = { setupModels, checkLocalModels, copyLocalModels };
}

