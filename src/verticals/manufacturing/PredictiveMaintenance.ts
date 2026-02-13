/**
 * Predictive Maintenance Engine
 * ML-powered predictive maintenance and digital twin integration
 */

import type {
  MachineStatus,
  SensorReading,
  PredictiveMaintenanceAlert,
  MaintenanceSchedule,
  DigitalTwin,
  Anomaly,
  Prediction,
  Optimization,
  OEEMetrics,
  ProductionMetrics,
} from './types/manufacturing';

export interface PredictiveMaintenanceConfig {
  alertThresholds: {
    failureProbability: number; // 0-100
    timeToFailure: number; // hours
  };
  historicalDataWindow: number; // days
  anomalyDetectionSensitivity: 'low' | 'medium' | 'high';
}

export class PredictiveMaintenanceEngine {
  private config: PredictiveMaintenanceConfig;
  private alerts: Map<string, PredictiveMaintenanceAlert> = new Map();
  private twins: Map<string, DigitalTwin> = new Map();
  private sensorHistory: Map<string, SensorReading[]> = new Map();

  constructor(config: PredictiveMaintenanceConfig) {
    this.config = config;
  }

  /**
   * Analyze machine health and predict failures
   */
  async analyzeMachineHealth(
    machineId: string,
    currentStatus: MachineStatus,
    sensorData: SensorReading[]
  ): Promise<PredictiveMaintenanceAlert | null> {
    // Store sensor data history
    for (const sensor of sensorData) {
      const history = this.sensorHistory.get(sensor.sensorId) || [];
      history.push(sensor);

      // Keep only recent data
      const cutoffTime = new Date(Date.now() - this.config.historicalDataWindow * 24 * 60 * 60 * 1000);
      const filteredHistory = history.filter(r => r.timestamp >= cutoffTime);
      this.sensorHistory.set(sensor.sensorId, filteredHistory);
    }

    // Detect anomalies
    const anomalies = this.detectAnomalies(sensorData);

    if (anomalies.length === 0) {
      return null;
    }

    // Calculate failure probability
    const failureProbability = this.calculateFailureProbability(anomalies, currentStatus);

    // Estimate time to failure
    const timeToFailure = this.estimateTimeToFailure(anomalies, sensorData);

    // Check if alert threshold is exceeded
    if (
      failureProbability < this.config.alertThresholds.failureProbability &&
      timeToFailure > this.config.alertThresholds.timeToFailure
    ) {
      return null;
    }

    // Identify critical component
    const criticalComponent = this.identifyCriticalComponent(anomalies);

    // Generate alert
    const alert: PredictiveMaintenanceAlert = {
      id: `PM-ALERT-${Date.now()}`,
      machineId,
      component: criticalComponent,
      prediction: {
        failureProbability,
        estimatedTimeToFailure: timeToFailure,
        confidence: this.calculateConfidence(sensorData),
      },
      indicators: anomalies.map(a => ({
        name: a.parameter,
        currentValue: a.actualValue,
        normalRange: { min: a.expectedValue * 0.9, max: a.expectedValue * 1.1 },
        trend: a.deviation > 0 ? 'increasing' : 'decreasing',
      })),
      recommendedAction: this.getRecommendedAction(failureProbability, criticalComponent),
      priority: this.getPriority(failureProbability, timeToFailure),
      timestamp: new Date(),
    };

    this.alerts.set(alert.id, alert);

    return alert;
  }

  /**
   * Detect anomalies in sensor data
   */
  private detectAnomalies(sensorData: SensorReading[]): Anomaly[] {
    const anomalies: Anomaly[] = [];

    for (const sensor of sensorData) {
      // Check against thresholds
      if (sensor.threshold) {
        let severity: Anomaly['severity'] | null = null;

        if (sensor.threshold.critical_high && sensor.value >= sensor.threshold.critical_high) {
          severity = 'critical';
        } else if (sensor.threshold.critical_low && sensor.value <= sensor.threshold.critical_low) {
          severity = 'critical';
        } else if (sensor.threshold.high && sensor.value >= sensor.threshold.high) {
          severity = 'high';
        } else if (sensor.threshold.low && sensor.value <= sensor.threshold.low) {
          severity = 'high';
        }

        if (severity) {
          const expectedValue = ((sensor.threshold.high || 0) + (sensor.threshold.low || 0)) / 2;
          anomalies.push({
            id: `ANOM-${Date.now()}-${sensor.sensorId}`,
            type: 'threshold_exceeded',
            severity,
            description: `${sensor.sensorType} reading out of range`,
            detectedAt: new Date(),
            parameter: sensor.sensorType,
            expectedValue,
            actualValue: sensor.value,
            deviation: Math.abs(sensor.value - expectedValue),
          });
        }
      }

      // Check historical trends
      const history = this.sensorHistory.get(sensor.sensorId);
      if (history && history.length > 10) {
        const trend = this.analyzeTrend(history);
        if (trend.anomalous) {
          anomalies.push({
            id: `ANOM-${Date.now()}-${sensor.sensorId}-TREND`,
            type: 'abnormal_trend',
            severity: 'medium',
            description: `Abnormal trend detected in ${sensor.sensorType}`,
            detectedAt: new Date(),
            parameter: sensor.sensorType,
            expectedValue: trend.expectedValue,
            actualValue: sensor.value,
            deviation: Math.abs(sensor.value - trend.expectedValue),
          });
        }
      }
    }

    return anomalies;
  }

  /**
   * Analyze sensor trend
   */
  private analyzeTrend(history: SensorReading[]): { anomalous: boolean; expectedValue: number } {
    const values = history.map(r => r.value);
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
    );

    const latestValue = values[values.length - 1];
    const deviationFromMean = Math.abs(latestValue - mean);

    // Anomalous if > 2 standard deviations from mean
    const threshold = this.config.anomalyDetectionSensitivity === 'high' ? 1.5
      : this.config.anomalyDetectionSensitivity === 'medium' ? 2
        : 2.5;

    return {
      anomalous: deviationFromMean > threshold * stdDev,
      expectedValue: mean,
    };
  }

  /**
   * Calculate failure probability (0-100)
   */
  private calculateFailureProbability(anomalies: Anomaly[], status: MachineStatus): number {
    let probability = 0;

    // Base probability from anomalies
    for (const anomaly of anomalies) {
      if (anomaly.severity === 'critical') probability += 30;
      else if (anomaly.severity === 'high') probability += 20;
      else if (anomaly.severity === 'medium') probability += 10;
      else probability += 5;
    }

    // Factor in machine status
    if (status.status === 'error') probability += 20;
    if (status.alerts && status.alerts.length > 0) probability += status.alerts.length * 5;

    // Factor in uptime
    if (status.uptime !== undefined && status.uptime < 80) {
      probability += (80 - status.uptime) / 2;
    }

    return Math.min(100, probability);
  }

  /**
   * Estimate time to failure (hours)
   */
  private estimateTimeToFailure(anomalies: Anomaly[], sensorData: SensorReading[]): number {
    // Simple linear extrapolation based on trend
    // In production, use ML model trained on historical failure data

    const maxSeverity = Math.max(...anomalies.map(a => {
      if (a.severity === 'critical') return 4;
      if (a.severity === 'high') return 3;
      if (a.severity === 'medium') return 2;
      return 1;
    }));

    // Estimate hours until failure
    const baseHours = 168; // 1 week
    const severityFactor = 5 - maxSeverity;

    return baseHours * severityFactor;
  }

  /**
   * Calculate confidence (0-100)
   */
  private calculateConfidence(sensorData: SensorReading[]): number {
    // Confidence based on data quality and quantity
    const goodQualitySensors = sensorData.filter(s => s.quality === 'good').length;
    const qualityScore = (goodQualitySensors / sensorData.length) * 50;

    const quantityScore = Math.min(sensorData.length * 5, 50);

    return qualityScore + quantityScore;
  }

  /**
   * Identify critical component
   */
  private identifyCriticalComponent(anomalies: Anomaly[]): string {
    const criticalAnomaly = anomalies.find(a => a.severity === 'critical');
    if (criticalAnomaly) {
      return this.mapParameterToComponent(criticalAnomaly.parameter);
    }

    const highAnomaly = anomalies.find(a => a.severity === 'high');
    if (highAnomaly) {
      return this.mapParameterToComponent(highAnomaly.parameter);
    }

    return 'unknown';
  }

  /**
   * Map parameter to component
   */
  private mapParameterToComponent(parameter: string): string {
    const mapping: Record<string, string> = {
      temperature: 'cooling_system',
      vibration: 'bearing',
      pressure: 'hydraulic_system',
      speed: 'motor',
      power: 'electrical_system',
    };

    return mapping[parameter] || parameter;
  }

  /**
   * Get recommended action
   */
  private getRecommendedAction(failureProbability: number, component: string): string {
    if (failureProbability > 80) {
      return `Immediate shutdown and inspection of ${component} required`;
    } else if (failureProbability > 60) {
      return `Schedule emergency maintenance for ${component} within 24 hours`;
    } else if (failureProbability > 40) {
      return `Schedule preventive maintenance for ${component} within 1 week`;
    } else {
      return `Monitor ${component} closely and schedule inspection`;
    }
  }

  /**
   * Get priority level
   */
  private getPriority(
    failureProbability: number,
    timeToFailure: number
  ): PredictiveMaintenanceAlert['priority'] {
    if (failureProbability > 80 || timeToFailure < 24) return 'critical';
    if (failureProbability > 60 || timeToFailure < 72) return 'high';
    if (failureProbability > 40 || timeToFailure < 168) return 'medium';
    return 'low';
  }

  /**
   * Create or update digital twin
   */
  async updateDigitalTwin(
    twinId: string,
    physicalAssetId: string,
    currentState: any,
    telemetry: Record<string, { value: any; unit?: string }>
  ): Promise<DigitalTwin> {
    const existingTwin = this.twins.get(twinId);

    const twin: DigitalTwin = {
      twinId,
      physicalAssetId,
      assetType: 'machine',
      state: {
        current: currentState,
        predicted: existingTwin?.state.predicted,
        optimal: this.calculateOptimalState(currentState),
      },
      properties: existingTwin?.properties || {},
      telemetry: Object.entries(telemetry).reduce((acc, [key, val]) => {
        acc[key] = { ...val, timestamp: new Date() };
        return acc;
      }, {} as any),
      analytics: {
        anomalies: existingTwin?.analytics.anomalies || [],
        predictions: existingTwin?.analytics.predictions || [],
        optimizations: this.generateOptimizations(currentState, telemetry),
      },
      lastSyncTime: new Date(),
    };

    this.twins.set(twinId, twin);

    return twin;
  }

  /**
   * Calculate optimal state
   */
  private calculateOptimalState(currentState: any): any {
    // In production, use optimization algorithms
    return {
      ...currentState,
      speed: currentState.speed * 1.1, // 10% faster
      temperature: currentState.temperature * 0.95, // 5% cooler
      powerConsumption: currentState.powerConsumption * 0.9, // 10% less power
    };
  }

  /**
   * Generate optimizations
   */
  private generateOptimizations(
    currentState: any,
    telemetry: Record<string, { value: any; unit?: string }>
  ): Optimization[] {
    const optimizations: Optimization[] = [];

    // Energy optimization
    if (telemetry.power && telemetry.power.value > 50) {
      optimizations.push({
        id: `OPT-ENERGY-${Date.now()}`,
        type: 'energy',
        description: 'Reduce power consumption during idle periods',
        currentValue: telemetry.power.value,
        optimizedValue: telemetry.power.value * 0.8,
        potentialSavings: {
          amount: (telemetry.power.value - telemetry.power.value * 0.8) * 24 * 30,
          unit: 'kWh/month',
        },
        implementationPlan: 'Adjust idle mode settings to reduce power draw',
      });
    }

    // Speed optimization
    if (currentState.speed && currentState.cycleTime) {
      optimizations.push({
        id: `OPT-SPEED-${Date.now()}`,
        type: 'performance',
        description: 'Optimize cycle time without compromising quality',
        currentValue: currentState.cycleTime,
        optimizedValue: currentState.cycleTime * 0.95,
        implementationPlan: 'Fine-tune motion profiles and reduce unnecessary delays',
      });
    }

    return optimizations;
  }

  /**
   * Calculate OEE metrics
   */
  calculateOEE(metrics: Partial<ProductionMetrics>): OEEMetrics {
    const plannedProductionTime = 480; // 8 hours in minutes
    const actualOperatingTime = plannedProductionTime - (metrics.downtime?.reduce((sum, d) => sum + d.duration, 0) || 0);

    const availability = (actualOperatingTime / plannedProductionTime) * 100;

    const idealCycleTime = 1; // 1 minute per part (example)
    const totalParts = metrics.totalProduced || 0;
    const performance = ((totalParts * idealCycleTime) / actualOperatingTime) * 100;

    const goodParts = totalParts - (metrics.totalRejected || 0);
    const quality = totalParts > 0 ? (goodParts / totalParts) * 100 : 100;

    const oee = (availability * performance * quality) / 10000;

    return {
      availability: Math.min(100, availability),
      performance: Math.min(100, performance),
      quality: Math.min(100, quality),
      oee: Math.min(100, oee),
    };
  }

  /**
   * Get all alerts
   */
  getAlerts(): PredictiveMaintenanceAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get digital twin
   */
  getDigitalTwin(twinId: string): DigitalTwin | undefined {
    return this.twins.get(twinId);
  }
}

export default PredictiveMaintenanceEngine;
