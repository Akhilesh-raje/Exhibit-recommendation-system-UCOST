const express = require('express');
const path = require('path');
const fs = require('fs');

class FrontendServer {
  constructor(config) {
    this.config = config;
    this.app = null;
    this.server = null;
    this.port = config.port || 5173;
    this.desktopConfig = null;
  }

  setDesktopConfig(config) {
    this.desktopConfig = config;
    console.log('[FrontendServer] Desktop config updated for dynamic injection');
  }

  injectConfig(html) {
    if (!this.desktopConfig) return html;

    const configScript = `
    <script id="desktop-config">
      window.__DESKTOP_CONFIG__ = ${JSON.stringify(this.desktopConfig, null, 2)};
      // Set environment variables for Vite
      ${Object.entries(this.desktopConfig).map(([key, value]) => {
      return `window.${key} = ${JSON.stringify(value)};`;
    }).join('\n      ')}
    </script>
    `;

    // Insert before </head>
    if (html.includes('</head>')) {
      return html.replace('</head>', `  ${configScript}\n</head>`);
    }
    return html;
  }

  create() {
    this.app = express();
    const frontendPath = this.config.path;

    // Check if frontend directory exists
    if (!fs.existsSync(frontendPath)) {
      throw new Error(`Frontend directory not found: ${frontendPath}`);
    }

    // CRITICAL: Add CORS headers for Electron app
    this.app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // CRITICAL: Add Content Security Policy for Electron
      res.setHeader('Content-Security-Policy',
        "default-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* http://127.0.0.1:*; " +
        "style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data: blob: http: https:; " +
        "font-src 'self' data:; " +
        "connect-src 'self' http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*; " +
        "frame-ancestors 'self';"
      );

      // Additional security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-XSS-Protection', '1; mode=block');

      if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
      }
      next();
    });

    // Serve static files
    this.app.use(express.static(frontendPath, {
      maxAge: '1d',
      etag: true
    }));

    // CRITICAL: Fix React loading order by ensuring vendor-react loads first
    // Intercept index.html and reorder script tags to load React first
    // Aggressive Cache Busting Middleware
    this.app.use((req, res, next) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
      next();
    });

    this.app.get('/', (req, res) => {
      const indexPath = path.join(frontendPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');

        // DEBUG: Log what we are finding
        console.log(`[FrontendServer] Serving index.html from: ${indexPath}`);

        // Extract all script and modulepreload tags
        const scriptMatches = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi) || [];
        const modulepreloadMatches = html.match(/<link[^>]*rel=["']modulepreload["'][^>]*>/gi) || [];

        // CRITICAL: Order chunks correctly to prevent initialization errors
        // Order: vendor-react -> vendor-radix-ui -> others (radix and ui merged into one)
        const reactScripts = [];
        // Injected config at runtime
        html = this.injectConfig(html);

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.status(404).send('Frontend not found. Please build the frontend first.');
      }
    });

    // DEBUG: Route to check what files are actually available
    this.app.get('/debug-files', (req, res) => {
      try {
        const assetsPath = path.join(frontendPath, 'assets', 'js');
        if (fs.existsSync(assetsPath)) {
          const files = fs.readdirSync(assetsPath);
          res.json({
            path: assetsPath,
            files: files,
            versions: {
              react: files.find(f => f.includes('vendor-react')),
              radixUi: files.find(f => f.includes('vendor-radix-ui')),
              ui: files.find(f => f.includes('vendor-ui'))
            }
          });
        } else {
          res.status(404).json({ error: 'Assets directory not found', path: assetsPath });
        }
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });

    // Handle SPA routing - all routes serve index.html
    this.app.get('*', (req, res) => {
      const indexPath = path.join(frontendPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');

        // Injected config at runtime
        html = this.injectConfig(html);

        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        res.status(404).send('Frontend not found. Please build the frontend first.');
      }
    });

    return this.app;
  }

  async start() {
    return new Promise((resolve, reject) => {
      if (!this.app) {
        this.create();
      }

      this.server = this.app.listen(this.port, '127.0.0.1', async () => {
        console.log(`Frontend server running on http://localhost:${this.port}`);

        // CRITICAL: Verify server is actually serving content before resolving
        // This prevents race conditions where window loads before server is ready
        try {
          const axios = require('axios');
          const testUrl = `http://127.0.0.1:${this.port}`;

          // Wait up to 5 seconds for server to be ready
          for (let i = 0; i < 10; i++) {
            try {
              const response = await axios.get(testUrl, {
                timeout: 500,
                validateStatus: () => true // Accept any status
              });
              if (response.status < 500) {
                console.log(`✅ Frontend server verified ready (status: ${response.status})`);
                resolve(this.port);
                return;
              }
            } catch (e) {
              // Server not ready yet, wait and retry
              await new Promise(r => setTimeout(r, 500));
            }
          }

          // If we get here, server might not be fully ready, but resolve anyway
          console.warn('⚠️  Frontend server started but readiness check incomplete');
          resolve(this.port);
        } catch (error) {
          console.warn('⚠️  Frontend server readiness check failed:', error.message);
          // Still resolve - server is listening, might just be a check issue
          resolve(this.port);
        }
      });

      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          // Port in use, try next port
          this.port++;
          this.start().then(resolve).catch(reject);
        } else {
          reject(error);
        }
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log('Frontend server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getUrl() {
    return `http://localhost:${this.port}`;
  }
}

module.exports = FrontendServer;
