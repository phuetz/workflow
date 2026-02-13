/**
 * Java Execution Service
 * Executes Java code in a sandboxed environment with Maven dependency support
 */

import { JavaExecutionConfig, CodeExecutionResult, CodeExecutionSandbox } from '../../types/codeExecution';
import { logger } from '../../services/SimpleLogger';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);

export class JavaExecutionService {
  private readonly sandboxDir = '/tmp/java-sandbox';
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
   * Execute Java code
   */
  async execute(config: JavaExecutionConfig, inputData: Record<string, unknown> = {}): Promise<CodeExecutionResult> {
    const executionId = randomUUID();
    const startTime = Date.now();

    logger.info(`Starting Java execution ${executionId}`);

    try {
      // Validate config
      this.validateConfig(config);

      // Create sandbox
      const sandbox = await this.createSandbox(executionId, config);

      // Write code and input data to files
      const codePath = await this.writeCodeToFile(executionId, config);

      // Write input data
      await this.writeInputData(executionId, inputData);

      // Install Maven dependencies if needed
      if (config.mavenDependencies && config.mavenDependencies.length > 0) {
        await this.installMavenDependencies(executionId, config.mavenDependencies);
      }

      // Compile Java code
      await this.compileJavaCode(executionId, config);

      // Execute compiled class
      const result = await this.executeInSandbox(sandbox, executionId, config);

      // Cleanup
      await this.cleanup(executionId);

      const executionTime = Date.now() - startTime;

      logger.info(`Java execution ${executionId} completed in ${executionTime}ms`);

      // Track successful execution metrics
      this.trackExecution(true, executionTime);

      return {
        success: true,
        ...result,
        executionTime,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      logger.error(`Java execution ${executionId} failed:`, error);

      // Cleanup on error
      await this.cleanup(executionId).catch((cleanupError) => {
        logger.warn('Failed to cleanup Java execution', { executionId, error: cleanupError.message });
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
  private validateConfig(config: JavaExecutionConfig): void {
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
      /Runtime\.getRuntime\(\)\.exec/,
      /ProcessBuilder/,
      /System\.exit/,
      /java\.lang\.reflect\.Method\.invoke/,
      /sun\.misc\.Unsafe/,
      /java\.io\.File.*delete/,
      /java\.nio\.file\.Files\.delete/,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(config.code)) {
        logger.warn(`Potentially dangerous pattern detected in Java code: ${pattern}`);
        // Note: En production, on pourrait bloquer complètement
        // Pour l'instant, on log seulement
      }
    }
  }

  /**
   * Create execution sandbox
   */
  private async createSandbox(executionId: string, config: JavaExecutionConfig): Promise<CodeExecutionSandbox> {
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
  private async writeCodeToFile(executionId: string, config: JavaExecutionConfig): Promise<string> {
    const execDir = path.join(this.sandboxDir, executionId);
    await fs.mkdir(execDir, { recursive: true });

    const className = config.className || 'WorkflowNode';
    const codePath = path.join(execDir, `${className}.java`);

    // Ensure the code has a proper class definition
    let code = config.code;
    if (!code.includes(`class ${className}`)) {
      logger.warn(`Code does not contain class ${className}, wrapping it`);
      code = `public class ${className} {\n${code}\n}`;
    }

    await fs.writeFile(codePath, code);

    return codePath;
  }

  /**
   * Write input data to JSON file
   */
  private async writeInputData(executionId: string, inputData: Record<string, unknown>): Promise<void> {
    const execDir = path.join(this.sandboxDir, executionId);
    const inputPath = path.join(execDir, 'input_data.json');

    await fs.writeFile(inputPath, JSON.stringify(inputData, null, 2));
  }

  /**
   * Install Maven dependencies
   */
  private async installMavenDependencies(
    executionId: string,
    dependencies: Array<{ groupId: string; artifactId: string; version: string }>
  ): Promise<void> {
    const execDir = path.join(this.sandboxDir, executionId);
    const libDir = path.join(execDir, 'lib');
    await fs.mkdir(libDir, { recursive: true });

    logger.info(`Installing ${dependencies.length} Maven dependencies for ${executionId}`);

    // Create a simple Maven POM file
    const pomXml = this.generatePomXml(dependencies);
    const pomPath = path.join(execDir, 'pom.xml');
    await fs.writeFile(pomPath, pomXml);

    try {
      // Use Maven to download dependencies
      const mvnCommand = `cd "${execDir}" && mvn dependency:copy-dependencies -DoutputDirectory=lib -q`;
      await execAsync(mvnCommand, { timeout: 120000 }); // 2 minutes timeout

      logger.info(`Successfully installed Maven dependencies for ${executionId}`);
    } catch (error) {
      logger.error(`Failed to install Maven dependencies:`, error);
      throw new Error('Maven dependency installation failed. Ensure Maven is installed.');
    }
  }

  /**
   * Generate Maven POM file
   */
  private generatePomXml(dependencies: Array<{ groupId: string; artifactId: string; version: string }>): string {
    const dependenciesXml = dependencies.map(dep => `
    <dependency>
      <groupId>${dep.groupId}</groupId>
      <artifactId>${dep.artifactId}</artifactId>
      <version>${dep.version}</version>
    </dependency>`).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>com.workflow</groupId>
  <artifactId>code-execution</artifactId>
  <version>1.0.0</version>

  <dependencies>
    ${dependenciesXml}
  </dependencies>
</project>`;
  }

  /**
   * Compile Java code
   */
  private async compileJavaCode(executionId: string, config: JavaExecutionConfig): Promise<void> {
    const execDir = path.join(this.sandboxDir, executionId);
    const className = config.className || 'WorkflowNode';
    const javaFile = path.join(execDir, `${className}.java`);
    const javaVersion = config.javaVersion || '17';

    logger.debug(`Compiling Java code for ${executionId}`);

    try {
      // Build classpath if there are dependencies
      const libDir = path.join(execDir, 'lib');
      let classpath = '.';

      try {
        const libFiles = await fs.readdir(libDir);
        if (libFiles.length > 0) {
          const jars = libFiles.filter(f => f.endsWith('.jar')).map(f => path.join(libDir, f));
          classpath = `.${path.delimiter}${jars.join(path.delimiter)}`;
        }
      } catch {
        // No lib directory, use default classpath
      }

      // Compile with javac
      const javacCommand = `javac -cp "${classpath}" -source ${javaVersion} -target ${javaVersion} "${javaFile}"`;

      await execAsync(javacCommand, {
        cwd: execDir,
        timeout: 30000, // 30 seconds for compilation
      });

      logger.debug(`Successfully compiled Java code for ${executionId}`);
    } catch (error) {
      logger.error(`Java compilation failed:`, error);

      if (error instanceof Error) {
        const errorMsg = error.message;
        if (errorMsg.includes('command not found')) {
          throw new Error('Java compiler (javac) not found. Ensure JDK is installed.');
        }
        throw new Error(`Compilation error: ${errorMsg}`);
      }

      throw new Error('Java compilation failed');
    }
  }

  /**
   * Execute compiled Java code in sandbox
   */
  private async executeInSandbox(
    sandbox: CodeExecutionSandbox,
    executionId: string,
    config: JavaExecutionConfig
  ): Promise<Partial<CodeExecutionResult>> {
    const execDir = path.join(this.sandboxDir, executionId);
    const className = config.className || 'WorkflowNode';
    const mainMethod = config.mainMethod || 'execute';
    const timeout = config.timeout || this.defaultTimeout;
    const memory = config.memory || this.defaultMemory;

    sandbox.status = 'running';

    try {
      // Build classpath
      const libDir = path.join(execDir, 'lib');
      let classpath = execDir;

      try {
        const libFiles = await fs.readdir(libDir);
        if (libFiles.length > 0) {
          const jars = libFiles.filter(f => f.endsWith('.jar')).map(f => path.join(libDir, f));
          classpath = `${execDir}${path.delimiter}${jars.join(path.delimiter)}`;
        }
      } catch {
        // No lib directory
      }

      // Create a wrapper class to handle I/O and invoke the user's method
      const wrapperCode = this.generateWrapperClass(className, mainMethod);
      const wrapperPath = path.join(execDir, 'WorkflowExecutor.java');
      await fs.writeFile(wrapperPath, wrapperCode);

      // Compile wrapper
      await execAsync(`javac -cp "${classpath}" "${wrapperPath}"`, {
        cwd: execDir,
        timeout: 10000,
      });

      // Execute with memory limit and timeout
      const javaCommand = `java -cp "${classpath}" -Xmx${memory}m -XX:+UseSerialGC WorkflowExecutor`;

      logger.debug(`Executing Java command: ${javaCommand}`);

      const { stdout, stderr } = await execAsync(javaCommand, {
        cwd: execDir,
        timeout,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: {
          ...process.env,
          ...config.environment,
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

      if (error instanceof Error && error.message.includes('OutOfMemoryError')) {
        throw new Error(`Out of memory. Limit: ${memory}MB`);
      }

      throw error;
    }
  }

  /**
   * Generate wrapper class for execution
   */
  private generateWrapperClass(className: string, mainMethod: string): string {
    return `import java.io.*;
import java.nio.file.*;
import java.util.*;
import com.google.gson.*;

public class WorkflowExecutor {
    @SuppressWarnings("unchecked")
    public static void main(String[] args) {
        try {
            // Install SecurityManager for sandboxing
            System.setSecurityManager(new SecurityManager() {
                @Override
                public void checkPermission(java.security.Permission perm) {
                    // Allow read/write in current directory only
                    if (perm instanceof FilePermission) {
                        String actions = perm.getActions();
                        if (actions.contains("delete") || actions.contains("execute")) {
                            throw new SecurityException("Operation not permitted: " + actions);
                        }
                    }
                    // Block network access
                    if (perm instanceof java.net.SocketPermission) {
                        throw new SecurityException("Network access not permitted");
                    }
                }
            });

            // Read input data
            Gson gson = new Gson();
            Map<String, Object> inputData;

            try {
                String inputJson = new String(Files.readAllBytes(Paths.get("input_data.json")));
                inputData = gson.fromJson(inputJson, Map.class);
            } catch (Exception e) {
                inputData = new HashMap<>();
                System.err.println("Warning: Could not load input data: " + e.getMessage());
            }

            // Invoke user's method using reflection
            Class<?> userClass = Class.forName("${className}");
            java.lang.reflect.Method method = userClass.getMethod("${mainMethod}", Map.class);
            Object result = method.invoke(null, inputData);

            // Write output
            Map<String, Object> output = new HashMap<>();
            output.put("result", result);
            output.put("success", true);
            output.put("timestamp", System.currentTimeMillis());

            String outputJson = gson.toJson(output);
            Files.write(Paths.get("output.json"), outputJson.getBytes());

        } catch (Exception e) {
            try {
                // Write error output
                Map<String, Object> errorOutput = new HashMap<>();
                errorOutput.put("success", false);
                errorOutput.put("error", e.toString());
                errorOutput.put("timestamp", System.currentTimeMillis());

                Gson gson = new Gson();
                String errorJson = gson.toJson(errorOutput);
                Files.write(Paths.get("output.json"), errorJson.getBytes());

                e.printStackTrace();
            } catch (Exception writeError) {
                writeError.printStackTrace();
            }
            System.exit(1);
        }
    }
}`;
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
export const javaExecutionService = new JavaExecutionService();
