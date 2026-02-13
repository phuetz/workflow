/**
 * Smart Sensor Implementation
 * Advanced sensor device with edge processing capabilities
 */

import { IoTDevice, DeviceConfig, ActuatorConfig } from './IoTDevice';
import * as mqtt from 'mqtt';
import * as tf from '@tensorflow/tfjs-node';
import { KalmanFilter } from 'kalman-filter';

interface SmartSensorConfig extends DeviceConfig {
  edgeProcessing: {
    enabled: boolean;
    mlModel?: string;
    filters: string[];
    aggregation: {
      window: number;
      functions: string[];
    };
  };
  alerts: {
    thresholds: Array<{
      sensorId: string;
      condition: string;
      value: number;
      action: string;
    }>;
  };
}

export class SmartSensor extends IoTDevice {
  private mqttClient: mqtt.Client;
  private mlModel: tf.LayersModel | null = null;
  private dataBuffer: Map<string, number[]> = new Map();
  private kalmanFilters: Map<string, unknown> = new Map();
  
  constructor(config: SmartSensorConfig) {
    super(config as DeviceConfig);
    this.initializeEdgeProcessing();
  }
  
  protected async initialize(): Promise<void> {
    console.log(`Initializing Smart Sensor: ${this.config.id}`);
    
    // Initialize Kalman filters for each sensor
    if (this.config.sensors) {
      for (const sensor of this.config.sensors) {
        this.kalmanFilters.set(sensor.id, new KalmanFilter({
          observation: 1,
          state: 1,
          transition: [[1]],
          observation: [[1]],
          processNoise: 0.01,
          observationNoise: sensor.accuracy
        }));
        
        this.dataBuffer.set(sensor.id, []);
      }
    }
    
    // Load ML model if configured
    const edgeConfig = (this.config as SmartSensorConfig).edgeProcessing;
    if (edgeConfig.enabled && edgeConfig.mlModel) {
      await this.loadMLModel(edgeConfig.mlModel);
    }
  }
  
  protected async connect(): Promise<void> {
    const { endpoint, qos = 1 } = this.config.communication;
    
    this.mqttClient = mqtt.connect(endpoint, {
      clientId: this.config.id,
      clean: true,
      connectTimeout: 30000,
      username: this.config.security.credentials.username,
      password: this.config.security.credentials.password,
      reconnectPeriod: 5000,
      qos
    });
    
    this.mqttClient.on('connect', () => {
      this.isConnected = true;
      console.log(`Smart Sensor ${this.config.id} connected to MQTT broker`);
      
      // Subscribe to command topic
      this.mqttClient.subscribe(`devices/${this.config.id}/commands`, { qos });
      
      this.emit('connected');
    });
    
    this.mqttClient.on('message', async (topic, message) => {
      try {
        const command = JSON.parse(message.toString());
        const response = await this.handleCommand(command);
        
        // Send response
        this.mqttClient.publish(
          `devices/${this.config.id}/responses`,
          JSON.stringify(response),
          { qos }
        );
      } catch (error) {
        console.error('Error handling command:', error);
      }
    });
    
    this.mqttClient.on('error', (error) => {
      this.emit('error', { type: 'connection', error });
    });
    
    this.mqttClient.on('offline', () => {
      this.isConnected = false;
      this.emit('disconnected');
    });
  }
  
  protected async disconnect(): Promise<void> {
    if (this.mqttClient) {
      await new Promise<void>((resolve) => {
        this.mqttClient.end(false, () => {
          this.isConnected = false;
          resolve();
        });
      });
    }
  }
  
  protected async transmitData(data: unknown): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Not connected to MQTT broker');
    }
    
    const topic = `devices/${this.config.id}/telemetry`;
    
    return new Promise((resolve, reject) => {
      this.mqttClient.publish(topic, JSON.stringify(data), { qos: 1 }, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }
  
  // Override sensor reading with smart processing
  protected async readSensor(sensorId: string): Promise<unknown> {
    const rawValue = await super.readSensor(sensorId);
    
    // Apply Kalman filter
    const kalmanFilter = this.kalmanFilters.get(sensorId);
    if (kalmanFilter) {
      const filtered = kalmanFilter.filter(rawValue);
      this.sensorData.set(sensorId, {
        value: filtered.mean,
        rawValue,
        variance: filtered.covariance,
        timestamp: new Date()
      });
      
      // Add to buffer for aggregation
      const buffer = this.dataBuffer.get(sensorId) || [];
      buffer.push(filtered.mean);
      
      const edgeConfig = (this.config as SmartSensorConfig).edgeProcessing;
      if (buffer.length > edgeConfig.aggregation.window) {
        buffer.shift();
      }
      this.dataBuffer.set(sensorId, buffer);
      
      // Check alerts
      await this.checkAlerts(sensorId, filtered.mean);
      
      // Apply ML inference if available
      if (this.mlModel && buffer.length >= edgeConfig.aggregation.window) {
        const prediction = await this.runInference(sensorId, buffer);
        if (prediction) {
          this.emit('prediction', {
            sensorId,
            prediction,
            timestamp: new Date()
          });
        }
      }
      
      return filtered.mean;
    }
    
    return rawValue;
  }
  
  private async initializeEdgeProcessing(): Promise<void> {
    const edgeConfig = (this.config as SmartSensorConfig).edgeProcessing;
    
    if (!edgeConfig.enabled) {
      return;
    }
    
    console.log('Initializing edge processing capabilities...');
    
    // Set up data aggregation
    setInterval(() => {
      this.performAggregation();
    }, edgeConfig.aggregation.window * 1000);
  }
  
  private async loadMLModel(modelPath: string): Promise<void> {
    try {
      this.mlModel = await tf.loadLayersModel(modelPath);
      console.log(`ML model loaded: ${modelPath}`);
    } catch (error) {
      console.error(`Failed to load ML model: ${error}`);
      this.emit('error', { type: 'ml_model_load', error });
    }
  }
  
  private async runInference(sensorId: string, data: number[]): Promise<unknown> {
    if (!this.mlModel) {
      return null;
    }
    
    try {
      // Prepare input tensor
      const input = tf.tensor2d([data]);
      
      // Run inference
      const prediction = this.mlModel.predict(input) as tf.Tensor;
      const result = await prediction.data();
      
      // Clean up tensors
      input.dispose();
      prediction.dispose();
      
      return {
        sensorId,
        values: Array.from(result),
        confidence: Math.max(...result)
      };
    } catch (error) {
      console.error(`Inference error: ${error}`);
      return null;
    }
  }
  
  private performAggregation(): void {
    const edgeConfig = (this.config as SmartSensorConfig).edgeProcessing;
    const aggregatedData: Record<string, unknown> = {};
    
    for (const [sensorId, buffer] of this.dataBuffer) {
      if (buffer.length === 0) continue;
      
      const aggregated: Record<string, number> = {};
      
      for (const func of edgeConfig.aggregation.functions) {
        switch (func) {
          case 'mean':
            aggregated.mean = buffer.reduce((a, b) => a + b, 0) / buffer.length;
            break;
          case 'min':
            aggregated.min = Math.min(...buffer);
            break;
          case 'max':
            aggregated.max = Math.max(...buffer);
            break;
          case 'std': {
            const mean = buffer.reduce((a, b) => a + b, 0) / buffer.length;
            const variance = buffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / buffer.length;
            aggregated.std = Math.sqrt(variance);
            break;
          }
          case 'median': {
            const sorted = [...buffer].sort((a, b) => a - b);
            aggregated.median = sorted[Math.floor(sorted.length / 2)];
            break;
          }
        }
      }
      
      aggregatedData[sensorId] = aggregated;
    }
    
    this.emit('aggregation', {
      timestamp: new Date(),
      window: edgeConfig.aggregation.window,
      data: aggregatedData
    });
  }
  
  private async checkAlerts(sensorId: string, value: number): Promise<void> {
    const alerts = (this.config as SmartSensorConfig).alerts.thresholds;
    
    for (const alert of alerts) {
      if (alert.sensorId !== sensorId) continue;
      
      let triggered = false;
      
      switch (alert.condition) {
        case 'gt':
          triggered = value > alert.value;
          break;
        case 'lt':
          triggered = value < alert.value;
          break;
        case 'eq':
          triggered = Math.abs(value - alert.value) < 0.01;
          break;
        case 'gte':
          triggered = value >= alert.value;
          break;
        case 'lte':
          triggered = value <= alert.value;
          break;
      }
      
      if (triggered) {
        this.emit('alert', {
          sensorId,
          condition: alert.condition,
          threshold: alert.value,
          actualValue: value,
          action: alert.action,
          timestamp: new Date()
        });
        
        // Execute alert action
        await this.executeAlertAction(alert.action, { sensorId, value });
      }
    }
  }
  
  private async executeAlertAction(action: string, data: unknown): Promise<void> {
    // Send immediate notification
    await this.transmitData({
      type: 'alert',
      priority: 'high',
      data
    });
    
    // Additional actions based on configuration
    switch (action) {
      case 'shutdown':
        await this.shutdown();
        break;
      case 'reduce_sampling':
        this.reduceSamplingRate();
        break;
      case 'activate_actuator':
        // Activate configured actuator
        if (this.config.actuators && this.config.actuators.length > 0) {
          await this.controlActuator(
            this.config.actuators[0].id,
            'emergency_stop'
          );
        }
        break;
    }
  }
  
  private reduceSamplingRate(): void {
    if (this.config.sensors) {
      for (const sensor of this.config.sensors) {
        sensor.samplingRate = Math.max(sensor.samplingRate / 2, 0.1);
      }
    }
  }
  
  protected async executeActuatorAction(actuator: ActuatorConfig, action: string, params?: unknown): Promise<void> {
    // Smart sensor typically doesn't have actuators, but can control external ones
    console.log(`Executing actuator action: ${action} on ${actuator.id}`);
    
    // Send command to external actuator
    await this.transmitData({
      type: 'actuator_command',
      actuatorId: actuator.id,
      action,
      params
    });
  }
  
  protected async verifyFirmware(_firmwareData: Buffer): Promise<boolean> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Implement firmware verification logic
    // Check signature, checksum, compatibility
    return true;
  }
  
  protected async applyFirmwareUpdate(_firmwareData: Buffer): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Implement firmware update logic
    console.log('Applying firmware update...');
    // This would typically involve writing to flash memory
    // and triggering a device restart
  }
  
  // Additional smart sensor specific methods
  
  public async calibrate(sensorId: string, referenceValue: number): Promise<void> {
    const currentValue = await this.readSensor(sensorId);
    const offset = referenceValue - currentValue;
    
    // Store calibration offset
    const sensor = this.config.sensors?.find(s => s.id === sensorId);
    if (sensor) {
      (sensor as unknown as { calibrationOffset: number }).calibrationOffset = offset;
    }
    
    this.emit('calibration:complete', {
      sensorId,
      offset,
      timestamp: new Date()
    });
  }
  
  public async runSelfTest(): Promise<unknown> {
    const results = await this.runDiagnostics();
    
    // Additional self-tests
    results.edgeProcessing = {
      mlModel: this.mlModel !== null,
      dataBufferSizes: Object.fromEntries(
        Array.from(this.dataBuffer.entries()).map(([k, v]) => [k, v.length])
      ),
      kalmanFilters: Array.from(this.kalmanFilters.keys())
    };
    
    return results;
  }
  
  public getStatistics(): unknown {
    const stats: Record<string, unknown> = {};
    
    for (const [sensorId, buffer] of this.dataBuffer) {
      if (buffer.length > 0) {
        const mean = buffer.reduce((a, b) => a + b, 0) / buffer.length;
        const variance = buffer.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / buffer.length;
        
        stats[sensorId] = {
          samples: buffer.length,
          mean,
          variance,
          std: Math.sqrt(variance),
          min: Math.min(...buffer),
          max: Math.max(...buffer)
        };
      }
    }
    
    return stats;
  }
}