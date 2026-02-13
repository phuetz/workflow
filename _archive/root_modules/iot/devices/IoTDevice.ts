/**
 * IoT Device Base Class
 * Foundation for all IoT device implementations
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface DeviceConfig {
  id: string;
  type: string;
  name: string;
  manufacturer: string;
  model: string;
  firmwareVersion: string;
  capabilities: string[];
  sensors?: SensorConfig[];
  actuators?: ActuatorConfig[];
  communication: CommunicationConfig;
  security: SecurityConfig;
  power: PowerConfig;
}

export interface SensorConfig {
  id: string;
  type: string;
  unit: string;
  range: {
    min: number;
    max: number;
  };
  accuracy: number;
  samplingRate: number;
}

export interface ActuatorConfig {
  id: string;
  type: string;
  actions: string[];
  parameters?: Record<string, unknown>;
}

export interface CommunicationConfig {
  protocol: 'mqtt' | 'coap' | 'websocket' | 'lorawan' | 'zigbee' | 'ble';
  endpoint: string;
  interval: number;
  qos?: number;
  encryption?: boolean;
}

export interface SecurityConfig {
  authMethod: 'token' | 'certificate' | 'key';
  credentials: unknown;
  encryption: boolean;
  secureElement?: boolean;
}

export interface PowerConfig {
  source: 'battery' | 'solar' | 'mains' | 'harvesting';
  batteryCapacity?: number;
  sleepMode: boolean;
  wakeInterval?: number;
}

export abstract class IoTDevice extends EventEmitter {
  protected config: DeviceConfig;
  protected isConnected: boolean = false;
  protected sensorData: Map<string, unknown> = new Map();
  protected lastTransmission: Date;
  protected transmissionInterval: NodeJS.Timer;
  protected powerLevel: number = 100;
  
  constructor(config: DeviceConfig) {
    super();
    this.config = config;
    this.initialize();
  }
  
  protected abstract initialize(): Promise<void>;
  protected abstract connect(): Promise<void>;
  protected abstract disconnect(): Promise<void>;
  protected abstract transmitData(data: unknown): Promise<void>;
  
  // Sensor management
  protected async readSensor(sensorId: string): Promise<unknown> {
    const sensor = this.config.sensors?.find(s => s.id === sensorId);
    if (!sensor) {
      throw new Error(`Sensor ${sensorId} not found`);
    }
    
    // Simulate sensor reading (override in specific implementations)
    const value = this.simulateSensorReading(sensor);
    this.sensorData.set(sensorId, {
      value,
      timestamp: new Date(),
      unit: sensor.unit
    });
    
    return value;
  }
  
  protected simulateSensorReading(sensor: SensorConfig): number {
    // Generate realistic sensor data
    const range = sensor.range.max - sensor.range.min;
    const noise = (Math.random() - 0.5) * sensor.accuracy;
    const base = sensor.range.min + Math.random() * range;
    return Math.round((base + noise) * 100) / 100;
  }
  
  // Actuator control
  protected async controlActuator(actuatorId: string, action: string, params?: unknown): Promise<void> {
    const actuator = this.config.actuators?.find(a => a.id === actuatorId);
    if (!actuator) {
      throw new Error(`Actuator ${actuatorId} not found`);
    }
    
    if (!actuator.actions.includes(action)) {
      throw new Error(`Action ${action} not supported by actuator ${actuatorId}`);
    }
    
    // Execute actuator action (override in specific implementations)
    await this.executeActuatorAction(actuator, action, params);
    
    this.emit('actuator:action', {
      actuatorId,
      action,
      params,
      timestamp: new Date()
    });
  }
  
  protected abstract executeActuatorAction(actuator: ActuatorConfig, action: string, params?: unknown): Promise<void>;
  
  // Data collection and transmission
  public async startDataCollection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }
    
    // Start periodic sensor readings
    if (this.config.sensors) {
      for (const sensor of this.config.sensors) {
        setInterval(async () => {
          try {
            await this.readSensor(sensor.id);
          } catch (error) {
            this.emit('error', {
              type: 'sensor_read',
              sensorId: sensor.id,
              error
            });
          }
        }, 1000 / sensor.samplingRate);
      }
    }
    
    // Start periodic data transmission
    this.transmissionInterval = setInterval(async () => {
      await this.transmitCollectedData();
    }, this.config.communication.interval);
    
    this.emit('collection:started');
  }
  
  public async stopDataCollection(): Promise<void> {
    if (this.transmissionInterval) {
      clearInterval(this.transmissionInterval);
    }
    
    await this.disconnect();
    this.emit('collection:stopped');
  }
  
  protected async transmitCollectedData(): Promise<void> {
    const data = {
      deviceId: this.config.id,
      timestamp: new Date(),
      sensors: Object.fromEntries(this.sensorData),
      metadata: {
        firmwareVersion: this.config.firmwareVersion,
        powerLevel: this.powerLevel,
        signalStrength: this.getSignalStrength()
      }
    };
    
    // Apply security
    const securedData = await this.secureData(data);
    
    // Transmit data
    try {
      await this.transmitData(securedData);
      this.lastTransmission = new Date();
      this.updatePowerConsumption('transmit');
      
      this.emit('data:transmitted', data);
    } catch (error) {
      this.emit('error', {
        type: 'transmission',
        error
      });
      
      // Store for later transmission if offline
      await this.storeOfflineData(data);
    }
  }
  
  // Security methods
  protected async secureData(data: unknown): Promise<unknown> {
    if (!this.config.security.encryption) {
      return data;
    }
    
    const key = this.config.security.credentials.key;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64')
    };
  }
  
  // Power management
  protected updatePowerConsumption(action: string): void {
    const consumption = {
      'sensor_read': 0.1,
      'transmit': 1.0,
      'actuator': 0.5,
      'idle': 0.01
    };
    
    if (this.config.power.source === 'battery') {
      this.powerLevel -= consumption[action] || 0;
      
      if (this.powerLevel < 20) {
        this.emit('power:low', this.powerLevel);
        this.enterPowerSavingMode();
      }
      
      if (this.powerLevel <= 0) {
        this.shutdown();
      }
    }
  }
  
  protected enterPowerSavingMode(): void {
    // Reduce sampling rates
    if (this.config.sensors) {
      for (const sensor of this.config.sensors) {
        sensor.samplingRate = Math.min(sensor.samplingRate / 2, 0.1);
      }
    }
    
    // Increase transmission interval
    this.config.communication.interval *= 2;
    
    this.emit('power:saving_mode');
  }
  
  // Firmware management
  public async updateFirmware(firmwareData: Buffer, version: string): Promise<void> {
    this.emit('firmware:update_start', { version });
    
    try {
      // Verify firmware signature
      const isValid = await this.verifyFirmware(firmwareData);
      if (!isValid) {
        throw new Error('Invalid firmware signature');
      }
      
      // Apply firmware update (device-specific implementation)
      await this.applyFirmwareUpdate(firmwareData);
      
      this.config.firmwareVersion = version;
      this.emit('firmware:update_complete', { version });
      
      // Restart device
      await this.restart();
      
    } catch (error) {
      this.emit('firmware:update_failed', { version, error });
      throw error;
    }
  }
  
  protected abstract verifyFirmware(firmwareData: Buffer): Promise<boolean>;
  protected abstract applyFirmwareUpdate(firmwareData: Buffer): Promise<void>;
  
  // Remote commands
  public async handleCommand(command: unknown): Promise<unknown> {
    this.emit('command:received', command);
    
    switch (command.type) {
      case 'read_sensor':
        return await this.readSensor(command.sensorId);
        
      case 'control_actuator':
        await this.controlActuator(command.actuatorId, command.action, command.params);
        return { success: true };
        
      case 'update_config':
        await this.updateConfiguration(command.config);
        return { success: true };
        
      case 'restart':
        await this.restart();
        return { success: true };
        
      case 'diagnostics':
        return await this.runDiagnostics();
        
      default:
        throw new Error(`Unknown command type: ${command.type}`);
    }
  }
  
  // Configuration management
  protected async updateConfiguration(newConfig: Partial<DeviceConfig>): Promise<void> {
    // Validate configuration
    if (newConfig.communication?.interval && newConfig.communication.interval < 1000) {
      throw new Error('Communication interval must be at least 1000ms');
    }
    
    // Apply configuration
    this.config = { ...this.config, ...newConfig };
    
    // Restart data collection with new config
    await this.stopDataCollection();
    await this.startDataCollection();
    
    this.emit('config:updated', this.config);
  }
  
  // Diagnostics
  protected async runDiagnostics(): Promise<unknown> {
    const diagnostics = {
      deviceId: this.config.id,
      timestamp: new Date(),
      connectivity: {
        isConnected: this.isConnected,
        lastTransmission: this.lastTransmission,
        signalStrength: this.getSignalStrength()
      },
      sensors: await this.testSensors(),
      actuators: await this.testActuators(),
      power: {
        level: this.powerLevel,
        source: this.config.power.source
      },
      firmware: {
        version: this.config.firmwareVersion,
        uptime: process.uptime()
      }
    };
    
    this.emit('diagnostics:complete', diagnostics);
    return diagnostics;
  }
  
  protected async testSensors(): Promise<unknown[]> {
    const results = [];
    
    if (this.config.sensors) {
      for (const sensor of this.config.sensors) {
        try {
          const value = await this.readSensor(sensor.id);
          results.push({
            sensorId: sensor.id,
            status: 'ok',
            value
          });
        } catch (error) {
          results.push({
            sensorId: sensor.id,
            status: 'error',
            error: error.message
          });
        }
      }
    }
    
    return results;
  }
  
  protected async testActuators(): Promise<unknown[]> {
    const results = [];
    
    if (this.config.actuators) {
      for (const actuator of this.config.actuators) {
        try {
          // Run self-test action if available
          if (actuator.actions.includes('self_test')) {
            await this.controlActuator(actuator.id, 'self_test');
            results.push({
              actuatorId: actuator.id,
              status: 'ok'
            });
          } else {
            results.push({
              actuatorId: actuator.id,
              status: 'untested'
            });
          }
        } catch (error) {
          results.push({
            actuatorId: actuator.id,
            status: 'error',
            error: error.message
          });
        }
      }
    }
    
    return results;
  }
  
  // Utility methods
  protected getSignalStrength(): number {
    // Simulate signal strength (override in specific implementations)
    return Math.floor(Math.random() * 40) + 60; // 60-100%
  }
  
  protected async storeOfflineData(_data: unknown): Promise<void> { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Store data for later transmission when connection is restored
    // Implementation depends on device storage capabilities
  }
  
  protected async restart(): Promise<void> {
    this.emit('device:restarting');
    await this.stopDataCollection();
    await new Promise(resolve => setTimeout(resolve, 5000));
    await this.initialize();
    await this.startDataCollection();
    this.emit('device:restarted');
  }
  
  protected shutdown(): void {
    this.emit('device:shutdown');
    this.stopDataCollection();
    process.exit(0);
  }
}