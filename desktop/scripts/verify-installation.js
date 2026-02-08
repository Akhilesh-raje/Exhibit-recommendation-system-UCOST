#!/usr/bin/env node

/**
 * Installation Verification Script
 * Verifies that all components are properly installed
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

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

const report = {
  python: { status: 'unknown', details: [] },
  packages: { status: 'unknown', details: [] },
  services: { status: 'unknown', details: [] },
  database: { status: 'unknown', details: [] },
  files: { status: 'unknown', details: [] }
};

/**
 * Verify Python installation
 */
function verifyPython(pythonExe) {
  log('Checking Python installation...', 'blue');
  
  try {
    const version = execSync(`"${pythonExe}" --version`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 5000
    }).trim();

    const match = version.match(/Python (\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1]);
      const minor = parseInt(match[2]);
      
      if (major === 3 && minor >= 8) {
        report.python.status = 'ok';
        report.python.details.push(`Python ${major}.${minor} found at: ${pythonExe}`);
        log(`  ✅ Python ${major}.${minor}`, 'green');
        return true;
      } else {
        report.python.status = 'error';
        report.python.details.push(`Python version ${major}.${minor} is too old. Need 3.8+`);
        log(`  ❌ Python ${major}.${minor} (need 3.8+)`, 'red');
        return false;
      }
    }
  } catch (error) {
    report.python.status = 'error';
    report.python.details.push(`Python not found: ${error.message}`);
    log(`  ❌ Python not found: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Verify Python packages
 */
function verifyPackages(pythonExe) {
  log('Checking Python packages...', 'blue');

  const requiredPackages = [
    { name: 'fastapi', import: 'fastapi' },
    { name: 'uvicorn', import: 'uvicorn' },
    { name: 'pydantic', import: 'pydantic' },
    { name: 'numpy', import: 'numpy' },
    { name: 'requests', import: 'requests' },
    { name: 'sentence-transformers', import: 'sentence_transformers' },
    { name: 'faiss', import: 'faiss' }
  ];

  const optionalPackages = [
    { name: 'torch', import: 'torch' },
    { name: 'transformers', import: 'transformers' },
    { name: 'opencv-python', import: 'cv2' },
    { name: 'easyocr', import: 'easyocr' }
  ];

  let allRequired = true;
  let optionalCount = 0;

  for (const pkg of requiredPackages) {
    try {
      execSync(`"${pythonExe}" -c "import ${pkg.import}"`, {
        stdio: 'pipe',
        timeout: 5000,
        shell: true
      });
      report.packages.details.push(`✅ ${pkg.name}`);
      log(`  ✅ ${pkg.name}`, 'green');
    } catch (error) {
      report.packages.details.push(`❌ ${pkg.name} - missing`);
      log(`  ❌ ${pkg.name} - missing`, 'red');
      allRequired = false;
    }
  }

  for (const pkg of optionalPackages) {
    try {
      execSync(`"${pythonExe}" -c "import ${pkg.import}"`, {
        stdio: 'pipe',
        timeout: 5000,
        shell: true
      });
      report.packages.details.push(`✅ ${pkg.name} (optional)`);
      log(`  ✅ ${pkg.name} (optional)`, 'green');
      optionalCount++;
    } catch (error) {
      report.packages.details.push(`⚠️  ${pkg.name} (optional) - missing`);
      log(`  ⚠️  ${pkg.name} (optional) - missing`, 'yellow');
    }
  }

  report.packages.status = allRequired ? 'ok' : 'error';
  if (!allRequired) {
    report.packages.details.push('Some required packages are missing');
  }

  return allRequired;
}

/**
 * Verify service files exist
 */
function verifyFiles(resourcesPath) {
  log('Checking service files...', 'blue');

  const requiredFiles = [
    { path: 'backend/dist/app.js', name: 'Backend' },
    { path: 'frontend/dist/index.html', name: 'Frontend' },
    { path: 'chatbot/dist/server.js', name: 'Chatbot' },
    { path: 'embed-service/main.py', name: 'Embed Service' },
    { path: 'gemma/infer/server.py', name: 'Gemma Service' },
    { path: 'data/exhibits.csv', name: 'Exhibits Data' }
  ];

  let allFound = true;

  for (const file of requiredFiles) {
    const fullPath = path.join(resourcesPath, file.path);
    if (fs.existsSync(fullPath)) {
      report.files.details.push(`✅ ${file.name}`);
      log(`  ✅ ${file.name}`, 'green');
    } else {
      report.files.details.push(`❌ ${file.name} - not found`);
      log(`  ❌ ${file.name} - not found`, 'red');
      allFound = false;
    }
  }

  report.files.status = allFound ? 'ok' : 'error';
  return allFound;
}

/**
 * Verify database
 */
function verifyDatabase(dbPath) {
  log('Checking database...', 'blue');

  try {
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      if (stats.size > 0) {
        report.database.status = 'ok';
        report.database.details.push(`Database exists: ${dbPath} (${(stats.size / 1024).toFixed(2)} KB)`);
        log(`  ✅ Database exists (${(stats.size / 1024).toFixed(2)} KB)`, 'green');
        return true;
      } else {
        report.database.status = 'warning';
        report.database.details.push('Database file is empty');
        log(`  ⚠️  Database file is empty`, 'yellow');
        return false;
      }
    } else {
      report.database.status = 'warning';
      report.database.details.push('Database will be created on first run');
      log(`  ⚠️  Database will be created on first run`, 'yellow');
      return true; // Not an error, will be created
    }
  } catch (error) {
    report.database.status = 'error';
    report.database.details.push(`Error checking database: ${error.message}`);
    log(`  ❌ Error: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Test service health (if running)
 */
async function testServices(servicePorts) {
  log('Testing services (if running)...', 'blue');

  const services = [
    { name: 'Backend', port: servicePorts.backend || 5000, path: '/health' },
    { name: 'Chatbot', port: servicePorts.chatbot || 4321, path: '/health' },
    { name: 'Embed Service', port: servicePorts.embed || 8001, path: '/health' },
    { name: 'Gemma Service', port: servicePorts.gemma || 8011, path: '/health' }
  ];

  let runningCount = 0;

  for (const service of services) {
    try {
      const response = await axios.get(`http://localhost:${service.port}${service.path}`, {
        timeout: 2000,
        validateStatus: () => true
      });
      
      if (response.status < 500) {
        report.services.details.push(`✅ ${service.name} - running`);
        log(`  ✅ ${service.name} - running`, 'green');
        runningCount++;
      } else {
        report.services.details.push(`⚠️  ${service.name} - not responding`);
        log(`  ⚠️  ${service.name} - not responding`, 'yellow');
      }
    } catch (error) {
      report.services.details.push(`⚠️  ${service.name} - not running`);
      log(`  ⚠️  ${service.name} - not running`, 'yellow');
    }
  }

  report.services.status = runningCount > 0 ? 'ok' : 'warning';
  return runningCount;
}

/**
 * Generate verification report
 */
function generateReport() {
  log('\n' + '='.repeat(60), 'cyan');
  log('INSTALLATION VERIFICATION REPORT', 'cyan');
  log('='.repeat(60), 'cyan');

  const sections = [
    { name: 'Python', data: report.python },
    { name: 'Packages', data: report.packages },
    { name: 'Files', data: report.files },
    { name: 'Database', data: report.database },
    { name: 'Services', data: report.services }
  ];

  for (const section of sections) {
    log(`\n${section.name}:`, 'blue');
    const status = section.data.status === 'ok' ? '✅' : 
                   section.data.status === 'warning' ? '⚠️' : '❌';
    log(`  Status: ${status} ${section.data.status}`, 
        section.data.status === 'ok' ? 'green' : 
        section.data.status === 'warning' ? 'yellow' : 'red');
    
    for (const detail of section.data.details) {
      log(`  ${detail}`);
    }
  }

  const allOk = sections.every(s => s.data.status === 'ok' || s.data.status === 'warning');
  
  log('\n' + '='.repeat(60), 'cyan');
  if (allOk) {
    log('✅ VERIFICATION PASSED', 'green');
  } else {
    log('❌ VERIFICATION FAILED - Some components are missing', 'red');
  }
  log('='.repeat(60), 'cyan');

  return allOk;
}

/**
 * Main verification function
 */
async function verifyInstallation(options = {}) {
  const {
    pythonExe,
    resourcesPath,
    dbPath,
    servicePorts = {}
  } = options;

  log('Starting installation verification...\n', 'cyan');

  let allOk = true;

  // Verify Python
  if (pythonExe) {
    if (!verifyPython(pythonExe)) {
      allOk = false;
    }
  }

  // Verify packages
  if (pythonExe) {
    if (!verifyPackages(pythonExe)) {
      allOk = false;
    }
  }

  // Verify files
  if (resourcesPath) {
    if (!verifyFiles(resourcesPath)) {
      allOk = false;
    }
  }

  // Verify database
  if (dbPath) {
    verifyDatabase(dbPath);
  }

  // Test services
  await testServices(servicePorts);

  // Generate report
  const passed = generateReport();

  return {
    success: passed,
    report: report
  };
}

// Export for use as module
if (require.main === module) {
  // Run as script
  const args = process.argv.slice(2);
  const pythonExe = args[0] || 'python';
  const resourcesPath = args[1] || null;
  const dbPath = args[2] || null;

  verifyInstallation({
    pythonExe,
    resourcesPath,
    dbPath
  }).then(result => {
    process.exit(result.success ? 0 : 1);
  }).catch(error => {
    log(`\n❌ Verification error: ${error.message}`, 'red');
    process.exit(1);
  });
} else {
  module.exports = {
    verifyInstallation,
    verifyPython,
    verifyPackages,
    verifyFiles,
    verifyDatabase,
    testServices,
    generateReport
  };
}

