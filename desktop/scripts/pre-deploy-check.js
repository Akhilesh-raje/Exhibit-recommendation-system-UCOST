#!/usr/bin/env node

/**
 * Pre-deployment validation script
 * Run this before building the installer
 */

const DeploymentValidator = require('../src/deployment-validator');
const path = require('path');

const projectRoot = path.join(__dirname, '../..');
const validator = new DeploymentValidator(projectRoot);

async function main() {
  console.log('🔍 Running pre-deployment validation...\n');

  const result = await validator.validateAll();
  const report = validator.generateReport();

  console.log('\n📊 Validation Report');
  console.log('='.repeat(50));
  console.log(`Status: ${report.summary.status}`);
  console.log(`Errors: ${report.summary.totalErrors}`);
  console.log(`Warnings: ${report.summary.totalWarnings}`);
  console.log('='.repeat(50));

  if (result.errors.length > 0) {
    console.log('\n❌ ERRORS (Must fix before deployment):');
    result.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. ${error}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (Recommended to fix):');
    result.warnings.forEach((warning, i) => {
      console.log(`  ${i + 1}. ${warning}`);
    });
  }

  if (result.valid) {
    console.log('\n✅ Validation passed! Ready for deployment.');
    console.log('\nNext steps:');
    console.log('  1. npm run build');
    console.log('  2. npm run package');
    process.exit(0);
  } else {
    console.log('\n❌ Validation failed! Please fix errors before deployment.');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

