#!/usr/bin/env node

/**
 * Export a detailed CSV of all exhibits stored in the Prisma database.
 *
 * The script mirrors the backend's default DATABASE_URL logic so it can run
 * without additional configuration. The output file is written to
 * docs/exhibits_detailed.csv relative to the repository root.
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');

// Load environment variables just like the backend app does.
dotenv.config();
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('file:')) {
  const defaultDbPath = path.join(process.cwd(), 'prisma', 'dev.db').replace(/\\/g, '/');
  process.env.DATABASE_URL = `file:${defaultDbPath}`;
}

const prisma = new PrismaClient();

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch (_err) {
    return fallback;
  }
}

function toCsvValue(value) {
  if (value === null || value === undefined) return '';
  let output = '';

  if (Array.isArray(value)) {
    output = value.join('; ');
  } else if (typeof value === 'object') {
    output = JSON.stringify(value);
  } else {
    output = String(value);
  }

  if (output.search(/["\n,]/) !== -1) {
    return `"${output.replace(/"/g, '""')}"`;
  }
  return output;
}

function flattenExhibit(exhibit) {
  const images = parseJson(exhibit.images, []);
  const features = parseJson(exhibit.interactiveFeatures, []);
  const coordinates = parseJson(exhibit.coordinates, {});
  const nearbyFacilities = parseJson(exhibit.nearbyFacilities, []);
  const routeInstructions = parseJson(exhibit.routeInstructions, {});

  return {
    id: exhibit.id,
    name: exhibit.name,
    description: exhibit.description || '',
    category: exhibit.category || '',
    location: exhibit.location || '',
    floor: exhibit.floor || coordinates.floor || '',
    ageRange: exhibit.ageRange || '',
    exhibitType: exhibit.exhibitType || '',
    environment: exhibit.environment || '',
    difficulty: exhibit.difficulty || '',
    durationMinutes: exhibit.duration ?? '',
    averageTimeMinutes: exhibit.averageTime ?? '',
    visitorCount: exhibit.visitorCount ?? '',
    rating: exhibit.rating ?? '',
    feedbackCount: exhibit.feedbackCount ?? '',
    language: exhibit.language || '',
    accessibility: exhibit.accessibility || '',
    maintenanceNotes: exhibit.maintenanceNotes || '',
    safetyNotes: exhibit.safetyNotes || '',
    educationalValue: exhibit.educationalValue || '',
    curriculumLinks: exhibit.curriculumLinks || '',
    materials: exhibit.materials || '',
    dimensions: exhibit.dimensions || '',
    weightKg: exhibit.weight ?? '',
    powerRequirements: exhibit.powerRequirements || '',
    temperatureRange: exhibit.temperatureRange || '',
    humidityRange: exhibit.humidityRange || '',
    lastMaintenance: exhibit.lastMaintenance ? exhibit.lastMaintenance.toISOString() : '',
    nextMaintenance: exhibit.nextMaintenance ? exhibit.nextMaintenance.toISOString() : '',
    cost: exhibit.cost ?? '',
    sponsor: exhibit.sponsor || '',
    designer: exhibit.designer || '',
    manufacturer: exhibit.manufacturer || '',
    warrantyExpiry: exhibit.warrantyExpiry ? exhibit.warrantyExpiry.toISOString() : '',
    insuranceInfo: exhibit.insuranceInfo || '',
    riskAssessment: exhibit.riskAssessment || '',
    emergencyContact: exhibit.emergencyContact || '',
    images: images,
    imagesCount: Array.isArray(images) ? images.length : 0,
    interactiveFeatures: features,
    coordinatesRaw: coordinates,
    coordinateX: coordinates.x ?? '',
    coordinateY: coordinates.y ?? '',
    coordinateNotes: coordinates.notes ?? '',
    nearbyFacilities,
    routeInstructions,
    createdAt: exhibit.createdAt ? exhibit.createdAt.toISOString() : '',
    updatedAt: exhibit.updatedAt ? exhibit.updatedAt.toISOString() : '',
    isActive: exhibit.isActive,
    exhibitCode: exhibit.exhibitCode || '',
    scientificName: exhibit.scientificName || '',
    virtualTour: exhibit.virtualTour || '',
    videos: parseJson(exhibit.videos, []),
    audioGuides: parseJson(exhibit.audioGuides, []),
  };
}

async function main() {
  const outputDir = path.resolve(process.cwd(), '..', '..', 'docs');
  const outputPath = path.join(outputDir, 'exhibits_detailed.csv');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('📦 Exporting detailed exhibits CSV');
  console.log(`🗂  Output directory: ${outputDir}`);

  const exhibits = await prisma.exhibit.findMany({
    orderBy: [{ category: 'asc' }, { name: 'asc' }],
  });

  console.log(`✅ Loaded ${exhibits.length} exhibits from database`);

  const flattened = exhibits.map(flattenExhibit);
  const headers = Object.keys(flattened[0] || {});

  const csvLines = [headers.map(toCsvValue).join(',')];
  for (const row of flattened) {
    csvLines.push(headers.map((header) => toCsvValue(row[header])).join(','));
  }

  fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf8');
  console.log(`💾 Wrote CSV: ${outputPath}`);
}

main()
  .catch((err) => {
    console.error('❌ Failed to export exhibits:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


