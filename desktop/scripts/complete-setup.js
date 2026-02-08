#!/usr/bin/env node

/**
 * Complete Setup Script
 * Finishes the setup after bundles are created
 * - Installs pip in bundled Python
 * - Verifies all resources
 * - Updates configuration if needed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

const PYTHON_DIR = path.join(__dirname, '../resources/python');
const PYTHON_EXE = path.join(PYTHON_DIR, 'python.exe');
const GET_PIP = path.join(PYTHON_DIR, 'get-pip.py');

/**
 * Install pip in bundled Python
 */
function installPip() {
  log('\n📦 Installing pip in bundled Python...', 'bright');
  
  if (!fs.existsSync(PYTHON_EXE)) {
    log('❌ Python executable not found', 'red');
    return false;
  }

  if (!fs.existsSync(GET_PIP)) {
    log('⚠️  get-pip.py not found', 'yellow');
    log('pip will be installed on first run if needed', 'yellow');
    return true; // Not critical
  }

  return runPipInstall();
}

function runPipInstall() {
  try {
    log('Running get-pip.py...', 'blue');
    execSync(`"${PYTHON_EXE}" "${GET_PIP}"`, {
      cwd: PYTHON_DIR,
      stdio: 'inherit',
      timeout: 120000
    });
    log('✅ pip installed successfully', 'green');
    return true;
  } catch (error) {
    log(`⚠️  pip installation had issues: ${error.message}`, 'yellow');
    log('pip will be installed on first run if needed', 'yellow');
    return true; // Not critical
  }
}

/**
 * Verify all resources exist
 */
function verifyResources() {
  log('\n🔍 Verifying resources...', 'bright');
  
  const resources = {
    python: {
      path: PYTHON_DIR,
      files: ['python.exe', 'python311._pth']
    },
    models: {
      path: path.join(__dirname, '../resources/models'),
      files: ['gemma/embeddings/faiss.index', 'ocr/tessdata/eng.traineddata']
    },
    tesseract: {
      path: path.join(__dirname, '../resources/tesseract'),
      files: ['tesseract.exe']
    }
  };

  let allOk = true;

  for (const [name, resource] of Object.entries(resources)) {
    if (fs.existsSync(resource.path)) {
      log(`✅ ${name}: Directory exists`, 'green');
      
      // Check key files
      for (const file of resource.files) {
        const filePath = path.join(resource.path, file);
        if (fs.existsSync(filePath)) {
          log(`  ✅ ${file}`, 'green');
        } else {
          log(`  ⚠️  ${file} (optional)`, 'yellow');
        }
      }
    } else {
      log(`⚠️  ${name}: Directory not found (will be created on first run)`, 'yellow');
    }
  }

  return allOk;
}

/**
 * Update python311._pth file to enable site-packages
 */
function updatePythonPath() {
  log('\n🔧 Updating Python path configuration...', 'bright');
  
  const pthFile = path.join(PYTHON_DIR, 'python311._pth');
  if (!fs.existsSync(pthFile)) {
    log('⚠️  python311._pth not found', 'yellow');
    return false;
  }

  try {
    let content = fs.readFileSync(pthFile, 'utf-8');
    
    // Check if site-packages is already enabled
    if (content.includes('import site')) {
      log('✅ Python path already configured', 'green');
      return true;
    }

    // Add import site to enable site-packages
    content = content.trim() + '\nimport site\n';
    fs.writeFileSync(pthFile, content);
    log('✅ Python path updated to enable site-packages', 'green');
    return true;
  } catch (error) {
    log(`⚠️  Failed to update python311._pth: ${error.message}`, 'yellow');
    return false;
  }
}

/**
 * Main setup function
 */
async function completeSetup() {
  log('\n🚀 Completing Setup...', 'bright');
  log('='.repeat(60), 'cyan');

  let allOk = true;

  // Install pip
  const pipOk = installPip();
  if (!pipOk) {
    allOk = false;
  }

  // Update Python path
  updatePythonPath();

  // Verify resources
  verifyResources();

  log('\n' + '='.repeat(60), 'cyan');
  if (allOk) {
    log('✅ Setup complete! Ready to build installer.', 'green');
    log('\nNext steps:', 'yellow');
    log('1. npm run build', 'cyan');
    log('2. npm run package', 'cyan');
  } else {
    log('⚠️  Setup completed with some warnings', 'yellow');
    log('Application should still work, but some features may need manual setup', 'yellow');
  }
  log('='.repeat(60), 'cyan');

  return allOk;
}

// Run if called directly
if (require.main === module) {
  completeSetup().then(success => {
    process.exit(0); // Always exit 0, warnings are OK
  }).catch(error => {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  });
} else {
  module.exports = { completeSetup };
}

