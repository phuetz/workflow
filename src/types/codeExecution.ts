/**
 * Code Execution Types
 * Support pour Python, Java, et autres langages
 */

export type CodeLanguage = 'python' | 'java' | 'javascript' | 'typescript';

export type ExecutionMode = 'sync' | 'async';

export interface CodeExecutionConfig {
  language: CodeLanguage;
  code: string;
  mode: ExecutionMode;
  timeout?: number; // milliseconds
  memory?: number; // MB
  environment?: Record<string, string>;
  packages?: string[]; // Dependencies to install
  inputVariables?: Record<string, unknown>;
}

export interface CodeExecutionResult {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number; // milliseconds
  memoryUsed?: number; // MB
  logs?: string[];
  returnValue?: unknown;
}

export interface PythonExecutionConfig extends CodeExecutionConfig {
  language: 'python';
  pythonVersion?: '3.9' | '3.10' | '3.11' | '3.12';
  pipPackages?: string[]; // pip install packages
  enableNumpy?: boolean;
  enablePandas?: boolean;
  enableRequests?: boolean;
}

export interface JavaExecutionConfig extends CodeExecutionConfig {
  language: 'java';
  javaVersion?: '11' | '17' | '21';
  mavenDependencies?: Array<{
    groupId: string;
    artifactId: string;
    version: string;
  }>;
  className?: string;
  mainMethod?: string;
}

export interface CodeExecutionSandbox {
  containerId?: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'timeout';
  startTime?: Date;
  endTime?: Date;
  resourceLimits: {
    cpu?: number; // CPU cores
    memory: number; // MB
    timeout: number; // ms
    networkAccess: boolean;
    fileSystemAccess: boolean;
  };
}

export interface CodeExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
  peakMemoryUsage: number;
}
