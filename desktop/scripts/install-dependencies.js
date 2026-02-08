#!/usr/bin/env node

/**
 * Python Dependency Installer
 * Installs all Python dependencies in virtual environment
 */

const { execSync, spawn } = require('child_process');
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

/**
 * Install dependencies from requirements file
 */
function installDependencies(pythonExe, requirementsPath, options = {}) {
  const {
    upgrade = false,
    timeout = 600000, // 10 minutes
    useMinimal = false
  } = options;

  if (!fs.existsSync(requirementsPath)) {
    throw new Error(`Requirements file not found: ${requirementsPath}`);
  }

  log(`Installing Python dependencies from: ${requirementsPath}`, 'blue');
  log(`Using Python: ${pythonExe}`, 'cyan');

  try {
    // Upgrade pip first
    log('Upgrading pip...', 'yellow');
    execSync(`"${pythonExe}" -m pip install --upgrade pip`, {
      stdio: 'inherit',
      timeout: 60000,
      shell: true
    });

    // Install torch separately first (if not using minimal)
    if (!useMinimal) {
      log('Installing PyTorch (this may take a while)...', 'yellow');
      try {
        execSync(`"${pythonExe}" -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu`, {
          stdio: 'inherit',
          timeout: 300000, // 5 minutes for torch
          shell: true
        });
        log('✅ PyTorch installed', 'green');
      } catch (error) {
        log('⚠️  PyTorch installation failed, continuing with other packages...', 'yellow');
      }
    }

    // Install requirements
    const upgradeFlag = upgrade ? '--upgrade' : '';
    log('Installing requirements (this may take several minutes)...', 'yellow');
    
    const installCommand = `"${pythonExe}" -m pip install ${upgradeFlag} -r "${requirementsPath}"`;
    
    execSync(installCommand, {
      stdio: 'inherit',
      timeout: timeout,
      shell: true,
      env: {
        ...process.env,
        PIP_DEFAULT_TIMEOUT: '300'
      }
    });

    log('✅ All dependencies installed successfully', 'green');
    return true;
  } catch (error) {
    log(`❌ Dependency installation failed: ${error.message}`, 'red');
    
    // Try minimal installation as fallback
    if (!useMinimal) {
      log('Attempting minimal installation...', 'yellow');
      const minimalPath = path.join(path.dirname(requirementsPath), 'requirements-min.txt');
      if (fs.existsSync(minimalPath)) {
        try {
          return installDependencies(pythonExe, minimalPath, { ...options, useMinimal: true });
        } catch (minimalError) {
          log(`❌ Minimal installation also failed: ${minimalError.message}`, 'red');
        }
      }
    }
    
    throw error;
  }
}

/**
 * Verify installation
 */
function verifyInstallation(pythonExe, requirementsPath) {
  log('Verifying installation...', 'blue');

  const requiredPackages = [
    'fastapi',
    'uvicorn',
    'pydantic',
    'numpy',
    'requests'
  ];

  const missing = [];
  const installed = [];

  for (const pkg of requiredPackages) {
    try {
      execSync(`"${pythonExe}" -c "import ${pkg.replace('-', '_')}"`, {
        stdio: 'pipe',
        timeout: 5000,
        shell: true
      });
      installed.push(pkg);
      log(`  ✅ ${pkg}`, 'green');
    } catch (error) {
      missing.push(pkg);
      log(`  ❌ ${pkg}`, 'red');
    }
  }

  if (missing.length > 0) {
    log(`⚠️  Missing packages: ${missing.join(', ')}`, 'yellow');
    return false;
  }

  log('✅ Installation verification passed', 'green');
  return true;
}

/**
 * Get pip list for debugging
 */
function listInstalledPackages(pythonExe) {
  try {
    const output = execSync(`"${pythonExe}" -m pip list`, {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000,
      shell: true
    });
    return output;
  } catch (error) {
    return `Error listing packages: ${error.message}`;
  }
}

/**
 * Main installation function
 */
function installPythonDependencies(options = {}) {
  const {
    pythonExe,
    requirementsPath,
    verify = true,
    upgrade = false,
    useMinimal = false
  } = options;

  if (!pythonExe || !fs.existsSync(pythonExe)) {
    throw new Error(`Python executable not found: ${pythonExe}`);
  }

  if (!requirementsPath || !fs.existsSync(requirementsPath)) {
    throw new Error(`Requirements file not found: ${requirementsPath}`);
  }

  try {
    // Install dependencies
    installDependencies(pythonExe, requirementsPath, { upgrade, useMinimal });

    // Verify installation
    if (verify) {
      const verified = verifyInstallation(pythonExe, requirementsPath);
      if (!verified) {
        log('⚠️  Some packages may be missing, but installation completed', 'yellow');
      }
    }

    return {
      success: true,
      pythonExe: pythonExe,
      installedPackages: listInstalledPackages(pythonExe)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      pythonExe: pythonExe
    };
  }
}

// Export for use as module
if (require.main === module) {
  // Run as script
  const args = process.argv.slice(2);
  const pythonExe = args[0];
  const requirementsPath = args[1] || path.join(__dirname, '../requirements/requirements.txt');
  const upgrade = args.includes('--upgrade');
  const useMinimal = args.includes('--minimal');
  const noVerify = args.includes('--no-verify');

  if (!pythonExe) {
    log('Usage: install-dependencies.js <python-exe> [requirements-path] [--upgrade] [--minimal] [--no-verify]', 'red');
    process.exit(1);
  }

  try {
    const result = installPythonDependencies({
      pythonExe,
      requirementsPath,
      verify: !noVerify,
      upgrade,
      useMinimal
    });

    if (result.success) {
      log('\n✅ Installation completed successfully!', 'green');
      process.exit(0);
    } else {
      log(`\n❌ Installation failed: ${result.error}`, 'red');
      process.exit(1);
    }
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    process.exit(1);
  }
} else {
  module.exports = {
    installPythonDependencies,
    installDependencies,
    verifyInstallation,
    listInstalledPackages
  };
}

