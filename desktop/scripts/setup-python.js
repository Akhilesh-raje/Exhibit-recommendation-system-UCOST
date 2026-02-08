#!/usr/bin/env node

/**
 * Python Setup Script
 * Detects or sets up Python runtime for desktop app
 */

const { execSync, spawn } = require('child_process');
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

/**
 * Detect Python installation
 */
function detectPython() {
  const pythonCommands = ['python', 'python3', 'py'];
  const pythonPaths = [];

  // Check common Python installation paths on Windows
  if (process.platform === 'win32') {
    const commonPaths = [
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Python39\\python.exe',
      'C:\\Python38\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python311\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python310\\python.exe',
      process.env.PROGRAMFILES + '\\Python311\\python.exe',
      process.env.PROGRAMFILES + '\\Python310\\python.exe'
    ];
    pythonPaths.push(...commonPaths);
  }

  // Try command-line Python
  for (const cmd of pythonCommands) {
    try {
      const version = execSync(`"${cmd}" --version`, { 
        encoding: 'utf-8', 
        stdio: 'pipe',
        timeout: 5000
      }).trim();
      const match = version.match(/Python (\d+)\.(\d+)/);
      if (match) {
        const major = parseInt(match[1]);
        const minor = parseInt(match[2]);
        if (major === 3 && minor >= 8) {
          // Verify it's actually Python
          const fullPath = execSync(`where ${cmd}`, { 
            encoding: 'utf-8', 
            stdio: 'pipe',
            shell: true
          }).trim().split('\n')[0];
          if (fs.existsSync(fullPath)) {
            return { path: fullPath, version: `${major}.${minor}`, command: cmd };
          }
        }
      }
    } catch (error) {
      // Command not found, continue
    }
  }

  // Try absolute paths
  for (const pythonPath of pythonPaths) {
    if (fs.existsSync(pythonPath)) {
      try {
        const version = execSync(`"${pythonPath}" --version`, { 
          encoding: 'utf-8', 
          stdio: 'pipe',
          timeout: 5000
        }).trim();
        const match = version.match(/Python (\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1]);
          const minor = parseInt(match[2]);
          if (major === 3 && minor >= 8) {
            return { path: pythonPath, version: `${major}.${minor}`, command: pythonPath };
          }
        }
      } catch (error) {
        // Invalid Python, continue
      }
    }
  }

  return null;
}

/**
 * Check if bundled Python exists
 */
function checkBundledPython(resourcesPath) {
  const bundledPaths = [
    path.join(resourcesPath, 'python', 'python.exe'),
    path.join(resourcesPath, 'python', 'python3.exe'),
    path.join(resourcesPath, 'venv', 'Scripts', 'python.exe'),
    path.join(resourcesPath, 'venv', 'bin', 'python')
  ];

  for (const pythonPath of bundledPaths) {
    if (fs.existsSync(pythonPath)) {
      try {
        const version = execSync(`"${pythonPath}" --version`, { 
          encoding: 'utf-8', 
          stdio: 'pipe',
          timeout: 5000
        }).trim();
        const match = version.match(/Python (\d+)\.(\d+)/);
        if (match) {
          const major = parseInt(match[1]);
          const minor = parseInt(match[2]);
          if (major === 3 && minor >= 8) {
            return { path: pythonPath, version: `${major}.${minor}`, bundled: true };
          }
        }
      } catch (error) {
        // Invalid, continue
      }
    }
  }

  return null;
}

/**
 * Create virtual environment
 */
function createVirtualEnv(pythonExe, venvPath) {
  log(`Creating virtual environment at: ${venvPath}`, 'blue');
  
  try {
    // Remove existing venv if it exists
    if (fs.existsSync(venvPath)) {
      log('Removing existing virtual environment...', 'yellow');
      fs.rmSync(venvPath, { recursive: true, force: true });
    }

    // Create venv
    execSync(`"${pythonExe}" -m venv "${venvPath}"`, {
      stdio: 'inherit',
      timeout: 60000
    });

    // Determine Python executable in venv
    const venvPython = process.platform === 'win32'
      ? path.join(venvPath, 'Scripts', 'python.exe')
      : path.join(venvPath, 'bin', 'python');

    if (!fs.existsSync(venvPython)) {
      throw new Error('Virtual environment Python executable not found');
    }

    log('✅ Virtual environment created successfully', 'green');
    return venvPython;
  } catch (error) {
    log(`❌ Failed to create virtual environment: ${error.message}`, 'red');
    throw error;
  }
}

/**
 * Get Python executable (bundled or system)
 */
function getPythonExecutable(resourcesPath = null) {
  // Priority 1: Check bundled Python
  if (resourcesPath) {
    const bundled = checkBundledPython(resourcesPath);
    if (bundled) {
      log(`✅ Found bundled Python ${bundled.version}`, 'green');
      return bundled.path;
    }
  }

  // Priority 2: Check system Python
  const systemPython = detectPython();
  if (systemPython) {
    log(`✅ Found system Python ${systemPython.version}`, 'green');
    return systemPython.path;
  }

  // Priority 3: Error
  log('❌ Python not found!', 'red');
  log('Please install Python 3.8+ from https://www.python.org/downloads/', 'yellow');
  throw new Error('Python 3.8+ is required but not found');
}

/**
 * Setup Python for desktop app
 */
function setupPython(options = {}) {
  const {
    resourcesPath = null,
    venvPath = null,
    createVenv = false
  } = options;

  try {
    // Get Python executable
    const pythonExe = getPythonExecutable(resourcesPath);

    // Create venv if requested
    if (createVenv && venvPath) {
      const venvPython = createVirtualEnv(pythonExe, venvPath);
      return {
        pythonExe: venvPython,
        systemPython: pythonExe,
        venvPath: venvPath,
        bundled: resourcesPath && checkBundledPython(resourcesPath) !== null
      };
    }

    return {
      pythonExe: pythonExe,
      systemPython: pythonExe,
      venvPath: null,
      bundled: resourcesPath && checkBundledPython(resourcesPath) !== null
    };
  } catch (error) {
    log(`Setup failed: ${error.message}`, 'red');
    throw error;
  }
}

// Export for use as module
if (require.main === module) {
  // Run as script
  const args = process.argv.slice(2);
  const resourcesPath = args[0] || null;
  const venvPath = args[1] || null;
  const createVenv = args.includes('--create-venv');

  try {
    const result = setupPython({ resourcesPath, venvPath, createVenv });
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
} else {
  module.exports = {
    setupPython,
    detectPython,
    checkBundledPython,
    createVirtualEnv,
    getPythonExecutable
  };
}

