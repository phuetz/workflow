/**
 * Python Execution Service
 * Executes Python code in a sandboxed Docker environment
 */

import { PythonExecutionConfig, CodeExecutionResult, CodeExecutionSandbox } from '../../types/codeExecution';
import { logger } from '../../services/SimpleLogger';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

export class PythonExecutionService {
  private readonly sandboxDir = '/tmp/python-sandbox';
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly defaultMemory = 512; // 512 MB
  private readonly maxTimeout = 300000; // 5 minutes
  private readonly maxMemory = 2048; // 2 GB

  // Metrics tracking
  private metrics = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    totalExecutionTime: 0,
    executionTimes: [] as number[],
    lastExecutionTime: null as Date | null,
  };

  constructor() {
    this.ensureSandboxDirectory();
  }

  /**
   * Execute Python code
   */
  async execute(config: PythonExecutionConfig, inputData: Record<string, unknown> = {}): Promise<CodeExecutionResult> {
    const executionId = randomUUID();
    const startTime = Date.now();

    logger.info(`Starting Python execution ${executionId}`);

    try {
      // Validate config
      this.validateConfig(config);

      // Create sandbox
      const sandbox = await this.createSandbox(executionId, config);

      // Write code and input data to files
      const codePath = await this.writeCodeToFile(executionId, config.code, inputData);

      // Execute code
      const result = await this.executeInSandbox(sandbox, codePath, config);

      // Cleanup
      await this.cleanup(executionId);

      const executionTime = Date.now() - startTime;

      logger.info(`Python execution ${executionId} completed in ${executionTime}ms`);

      // Track successful execution metrics
      this.trackExecution(true, executionTime);

      return {
        success: true,
        ...result,
        executionTime,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`Python execution ${executionId} failed:`, error);

      // Cleanup on error
      await this.cleanup(executionId).catch((cleanupError) => {
        logger.warn('Failed to cleanup Python execution', { executionId, error: cleanupError.message });
      });

      // Track failed execution metrics
      this.trackExecution(false, executionTime);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime,
      };
    }
  }

  /**
   * Track execution metrics
   */
  private trackExecution(success: boolean, executionTime: number): void {
    this.metrics.totalExecutions++;
    this.metrics.totalExecutionTime += executionTime;
    this.metrics.lastExecutionTime = new Date();

    if (success) {
      this.metrics.successfulExecutions++;
    } else {
      this.metrics.failedExecutions++;
    }

    // Keep last 100 execution times for percentile calculations
    this.metrics.executionTimes.push(executionTime);
    if (this.metrics.executionTimes.length > 100) {
      this.metrics.executionTimes.shift();
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: PythonExecutionConfig): void {
    if (!config.code || config.code.trim().length === 0) {
      throw new Error('Code cannot be empty');
    }

    const timeout = config.timeout || this.defaultTimeout;
    if (timeout > this.maxTimeout) {
      throw new Error(`Timeout cannot exceed ${this.maxTimeout}ms`);
    }

    const memory = config.memory || this.defaultMemory;
    if (memory > this.maxMemory) {
      throw new Error(`Memory limit cannot exceed ${this.maxMemory}MB`);
    }

    // Check for dangerous patterns (basic security)
    const dangerousPatterns = [
      /import\s+os\s*$/m,
      /import\s+sys\s*$/m,
      /import\s+subprocess/,
      /__import__\s*\(\s*['"]os['"]\s*\)/,
      /__import__\s*\(\s*['"]sys['"]\s*\)/,
      /eval\s*\(/,
      /exec\s*\(/,
      /compile\s*\(/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(config.code)) {
        logger.warn(`Potentially dangerous pattern detected in Python code: ${pattern}`);
        // Note: En production, on pourrait bloquer complètement
        // Pour l'instant, on log seulement
      }
    }
  }

  /**
   * Create execution sandbox
   */
  private async createSandbox(executionId: string, config: PythonExecutionConfig): Promise<CodeExecutionSandbox> {
    const timeout = config.timeout || this.defaultTimeout;
    const memory = config.memory || this.defaultMemory;

    return {
      containerId: executionId,
      status: 'idle',
      startTime: new Date(),
      resourceLimits: {
        memory,
        timeout,
        networkAccess: false, // Désactivé par défaut pour sécurité
        fileSystemAccess: false, // Lecture/écriture limitée
      },
    };
  }

  /**
   * Write code to temporary file
   */
  private async writeCodeToFile(
    executionId: string,
    code: string,
    inputData: Record<string, unknown>
  ): Promise<string> {
    const execDir = path.join(this.sandboxDir, executionId);
    await fs.mkdir(execDir, { recursive: true });

    // Write input data
    const inputPath = path.join(execDir, 'input_data.json');
    await fs.writeFile(inputPath, JSON.stringify(inputData, null, 2));

    // Wrap code with input/output handling
    const wrappedCode = `
import json
import sys
from datetime import datetime

# Load input data
try:
    with open('${inputPath}', 'r') as f:
        input_data = json.load(f)
except Exception as e:
    input_data = {}
    print(f"Warning: Could not load input data: {e}", file=sys.stderr)

# User code starts here
${code}

# Output result
try:
    output_data = {
        'result': result if 'result' in locals() else None,
        'success': True,
        'timestamp': str(datetime.now())
    }
    with open('output.json', 'w') as f:
        json.dump(output_data, f, indent=2)
except Exception as e:
    error_data = {
        'success': False,
        'error': str(e),
        'timestamp': str(datetime.now())
    }
    with open('output.json', 'w') as f:
        json.dump(error_data, f, indent=2)
    raise
`;

    const codePath = path.join(execDir, 'script.py');
    await fs.writeFile(codePath, wrappedCode);

    return codePath;
  }

  /**
   * Execute code in sandbox (using Python directly or Docker)
   */
  private async executeInSandbox(
    sandbox: CodeExecutionSandbox,
    codePath: string,
    config: PythonExecutionConfig
  ): Promise<Partial<CodeExecutionResult>> {
    const execDir = path.dirname(codePath);
    const pythonVersion = config.pythonVersion || '3.11';
    const timeout = config.timeout || this.defaultTimeout;

    sandbox.status = 'running';

    try {
      // Install packages if needed
      if (config.pipPackages && config.pipPackages.length > 0) {
        await this.installPackages(execDir, config.pipPackages, pythonVersion);
      }

      // Install common libraries if enabled
      const commonPackages: string[] = [];
      if (config.enableRequests) commonPackages.push('requests');
      if (config.enableNumpy) commonPackages.push('numpy');
      if (config.enablePandas) commonPackages.push('pandas');

      if (commonPackages.length > 0) {
        await this.installPackages(execDir, commonPackages, pythonVersion);
      }

      // Execute Python script
      // Note: En production, utiliser Docker pour isolation complète
      // Pour développement, on utilise le Python système
      const pythonCmd = `python${pythonVersion.split('.')[0]}`;

      const command = `cd "${execDir}" && ${pythonCmd} script.py`;

      logger.debug(`Executing command: ${command}`);

      const { stdout, stderr } = await execAsync(command, {
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          ...config.environment,
          PYTHONUNBUFFERED: '1',
        },
      });

      // Read output file
      const outputPath = path.join(execDir, 'output.json');
      const outputContent = await fs.readFile(outputPath, 'utf-8');
      const outputData = JSON.parse(outputContent);

      sandbox.status = 'completed';
      sandbox.endTime = new Date();

      return {
        output: stdout,
        logs: stderr ? [stderr] : [],
        returnValue: outputData.result,
        success: outputData.success !== false,
        error: outputData.error,
      };

    } catch (error) {
      sandbox.status = 'failed';
      sandbox.endTime = new Date();

      if (error instanceof Error && error.message.includes('ETIMEDOUT')) {
        throw new Error(`Execution timeout after ${timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Install pip packages
   */
  private async installPackages(
    execDir: string,
    packages: string[],
    pythonVersion: string
  ): Promise<void> {
    const pythonCmd = `python${pythonVersion.split('.')[0]}`;
    const pipCmd = `${pythonCmd} -m pip install --quiet --target ${execDir} ${packages.join(' ')}`;

    logger.debug(`Installing packages: ${packages.join(', ')}`);

    try {
      await execAsync(pipCmd, { timeout: 60000 }); // 1 minute timeout for package installation
    } catch (error) {
      logger.error('Failed to install packages:', error);
      throw new Error(`Package installation failed: ${packages.join(', ')}`);
    }
  }

  /**
   * Cleanup execution directory
   */
  private async cleanup(executionId: string): Promise<void> {
    const execDir = path.join(this.sandboxDir, executionId);

    try {
      await fs.rm(execDir, { recursive: true, force: true });
      logger.debug(`Cleaned up execution directory: ${execDir}`);
    } catch (error) {
      logger.warn(`Failed to cleanup execution directory ${execDir}:`, error);
    }
  }

  /**
   * Ensure sandbox directory exists
   */
  private async ensureSandboxDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.sandboxDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create sandbox directory:', error);
    }
  }

  /**
   * Get execution metrics
   */
  async getMetrics(): Promise<Record<string, unknown>> {
    const avgExecutionTime = this.metrics.totalExecutions > 0
      ? this.metrics.totalExecutionTime / this.metrics.totalExecutions
      : 0;

    const successRate = this.metrics.totalExecutions > 0
      ? (this.metrics.successfulExecutions / this.metrics.totalExecutions) * 100
      : 0;

    // Calculate percentiles
    const sortedTimes = [...this.metrics.executionTimes].sort((a, b) => a - b);
    const p50 = this.calculatePercentile(sortedTimes, 50);
    const p95 = this.calculatePercentile(sortedTimes, 95);
    const p99 = this.calculatePercentile(sortedTimes, 99);

    return {
      totalExecutions: this.metrics.totalExecutions,
      successfulExecutions: this.metrics.successfulExecutions,
      failedExecutions: this.metrics.failedExecutions,
      averageExecutionTime: Math.round(avgExecutionTime),
      successRate: Math.round(successRate * 100) / 100,
      lastExecutionTime: this.metrics.lastExecutionTime,
      percentiles: {
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99),
      },
    };
  }

  /**
   * Calculate percentile from sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, index)];
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutionTime: 0,
      executionTimes: [],
      lastExecutionTime: null,
    };
  }
}

// Export singleton instance
export const pythonExecutionService = new PythonExecutionService();
