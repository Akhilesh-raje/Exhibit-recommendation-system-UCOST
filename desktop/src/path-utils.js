const path = require('path');
const fs = require('fs');
const { app } = require('electron');

/**
 * Unified path resolution utility for Electron app
 * Handles differences between development and production environments
 */
class PathUtils {
  /**
   * Check if running in production mode
   * CRITICAL: Use app.isPackaged instead of NODE_ENV for reliable detection
   * app.isPackaged is set by Electron and is always correct
   */
  static isProduction() {
    // Use app.isPackaged if available (more reliable than NODE_ENV)
    if (app && typeof app.isPackaged === 'boolean') {
      return app.isPackaged;
    }
    // Fallback to NODE_ENV if app not available (shouldn't happen in Electron)
    return process.env.NODE_ENV === 'production';
  }

  /**
   * Get the resources path where extraResources are placed
   * In production: process.resourcesPath (set by Electron)
   * In development: relative to desktop folder
   */
  static getResourcesPath() {
    if (this.isProduction()) {
      // In packaged app, process.resourcesPath points to resources folder
      if (process.resourcesPath) {
        return process.resourcesPath;
      }
      // Fallback: resources folder is next to executable
      return path.join(path.dirname(process.execPath), 'resources');
    } else {
      // Development: relative to desktop folder
      return path.join(__dirname, '../../resources');
    }
  }

  /**
   * Find frontend path, checking multiple possible locations
   * Handles both old (nested) and new (correct) structures for backward compatibility
   */
  static findFrontendPath() {
    const resourcesPath = this.getResourcesPath();
    const execDir = process.execPath ? path.dirname(process.execPath) : __dirname;
    
    // Check correct path FIRST, then fallback to nested (for old builds)
    const possiblePaths = [
      path.join(resourcesPath, 'frontend/dist'),           // Correct location (NEW)
      path.join(resourcesPath, 'resources/frontend/dist'), // Nested (OLD - backward compatibility)
      path.join(execDir, 'resources/frontend/dist'),
      path.join(execDir, 'resources/resources/frontend/dist')
    ];
    
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }
    
    // Return first path as default (will show error if not found)
    return possiblePaths[0];
  }

  /**
   * Get the project root path
   * In production: same as resources path
   * In development: go up from desktop/src to project root
   */
  static getProjectRoot() {
    if (this.isProduction()) {
      // In production, project files are in resources
      return this.getResourcesPath();
    } else {
      // Development: go up from desktop/src to project root
      return path.join(__dirname, '../../');
    }
  }

  /**
   * Resolve a path relative to resources folder
   */
  static resolveResourcePath(relativePath) {
    const resourcesPath = this.getResourcesPath();
    return path.join(resourcesPath, relativePath);
  }

  /**
   * Resolve a path relative to project root
   */
  static resolveProjectPath(relativePath) {
    const projectRoot = this.getProjectRoot();
    return path.join(projectRoot, relativePath);
  }

  /**
   * Validate that a path exists, throw error if not
   */
  static validatePath(filePath, description = 'Path') {
    if (!fs.existsSync(filePath)) {
      throw new Error(`${description} not found: ${filePath}`);
    }
    return filePath;
  }

  /**
   * Try multiple alternative paths and return the first that exists
   */
  static findAlternativePath(primaryPath, alternatives) {
    if (fs.existsSync(primaryPath)) {
      return primaryPath;
    }

    for (const altPath of alternatives) {
      if (fs.existsSync(altPath)) {
        return altPath;
      }
    }

    return null;
  }

  /**
   * Get diagnostic information about paths
   */
  static getPathDiagnostics() {
    return {
      isProduction: this.isProduction(),
      resourcesPath: this.getResourcesPath(),
      projectRoot: this.getProjectRoot(),
      processResourcesPath: process.resourcesPath,
      processExecPath: process.execPath,
      processCwd: process.cwd(),
      __dirname: __dirname
    };
  }

  /**
   * STATE-OF-THE-ART: Comprehensive resource path validation
   * Validates all critical resource paths exist
   */
  static validateAllResourcePaths() {
    const fs = require('fs');
    const resourcesPath = this.getResourcesPath();
    const missing = [];
    const invalid = [];

    const requiredPaths = [
      { path: 'frontend/dist', name: 'Frontend', critical: true },
      { path: 'backend/dist', name: 'Backend', critical: true },
      { path: 'chatbot/dist', name: 'Chatbot', critical: false },
      { path: 'embed-service', name: 'Embed Service', critical: false },
      { path: 'gemma/infer', name: 'Gemma Service', critical: false },
      { path: 'ocr-engine', name: 'OCR Engine', critical: false },
      { path: 'data/exhibits.csv', name: 'Exhibits CSV', critical: false }
    ];

    for (const { path: relPath, name, critical } of requiredPaths) {
      const fullPath = path.join(resourcesPath, relPath);
      
      if (!fs.existsSync(fullPath)) {
        if (critical) {
          invalid.push({ name, path: fullPath, reason: 'Missing critical resource' });
        } else {
          missing.push({ name, path: fullPath, reason: 'Missing optional resource' });
        }
      } else {
        // Check if it's a directory or file
        const stats = fs.statSync(fullPath);
        if (relPath.endsWith('.csv')) {
          if (!stats.isFile()) {
            invalid.push({ name, path: fullPath, reason: 'Expected file but found directory' });
          }
        } else {
          if (!stats.isDirectory()) {
            invalid.push({ name, path: fullPath, reason: 'Expected directory but found file' });
          }
        }
      }
    }

    return {
      valid: invalid.length === 0,
      missing,
      invalid,
      resourcesPath
    };
  }
}

module.exports = PathUtils;

