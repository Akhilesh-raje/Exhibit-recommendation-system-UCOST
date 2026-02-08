#!/usr/bin/env node

/**
 * Create Icon Script
 * Creates a valid ICO file from PNG or creates a placeholder
 */

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

const ICON_PATH = path.join(__dirname, '../build/icon.ico');
const LOGO_PATH = path.join(__dirname, '../../logo ucost.png');

/**
 * Create a minimal valid ICO file
 * This creates a simple 16x16 and 32x32 icon
 */
function createMinimalIcon() {
  log('Creating minimal icon file...', 'blue');
  
  // Minimal ICO file structure (16x16 and 32x32, 1-bit color)
  // This is a very basic icon that will work
  const icoBuffer = Buffer.from([
    // ICO header
    0x00, 0x00, // Reserved (must be 0)
    0x01, 0x00, // Type (1 = ICO)
    0x02, 0x00, // Number of images
    
    // Image 1 entry (16x16)
    0x10,       // Width (16)
    0x10,       // Height (16)
    0x00,       // Color palette (0 = no palette)
    0x00,       // Reserved
    0x01, 0x00, // Color planes
    0x01, 0x00, // Bits per pixel
    0x40, 0x00, 0x00, 0x00, // Size of image data (64 bytes)
    0x16, 0x00, 0x00, 0x00, // Offset to image data
    
    // Image 2 entry (32x32)
    0x20,       // Width (32)
    0x20,       // Height (32)
    0x00,       // Color palette (0 = no palette)
    0x00,       // Reserved
    0x01, 0x00, // Color planes
    0x01, 0x00, // Bits per pixel
    0x00, 0x04, 0x00, 0x00, // Size of image data (1024 bytes)
    0x56, 0x00, 0x00, 0x00, // Offset to image data
    
    // Image 1 data (16x16, 1-bit, simple pattern)
    // BITMAPINFOHEADER
    0x28, 0x00, 0x00, 0x00, // Header size (40)
    0x10, 0x00, 0x00, 0x00, // Width (16)
    0x20, 0x00, 0x00, 0x00, // Height (32, includes AND mask)
    0x01, 0x00,             // Planes (1)
    0x01, 0x00,             // Bits per pixel (1)
    0x00, 0x00, 0x00, 0x00, // Compression (0 = none)
    0x40, 0x00, 0x00, 0x00, // Image size (64)
    0x00, 0x00, 0x00, 0x00, // X pixels per meter
    0x00, 0x00, 0x00, 0x00, // Y pixels per meter
    0x00, 0x00, 0x00, 0x00, // Colors used
    0x00, 0x00, 0x00, 0x00, // Important colors
    
    // Color table (2 colors: black and white)
    0x00, 0x00, 0x00, 0x00, // Black
    0xFF, 0xFF, 0xFF, 0x00, // White
    
    // Image data (16x16, 1-bit, 32 bytes)
    // Simple pattern: alternating rows
    ...Array(32).fill(0xAA), // XOR mask (pattern)
    ...Array(32).fill(0x00), // AND mask (transparent)
    
    // Image 2 data (32x32, 1-bit, simple pattern)
    // BITMAPINFOHEADER
    0x28, 0x00, 0x00, 0x00, // Header size (40)
    0x20, 0x00, 0x00, 0x00, // Width (32)
    0x40, 0x00, 0x00, 0x00, // Height (64, includes AND mask)
    0x01, 0x00,             // Planes (1)
    0x01, 0x00,             // Bits per pixel (1)
    0x00, 0x00, 0x00, 0x00, // Compression (0 = none)
    0x00, 0x04, 0x00, 0x00, // Image size (1024)
    0x00, 0x00, 0x00, 0x00, // X pixels per meter
    0x00, 0x00, 0x00, 0x00, // Y pixels per meter
    0x00, 0x00, 0x00, 0x00, // Colors used
    0x00, 0x00, 0x00, 0x00, // Important colors
    
    // Color table (2 colors: black and white)
    0x00, 0x00, 0x00, 0x00, // Black
    0xFF, 0xFF, 0xFF, 0x00, // White
    
    // Image data (32x32, 1-bit, 128 bytes)
    ...Array(128).fill(0xAA), // XOR mask (pattern)
    ...Array(128).fill(0x00), // AND mask (transparent)
  ]);

  try {
    fs.writeFileSync(ICON_PATH, icoBuffer);
    log('✅ Minimal icon created', 'green');
    log('⚠️  Note: This is a placeholder icon. Replace with a proper icon for production.', 'yellow');
    return true;
  } catch (error) {
    log(`❌ Failed to create icon: ${error.message}`, 'red');
    return false;
  }
}

/**
 * Main function
 */
function createIcon() {
  log('\n🎨 Creating Icon File...', 'bright');
  log('='.repeat(60), 'cyan');

  // Check if logo exists
  if (fs.existsSync(LOGO_PATH)) {
    log('Found logo PNG, but ICO conversion requires external tools', 'yellow');
    log('Creating minimal placeholder icon instead...', 'yellow');
  }

  // Create minimal icon
  const success = createMinimalIcon();

  if (success) {
    log('\n✅ Icon file created successfully!', 'green');
    log('You can replace it with a proper icon later.', 'yellow');
    log('To create a proper icon:', 'cyan');
    log('1. Use an online converter: https://convertio.co/png-ico/', 'cyan');
    log('2. Or use ImageMagick: magick logo.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico', 'cyan');
  } else {
    log('\n❌ Failed to create icon', 'red');
    log('Build will continue without icon (will use default)', 'yellow');
  }

  return success;
}

// Run if called directly
if (require.main === module) {
  createIcon();
} else {
  module.exports = { createIcon };
}
