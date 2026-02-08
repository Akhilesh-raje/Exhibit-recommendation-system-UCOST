const { spawn } = require('child_process');
const net = require('net');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

class ServiceManager {
  constructor() {
    this.services = new Map();
    this.ports = new Map();
    this.logger = null;
  }

  setLogger(logger) {
    this.logger = logger;
  }

  log(level, message, service = null) {
    if (this.logger) {
      this.logger(level, message, service);
    } else {
      console.log(`[${level}]${service ? ` [${service}]` : ''} ${message}`);
    }
  }

  async findAvailablePort(startPort, maxAttempts = 100) {
    for (let port = startPort; port < startPort + maxAttempts; port++) {
      if (await this.isPortAvailable(port)) {
        return port;
      }
    }
    throw new Error(`No available ports found starting from ${startPort}`);
  }

  isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.once('close', () => resolve(true));
        server.close();
      });
      server.on('error', () => resolve(false));
    });
  }

  getPythonExecutable() {
    const { setupPython } = require('../scripts/setup-python');

    // Priority 1: Check bundled Python in virtual environment
    const resourcesPath = process.resourcesPath || path.join(__dirname, '../../resources');
    const venvPython = process.platform === 'win32'
      ? path.join(resourcesPath, 'venv', 'Scripts', 'python.exe')
      : path.join(resourcesPath, 'venv', 'bin', 'python');

    if (fs.existsSync(venvPython)) {
      this.log('debug', `Using bundled Python: ${venvPython}`, 'python');
      return venvPython;
    }

    // Priority 2: Check bundled Python (without venv)
    const bundledPython = process.platform === 'win32'
      ? path.join(resourcesPath, 'python', 'python.exe')
      : path.join(resourcesPath, 'python', 'python3');

    if (fs.existsSync(bundledPython)) {
      this.log('debug', `Using bundled Python: ${bundledPython}`, 'python');
      return bundledPython;
    }

    // Priority 3: Use setup-python to detect system Python
    try {
      const result = setupPython({ resourcesPath });
      if (result && result.pythonExe && fs.existsSync(result.pythonExe)) {
        this.log('debug', `Using system Python: ${result.pythonExe}`, 'python');
        return result.pythonExe;
      }
    } catch (error) {
      this.log('warn', `Python setup failed: ${error.message}`, 'python');
    }

    // Priority 4: Try common system Python paths
    const pythonPaths = [
      'python',
      'python3',
      'py',
      'C:\\Python311\\python.exe',
      'C:\\Python310\\python.exe',
      'C:\\Python39\\python.exe',
      process.env.LOCALAPPDATA + '\\Programs\\Python\\Python311\\python.exe',
      process.env.PROGRAMFILES + '\\Python311\\python.exe'
    ];

    for (const pythonPath of pythonPaths) {
      try {
        if (path.isAbsolute(pythonPath) && !fs.existsSync(pythonPath)) {
          continue;
        }
        // Try to verify it's actually Python
        const { execSync } = require('child_process');
        execSync(`"${pythonPath}" --version`, {
          stdio: 'pipe',
          timeout: 2000
        });
        this.log('debug', `Using Python: ${pythonPath}`, 'python');
        return pythonPath;
      } catch (error) {
        continue;
      }
    }

    // Default to 'python' and let spawn handle the error
    this.log('warn', 'Python not found, using default "python" command', 'python');
    return 'python';
  }

  startNodeService(serviceConfig, port) {
    const env = {
      ...process.env,
      ...serviceConfig.env,
      PORT: port.toString()
    };

    const isDev = process.env.NODE_ENV !== 'production';
    let command = 'node';
    let args = [];

    if (isDev && serviceConfig.entry.endsWith('.ts')) {
      // Development mode with TypeScript
      // Check if service uses ES modules (has "type": "module" in package.json)
      const packageJsonPath = path.join(serviceConfig.path, 'package.json');
      let useESModules = false;
      try {
        const fs = require('fs');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          useESModules = packageJson.type === 'module';
        }
      } catch (error) {
        // If we can't read package.json, default to CommonJS
      }

      if (useESModules) {
        // Use tsx for ES modules (chatbot uses ES modules)
        command = 'npx';
        args = ['tsx', 'watch', serviceConfig.entry];
      } else {
        // Use ts-node-dev for CommonJS (backend uses CommonJS)
        command = 'npx';
        args = ['ts-node-dev', '--respawn', '--transpile-only', serviceConfig.entry];
      }
    } else {
      args = [serviceConfig.entry];
    }

    this.log('info', `Starting ${serviceConfig.name} on port ${port}`, serviceConfig.name);
    this.log('debug', `Command: ${command} ${args.join(' ')}`, serviceConfig.name);
    this.log('debug', `Working directory: ${serviceConfig.path}`, serviceConfig.name);

    // DEBUG: Check if paths exist
    const entryPath = path.join(serviceConfig.path, serviceConfig.entry);
    this.log('info', `Entry file: ${entryPath}`, serviceConfig.name);
    this.log('info', `Entry exists: ${fs.existsSync(entryPath)}`, serviceConfig.name);
    this.log('info', `Path exists: ${fs.existsSync(serviceConfig.path)}`, serviceConfig.name);

    // DEBUG: Log environment variables (sensitive values should be redacted in production, but we need this now)
    this.log('debug', `Starting service ${serviceConfig.name} on port ${port}`, serviceConfig.name);
    this.log('debug', `Environment DATABASE_URL: ${env.DATABASE_URL}`, serviceConfig.name);
    this.log('debug', `Environment PORT: ${env.PORT}`, serviceConfig.name);
    this.log('debug', `Working Directory: ${serviceConfig.path}`, serviceConfig.name);
    this.log('debug', `Command: ${command} ${args.join(' ')}`, serviceConfig.name);

    const childProcess = spawn(command, args, {
      cwd: serviceConfig.path,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });

    // CRITICAL: Write service logs to dedicated files
    try {
      const logDir = require('path').join(require('os').homedir(), 'AppData', 'Roaming', 'UCOST Discovery Hub', 'logs');
      const fs = require('fs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = require('path').join(logDir, `${serviceConfig.name}.log`);
      const logStream = fs.createWriteStream(logFile, { flags: 'a' });

      // Pipe both stdout and stderr to log file AND console
      if (childProcess.stdout) {
        childProcess.stdout.pipe(logStream, { end: false });
      }
      if (childProcess.stderr) {
        childProcess.stderr.pipe(logStream, { end: false });
      }

      this.log('debug', `Logging to: ${logFile}`, serviceConfig.name);
    } catch (logError) {
      this.log('warn', `Failed to setup file logging: ${logError.message}`, serviceConfig.name);
    }

    // Capture stdout
    childProcess.stdout.on('data', (data) => {
      this.log('info', data.toString().trim(), serviceConfig.name);
    });

    // Capture stderr
    childProcess.stderr.on('data', (data) => {
      this.log('error', data.toString().trim(), serviceConfig.name);
    });

    childProcess.on('error', (error) => {
      this.log('error', `Failed to start: ${error.message}`, serviceConfig.name);
    });

    childProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        this.log('error', `Exited with code ${code}`, serviceConfig.name);
      } else if (signal) {
        this.log('warn', `Exited with signal ${signal}`, serviceConfig.name);
      }
    });

    return childProcess;
  }

  startPythonService(serviceConfig, port) {
    const pythonExe = this.getPythonExecutable();
    const env = {
      ...process.env,
      ...serviceConfig.env,
      PORT: port.toString()
    };

    this.log('info', `Starting ${serviceConfig.name} on port ${port}`, serviceConfig.name);
    this.log('debug', `Python: ${pythonExe}`, serviceConfig.name);
    this.log('debug', `Script: ${serviceConfig.script}`, serviceConfig.name);
    this.log('debug', `Working directory: ${serviceConfig.path}`, serviceConfig.name);

    // For FastAPI services, use uvicorn
    // For regular Python scripts, run directly
    let args = [];
    if (serviceConfig.script.endsWith('.py')) {
      // Check if it's a FastAPI app (has app = FastAPI())
      // For now, assume all Python services use uvicorn
      const moduleName = serviceConfig.script.replace('.py', '');
      args = ['-m', 'uvicorn', `${moduleName}:app`, '--host', '127.0.0.1', '--port', port.toString(), '--log-level', 'info'];
    } else {
      args = [serviceConfig.script, '--port', port.toString()];
    }

    const childProcess = spawn(pythonExe, args, {
      cwd: serviceConfig.path,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false  // CRITICAL: Don't use shell to avoid path parsing issues
    });

    // Capture stdout
    childProcess.stdout.on('data', (data) => {
      this.log('info', data.toString().trim(), serviceConfig.name);
    });

    // Capture stderr
    childProcess.stderr.on('data', (data) => {
      this.log('error', data.toString().trim(), serviceConfig.name);
    });

    childProcess.on('error', (error) => {
      this.log('error', `Failed to start: ${error.message}`, serviceConfig.name);
      if (error.code === 'ENOENT') {
        this.log('error', `Python not found. Please install Python 3.10+ or bundle Python runtime.`, serviceConfig.name);
      }
    });

    childProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        this.log('error', `Exited with code ${code}`, serviceConfig.name);
      } else if (signal) {
        this.log('warn', `Exited with signal ${signal}`, serviceConfig.name);
      }
    });

    return childProcess;
  }

  async startService(name, serviceConfig, serviceConfigs = null, retryCount = 0, maxRetries = 3) {
    try {
      // In development mode, check if service is already running
      const isDev = process.env.NODE_ENV !== 'production';
      if (isDev && serviceConfig.healthCheck) {
        try {
          const axios = require('axios');
          const response = await axios.get(serviceConfig.healthCheck.url, {
            timeout: 2000,
            validateStatus: (status) => status < 500
          });
          if (response.status < 500) {
            // Service is already running, just register it
            this.log('info', `Service ${name} already running, connecting to existing instance`, name);
            const service = {
              name,
              port: serviceConfig.port,
              process: null,
              status: 'running',
              config: serviceConfig,
              startTime: Date.now(),
              external: true // Mark as external service
            };
            this.services.set(name, service);
            this.ports.set(name, serviceConfig.port);
            return service;
          }
        } catch (error) {
          // Service not running, continue to start it
          this.log('debug', `Service ${name} not running, will start new instance`, name);
        }
      }

      // STATE-OF-THE-ART: Find available port with conflict handling
      let port;
      try {
        port = await this.findAvailablePort(serviceConfig.port);
      } catch (error) {
        // If port finding fails, try alternative ports
        this.log('warn', `Port ${serviceConfig.port} unavailable, trying alternatives...`, name);
        port = await this.findAvailablePort(serviceConfig.port + 100, 50);
      }

      // Update service config with actual port
      if (port !== serviceConfig.port) {
        this.log('info', `Using alternative port ${port} for ${name} (${serviceConfig.port} was in use)`, name);
        serviceConfig.env.PORT = port.toString();
        if (serviceConfig.healthCheck) {
          serviceConfig.healthCheck.url = serviceConfig.healthCheck.url.replace(
            `:${serviceConfig.port}`,
            `:${port}`
          );
        }
      }

      this.ports.set(name, port);

      const service = {
        name,
        port,
        process: null,
        status: 'starting',
        config: serviceConfig,
        startTime: Date.now()
      };

      // STATE-OF-THE-ART: Wait for dependencies before starting
      if (serviceConfigs) {
        await this.waitForDependencies(name, serviceConfig, serviceConfigs);
      }

      // Start the service based on type
      if (serviceConfig.type === 'node') {
        service.process = this.startNodeService(serviceConfig, port);
      } else if (serviceConfig.type === 'python') {
        service.process = this.startPythonService(serviceConfig, port);
      } else {
        throw new Error(`Unknown service type: ${serviceConfig.type}`);
      }

      this.services.set(name, service);

      // Wait for health check (with timeout)
      if (serviceConfig.healthCheck) {
        const healthCheckPassed = await this.waitForService(name, port, serviceConfig.healthCheck);
        if (!healthCheckPassed) {
          // Health check failed, but continue anyway
          this.log('warn', `Health check failed for ${name}, but continuing...`, name);
          service.status = 'warning'; // Mark as warning instead of error
        }
      } else {
        // Give service a moment to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        service.status = 'running';
      }

      if (service.status !== 'error') {
        this.log('info', `✓ ${name} started on port ${port}`, name);
      }
      return service;
    } catch (error) {
      // STATE-OF-THE-ART: Retry mechanism with exponential backoff
      if (retryCount < maxRetries && (error.message.includes('timeout') || error.message.includes('ECONNREFUSED'))) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
        this.log('warn', `Service ${name} failed, retrying in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})...`, name);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.startService(name, serviceConfig, serviceConfigs, retryCount + 1, maxRetries);
      }

      this.log('error', `Failed to start ${name}: ${error.message}`, name);
      if (this.services.has(name)) {
        const service = this.services.get(name);
        service.status = 'error';
        service.error = error.message;
      }

      // For Python services, provide more helpful error messages
      if (serviceConfig.type === 'python' && error.message.includes('ENOENT')) {
        throw new Error(`Python service ${name} failed: Python executable not found. Please install Python 3.8+ or bundle Python with the app.`);
      }

      throw error;
    }
  }

  /**
   * STATE-OF-THE-ART: Wait for service dependencies before starting
   */
  async waitForDependencies(serviceName, serviceConfig, serviceConfigs) {
    const dependencies = serviceConfig.dependencies || [];

    for (const depName of dependencies) {
      const depService = this.services.get(depName);
      if (!depService || depService.status !== 'running') {
        this.log('info', `Waiting for dependency ${depName} before starting ${serviceName}...`, serviceName);

        // Wait for dependency with timeout
        const maxWait = 30000; // 30 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
          const dep = this.services.get(depName);
          if (dep && dep.status === 'running') {
            // Verify dependency is actually healthy
            if (dep.config && dep.config.healthCheck) {
              try {
                const axios = require('axios');
                await axios.get(dep.config.healthCheck.url, { timeout: 2000 });
                this.log('info', `Dependency ${depName} is healthy, starting ${serviceName}...`, serviceName);
                break;
              } catch (error) {
                // Dependency not healthy yet, continue waiting
              }
            } else {
              break;
            }
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Check if dependency is ready
        const dep = this.services.get(depName);
        if (!dep || dep.status !== 'running') {
          throw new Error(`Dependency ${depName} failed to start. Cannot start ${serviceName}.`);
        }
      }
    }
  }

  async waitForService(name, port, healthCheck, maxAttempts = null) {
    // Calculate attempts with a maximum limit to prevent infinite waiting
    const calculatedAttempts = maxAttempts || Math.ceil(healthCheck.timeout / healthCheck.interval);
    const attempts = Math.min(calculatedAttempts, 30); // Max 30 attempts to prevent hanging
    const url = healthCheck.url.replace(/localhost:\d+/, `localhost:${port}`);
    const startTime = Date.now();
    const maxWaitTime = healthCheck.timeout || 30000; // Default 30 seconds max

    this.log('debug', `Waiting for ${name} health check (max ${attempts} attempts, ${maxWaitTime}ms)`, name);

    for (let i = 0; i < attempts; i++) {
      // Check if we've exceeded max wait time
      if (Date.now() - startTime > maxWaitTime) {
        this.log('warn', `Health check timeout for ${name} after ${Date.now() - startTime}ms`, name);
        const service = this.services.get(name);
        if (service) {
          service.status = 'error';
          service.error = 'Health check timeout';
        }
        throw new Error(`Service ${name} health check timeout after ${maxWaitTime}ms`);
      }

      try {
        const response = await axios.get(url, {
          timeout: Math.min(healthCheck.timeout || 5000, 5000), // Max 5s per request
          validateStatus: (status) => status < 500 // Accept 2xx, 3xx, 4xx
        });

        if (response.status < 500) {
          const service = this.services.get(name);
          if (service) {
            service.status = 'running';
          }
          this.log('info', `✓ ${name} health check passed (attempt ${i + 1}/${attempts})`, name);
          return true;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
        if (i < attempts - 1) {
          // Not the last attempt, wait and continue
          await new Promise(resolve => setTimeout(resolve, healthCheck.interval));
          continue;
        } else {
          // Last attempt failed
          this.log('warn', `Health check failed for ${name} after ${attempts} attempts: ${error.message}`, name);
          const service = this.services.get(name);
          if (service) {
            service.status = 'error';
            service.error = `Health check failed: ${error.message}`;
          }
          // Don't throw - let the app continue
          return false;
        }
      }

      await new Promise(resolve => setTimeout(resolve, healthCheck.interval));
    }

    // If we get here, all attempts failed
    this.log('warn', `Service ${name} health check failed after ${attempts} attempts`, name);
    const service = this.services.get(name);
    if (service) {
      service.status = 'error';
      service.error = 'Health check failed - service may not be responding';
    }
    return false; // Don't throw, allow app to continue
  }

  async stopService(name) {
    const service = this.services.get(name);
    if (service) {
      // Don't stop external services (services we didn't start)
      if (service.external) {
        this.log('info', `Service ${name} is external, not stopping`, name);
        this.services.delete(name);
        this.ports.delete(name);
        return;
      }

      if (service.process) {
        this.log('info', `Stopping ${name}...`, name);
        try {
          // Try graceful shutdown
          service.process.kill('SIGTERM');

          // Wait for graceful shutdown
          await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              service.process.kill('SIGKILL');
              resolve();
            }, 5000);

            service.process.once('exit', () => {
              clearTimeout(timeout);
              resolve();
            });
          });

          this.log('info', `✓ ${name} stopped`, name);
        } catch (error) {
          this.log('error', `Error stopping ${name}: ${error.message}`, name);
          service.process.kill('SIGKILL');
        }
      }
      this.services.delete(name);
      this.ports.delete(name);
    }
  }

  async stopAll() {
    this.log('info', 'Stopping all services...');
    const stopPromises = [];
    for (const [name] of this.services) {
      stopPromises.push(this.stopService(name));
    }
    await Promise.all(stopPromises);
    this.log('info', 'All services stopped');
  }

  getServiceStatus(name) {
    const service = this.services.get(name);
    if (!service) return { status: 'not_started' };
    return {
      status: service.status,
      port: service.port,
      uptime: service.status === 'running' ? Date.now() - service.startTime : 0,
      error: service.error || null
    };
  }

  getAllServiceStatus() {
    const status = {};
    for (const [name] of this.services) {
      status[name] = this.getServiceStatus(name);
    }
    return status;
  }
}

module.exports = ServiceManager;

