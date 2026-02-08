/**
 * Frontend configuration helper
 * Sets up environment variables for the frontend in desktop mode
 */

const path = require('path');
const fs = require('fs');

/**
 * Generate frontend environment configuration
 * This creates a config file that the frontend can read
 */
function generateFrontendConfig(servicePorts, frontendPort) {
  const config = {
    VITE_API_URL: `http://localhost:${servicePorts.backend || 5000}/api`,
    VITE_CHATBOT_API_URL: `http://localhost:${servicePorts.chatbot || 4321}`,
    VITE_EMBED_API_URL: `http://localhost:${servicePorts.embed || 8001}`,
    VITE_GEMMA_API_URL: `http://localhost:${servicePorts.gemma || 8011}`,
    VITE_OCR_API_URL: `http://localhost:${servicePorts.ocr || 8088}/api`,
    VITE_FRONTEND_URL: frontendPort ? `http://localhost:${frontendPort}` : 'http://localhost:5173',
    VITE_DESKTOP_MODE: 'true'
  };

  return config;
}

/**
 * Inject configuration into frontend HTML
 * This modifies the index.html to include config as a script tag
 */
function injectFrontendConfig(frontendDistPath, config) {
  const indexPath = path.join(frontendDistPath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.warn(`Frontend index.html not found at: ${indexPath}`);
    return false;
  }

  try {
    let html = fs.readFileSync(indexPath, 'utf8');
    
    // Remove existing config script and CSP meta tag if present
    html = html.replace(/<script[^>]*id="desktop-config"[^>]*>[\s\S]*?<\/script>/gi, '');
    html = html.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, '');
    
    // CRITICAL: Add CSP meta tag for file:// protocol fallback (if needed)
    // This ensures React can load even if HTTP server fails
    // NOTE: frame-ancestors is ignored in meta tags, so we remove it
    const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:* data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* http://127.0.0.1:*; style-src 'self' 'unsafe-inline' data:; img-src 'self' data: blob: http: https: file:; font-src 'self' data: file:; connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*;">`;
    
    // Create config script
    const configScript = `
    <script id="desktop-config">
      window.__DESKTOP_CONFIG__ = ${JSON.stringify(config, null, 2)};
      // Set environment variables for Vite
      ${Object.entries(config).map(([key, value]) => {
        // Vite uses import.meta.env, but we can set it via window for runtime
        return `window.${key} = ${JSON.stringify(value)};`;
      }).join('\n      ')}
    </script>
    `;
    
    // Insert CSP meta tag and config script in head
    if (html.includes('</head>')) {
      html = html.replace('</head>', `  ${cspMeta}\n  ${configScript}\n</head>`);
    } else if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>\n  ${cspMeta}\n  ${configScript}`);
    } else if (html.includes('<body>')) {
      html = html.replace('<body>', `<head>${cspMeta}${configScript}</head><body>`);
    } else {
      // Fallback: add at the beginning
      html = `<head>${cspMeta}${configScript}</head>` + html;
    }
    
    fs.writeFileSync(indexPath, html, 'utf8');
    console.log('Frontend configuration and CSP injected successfully');
    return true;
  } catch (error) {
    console.error('Failed to inject frontend config:', error);
    return false;
  }
}

/**
 * Update frontend API URLs at runtime
 * This can be called when services start to update URLs
 */
function updateFrontendConfig(servicePorts) {
  const config = generateFrontendConfig(servicePorts);
  
  // Store in a global location that frontend can access
  if (typeof global !== 'undefined') {
    global.__DESKTOP_SERVICE_PORTS__ = servicePorts;
    global.__DESKTOP_CONFIG__ = config;
  }
  
  return config;
}

module.exports = {
  generateFrontendConfig,
  injectFrontendConfig,
  updateFrontendConfig
};

