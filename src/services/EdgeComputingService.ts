import { logger } from './SimpleLogger';
export interface EdgeNode {
  id: string;
  name: string;
  type: 'raspberry_pi' | 'edge_server' | 'gateway' | 'sensor_hub' | 'mobile_device' | 'custom';
  location: {
    latitude: number;
    longitude: number;
    address: string;
    timezone: string;
  };
  capabilities: EdgeCapability[];
  resources: EdgeResources;
  status: 'online' | 'offline' | 'maintenance' | 'error';
  lastSeen: Date;
  version: string;
  metadata: { [key: string]: unknown };
  configuration: EdgeConfiguration;
  metrics: EdgeMetrics;
  deployment: EdgeDeployment;
}

export interface EdgeCapability {
  type: 'compute' | 'storage' | 'network' | 'sensor' | 'actuator' | 'ai_inference' | 'video_processing';
  name: string;
  description: string;
  specs: unknown;
  enabled: boolean;
}

export interface EdgeResources {
  cpu: {
    cores: number;
    architecture: string;
    frequency: number; // MHz
    usage: number; // percentage
  };
  memory: {
    total: number; // MB
    available: number; // MB
    usage: number; // percentage
  };
  storage: {
    total: number; // GB
    available: number; // GB
    type: 'ssd' | 'hdd' | 'emmc' | 'sd';
  };
  network: {
    interfaces: NetworkInterface[];
    bandwidth: number; // Mbps
    latency: number; // ms
  };
  battery?: {
    level: number; // percentage
    charging: boolean;
    estimatedLife: number; // hours
  };
}

export interface NetworkInterface {
  name: string;
  type: 'ethernet' | 'wifi' | 'cellular' | 'bluetooth' | 'zigbee' | 'lora';
  status: 'connected' | 'disconnected' | 'error';
  ip: string;
  mac: string;
  signal?: number; // signal strength for wireless
}

export interface EdgeConfiguration {
  runtime: {
    containerEngine: 'docker' | 'podman' | 'containerd' | 'native';
    orchestrator?: 'kubernetes' | 'docker-swarm' | 'nomad';
    autoUpdate: boolean;
    restartPolicy: 'always' | 'on-failure' | 'unless-stopped';
  };
  security: {
    encryption: boolean;
    certificates: string[];
    firewall: FirewallRule[];
    vpn?: VPNConfig;
  };
  monitoring: {
    enabled: boolean;
    interval: number; // seconds
    metrics: string[];
    alerting: boolean;
  };
  storage: {
    dataRetention: number; // days
    compression: boolean;
    backup: BackupConfig;
  };
}

export interface FirewallRule {
  name: string;
  action: 'allow' | 'deny';
  direction: 'inbound' | 'outbound' | 'both';
  protocol: 'tcp' | 'udp' | 'icmp' | 'any';
  port?: number;
  source?: string;
  destination?: string;
}

export interface VPNConfig {
  type: 'wireguard' | 'openvpn' | 'ipsec';
  server: string;
  credentials: unknown;
  enabled: boolean;
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string; // cron format
  destination: 'cloud' | 'local' | 'network';
  encryption: boolean;
  retention: number; // days
}

export interface EdgeMetrics {
  nodeId: string;
  timestamp: Date;
  uptime: number; // seconds
  cpuUsage: number; // percentage
  memoryUsage: number; // percentage
  diskUsage: number; // percentage
  networkIn: number; // bytes/sec
  networkOut: number; // bytes/sec
  temperature?: number; // celsius
  powerConsumption?: number; // watts
  customMetrics: { [key: string]: number };
}

export interface EdgeDeployment {
  workflowId: string;
  version: string;
  status: 'pending' | 'deploying' | 'running' | 'stopped' | 'failed';
  containers: EdgeContainer[];
  services: EdgeService[];
  volumes: EdgeVolume[];
  networks: EdgeNetwork[];
  deployedAt?: Date;
  lastUpdate?: Date;
  rollbackVersion?: string;
}

export interface EdgeContainer {
  id: string;
  name: string;
  image: string;
  tag: string;
  status: 'running' | 'stopped' | 'error';
  ports: PortMapping[];
  environment: { [key: string]: string };
  volumes: string[];
  resources: ContainerResources;
  restartCount: number;
  logs: string[];
}

export interface PortMapping {
  internal: number;
  external: number;
  protocol: 'tcp' | 'udp';
}

export interface ContainerResources {
  cpuLimit?: number; // percentage
  memoryLimit?: number; // MB
  storageLimit?: number; // GB
}

export interface EdgeService {
  name: string;
  type: 'http' | 'tcp' | 'udp' | 'mqtt' | 'websocket';
  port: number;
  protocol: string;
  healthCheck: HealthCheck;
  loadBalancing?: LoadBalancingConfig;
}

export interface HealthCheck {
  enabled: boolean;
  endpoint?: string;
  interval: number; // seconds
  timeout: number; // seconds
  retries: number;
}

export interface LoadBalancingConfig {
  algorithm: 'round_robin' | 'least_connections' | 'weighted' | 'hash';
  targets: string[];
  healthCheck: boolean;
}

export interface EdgeVolume {
  name: string;
  type: 'local' | 'network' | 'tmpfs';
  mountPath: string;
  size?: number; // GB
  readOnly: boolean;
  backup: boolean;
}

export interface EdgeNetwork {
  name: string;
  type: 'bridge' | 'host' | 'overlay' | 'macvlan';
  subnet?: string;
  gateway?: string;
  dns?: string[];
}

export interface IoTDevice {
  id: string;
  name: string;
  type: 'sensor' | 'actuator' | 'gateway' | 'camera' | 'beacon' | 'display' | 'custom';
  manufacturer: string;
  model: string;
  version: string;
  protocol: 'mqtt' | 'coap' | 'http' | 'websocket' | 'zigbee' | 'zwave' | 'bluetooth' | 'lora' | 'custom';
  edgeNodeId: string;
  configuration: IoTConfiguration;
  sensors: IoTSensor[];
  actuators: IoTActuator[];
  status: 'active' | 'inactive' | 'maintenance' | 'error';
  lastSeen: Date;
  location?: {
    latitude: number;
    longitude: number;
    description: string;
  };
  metadata: { [key: string]: unknown };
}

export interface IoTConfiguration {
  connectionString: string;
  authentication: {
    type: 'none' | 'basic' | 'token' | 'certificate' | 'api_key';
    credentials: unknown;
  };
  communication: {
    interval: number; // seconds
    retryPolicy: RetryPolicy;
    encryption: boolean;
    compression: boolean;
  };
  power: {
    mode: 'always_on' | 'sleep' | 'deep_sleep' | 'scheduled';
    schedule?: string; // cron format
    batteryOptimization: boolean;
  };
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential' | 'fixed';
  baseDelay: number; // ms
  maxDelay: number; // ms
}

export interface IoTSensor {
  id: string;
  type: 'temperature' | 'humidity' | 'pressure' | 'light' | 'motion' | 'sound' | 'air_quality' | 'gps' | 'accelerometer' | 'gyroscope' | 'magnetic' | 'custom';
  name: string;
  unit: string;
  range: {
    min: number;
    max: number;
  };
  accuracy: number;
  resolution: number;
  samplingRate: number; // Hz
  calibration: SensorCalibration;
  alerts: SensorAlert[];
  lastReading?: SensorReading;
}

export interface SensorCalibration {
  enabled: boolean;
  offset: number;
  scale: number;
  lastCalibrated?: Date;
  calibrationData?: unknown;
}

export interface SensorAlert {
  type: 'threshold' | 'rate_of_change' | 'anomaly' | 'custom';
  condition: AlertCondition;
  action: AlertAction;
  enabled: boolean;
}

export interface AlertCondition {
  operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'between' | 'outside';
  value: number | number[];
  duration?: number; // seconds
}

export interface AlertAction {
  type: 'notification' | 'webhook' | 'email' | 'sms' | 'actuator' | 'workflow';
  target: string;
  payload: unknown;
}

export interface SensorReading {
  sensorId: string;
  timestamp: Date;
  value: number;
  quality: 'good' | 'uncertain' | 'bad';
  metadata?: { [key: string]: unknown };
}

export interface IoTActuator {
  id: string;
  type: 'relay' | 'servo' | 'stepper' | 'led' | 'buzzer' | 'valve' | 'pump' | 'heater' | 'fan' | 'custom';
  name: string;
  capabilities: ActuatorCapability[];
  currentState: unknown;
  commands: ActuatorCommand[];
}

export interface ActuatorCapability {
  name: string;
  type: 'boolean' | 'numeric' | 'enum' | 'string';
  range?: {
    min: number;
    max: number;
  };
  options?: string[];
  unit?: string;
}

export interface ActuatorCommand {
  id: string;
  name: string;
  description: string;
  parameters: CommandParameter[];
  validation: CommandValidation;
}

export interface CommandParameter {
  name: string;
  type: 'boolean' | 'number' | 'string' | 'array' | 'object';
  required: boolean;
  default?: unknown;
  description: string;
}

export interface CommandValidation {
  required: string[];
  rules: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: 'min' | 'max' | 'pattern' | 'enum' | 'custom';
  value: unknown;
  message: string;
}

export interface EdgeWorkflow {
  id: string;
  name: string;
  description: string;
  type: 'real_time' | 'batch' | 'event_driven' | 'scheduled';
  targetNodes: string[];
  requirements: DeploymentRequirements;
  configuration: WorkflowConfiguration;
  pipeline: WorkflowStage[];
  triggers: WorkflowTrigger[];
  outputs: WorkflowOutput[];
  status: 'draft' | 'deploying' | 'deployed' | 'running' | 'stopped' | 'error';
  version: string;
  createdAt: Date;
  updatedAt: Date;
  deployments: { [nodeId: string]: EdgeDeployment };
}

export interface DeploymentRequirements {
  minCpu: number; // percentage
  minMemory: number; // MB
  minStorage: number; // GB
  requiredCapabilities: string[];
  networkRequirements: NetworkRequirements;
  locationConstraints?: LocationConstraints;
}

export interface NetworkRequirements {
  minBandwidth: number; // Mbps
  maxLatency: number; // ms
  connectivity: 'always' | 'intermittent' | 'scheduled';
  protocols: string[];
}

export interface LocationConstraints {
  regions?: string[];
  excludeRegions?: string[];
  maxDistanceFromCenter?: {
    latitude: number;
    longitude: number;
    radius: number; // km
  };
  timezone?: string[];
}

export interface WorkflowConfiguration {
  runtime: {
    language: 'javascript' | 'python' | 'go' | 'rust' | 'c++' | 'container';
    version: string;
    entrypoint: string;
  };
  resources: {
    cpuLimit: number; // percentage
    memoryLimit: number; // MB
    storageLimit: number; // GB
    timeout: number; // seconds
  };
  scaling: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetCpuUtilization: number;
    targetMemoryUtilization: number;
  };
  persistence: {
    enabled: boolean;
    volumeSize: number; // GB
    backup: boolean;
  };
}

export interface WorkflowStage {
  id: string;
  name: string;
  type: 'data_collection' | 'processing' | 'ai_inference' | 'aggregation' | 'filtering' | 'transformation' | 'output';
  configuration: unknown;
  dependencies: string[];
  parallel: boolean;
  retryPolicy: RetryPolicy;
  resources: StageResources;
}

export interface StageResources {
  cpuRequest: number; // percentage
  memoryRequest: number; // MB
  timeout: number; // seconds
}

export interface WorkflowTrigger {
  type: 'sensor_data' | 'time_based' | 'event' | 'api_call' | 'file_change' | 'threshold' | 'custom';
  configuration: unknown;
  enabled: boolean;
  filters?: TriggerFilter[];
}

export interface TriggerFilter {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'regex';
  value: unknown;
}

export interface WorkflowOutput {
  type: 'cloud_storage' | 'database' | 'api' | 'file' | 'stream' | 'actuator' | 'notification';
  destination: string;
  format: 'json' | 'csv' | 'binary' | 'custom';
  configuration: unknown;
  filters?: OutputFilter[];
}

export interface OutputFilter {
  include?: string[];
  exclude?: string[];
  transform?: { [field: string]: string };
}

export interface EdgeAnalytics {
  nodeId: string;
  timeRange: {
    start: Date;
    end: Date;
  };
  performance: PerformanceMetrics;
  reliability: ReliabilityMetrics;
  efficiency: EfficiencyMetrics;
  insights: AnalyticsInsight[];
  recommendations: AnalyticsRecommendation[];
}

export interface PerformanceMetrics {
  avgCpuUsage: number;
  avgMemoryUsage: number;
  avgNetworkLatency: number;
  workflowExecutionTime: number;
  throughput: number; // operations per second
  errorRate: number; // percentage
}

export interface ReliabilityMetrics {
  uptime: number; // percentage
  mtbf: number; // mean time between failures in hours
  mttr: number; // mean time to recovery in minutes
  successRate: number; // percentage
  dataLossRate: number; // percentage
}

export interface EfficiencyMetrics {
  powerEfficiency: number; // operations per watt
  costEfficiency: number; // operations per dollar
  resourceUtilization: number; // percentage
  dataCompressionRatio: number;
  networkEfficiency: number; // bytes transferred vs bytes needed
}

export interface AnalyticsInsight {
  type: 'performance' | 'reliability' | 'efficiency' | 'security' | 'cost';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // percentage
  data: unknown;
  timestamp: Date;
}

export interface AnalyticsRecommendation {
  type: 'optimization' | 'scaling' | 'maintenance' | 'security' | 'cost_reduction';
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  priority: number;
  implementation: string;
  estimatedSavings?: {
    type: 'cost' | 'time' | 'resources';
    amount: number;
    unit: string;
  };
}

export class EdgeComputingService {
  private edgeNodes: Map<string, EdgeNode> = new Map();
  private iotDevices: Map<string, IoTDevice> = new Map();
  private edgeWorkflows: Map<string, EdgeWorkflow> = new Map();
  private sensorReadings: Map<string, SensorReading[]> = new Map();
  private deployments: Map<string, EdgeDeployment> = new Map();
  private analytics: Map<string, EdgeAnalytics> = new Map();

  constructor() {
    this.initializeSampleData();
    this.startMetricsCollection();
  }

  // Edge Node Management
  async registerEdgeNode(node: Omit<EdgeNode, 'id' | 'lastSeen' | 'metrics'>): Promise<EdgeNode> {
    const nodeId = this.generateId();
    const newNode: EdgeNode = {
      ...node,
      id: nodeId,
      lastSeen: new Date(),
      metrics: this.createInitialMetrics(nodeId)
    };

    this.edgeNodes.set(newNode.id, newNode);
    return newNode;
  }

  async getEdgeNodes(filters?: {
    type?: string;
    status?: string;
    location?: { latitude: number; longitude: number; radius: number };
    capabilities?: string[];
  }): Promise<EdgeNode[]> {
    let nodes = Array.from(this.edgeNodes.values());

    if (filters) {
      nodes = nodes.filter(node => {
        if (filters.type && node.type !== filters.type) return false;
        if (filters.status && node.status !== filters.status) return false;
        if (filters.capabilities && !filters.capabilities.every(cap =>
          node.capabilities.some(c => c.type === cap && c.enabled)
        )) return false;
        if (filters.location) {
          const distance = this.calculateDistance(
            node.location.latitude,
            node.location.longitude,
            filters.location.latitude,
            filters.location.longitude
          );
          if (distance > filters.location.radius) return false;
        }
        return true;
      });
    }

    return nodes;
  }

  async updateEdgeNode(nodeId: string, updates: Partial<EdgeNode>): Promise<EdgeNode | undefined> {
    const node = this.edgeNodes.get(nodeId);
    if (node) {
      const updatedNode = { ...node, ...updates };
      this.edgeNodes.set(nodeId, updatedNode);
      return updatedNode;
    }
    return undefined;
  }

  async removeEdgeNode(nodeId: string): Promise<boolean> {
    return this.edgeNodes.delete(nodeId);
  }

  // IoT Device Management
  async registerIoTDevice(device: Omit<IoTDevice, 'id' | 'lastSeen'>): Promise<IoTDevice> {
    const newDevice: IoTDevice = {
      ...device,
      id: this.generateId(),
      lastSeen: new Date()
    };

    this.iotDevices.set(newDevice.id, newDevice);
    return newDevice;
  }

  async getIoTDevices(edgeNodeId?: string): Promise<IoTDevice[]> {
    const devices = Array.from(this.iotDevices.values());
    if (edgeNodeId) {
      return devices.filter(device => device.edgeNodeId === edgeNodeId);
    }

    return devices;
  }

  async updateIoTDevice(deviceId: string, updates: Partial<IoTDevice>): Promise<IoTDevice | undefined> {
    const device = this.iotDevices.get(deviceId);
    if (device) {
      const updatedDevice = { ...device, ...updates };
      this.iotDevices.set(deviceId, updatedDevice);
      return updatedDevice;
    }
    return undefined;
  }

  // Sensor Data Management
  async recordSensorReading(reading: SensorReading): Promise<void> {
    const readings = this.sensorReadings.get(reading.sensorId) || [];
    readings.push(reading);

    // Keep only last 10000 readings per sensor
    if (readings.length > 10000) {
      readings.shift();
    }

    this.sensorReadings.set(reading.sensorId, readings);

    // Update last reading in device
    const device = Array.from(this.iotDevices.values())
      .find(d => d.sensors.some(s => s.id === reading.sensorId));

    if (device) {
      const sensor = device.sensors.find(s => s.id === reading.sensorId);
      if (sensor) {
        sensor.lastReading = reading;
        await this.updateIoTDevice(device.id, device);
      }
    }

    // Check alerts
    await this.checkSensorAlerts(reading);
  }

  async getSensorReadings(sensorId: string, timeRange?: { start: Date; end: Date }): Promise<SensorReading[]> {
    let readings = this.sensorReadings.get(sensorId) || [];
    if (timeRange) {
      readings = readings.filter(reading =>
        reading.timestamp >= timeRange.start && reading.timestamp <= timeRange.end
      );
    }

    return readings.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Actuator Control
  async executeActuatorCommand(deviceId: string, actuatorId: string, commandId: string, parameters: unknown): Promise<{
    success: boolean;
    result?: unknown;
    error?: string;
  }> {
    const device = this.iotDevices.get(deviceId);
    if (!device) {
      return { success: false, error: 'Device not found' };
    }

    const actuator = device.actuators.find(a => a.id === actuatorId);
    if (!actuator) {
      return { success: false, error: 'Actuator not found' };
    }

    const command = actuator.commands.find(c => c.id === commandId);
    if (!command) {
      return { success: false, error: 'Command not found' };
    }

    // Validate parameters
    const validation = this.validateCommandParameters(command, parameters as object);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Execute command (mock implementation)
      const result = await this.executeCommand(device, actuator, command, parameters);
      // Update actuator state
      actuator.currentState = result.newState;
      await this.updateIoTDevice(deviceId, device);

      return { success: true, result: result.output };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // Edge Workflow Management
  async createEdgeWorkflow(workflow: Omit<EdgeWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'deployments'>): Promise<EdgeWorkflow> {
    const newWorkflow: EdgeWorkflow = {
      ...workflow,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      deployments: {}
    };

    this.edgeWorkflows.set(newWorkflow.id, newWorkflow);
    return newWorkflow;
  }

  async deployWorkflow(workflowId: string, targetNodes?: string[]): Promise<{
    success: boolean;
    deployments: { [nodeId: string]: EdgeDeployment };
    errors: { [nodeId: string]: string };
  }> {
    const workflow = this.edgeWorkflows.get(workflowId);
    if (!workflow) {
      throw new Error('Workflow not found');
    }

    const deployments: { [nodeId: string]: EdgeDeployment } = {};
    const errors: { [nodeId: string]: string } = {};

    const nodes = targetNodes || workflow.targetNodes;
    for (const nodeId of nodes) {
      try {
        const deployment = await this.deployToNode(workflow, nodeId);
        deployments[nodeId] = deployment;
        workflow.deployments[nodeId] = deployment;
      } catch (error) {
        errors[nodeId] = error instanceof Error ? error.message : String(error);
      }
    }

    workflow.status = Object.keys(errors).length === 0 ? 'deployed' : 'error';
    workflow.updatedAt = new Date();

    this.edgeWorkflows.set(workflowId, workflow);

    return {
      success: Object.keys(errors).length === 0,
      deployments,
      errors
    };
  }

  async stopWorkflow(workflowId: string, nodeIds?: string[]): Promise<void> {
    const workflow = this.edgeWorkflows.get(workflowId);
    if (!workflow) return;

    const targetNodes = nodeIds || workflow.targetNodes;
    for (const nodeId of targetNodes) {
      const deployment = workflow.deployments[nodeId];
      if (deployment) {
        deployment.status = 'stopped';
        deployment.lastUpdate = new Date();
      }
    }

    workflow.status = 'stopped';
    workflow.updatedAt = new Date();
    this.edgeWorkflows.set(workflowId, workflow);
  }

  // Analytics and Monitoring
  async getEdgeAnalytics(nodeId: string, timeRange: { start: Date; end: Date }): Promise<EdgeAnalytics> {
    const node = this.edgeNodes.get(nodeId);
    if (!node) {
      throw new Error('Edge node not found');
    }

    // Generate or retrieve analytics
    const analytics = this.generateAnalytics(node, timeRange);
    this.analytics.set(`${nodeId}-${timeRange.start.getTime()}`, analytics);

    return analytics;
  }

   
  async getFleetAnalytics(nodeIds: string[], _timeRange: { start: Date; end: Date }): Promise<{
    overview: {
      totalNodes: number;
      onlineNodes: number;
      totalDevices: number;
      activeDevices: number;
      totalWorkflows: number;
      runningWorkflows: number;
    };
    performance: {
      avgCpuUsage: number;
      avgMemoryUsage: number;
      avgNetworkLatency: number;
      totalThroughput: number;
    };
    alerts: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    topNodes: Array<{
      nodeId: string;
      name: string;
      performance: number;
      reliability: number;
    }>;
  }> {
    const nodes = Array.from(this.edgeNodes.values()).filter(n => nodeIds.includes(n.id));
    const devices = Array.from(this.iotDevices.values());
    const workflows = Array.from(this.edgeWorkflows.values()).filter(
      w => w.targetNodes.some(nodeId => nodeIds.includes(nodeId))
    );

    return {
      overview: {
        totalNodes: nodes.length,
        onlineNodes: nodes.filter(n => n.status === 'online').length,
        totalDevices: devices.length,
        activeDevices: devices.filter(d => d.status === 'active').length,
        totalWorkflows: workflows.length,
        runningWorkflows: workflows.filter(w => w.status === 'running').length
      },
      performance: {
        avgCpuUsage: nodes.reduce((sum, n) => sum + n.metrics.cpuUsage, 0) / nodes.length,
        avgMemoryUsage: nodes.reduce((sum, n) => sum + n.metrics.memoryUsage, 0) / nodes.length,
        avgNetworkLatency: nodes.reduce((sum, n) => sum + (n.resources.network.latency || 0), 0) / nodes.length,
        totalThroughput: nodes.reduce((sum, n) => sum + (n.metrics.networkIn + n.metrics.networkOut), 0)
      },
      alerts: {
        critical: 0,
        high: 2,
        medium: 5,
        low: 8
      },
      topNodes: nodes.slice(0, 5).map(node => ({
        nodeId: node.id,
        name: node.name,
        performance: Math.random() * 100,
        reliability: Math.random() * 100
      }))
    };
  }

  // Device Discovery
  async discoverDevices(nodeId: string, protocol?: string): Promise<IoTDevice[]> {
    // Mock device discovery
    const discoveredDevices: IoTDevice[] = [];
    const deviceTypes = ['sensor', 'actuator', 'gateway', 'camera', 'beacon', 'display', 'custom'] as const;
    const protocols = ['mqtt', 'coap', 'http', 'websocket', 'zigbee', 'zwave', 'bluetooth', 'lora', 'custom'] as const;

    for (let i = 0; i < Math.floor(Math.random() * 5) + 1; i++) {
      const selectedProtocol = protocol || protocols[Math.floor(Math.random() * protocols.length)];
      const device: IoTDevice = {
        id: this.generateId(),
        name: `Discovered Device ${i + 1}`,
        type: deviceTypes[Math.floor(Math.random() * deviceTypes.length)],
        manufacturer: 'Generic',
        model: `Model-${Math.floor(Math.random() * 1000)}`,
        version: '1.0.0',
        protocol: selectedProtocol as IoTDevice['protocol'],
        edgeNodeId: nodeId,
        configuration: this.createDefaultIoTConfiguration(),
        sensors: [],
        actuators: [],
        status: 'active',
        lastSeen: new Date(),
        metadata: {}
      };

      discoveredDevices.push(device);
    }

    return discoveredDevices;
  }

  // Security Management
  async updateSecurityConfiguration(nodeId: string, securityConfig: EdgeConfiguration['security']): Promise<void> {
    const node = this.edgeNodes.get(nodeId);
    if (node) {
      node.configuration.security = securityConfig;
      await this.updateEdgeNode(nodeId, node);
    }
  }

  async rotateSecurityCertificates(nodeId: string): Promise<{
    success: boolean;
    newCertificates: string[];
    expiryDate: Date;
  }> {
    const node = this.edgeNodes.get(nodeId);

    // Mock certificate rotation
    const newCertificates = [
      `cert-${this.generateId()}`,
      `key-${this.generateId()}`
    ];

    if (node) {
      node.configuration.security.certificates = newCertificates;
      await this.updateEdgeNode(nodeId, node);
    }

    return {
      success: true,
      newCertificates,
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    };
  }

  // Network Optimization
   
  async optimizeNetworkTopology(_nodeIds: string[]): Promise<{
    recommendations: Array<{
      type: 'routing' | 'bandwidth' | 'latency' | 'redundancy';
      description: string;
      impact: 'low' | 'medium' | 'high';
      implementation: string;
    }>;
    estimatedImprovements: {
      latencyReduction: number; // percentage
      bandwidthIncrease: number; // percentage
      reliabilityImprovement: number; // percentage
    };
  }> {
    // Mock network optimization analysis
    return {
      recommendations: [
        {
          type: 'routing',
          description: 'Implement mesh networking between edge nodes',
          impact: 'high',
          implementation: 'Deploy mesh routing protocol and configure redundant paths'
        },
        {
          type: 'bandwidth',
          description: 'Optimize data compression for sensor data',
          impact: 'medium',
          implementation: 'Enable GZIP compression and implement delta encoding'
        },
        {
          type: 'latency',
          description: 'Cache frequently accessed data locally',
          impact: 'high',
          implementation: 'Deploy Redis cache on edge nodes with smart prefetching'
        }
      ],
      estimatedImprovements: {
        latencyReduction: 35,
        bandwidthIncrease: 25,
        reliabilityImprovement: 40
      }
    };
  }

  // Private Helper Methods
  private async deployToNode(workflow: EdgeWorkflow, nodeId: string): Promise<EdgeDeployment> {
    const node = this.edgeNodes.get(nodeId);
    if (!node) {
      throw new Error(`Edge node ${nodeId} not found`);
    }

    // Check resource requirements
    const hasRequiredResources = this.checkResourceRequirements(node, workflow.requirements);
    if (!hasRequiredResources) {
      throw new Error('Insufficient resources on target node');
    }

    const deployment: EdgeDeployment = {
      workflowId: workflow.id,
      version: workflow.version,
      status: 'deploying',
      containers: this.generateContainers(workflow),
      services: this.generateServices(workflow),
      volumes: this.generateVolumes(workflow),
      networks: this.generateNetworks(workflow),
      deployedAt: new Date()
    };

    // Simulate deployment process
    setTimeout(() => {
      deployment.status = 'running';
      deployment.lastUpdate = new Date();
    }, 2000);

    this.deployments.set(`${workflow.id}-${nodeId}`, deployment);
    return deployment;
  }

  private checkResourceRequirements(node: EdgeNode, requirements: DeploymentRequirements): boolean {
    const resources = node.resources;

    return (
      resources.cpu.usage + requirements.minCpu <= 100 &&
      resources.memory.available >= requirements.minMemory &&
      resources.storage.available >= requirements.minStorage &&
      requirements.requiredCapabilities.every(cap =>
        node.capabilities.some(c => c.type === cap && c.enabled)
      )
    );
  }

  private generateContainers(workflow: EdgeWorkflow): EdgeContainer[] {
    return workflow.pipeline.map(stage => ({
      id: this.generateId(),
      name: `${workflow.name}-${stage.name}`,
      image: `workflow/${stage.type}`,
      tag: 'latest',
      status: 'running',
      ports: [],
      environment: {},
      volumes: [],
      resources: {
        cpuLimit: stage.resources.cpuRequest,
        memoryLimit: stage.resources.memoryRequest
      },
      restartCount: 0,
      logs: []
    }));
  }

  private generateServices(workflow: EdgeWorkflow): EdgeService[] {
    return [{
      name: `${workflow.name}-service`,
      type: 'http',
      port: 8080,
      protocol: 'HTTP/1.1',
      healthCheck: {
        enabled: true,
        endpoint: '/health',
        interval: 30,
        timeout: 5,
        retries: 3
      }
    }];
  }

  private generateVolumes(workflow: EdgeWorkflow): EdgeVolume[] {
    if (!workflow.configuration.persistence.enabled) return [];
    
    return [{
      name: `${workflow.name}-data`,
      type: 'local',
      mountPath: '/data',
      size: workflow.configuration.persistence.volumeSize,
      readOnly: false,
      backup: workflow.configuration.persistence.backup
    }];
  }

  private generateNetworks(workflow: EdgeWorkflow): EdgeNetwork[] {
    return [{
      name: `${workflow.name}-network`,
      type: 'bridge',
      subnet: '172.20.0.0/16',
      gateway: '172.20.0.1'
    }];
  }

  private async checkSensorAlerts(reading: SensorReading): Promise<void> {
    const device = Array.from(this.iotDevices.values())
      .find(d => d.sensors.some(s => s.id === reading.sensorId));

    if (!device) return;

    const sensor = device.sensors.find(s => s.id === reading.sensorId);
    if (!sensor) return;

    for (const alert of sensor.alerts) {
      if (!alert.enabled) continue;

      const triggered = this.evaluateAlertCondition(reading.value, alert.condition);
      if (triggered) {
        await this.executeAlertAction(alert.action, reading);
      }
    }
  }

  private evaluateAlertCondition(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case 'greater_than':
        return typeof condition.value === 'number' && value > condition.value;
      case 'less_than':
        return typeof condition.value === 'number' && value < condition.value;
      case 'equals':
        return value === condition.value;
      case 'between':
        return Array.isArray(condition.value) &&
               condition.value.length >= 2 &&
               value >= condition.value[0] &&
               value <= condition.value[1];
      default:
        return false;
    }
  }

  private async executeAlertAction(action: AlertAction, reading: SensorReading): Promise<void> {
    switch (action.type) {
      case 'notification':
        logger.info(`Alert: Sensor ${reading.sensorId} triggered with value ${reading.value}`);
        break;
      case 'webhook':
        // Mock webhook call
        break;
      case 'actuator':
        // Execute actuator command
        break;
      default:
        logger.info('Unknown alert action:', action.type);
    }
  }

   
  private async executeCommand(device: IoTDevice, actuator: IoTActuator, command: ActuatorCommand, _parameters: unknown): Promise<{
    output: unknown;
    newState: unknown;
  }> {
    // Mock command execution
    const currentState = actuator.currentState as Record<string, unknown> | null;
    return {
      output: { success: true, message: `Command ${command.name} executed` },
      newState: { ...(currentState || {}), lastCommand: command.name, lastUpdate: new Date() }
    };
  }

  private validateCommandParameters(command: ActuatorCommand, parameters: unknown): { valid: boolean; error?: string } {
    const params = parameters as Record<string, unknown>;
    for (const param of command.parameters) {
      if (param.required && !(param.name in params)) {
        return { valid: false, error: `Missing required parameter: ${param.name}` };
      }
    }
    return { valid: true };
  }

  private generateAnalytics(node: EdgeNode, timeRange: { start: Date; end: Date }): EdgeAnalytics {
    return {
      nodeId: node.id,
      timeRange,
      performance: {
        avgCpuUsage: node.metrics.cpuUsage,
        avgMemoryUsage: node.metrics.memoryUsage,
        avgNetworkLatency: node.resources.network.latency,
        workflowExecutionTime: Math.random() * 1000,
        throughput: Math.random() * 100,
        errorRate: Math.random() * 5
      },
      reliability: {
        uptime: 99.5,
        mtbf: 720,
        mttr: 15,
        successRate: 99.2,
        dataLossRate: 0.1
      },
      efficiency: {
        powerEfficiency: Math.random() * 10,
        costEfficiency: Math.random() * 5,
        resourceUtilization: (node.metrics.cpuUsage + node.metrics.memoryUsage) / 2,
        dataCompressionRatio: 3.2,
        networkEfficiency: 85.5
      },
      insights: [
        {
          type: 'performance',
          title: 'High CPU Usage Detected',
          description: 'CPU usage consistently above 80% for the past hour',
          severity: 'medium',
          confidence: 85,
          data: { cpuUsage: node.metrics.cpuUsage },
          timestamp: new Date()
        }
      ],
      recommendations: [
        {
          type: 'optimization',
          title: 'Optimize Workflow Scheduling',
          description: 'Implement load balancing to distribute workloads more evenly',
          impact: 'high',
          effort: 'medium',
          priority: 1,
          implementation: 'Configure round-robin scheduling for workflow execution',
          estimatedSavings: {
            type: 'resources',
            amount: 25,
            unit: 'percent'
          }
        }
      ]
    };
  }

  private createInitialMetrics(nodeId: string): EdgeMetrics {
    return {
      nodeId,
      timestamp: new Date(),
      uptime: Math.random() * 1000000,
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: Math.random() * 100,
      networkIn: Math.random() * 1000000,
      networkOut: Math.random() * 1000000,
      temperature: 20 + Math.random() * 40,
      powerConsumption: Math.random() * 50,
      customMetrics: {}
    };
  }

  private createDefaultIoTConfiguration(): IoTConfiguration {
    return {
      connectionString: 'mqtt://localhost:1883',
      authentication: {
        type: 'none',
        credentials: {}
      },
      communication: {
        interval: 60,
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential',
          baseDelay: 1000,
          maxDelay: 30000
        },
        encryption: false,
        compression: false
      },
      power: {
        mode: 'always_on',
        batteryOptimization: false
      }
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      // Update metrics for all nodes
      const nodes = Array.from(this.edgeNodes.values());
      for (const node of nodes) {
        node.metrics.timestamp = new Date();
        node.metrics.cpuUsage = Math.max(0, Math.min(100, node.metrics.cpuUsage + (Math.random() - 0.5) * 10));
        node.metrics.memoryUsage = Math.max(0, Math.min(100, node.metrics.memoryUsage + (Math.random() - 0.5) * 5));
        node.metrics.networkIn = Math.random() * 1000000;
        node.metrics.networkOut = Math.random() * 1000000;
        node.lastSeen = new Date();
      }
    }, 30000); // Update every 30 seconds
  }

  private initializeSampleData(): void {
    // Create sample edge nodes
    const sampleNodes: EdgeNode[] = [
      {
        id: 'edge-001',
        name: 'Factory Floor Gateway',
        type: 'gateway',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: 'New York, NY',
          timezone: 'America/New_York'
        },
        capabilities: [
          { type: 'compute', name: 'ARM CPU', description: '4-core ARM Cortex-A72', specs: { cores: 4 }, enabled: true },
          { type: 'ai_inference', name: 'TensorFlow Lite', description: 'AI inference engine', specs: {}, enabled: true }
        ],
        resources: {
          cpu: { cores: 4, architecture: 'ARM64', frequency: 1500, usage: 45 },
          memory: { total: 4096, available: 2048, usage: 50 },
          storage: { total: 64, available: 32, type: 'emmc' },
          network: {
            interfaces: [
              { name: 'eth0', type: 'ethernet', status: 'connected', ip: '192.168.1.100', mac: '00:11:22:33:44:55' }
            ],
            bandwidth: 100,
            latency: 5
          }
        },
        status: 'online',
        lastSeen: new Date(),
        version: '1.2.3',
        metadata: { department: 'manufacturing' },
        configuration: {
          runtime: { containerEngine: 'docker', autoUpdate: true, restartPolicy: 'always' },
          security: { encryption: true, certificates: [], firewall: [] },
          monitoring: { enabled: true, interval: 30, metrics: ['cpu', 'memory'], alerting: true },
          storage: { dataRetention: 30, compression: true, backup: { enabled: true, schedule: '0 2 * * *', destination: 'cloud', encryption: true, retention: 7 } }
        },
        metrics: this.createInitialMetrics('edge-001'),
        deployment: {
          workflowId: '',
          version: '',
          status: 'stopped',
          containers: [],
          services: [],
          volumes: [],
          networks: []
        }
      }
    ];

    sampleNodes.forEach(node => this.edgeNodes.set(node.id, node));

    // Create sample IoT devices
    const sampleDevices: IoTDevice[] = [
      {
        id: 'iot-001',
        name: 'Temperature Sensor #1',
        type: 'sensor',
        manufacturer: 'Bosch',
        model: 'BME280',
        version: '1.0',
        protocol: 'mqtt',
        edgeNodeId: 'edge-001',
        configuration: this.createDefaultIoTConfiguration(),
        sensors: [
          {
            id: 'temp-001',
            type: 'temperature',
            name: 'Ambient Temperature',
            unit: '°C',
            range: { min: -40, max: 85 },
            accuracy: 0.5,
            resolution: 0.1,
            samplingRate: 1,
            calibration: { enabled: false, offset: 0, scale: 1 },
            alerts: []
          }
        ],
        actuators: [],
        status: 'active',
        lastSeen: new Date(),
        metadata: { location: 'Zone A' }
      }
    ];

    sampleDevices.forEach(device => this.iotDevices.set(device.id, device));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

// Singleton instance
export const edgeComputingService = new EdgeComputingService();