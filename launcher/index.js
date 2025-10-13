#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, ...options });
    child.on('exit', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

(async () => {
  try {
    const repoRoot = path.resolve(__dirname, '..');
    process.chdir(repoRoot);

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
