/**
 * Canary Deployment with Progressive Traffic Splitting
 * Implements gradual rollout with automatic rollback on metrics degradation
 */

export interface CanaryConfig {
  version: string;
  stages: CanaryStage[];
  metricsThresholds: MetricsThresholds;
  autoRollback: boolean;
  manualApproval: boolean;
  monitoringInterval: number; // milliseconds
  stageDelay: number; // milliseconds between stages
}

export interface CanaryStage {
  name: string;
  trafficPercentage: number; // 0-100
  duration: number; // milliseconds
  approvalRequired?: boolean;
}

export interface MetricsThresholds {
  errorRate: number; // percentage (e.g., 1.0 means 1%)
  responseTime: number; // milliseconds (e.g., 500ms)
  cpuUtilization: number; // percentage
  memoryUtilization: number; // percentage
}

export interface DeploymentMetrics {
  timestamp: Date;
  version: string;
  errorRate: number;
  responseTime: number;
  requestCount: number;
  errorCount: number;
  cpuUtilization: number;
  memoryUtilization: number;
  activeConnections: number;
}

export interface CanaryDeployment {
  version: string;
  status: 'deploying' | 'monitoring' | 'completed' | 'rolledback' | 'failed';
  currentStage: number;
  startedAt: Date;
  completedAt?: Date;
  stages: CanaryStageResult[];
  metricsHistory: DeploymentMetrics[];
  rollbackReason?: string;
}

export interface CanaryStageResult {
  stage: CanaryStage;
  status: 'pending' | 'active' | 'completed' | 'failed' | 'awaiting_approval';
  startedAt?: Date;
  completedAt?: Date;
  metrics: DeploymentMetrics[];
  approved?: boolean;
  issues: string[];
}

export interface TrafficSplit {
  stable: number; // percentage to stable version
  canary: number; // percentage to canary version
}

export class CanaryDeployer {
  private currentDeployment?: CanaryDeployment;
  private stableVersion: string = '1.0.0';
  private canaryVersion?: string;
  private currentTrafficSplit: TrafficSplit = { stable: 100, canary: 0 };
  private monitoringInterval?: NodeJS.Timeout;
  private logger: (message: string) => void;

  constructor(logger?: (message: string) => void) {
    this.logger = logger || (() => {});
  }

  /**
   * Deploy new version using canary strategy
   */
  async deploy(config: CanaryConfig): Promise<CanaryDeployment> {
    if (this.currentDeployment && this.currentDeployment.status === 'deploying') {
      throw new Error('A canary deployment is already in progress');
    }

    this.logger(`Starting canary deployment for version ${config.version}`);
    this.logger(`Stages: ${config.stages.map(s => s.trafficPercentage + '%').join(' → ')}`);

    this.canaryVersion = config.version;

    // Initialize deployment
    this.currentDeployment = {
      version: config.version,
      status: 'deploying',
      currentStage: 0,
      startedAt: new Date(),
      stages: config.stages.map(stage => ({
        stage,
        status: 'pending',
        metrics: [],
        issues: []
      })),
      metricsHistory: []
    };

    try {
      // Deploy canary instances
      await this.deployCanaryInstances(config.version);

      // Execute each stage
      for (let i = 0; i < config.stages.length; i++) {
        const stage = config.stages[i];
        const stageResult = this.currentDeployment.stages[i];

        this.logger(`\n=== Stage ${i + 1}/${config.stages.length}: ${stage.name} (${stage.trafficPercentage}% traffic) ===`);

        this.currentDeployment.currentStage = i;
        stageResult.status = 'active';
        stageResult.startedAt = new Date();

        // Check for manual approval
        if (stage.approvalRequired || config.manualApproval) {
          this.logger('Waiting for manual approval...');
          stageResult.status = 'awaiting_approval';
          await this.waitForApproval(i);
          stageResult.approved = true;
        }

        // Update traffic split
        await this.updateTrafficSplit(stage.trafficPercentage);

        // Monitor metrics for stage duration
        this.logger(`Monitoring for ${stage.duration / 1000}s...`);
        const metricsOk = await this.monitorStage(stage, stageResult, config);

        if (!metricsOk) {
          throw new Error(`Metrics degraded during stage ${i + 1}`);
        }

        stageResult.status = 'completed';
        stageResult.completedAt = new Date();

        this.logger(`✓ Stage ${i + 1} completed successfully`);

        // Wait before next stage
        if (i < config.stages.length - 1) {
          this.logger(`Waiting ${config.stageDelay / 1000}s before next stage...`);
          await new Promise(resolve => setTimeout(resolve, config.stageDelay));
        }
      }

      // Deployment successful - promote canary to stable
      await this.promoteCanary();

      this.currentDeployment.status = 'completed';
      this.currentDeployment.completedAt = new Date();

      const duration = Date.now() - this.currentDeployment.startedAt.getTime();
      this.logger(`\nCanary deployment completed successfully in ${duration / 1000}s`);
      this.logger(`Version ${config.version} is now stable`);

      return this.currentDeployment;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger(`\nCanary deployment failed: ${errorMessage}`);

      if (config.autoRollback) {
        this.logger('Initiating automatic rollback...');
        await this.rollback();
        this.currentDeployment.status = 'rolledback';
        this.currentDeployment.rollbackReason = errorMessage;
      } else {
        this.currentDeployment.status = 'failed';
      }

      this.currentDeployment.completedAt = new Date();

      throw error;
    }
  }

  /**
   * Deploy canary instances
   */
  private async deployCanaryInstances(version: string): Promise<void> {
    this.logger('Deploying canary instances...');

    // This would integrate with container orchestration
    // For now, this is a placeholder

    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate deployment

    this.logger('Canary instances deployed and ready');
  }

  /**
   * Update traffic split
   */
  private async updateTrafficSplit(canaryPercentage: number): Promise<void> {
    const stablePercentage = 100 - canaryPercentage;

    this.logger(`Updating traffic split: ${stablePercentage}% stable, ${canaryPercentage}% canary`);

    // This would update load balancer, service mesh, or ingress controller
    // Examples:
    // - Update Istio VirtualService weights
    // - Update NGINX Ingress annotations
    // - Update AWS ALB target group weights
    // - Update Kubernetes service selector labels

    this.currentTrafficSplit = {
      stable: stablePercentage,
      canary: canaryPercentage
    };

    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate configuration update

    this.logger('Traffic split updated');
  }

  /**
   * Monitor stage metrics
   */
  private async monitorStage(
    stage: CanaryStage,
    stageResult: CanaryStageResult,
    config: CanaryConfig
  ): Promise<boolean> {
    const startTime = Date.now();
    const endTime = startTime + stage.duration;

    // Start monitoring
    let checksPassed = 0;
    let totalChecks = 0;

    while (Date.now() < endTime) {
      totalChecks++;

      // Collect metrics
      const canaryMetrics = await this.collectMetrics(this.canaryVersion!);
      const stableMetrics = await this.collectMetrics(this.stableVersion);

      stageResult.metrics.push(canaryMetrics);
      this.currentDeployment!.metricsHistory.push(canaryMetrics);

      // Compare metrics against thresholds
      const comparison = this.compareMetrics(
        canaryMetrics,
        stableMetrics,
        config.metricsThresholds
      );

      if (comparison.passed) {
        checksPassed++;
        this.logger(`Metrics check ${totalChecks}: ✓ PASSED`);
      } else {
        this.logger(`Metrics check ${totalChecks}: ✗ FAILED - ${comparison.issues.join(', ')}`);
        stageResult.issues.push(...comparison.issues);

        // Fail fast if metrics are significantly degraded
        if (comparison.critical) {
          this.logger('CRITICAL: Metrics significantly degraded, failing immediately');
          return false;
        }
      }

      // Log current metrics
      this.logger(`  Error rate: ${canaryMetrics.errorRate.toFixed(2)}% (threshold: ${config.metricsThresholds.errorRate}%)`);
      this.logger(`  Response time: ${canaryMetrics.responseTime}ms (threshold: ${config.metricsThresholds.responseTime}ms)`);
      this.logger(`  CPU: ${canaryMetrics.cpuUtilization}% (threshold: ${config.metricsThresholds.cpuUtilization}%)`);
      this.logger(`  Memory: ${canaryMetrics.memoryUtilization}% (threshold: ${config.metricsThresholds.memoryUtilization}%)`);

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, config.monitoringInterval));
    }

    // Calculate success rate
    const successRate = (checksPassed / totalChecks) * 100;
    this.logger(`Monitoring completed: ${checksPassed}/${totalChecks} checks passed (${successRate.toFixed(1)}%)`);

    // Require at least 80% of checks to pass
    return successRate >= 80;
  }

  /**
   * Collect metrics for a version
   */
  private async collectMetrics(version: string): Promise<DeploymentMetrics> {
    // This would integrate with monitoring system (Prometheus, Datadog, etc.)
    // For now, this returns simulated metrics

    const baseMetrics = {
      timestamp: new Date(),
      version,
      requestCount: Math.floor(Math.random() * 1000) + 500,
      errorCount: Math.floor(Math.random() * 5),
      cpuUtilization: Math.floor(Math.random() * 30) + 40,
      memoryUtilization: Math.floor(Math.random() * 20) + 50,
      activeConnections: Math.floor(Math.random() * 100) + 50
    };

    // Simulate canary potentially having slightly different metrics
    if (version === this.canaryVersion) {
      // Canary might have slightly higher resource usage (new code)
      baseMetrics.cpuUtilization += 5;
      baseMetrics.memoryUtilization += 3;
    }

    const errorRate = (baseMetrics.errorCount / baseMetrics.requestCount) * 100;
    const responseTime = Math.floor(Math.random() * 200) + 300;

    return {
      ...baseMetrics,
      errorRate,
      responseTime
    };
  }

  /**
   * Compare canary metrics against stable and thresholds
   */
  private compareMetrics(
    canary: DeploymentMetrics,
    stable: DeploymentMetrics,
    thresholds: MetricsThresholds
  ): { passed: boolean; critical: boolean; issues: string[] } {
    const issues: string[] = [];
    let critical = false;

    // Check error rate
    if (canary.errorRate > thresholds.errorRate) {
      issues.push(`Error rate ${canary.errorRate.toFixed(2)}% exceeds threshold ${thresholds.errorRate}%`);

      // Critical if error rate is 2x threshold
      if (canary.errorRate > thresholds.errorRate * 2) {
        critical = true;
      }
    }

    // Check if canary error rate is significantly higher than stable
    if (canary.errorRate > stable.errorRate * 1.5) {
      issues.push(`Error rate ${canary.errorRate.toFixed(2)}% is 50% higher than stable ${stable.errorRate.toFixed(2)}%`);
    }

    // Check response time
    if (canary.responseTime > thresholds.responseTime) {
      issues.push(`Response time ${canary.responseTime}ms exceeds threshold ${thresholds.responseTime}ms`);

      // Critical if response time is 2x threshold
      if (canary.responseTime > thresholds.responseTime * 2) {
        critical = true;
      }
    }

    // Check CPU utilization
    if (canary.cpuUtilization > thresholds.cpuUtilization) {
      issues.push(`CPU ${canary.cpuUtilization}% exceeds threshold ${thresholds.cpuUtilization}%`);
    }

    // Check memory utilization
    if (canary.memoryUtilization > thresholds.memoryUtilization) {
      issues.push(`Memory ${canary.memoryUtilization}% exceeds threshold ${thresholds.memoryUtilization}%`);
    }

    return {
      passed: issues.length === 0,
      critical,
      issues
    };
  }

  /**
   * Wait for manual approval
   */
  private async waitForApproval(stageIndex: number): Promise<void> {
    // In a real implementation, this would integrate with approval system
    // (e.g., Slack bot, web UI, etc.)

    // For now, simulate approval after delay
    await new Promise(resolve => setTimeout(resolve, 5000));

    this.logger('Stage approved');
  }

  /**
   * Manually approve a stage
   */
  approveStage(stageIndex: number): void {
    if (!this.currentDeployment) {
      throw new Error('No active deployment');
    }

    const stageResult = this.currentDeployment.stages[stageIndex];
    if (!stageResult) {
      throw new Error(`Stage ${stageIndex} not found`);
    }

    if (stageResult.status !== 'awaiting_approval') {
      throw new Error(`Stage ${stageIndex} is not awaiting approval`);
    }

    stageResult.approved = true;
    this.logger(`Stage ${stageIndex + 1} manually approved`);
  }

  /**
   * Promote canary to stable
   */
  private async promoteCanary(): Promise<void> {
    this.logger('Promoting canary to stable...');

    // Set canary as new stable version
    this.stableVersion = this.canaryVersion!;

    // Route 100% traffic to new version
    await this.updateTrafficSplit(100);

    // Destroy old stable instances
    this.logger('Destroying old stable instances...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    this.canaryVersion = undefined;
    this.logger('Promotion completed');
  }

  /**
   * Rollback canary deployment
   */
  async rollback(): Promise<void> {
    this.logger('Rolling back canary deployment...');

    // Route all traffic back to stable
    await this.updateTrafficSplit(0);

    // Destroy canary instances
    this.logger('Destroying canary instances...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    this.canaryVersion = undefined;

    this.logger(`Rollback completed to stable version ${this.stableVersion}`);
  }

  /**
   * Get current deployment status
   */
  getStatus(): {
    deployment?: CanaryDeployment;
    stableVersion: string;
    canaryVersion?: string;
    trafficSplit: TrafficSplit;
  } {
    return {
      deployment: this.currentDeployment,
      stableVersion: this.stableVersion,
      canaryVersion: this.canaryVersion,
      trafficSplit: this.currentTrafficSplit
    };
  }

  /**
   * Get deployment metrics
   */
  getMetrics(): {
    currentStage?: string;
    trafficSplit: TrafficSplit;
    latestMetrics?: DeploymentMetrics;
    issueCount: number;
  } {
    if (!this.currentDeployment) {
      return {
        trafficSplit: this.currentTrafficSplit,
        issueCount: 0
      };
    }

    const currentStageResult = this.currentDeployment.stages[this.currentDeployment.currentStage];
    const latestMetrics = this.currentDeployment.metricsHistory[this.currentDeployment.metricsHistory.length - 1];
    const issueCount = this.currentDeployment.stages.reduce((sum, s) => sum + s.issues.length, 0);

    return {
      currentStage: currentStageResult?.stage.name,
      trafficSplit: this.currentTrafficSplit,
      latestMetrics,
      issueCount
    };
  }

  /**
   * Create standard canary configuration
   */
  static createStandardConfig(version: string): CanaryConfig {
    return {
      version,
      stages: [
        { name: '1% Canary', trafficPercentage: 1, duration: 300000 }, // 5 minutes
        { name: '5% Canary', trafficPercentage: 5, duration: 300000 },
        { name: '10% Canary', trafficPercentage: 10, duration: 600000 }, // 10 minutes
        { name: '25% Canary', trafficPercentage: 25, duration: 600000 },
        { name: '50% Canary', trafficPercentage: 50, duration: 600000 },
        { name: '100% Rollout', trafficPercentage: 100, duration: 300000 }
      ],
      metricsThresholds: {
        errorRate: 1.0, // 1%
        responseTime: 500, // 500ms
        cpuUtilization: 80, // 80%
        memoryUtilization: 85 // 85%
      },
      autoRollback: true,
      manualApproval: false,
      monitoringInterval: 30000, // 30 seconds
      stageDelay: 60000 // 1 minute between stages
    };
  }
}
