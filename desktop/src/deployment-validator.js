/**
 * Deployment Validator
 * Comprehensive validation before deployment
 */

const fs = require('fs');
const path = require('path');

class DeploymentValidator {
  constructor(projectRoot, logger = null) {
    this.projectRoot = projectRoot;
    this.logger = logger;
    this.errors = [];
    this.warnings = [];
  }

  log(level, message) {
    if (this.logger) {
      this.logger(level, message, 'deployment-validator');
    } else {
      console.log(`[${level}] ${message}`);
    }
  }

  /**
   * Validate all components
   */
  async validateAll() {
    this.errors = [];
    this.warnings = [];

    // Core files
    this.validateCoreFiles();
    
    // Service builds
    this.validateServiceBuilds();
    
    // Configuration
    this.validateConfiguration();
    
    // Dependencies
    await this.validateDependencies();
    
    // Files
    this.validateRequiredFiles();

    return {
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  validateCoreFiles() {
    const requiredFiles = [
      'desktop/main.js',
      'desktop/package.json',
      'desktop/src/config.js',
      'desktop/src/service-manager.js',
      'desktop/src/window-manager.js'
    ];

    for (const file of requiredFiles) {
      const fullPath = path.join(this.projectRoot, file);
      if (!fs.existsSync(fullPath)) {
        this.errors.push(`Missing required file: ${file}`);
      }
    }
  }

  validateServiceBuilds() {
    const builds = [
      { name: 'Frontend', path: 'project/frontend/ucost-discovery-hub/dist' },
      { name: 'Backend', path: 'project/backend/backend/dist' },
      { name: 'Chatbot', path: 'project/chatbot-mini/dist' }
    ];

    for (const build of builds) {
      const buildPath = path.join(this.projectRoot, build.path);
      if (!fs.existsSync(buildPath)) {
        this.warnings.push(`${build.name} not built. Run: npm run build:${build.name.toLowerCase()}`);
      }
    }
  }

  validateConfiguration() {
    // Check icon file (optional)
    const iconPath = path.join(this.projectRoot, 'desktop/build/icon.ico');
    if (!fs.existsSync(iconPath)) {
      this.warnings.push('Icon file missing: desktop/build/icon.ico (installer will use default)');
    }

    // Check package.json
    const packagePath = path.join(this.projectRoot, 'desktop/package.json');
    if (fs.existsSync(packagePath)) {
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      if (!pkg.build || !pkg.build.appId) {
        this.warnings.push('Electron Builder configuration incomplete');
      }
    }
  }

  async validateDependencies() {
    // Check node_modules
    const desktopNodeModules = path.join(this.projectRoot, 'desktop/node_modules');
    if (!fs.existsSync(desktopNodeModules)) {
      this.errors.push('Desktop dependencies not installed. Run: cd desktop && npm install');
    }

    // Check backend node_modules
    const backendNodeModules = path.join(this.projectRoot, 'project/backend/backend/node_modules');
    if (!fs.existsSync(backendNodeModules)) {
      this.warnings.push('Backend dependencies not installed');
    }
  }

  validateRequiredFiles() {
    // Check CSV file
    const csvPath = path.join(this.projectRoot, 'docs/exhibits.csv');
    if (!fs.existsSync(csvPath)) {
      this.warnings.push('Exhibits CSV file not found: docs/exhibits.csv');
    }

    // Check Python scripts
    const pythonServices = [
      { name: 'Embed', path: 'project/embed-service/main.py' },
      { name: 'Gemma', path: 'gemma/infer/server.py' }
    ];

    for (const service of pythonServices) {
      const servicePath = path.join(this.projectRoot, service.path);
      if (!fs.existsSync(servicePath)) {
        this.warnings.push(`${service.name} service script not found: ${service.path}`);
      }
    }
  }

  /**
   * Generate validation report
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      valid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        status: this.errors.length === 0 ? 'READY' : 'NOT READY'
      }
    };

    return report;
  }
}

module.exports = DeploymentValidator;

