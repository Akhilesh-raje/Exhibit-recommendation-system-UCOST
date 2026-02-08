#!/usr/bin/env node

/**
 * Generate an Excel workbook of the exhibits with the same structure as the admin export.
 *
 * The output file is written to docs/exhibits_structured.xlsx relative to the backend root.
 */

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Ensure TypeScript sources can be required.
require('ts-node/register');

// Mirror backend DATABASE_URL fallback
dotenv.config();
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('file:')) {
  const defaultDbPath = path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
  process.env.DATABASE_URL = `file:${defaultDbPath}`;
}

async function main() {
  const { DataStorageService } = require('../src/services/dataStorage');
  const service = new DataStorageService();

  const outputDir = path.resolve(process.cwd(), '..', '..', 'docs');
  const outputPath = path.join(outputDir, 'exhibits_structured.xlsx');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('📊 Generating structured exhibits workbook');
  console.log(`🗂  Output directory: ${outputDir}`);

  await service.saveExcelSheet(outputPath, {
    includeAnalytics: true,
    format: 'xlsx',
  });

  console.log(`✅ Excel export saved to: ${outputPath}`);
  await service['prisma']?.$disconnect?.();
}

main().catch(async (err) => {
  console.error('❌ Failed to export Excel data sheet:', err);
  process.exitCode = 1;
});


