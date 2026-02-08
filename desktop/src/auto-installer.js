const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/**
 * AutoInstaller - Handles first-run setup and dependency management
 * 
 * Features:
 * - Detects first-run scenarios
 * - Verifies all dependencies are present
 * - Provides progress callbacks for UI updates
 */
class AutoInstaller {
    constructor(resourcesPath, userDataPath, logger) {
        this.resourcesPath = resourcesPath;
        this.userDataPath = userDataPath;
        this.logger = logger;
        this.flagFile = path.join(userDataPath, '.setup_complete');
    }

    /**
     * Check if this is the first run
     */
    isFirstRun() {
        return !fs.existsSync(this.flagFile);
    }

    /**
     * Mark setup as complete
     */
    markSetupComplete() {
        try {
            fs.writeFileSync(this.flagFile, new Date().toISOString());
            this.logger.info('Setup marked as complete');
        } catch (error) {
            this.logger.error(`Failed to mark setup complete: ${error.message}`);
        }
    }

    /**
     * Verify all critical resources exist
     */
    verifyResources() {
        const requiredPaths = [
            { name: 'Backend', path: path.join(this.resourcesPath, 'backend') },
            { name: 'Frontend', path: path.join(this.resourcesPath, 'frontend') },
            { name: 'Chatbot', path: path.join(this.resourcesPath, 'chatbot') },
            { name: 'Embed Service', path: path.join(this.resourcesPath, 'embed-service') },
            { name: 'Gemma Service', path: path.join(this.resourcesPath, 'gemma') },
            { name: 'OCR Engine', path: path.join(this.resourcesPath, 'ocr-engine') }
        ];

        const missing = [];
        const verified = [];

        for (const item of requiredPaths) {
            if (fs.existsSync(item.path)) {
                verified.push(item.name);
                this.logger.info(`✅ ${item.name} found at: ${item.path}`);
            } else {
                missing.push(item.name);
                this.logger.warn(`❌ ${item.name} NOT found at: ${item.path}`);
            }
        }

        return {
            success: missing.length === 0,
            verified,
            missing,
            total: requiredPaths.length
        };
    }

    /**
     * Check for Python installation
     */
    async checkPython(onProgress) {
        return new Promise((resolve) => {
            onProgress?.('Checking Python installation...', 10);

            const python = spawn('python', ['--version'], { shell: true });
            let version = '';

            python.stdout.on('data', (data) => {
                version += data.toString();
            });

            python.stderr.on('data', (data) => {
                version += data.toString();
            });

            python.on('close', (code) => {
                if (code === 0 && version.includes('Python')) {
                    this.logger.info(`Python found: ${version.trim()}`);
                    onProgress?.('Python installed ✓', 20);
                    resolve({ installed: true, version: version.trim() });
                } else {
                    this.logger.warn('Python not found on PATH');
                    onProgress?.('Python not found (services will be limited)', 20);
                    resolve({ installed: false, version: null });
                }
            });

            python.on('error', () => {
                resolve({ installed: false, version: null });
            });
        });
    }

    /**
     * Run first-time setup
     */
    async runFirstTimeSetup(onProgress) {
        this.logger.info('=== Running First-Time Setup ===');

        try {
            // Step 1: Verify Resources
            onProgress?.('Verifying bundled resources...', 5);
            const resourceCheck = this.verifyResources();

            if (!resourceCheck.success) {
                throw new Error(`Missing resources: ${resourceCheck.missing.join(', ')}`);
            }

            onProgress?.(`All resources verified (${resourceCheck.verified.length}/${resourceCheck.total})`, 15);

            // Step 2: Check Python
            const pythonCheck = await this.checkPython(onProgress);
            if (!pythonCheck.installed) {
                this.logger.warn('Python not available - some services will be disabled');
            }

            // Step 3: Setup Database Directory
            onProgress?.('Setting up database...', 40);
            const dbDir = path.join(this.userDataPath, 'database');
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }

            // Step 4: Setup Upload Directory
            onProgress?.('Setting up upload directory...', 50);
            const uploadDir = path.join(this.userDataPath, 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            // Step 5: Setup Cache Directory
            onProgress?.('Setting up cache directory...', 60);
            const cacheDir = path.join(this.userDataPath, 'cache');
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            // Step 6: Setup Logs Directory
            onProgress?.('Setting up logs directory...', 70);
            const logsDir = path.join(this.userDataPath, 'logs');
            if (!fs.existsSync(logsDir)) {
                fs.mkdirSync(logsDir, { recursive: true });
            }

            // Mark setup as complete
            this.markSetupComplete();

            onProgress?.('Setup complete!', 100);
            this.logger.info('=== First-Time Setup Complete ===');

            return {
                success: true,
                pythonAvailable: pythonCheck.installed,
                resourcesVerified: resourceCheck.verified
            };

        } catch (error) {
            this.logger.error(`First-time setup failed: ${error.message}`);
            onProgress?.(`Setup failed: ${error.message}`, 0);
            throw error;
        }
    }

    /**
     * Quick setup check for subsequent runs
     */
    async quickSetupCheck(onProgress) {
        this.logger.info('Running quick setup check...');

        try {
            onProgress?.('Verifying installation...', 10);

            const resourceCheck = this.verifyResources();
            if (!resourceCheck.success) {
                this.logger.warn(`Some resources missing: ${resourceCheck.missing.join(', ')}`);
                // Don't fail - try to continue
            }

            onProgress?.('Installation verified', 100);

            return {
                success: true,
                resourcesVerified: resourceCheck.verified
            };

        } catch (error) {
            this.logger.error(`Quick setup check failed: ${error.message}`);
            throw error;
        }
    }
}

module.exports = AutoInstaller;
