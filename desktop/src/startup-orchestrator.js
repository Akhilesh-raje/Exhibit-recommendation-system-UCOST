/**
 * StartupOrchestrator - Manages automatic startup of all services
 * 
 * Ensures services start in the correct order with health checks
 * and automatic retry logic
 */
class StartupOrchestrator {
    constructor(serviceManager, logger) {
        this.serviceManager = serviceManager;
        this.logger = logger;
        this.startupOrder = [
            'backend',   // Start first - others depend on it
            'embed',     // Python services can start in parallel
            'gemma',
            'ocr',
            'chatbot'    // Start last - depends on backend
        ];
        this.maxRetries = 3;
        this.retryDelay = 2000; // 2 seconds
    }

    /**
     * Start all services in the correct order
     */
    async startAll(serviceConfigs, onProgress) {
        this.logger.info('=== Starting Service Orchestration ===');

        const results = {
            started: [],
            failed: [],
            skipped: []
        };

        let progress = 0;
        const progressStep = 80 / this.startupOrder.length;

        // Phase 1: Start backend first (critical dependency)
        onProgress?.('Starting core backend...', progress);
        const backendResult = await this.startServiceWithRetry(
            'backend',
            serviceConfigs.backend
        );

        if (backendResult.success) {
            results.started.push('backend');
            this.logger.info(`✅ Backend started on port ${backendResult.port}`);
        } else {
            results.failed.push({ name: 'backend', error: backendResult.error });
            this.logger.error('❌ Backend failed to start - proceeding with limited functionality');
        }

        progress += progressStep;

        // Phase 2: Start other services
        const otherServices = this.startupOrder.filter(s => s !== 'backend');

        for (const serviceName of otherServices) {
            const config = serviceConfigs[serviceName];

            if (!config) {
                this.logger.warn(`No configuration found for service: ${serviceName}`);
                results.skipped.push(serviceName);
                continue;
            }

            onProgress?.(`Starting ${serviceName}...`, progress);

            const result = await this.startServiceWithRetry(serviceName, config);

            if (result.success) {
                results.started.push(serviceName);
                this.logger.info(`✅ ${serviceName} started on port ${result.port}`);
            } else {
                results.failed.push({ name: serviceName, error: result.error });
                this.logger.warn(`⚠️ ${serviceName} failed to start (non-critical)`);
            }

            progress += progressStep;
        }

        onProgress?.('All services started', 100);
        this.logger.info(`=== Startup Complete: ${results.started.length}/${this.startupOrder.length} services running ===`);

        return results;
    }

    /**
     * Start a single service with retry logic
     */
    async startServiceWithRetry(serviceName, config, retries = 0) {
        try {
            this.logger.info(`Starting ${serviceName} (attempt ${retries + 1}/${this.maxRetries + 1})...`);

            await this.serviceManager.startService(serviceName, config);

            // Wait a bit for service to initialize
            await this.sleep(1000);

            // Verify service is running
            const status = this.serviceManager.getServiceStatus(serviceName);

            if (status && status.status === 'running') {
                return { success: true, port: status.port };
            } else {
                throw new Error(`Service not running after start`);
            }

        } catch (error) {
            this.logger.error(`Failed to start ${serviceName}: ${error.message}`);

            if (retries < this.maxRetries) {
                this.logger.info(`Retrying ${serviceName} in ${this.retryDelay}ms...`);
                await this.sleep(this.retryDelay);
                return this.startServiceWithRetry(serviceName, config, retries + 1);
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * Monitor service health and restart if needed
     */
    startHealthMonitoring(serviceConfigs, onServiceDown) {
        this.logger.info('Starting health monitoring...');

        const checkInterval = 30000; // 30 seconds

        this.healthCheckInterval = setInterval(async () => {
            for (const serviceName of this.startupOrder) {
                const status = this.serviceManager.getServiceStatus(serviceName);

                if (!status || status.status !== 'running') {
                    this.logger.warn(`Service ${serviceName} is down - attempting restart...`);
                    onServiceDown?.(serviceName);

                    const config = serviceConfigs[serviceName];
                    if (config) {
                        await this.startServiceWithRetry(serviceName, config);
                    }
                }
            }
        }, checkInterval);
    }

    /**
     * Stop health monitoring
     */
    stopHealthMonitoring() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
            this.logger.info('Health monitoring stopped');
        }
    }

    /**
     * Helper: Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get startup progress for UI
     */
    getProgress() {
        const statuses = this.startupOrder.map(name => ({
            name,
            ...this.serviceManager.getServiceStatus(name)
        }));

        const running = statuses.filter(s => s.status === 'running').length;
        const percentage = Math.round((running / this.startupOrder.length) * 100);

        return {
            percentage,
            running,
            total: this.startupOrder.length,
            services: statuses
        };
    }
}

module.exports = StartupOrchestrator;
