/**
 * Edge Gateway Service
 * Main gateway for edge computing and IoT device management
 */

import { EventEmitter } from 'events';
// import * as mqtt from 'mqtt';
import * as coap from 'coap';
import * as WebSocket from 'ws';
// import { Server as SocketIOServer } from 'socket.io';
import * as dgram from 'dgram';
import * as net from 'net';
import { DeviceRegistry } from './DeviceRegistry';
import { EdgeCompute } from './EdgeCompute';
import { SecurityManager } from './SecurityManager';
import { DataProcessor } from './DataProcessor';
import { RuleEngine } from './RuleEngine';
import { StorageManager } from './StorageManager';
import { SyncManager } from './SyncManager';

interface EdgeGatewayConfig {
  id: string;
  name: string;
  location: {
    latitude: number;
    longitude: number;
    altitude?: number;
  };
  capabilities: {
    compute: boolean;
    storage: boolean;
    network: string[];
    protocols: string[];
  };
  resources: {
    cpu: number;
    memory: number;
    storage: number;
    gpu?: boolean;
  };
}

interface DeviceMessage {
  deviceId: string;
  timestamp: number;
  type: 'telemetry' | 'event' | 'command' | 'config';
  data: unknown;
  metadata?: Record<string, unknown>;
}

export class EdgeGateway extends EventEmitter {
  private config: EdgeGatewayConfig;
  private deviceRegistry: DeviceRegistry;
  private edgeCompute: EdgeCompute;
  private securityManager: SecurityManager;
  private dataProcessor: DataProcessor;
  private ruleEngine: RuleEngine;
  private storageManager: StorageManager;
  private syncManager: SyncManager;
  
  // Protocol servers
  private mqttBroker: unknown;
  private coapServer: unknown;
  private wsServer: WebSocket.Server;
  private tcpServer: net.Server;
  private udpServer: dgram.Socket;
  
  // Connection pools
  private deviceConnections: Map<string, unknown> = new Map();
  private activeStreams: Map<string, unknown> = new Map();
  
  constructor(config: EdgeGatewayConfig) {
    super();
    this.config = config;
    this.initialize();
  }
  
  private async initialize(): Promise<void> {
    // Initialize core services
    this.deviceRegistry = new DeviceRegistry();
    this.edgeCompute = new EdgeCompute(this.config.resources);
    this.securityManager = new SecurityManager();
    this.dataProcessor = new DataProcessor();
    this.ruleEngine = new RuleEngine();
    this.storageManager = new StorageManager();
    this.syncManager = new SyncManager();
    
    // Start protocol servers
    await this.startProtocolServers();
    
    // Initialize edge compute runtime
    await this.edgeCompute.initialize();
    
    // Start health monitoring
    this.startHealthMonitoring();
    
    console.log(`Edge Gateway ${this.config.id} initialized at ${this.config.location.latitude}, ${this.config.location.longitude}`);
  }
  
  private async startProtocolServers(): Promise<void> {
    // MQTT Broker for IoT devices
    if (this.config.capabilities.protocols.includes('mqtt')) {
      const aedes = await import('aedes').then(m => m.default());
      this.mqttBroker = (await import('net')).createServer(aedes.handle);
      
      this.mqttBroker.listen(1883, () => {
        console.log('MQTT broker listening on port 1883');
      });
      
      aedes.on('client', (client: unknown) => {
        console.log(`MQTT client connected: ${client.id}`);
        this.handleDeviceConnection(client.id, 'mqtt', client);
      });
      
      aedes.on('publish', async (packet: unknown, client: unknown) => {
        if (client) {
          await this.handleDeviceMessage({
            deviceId: client.id,
            timestamp: Date.now(),
            type: 'telemetry',
            data: packet.payload.toString(),
            metadata: { topic: packet.topic }
          });
        }
      });
    }
    
    // CoAP Server for constrained devices
    if (this.config.capabilities.protocols.includes('coap')) {
      this.coapServer = coap.createServer();
      
      this.coapServer.on('request', async (req: unknown, res: unknown) => {
        const deviceId = req.url.split('/')[1];
        
        await this.handleDeviceMessage({
          deviceId,
          timestamp: Date.now(),
          type: 'telemetry',
          data: req.payload.toString(),
          metadata: { 
            method: req.method,
            path: req.url
          }
        });
        
        res.end('OK');
      });
      
      this.coapServer.listen(5683, () => {
        console.log('CoAP server listening on port 5683');
      });
    }
    
    // WebSocket Server for real-time devices
    if (this.config.capabilities.protocols.includes('websocket')) {
      this.wsServer = new WebSocket.Server({ port: 8080 });
      
      this.wsServer.on('connection', (ws: WebSocket, req: unknown) => {
        const deviceId = req.url?.split('/')[1] || 'unknown';
        console.log(`WebSocket device connected: ${deviceId}`);
        
        this.handleDeviceConnection(deviceId, 'websocket', ws);
        
        ws.on('message', async (data: unknown) => {
          await this.handleDeviceMessage({
            deviceId,
            timestamp: Date.now(),
            type: 'telemetry',
            data: JSON.parse(data.toString())
          });
        });
        
        ws.on('close', () => {
          this.handleDeviceDisconnection(deviceId);
        });
      });
    }
    
    // TCP Server for industrial protocols
    if (this.config.capabilities.protocols.includes('tcp')) {
      this.tcpServer = net.createServer((socket) => {
        const deviceId = `tcp_${socket.remoteAddress}_${socket.remotePort}`;
        
        this.handleDeviceConnection(deviceId, 'tcp', socket);
        
        socket.on('data', async (data) => {
          await this.handleDeviceMessage({
            deviceId,
            timestamp: Date.now(),
            type: 'telemetry',
            data: data.toString()
          });
        });
        
        socket.on('end', () => {
          this.handleDeviceDisconnection(deviceId);
        });
      });
      
      this.tcpServer.listen(8081, () => {
        console.log('TCP server listening on port 8081');
      });
    }
    
    // UDP Server for lightweight protocols
    if (this.config.capabilities.protocols.includes('udp')) {
      this.udpServer = dgram.createSocket('udp4');
      
      this.udpServer.on('message', async (msg, rinfo) => {
        const deviceId = `udp_${rinfo.address}_${rinfo.port}`;
        
        await this.handleDeviceMessage({
          deviceId,
          timestamp: Date.now(),
          type: 'telemetry',
          data: msg.toString(),
          metadata: { 
            address: rinfo.address,
            port: rinfo.port
          }
        });
      });
      
      this.udpServer.bind(8082, () => {
        console.log('UDP server listening on port 8082');
      });
    }
  }
  
  private async handleDeviceConnection(deviceId: string, protocol: string, connection: unknown): Promise<void> {
    // Authenticate device
    const isAuthenticated = await this.securityManager.authenticateDevice(deviceId);
    if (!isAuthenticated) {
      console.warn(`Unauthorized device connection attempt: ${deviceId}`);
      connection.close?.();
      return;
    }
    
    // Register device
    await this.deviceRegistry.registerDevice({
      id: deviceId,
      protocol,
      connectedAt: new Date(),
      gatewayId: this.config.id,
      status: 'online'
    });
    
    // Store connection
    this.deviceConnections.set(deviceId, {
      protocol,
      connection,
      lastSeen: Date.now()
    });
    
    this.emit('device:connected', { deviceId, protocol });
  }
  
  private async handleDeviceDisconnection(deviceId: string): Promise<void> {
    // Update device status
    await this.deviceRegistry.updateDeviceStatus(deviceId, 'offline');
    
    // Remove connection
    this.deviceConnections.delete(deviceId);
    
    // Clean up streams
    const stream = this.activeStreams.get(deviceId);
    if (stream) {
      stream.destroy?.();
      this.activeStreams.delete(deviceId);
    }
    
    this.emit('device:disconnected', { deviceId });
  }
  
  private async handleDeviceMessage(message: DeviceMessage): Promise<void> {
    try {
      // Update last seen
      const connection = this.deviceConnections.get(message.deviceId);
      if (connection) {
        connection.lastSeen = Date.now();
      }
      
      // Security validation
      const isValid = await this.securityManager.validateMessage(message);
      if (!isValid) {
        console.warn(`Invalid message from device ${message.deviceId}`);
        return;
      }
      
      // Data processing pipeline
      const processedData = await this.dataProcessor.process(message);
      
      // Apply edge rules
      const ruleResults = await this.ruleEngine.evaluate(processedData);
      
      // Handle rule actions
      for (const result of ruleResults) {
        if (result.action === 'store') {
          await this.storageManager.store(processedData);
        } else if (result.action === 'compute') {
          await this.edgeCompute.execute(result.computeTask, processedData);
        } else if (result.action === 'forward') {
          await this.syncManager.forward(processedData, result.destination);
        } else if (result.action === 'alert') {
          this.emit('alert', {
            deviceId: message.deviceId,
            alert: result.alert,
            data: processedData
          });
        }
      }
      
      // Emit processed message
      this.emit('device:message', processedData);
      
    } catch (error) {
      console.error(`Error processing device message: ${error}`);
      this.emit('error', {
        deviceId: message.deviceId,
        error: error.message
      });
    }
  }
  
  // Public API methods
  
  async sendCommand(deviceId: string, command: unknown): Promise<void> {
    const connection = this.deviceConnections.get(deviceId);
    if (!connection) {
      throw new Error(`Device ${deviceId} not connected`);
    }
    
    const message = {
      type: 'command',
      timestamp: Date.now(),
      data: command
    };
    
    switch (connection.protocol) {
      case 'mqtt':
        connection.connection.publish(`devices/${deviceId}/commands`, JSON.stringify(message));
        break;
      case 'websocket':
        connection.connection.send(JSON.stringify(message));
        break;
      case 'tcp':
        connection.connection.write(JSON.stringify(message));
        break;
      default:
        throw new Error(`Unsupported protocol for commands: ${connection.protocol}`);
    }
  }
  
  async updateDeviceConfig(deviceId: string, config: unknown): Promise<void> {
    // Validate configuration
    const isValid = await this.deviceRegistry.validateConfig(deviceId, config);
    if (!isValid) {
      throw new Error('Invalid device configuration');
    }
    
    // Send configuration update
    await this.sendCommand(deviceId, {
      type: 'config_update',
      config
    });
    
    // Store configuration
    await this.deviceRegistry.updateDeviceConfig(deviceId, config);
  }
  
  async deployEdgeFunction(functionCode: string, triggers: unknown[]): Promise<string> {
    const functionId = await this.edgeCompute.deployFunction(functionCode, triggers);
    
    // Register triggers with rule engine
    for (const trigger of triggers) {
      await this.ruleEngine.addRule({
        condition: trigger.condition,
        action: 'compute',
        computeTask: {
          functionId,
          params: trigger.params
        }
      });
    }
    
    return functionId;
  }
  
  async getDeviceList(): Promise<unknown[]> {
    return this.deviceRegistry.getAllDevices();
  }
  
  async getDeviceStatus(deviceId: string): Promise<unknown> {
    const device = await this.deviceRegistry.getDevice(deviceId);
    const connection = this.deviceConnections.get(deviceId);
    
    return {
      ...device,
      online: !!connection,
      lastSeen: connection?.lastSeen,
      protocol: connection?.protocol
    };
  }
  
  async getGatewayMetrics(): Promise<unknown> {
    const devices = await this.deviceRegistry.getAllDevices();
    const compute = await this.edgeCompute.getMetrics();
    const storage = await this.storageManager.getMetrics();
    
    return {
      gateway: this.config,
      devices: {
        total: devices.length,
        online: this.deviceConnections.size,
        byProtocol: this.getDevicesByProtocol()
      },
      compute,
      storage,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    };
  }
  
  private getDevicesByProtocol(): Record<string, number> {
    const byProtocol: Record<string, number> = {};
    
    for (const [, connection] of this.deviceConnections) {
      byProtocol[connection.protocol] = (byProtocol[connection.protocol] || 0) + 1;
    }
    
    return byProtocol;
  }
  
  private startHealthMonitoring(): void {
    setInterval(async () => {
      // Check device connections
      const now = Date.now();
      for (const [, connection] of this.deviceConnections) {
        if (now - connection.lastSeen > 60000) { // 1 minute timeout
          console.warn(`Device ${deviceId} appears to be offline`);
          await this.handleDeviceDisconnection(deviceId);
        }
      }
      
      // Sync with cloud
      if (this.syncManager.isOnline()) {
        await this.syncManager.sync();
      }
      
      // Emit health status
      this.emit('health', await this.getGatewayMetrics());
      
    }, 30000); // Every 30 seconds
  }
  
  async shutdown(): Promise<void> {
    console.log('Shutting down Edge Gateway...');
    
    // Close all device connections
    for (const [, connection] of this.deviceConnections) {
      connection.connection.close?.();
      connection.connection.end?.();
    }
    
    // Stop protocol servers
    this.mqttBroker?.close();
    this.coapServer?.close();
    this.wsServer?.close();
    this.tcpServer?.close();
    this.udpServer?.close();
    
    // Shutdown services
    await this.edgeCompute.shutdown();
    await this.storageManager.shutdown();
    await this.syncManager.shutdown();
    
    console.log('Edge Gateway shutdown complete');
  }
}