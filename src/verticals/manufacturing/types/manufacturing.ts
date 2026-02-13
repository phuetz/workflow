/**
 * Manufacturing Type Definitions
 * Supports OPC UA, MQTT, ModBus, and Industry 4.0 standards
 */

// OPC UA Types
export interface OPCUAConnection {
  endpointUrl: string;
  securityMode?: 'None' | 'Sign' | 'SignAndEncrypt';
  securityPolicy?: string;
  username?: string;
  password?: string;
  certificatePath?: string;
  privateKeyPath?: string;
}

export interface OPCUANode {
  nodeId: string;
  browseName: string;
  displayName: string;
  nodeClass: 'Object' | 'Variable' | 'Method' | 'ObjectType' | 'VariableType' | 'ReferenceType' | 'DataType' | 'View';
  value?: any;
  dataType?: string;
  accessLevel?: 'CurrentRead' | 'CurrentWrite' | 'HistoryRead' | 'HistoryWrite';
  timestamp?: Date;
  quality?: 'Good' | 'Uncertain' | 'Bad';
}

export interface OPCUASubscription {
  subscriptionId: string;
  publishingInterval: number; // milliseconds
  maxKeepAliveCount: number;
  maxNotificationsPerPublish: number;
  priority: number;
  monitoredItems: OPCUAMonitoredItem[];
}

export interface OPCUAMonitoredItem {
  monitoredItemId: string;
  nodeId: string;
  samplingInterval: number; // milliseconds
  queueSize: number;
  discardOldest: boolean;
}

export interface OPCUADataValue {
  nodeId: string;
  value: any;
  sourceTimestamp: Date;
  serverTimestamp: Date;
  quality: 'Good' | 'Uncertain' | 'Bad';
  statusCode: number;
}

// MQTT Types
export interface MQTTConnection {
  broker: string;
  port?: number;
  clientId?: string;
  username?: string;
  password?: string;
  protocol?: 'mqtt' | 'mqtts' | 'ws' | 'wss';
  keepAlive?: number;
  clean?: boolean;
  reconnectPeriod?: number;
}

export interface MQTTMessage {
  topic: string;
  payload: any;
  qos?: 0 | 1 | 2;
  retain?: boolean;
  timestamp: Date;
}

export interface MQTTSubscription {
  topic: string;
  qos?: 0 | 1 | 2;
}

// ModBus Types
export type ModBusFunction = 'ReadCoils' | 'ReadDiscreteInputs' | 'ReadHoldingRegisters' | 'ReadInputRegisters' | 'WriteSingleCoil' | 'WriteSingleRegister' | 'WriteMultipleCoils' | 'WriteMultipleRegisters';

export interface ModBusConnection {
  host: string;
  port?: number;
  unitId?: number;
  timeout?: number;
  protocol?: 'TCP' | 'RTU';
}

export interface ModBusRequest {
  function: ModBusFunction;
  address: number;
  quantity?: number;
  value?: number | boolean | number[];
}

export interface ModBusResponse {
  function: ModBusFunction;
  address: number;
  values: number[] | boolean[];
  timestamp: Date;
}

// Machine & Sensor Data
export interface MachineStatus {
  machineId: string;
  machineName: string;
  status: 'running' | 'idle' | 'maintenance' | 'error' | 'offline';
  operatingMode?: 'auto' | 'manual' | 'semi-auto';
  speed?: number; // units per hour
  temperature?: number;
  pressure?: number;
  vibration?: number;
  powerConsumption?: number;
  cycleTime?: number; // seconds
  partsProduced?: number;
  uptime?: number; // percentage
  lastMaintenance?: Date;
  nextMaintenance?: Date;
  alerts?: MachineAlert[];
  timestamp: Date;
}

export interface MachineAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  timestamp: Date;
  acknowledged?: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface SensorReading {
  sensorId: string;
  sensorType: 'temperature' | 'pressure' | 'humidity' | 'vibration' | 'flow' | 'level' | 'speed' | 'power' | 'position' | 'proximity';
  value: number;
  unit: string;
  quality: 'good' | 'uncertain' | 'bad';
  timestamp: Date;
  min?: number;
  max?: number;
  threshold?: {
    low?: number;
    high?: number;
    critical_low?: number;
    critical_high?: number;
  };
}

// Production Data
export interface ProductionOrder {
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  quantityProduced: number;
  quantityRejected: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  startDate: Date;
  endDate?: Date;
  dueDate: Date;
  machineIds?: string[];
  operatorIds?: string[];
  batchNumber?: string;
  qualityChecks?: QualityCheck[];
}

export interface QualityCheck {
  id: string;
  type: 'visual' | 'dimensional' | 'functional' | 'performance';
  parameter: string;
  result: 'pass' | 'fail' | 'rework';
  measuredValue?: number;
  expectedValue?: number;
  tolerance?: number;
  inspector?: string;
  timestamp: Date;
  notes?: string;
}

export interface ProductionMetrics {
  period: { start: Date; end: Date };
  machineId?: string;
  totalProduced: number;
  totalRejected: number;
  yieldRate: number; // percentage
  scrapRate: number; // percentage
  averageCycleTime: number; // seconds
  oee: OEEMetrics;
  downtime: DowntimeRecord[];
}

export interface OEEMetrics {
  availability: number; // percentage
  performance: number; // percentage
  quality: number; // percentage
  oee: number; // percentage (availability * performance * quality)
}

export interface DowntimeRecord {
  startTime: Date;
  endTime?: Date;
  duration: number; // minutes
  reason: string;
  category: 'planned' | 'unplanned';
  type: 'maintenance' | 'changeover' | 'breakdown' | 'material_shortage' | 'quality_issue' | 'other';
  machineId: string;
  notes?: string;
}

// Predictive Maintenance
export interface MaintenanceSchedule {
  scheduleId: string;
  machineId: string;
  maintenanceType: 'preventive' | 'predictive' | 'corrective';
  taskDescription: string;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  nextDueDate: Date;
  estimatedDuration: number; // hours
  assignedTo?: string;
  parts?: MaintenancePart[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue' | 'cancelled';
}

export interface MaintenancePart {
  partNumber: string;
  partName: string;
  quantity: number;
  estimatedCost?: number;
}

export interface PredictiveMaintenanceAlert {
  id: string;
  machineId: string;
  component: string;
  prediction: {
    failureProbability: number; // 0-100
    estimatedTimeToFailure: number; // hours
    confidence: number; // 0-100
  };
  indicators: {
    name: string;
    currentValue: number;
    normalRange: { min: number; max: number };
    trend: 'increasing' | 'decreasing' | 'stable';
  }[];
  recommendedAction: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
}

// Digital Twin
export interface DigitalTwin {
  twinId: string;
  physicalAssetId: string;
  assetType: 'machine' | 'production_line' | 'factory' | 'product';
  state: {
    current: any;
    predicted?: any;
    optimal?: any;
  };
  properties: Record<string, any>;
  telemetry: {
    [key: string]: {
      value: any;
      timestamp: Date;
      unit?: string;
    };
  };
  analytics: {
    anomalies?: Anomaly[];
    predictions?: Prediction[];
    optimizations?: Optimization[];
  };
  lastSyncTime: Date;
}

export interface Anomaly {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  parameter: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
}

export interface Prediction {
  id: string;
  type: string;
  parameter: string;
  predictedValue: number;
  predictedAt: Date;
  confidence: number; // 0-100
  timeHorizon: number; // hours
}

export interface Optimization {
  id: string;
  type: string;
  description: string;
  currentValue: number;
  optimizedValue: number;
  potentialSavings?: {
    amount: number;
    unit: string;
  };
  implementationPlan?: string;
}

// Supply Chain Integration
export interface InventoryLevel {
  itemId: string;
  itemName: string;
  location: string;
  quantity: number;
  unit: string;
  reorderPoint: number;
  reorderQuantity: number;
  leadTime: number; // days
  lastUpdated: Date;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'on_order';
}

export interface MaterialRequest {
  requestId: string;
  itemId: string;
  quantity: number;
  requiredBy: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  requestedBy: string;
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled' | 'cancelled';
  approvedBy?: string;
  approvalDate?: Date;
}

// Energy Monitoring
export interface EnergyConsumption {
  machineId?: string;
  zone?: string;
  period: { start: Date; end: Date };
  consumption: {
    total: number; // kWh
    average: number; // kW
    peak: number; // kW
  };
  cost?: {
    total: number;
    currency: string;
    rate: number; // per kWh
  };
  breakdown?: {
    operation: number;
    idle: number;
    startup: number;
  };
}

// Environmental Monitoring
export interface EnvironmentalData {
  location: string;
  timestamp: Date;
  temperature: number;
  humidity: number;
  airQuality?: {
    pm25?: number;
    pm10?: number;
    co2?: number;
    voc?: number;
  };
  noise?: number; // dB
  lighting?: number; // lux
  compliance: {
    withinLimits: boolean;
    violations?: string[];
  };
}
