#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...options });
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

function getRepoRoot() {
  const isPackaged = typeof process.pkg !== 'undefined';
  if (isPackaged) {
    // When packaged by pkg, use the directory of the executable
    return path.dirname(process.execPath);
  }
  // In dev, use project root relative to this file
  return path.resolve(__dirname, '..');
}

(async () => {
  try {
    const repoRoot = getRepoRoot();
    process.chdir(repoRoot);

    // Sanity check: ensure package.json exists at repo root
    if (!fs.existsSync(path.join(repoRoot, 'package.json'))) {
      console.error('package.json not found. Please place UCOST-Launcher.exe inside the project root folder.');
      process.exit(1);
    }

    // Ensure npm is available (EXE relies on system Node/npm)
    // Users must have Node.js (with npm) installed and on PATH.

    const isFirstRun = process.argv.includes('--install');
    if (isFirstRun) {
      console.log('Installing dependencies...');
      await run('npm', ['run', 'install:all']);
    }

    console.log('Starting UCOST Discovery Hub services (backend, frontend, AI, mobile-backend, OCR)...');
    await run('npm', ['run', 'dev:all']);
  } catch (err) {
    console.error(err.message || err);
    process.exit(1);
  }
})();
