/**
 * Manufacturing Workflow Nodes
 * 20+ nodes for OPC UA, MQTT, sensors, predictive maintenance, digital twins
 */

import { OPCUAClient } from './OPCUAClient';
import { PredictiveMaintenanceEngine } from './PredictiveMaintenance';
import type {
  OPCUAConnection,
  OPCUADataValue,
  MQTTConnection,
  MQTTMessage,
  ModBusConnection,
  ModBusRequest,
  MachineStatus,
  SensorReading,
  ProductionOrder,
  ProductionMetrics,
  MaintenanceSchedule,
  PredictiveMaintenanceAlert,
  DigitalTwin,
  InventoryLevel,
  EnergyConsumption,
} from './types/manufacturing';

export interface ManufacturingNodeConfig {
  opcuaConfig?: OPCUAConnection;
  mqttConfig?: MQTTConnection;
  modbusConfig?: ModBusConnection;
  predictiveMaintenanceConfig?: {
    alertThresholds: { failureProbability: number; timeToFailure: number };
    historicalDataWindow: number;
    anomalyDetectionSensitivity: 'low' | 'medium' | 'high';
  };
}

export interface NodeInput { json: any; binary?: any; }
export interface NodeOutput { json: any; binary?: any; }

// OPC UA Nodes

export class OPCUAConnectNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.opcuaConfig) throw new Error('OPC UA configuration required');
    const client = new OPCUAClient(config.opcuaConfig);
    await client.connect();
    return { json: { connected: true, endpoint: config.opcuaConfig.endpointUrl } };
  }
}

export class OPCUABrowseNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.opcuaConfig) throw new Error('OPC UA configuration required');
    const client = new OPCUAClient(config.opcuaConfig);
    await client.connect();
    const nodes = await client.browse(input.json.nodeId);
    return { json: { nodes, count: nodes.length } };
  }
}

export class OPCUAReadNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.opcuaConfig) throw new Error('OPC UA configuration required');
    const client = new OPCUAClient(config.opcuaConfig);
    await client.connect();
    const nodeIds = Array.isArray(input.json.nodeIds) ? input.json.nodeIds : [input.json.nodeId];
    const values = await client.readNodes(nodeIds);
    return { json: { values } };
  }
}

export class OPCUAWriteNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.opcuaConfig) throw new Error('OPC UA configuration required');
    const client = new OPCUAClient(config.opcuaConfig);
    await client.connect();
    await client.writeNode(input.json.nodeId, input.json.value);
    return { json: { written: true, nodeId: input.json.nodeId, value: input.json.value } };
  }
}

export class OPCUASubscribeNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.opcuaConfig) throw new Error('OPC UA configuration required');
    const client = new OPCUAClient(config.opcuaConfig);
    await client.connect();
    const subscriptionId = await client.createSubscription(input.json.publishingInterval);
    const monitoredItemId = await client.monitorItem(subscriptionId, input.json.nodeId, input.json.samplingInterval);
    return { json: { subscriptionId, monitoredItemId, monitoring: input.json.nodeId } };
  }
}

// Machine Status Nodes

export class GetMachineStatusNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const machineId = input.json.machineId;
    // In production, fetch from actual system
    const status: MachineStatus = {
      machineId,
      machineName: `Machine ${machineId}`,
      status: 'running',
      operatingMode: 'auto',
      speed: 100,
      temperature: 65,
      pressure: 150,
      vibration: 2.5,
      powerConsumption: 45,
      cycleTime: 30,
      partsProduced: 1250,
      uptime: 94.5,
      timestamp: new Date(),
    };
    return { json: { status } };
  }
}

export class UpdateMachineStatusNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const status = input.json as MachineStatus;
    // In production, update actual system
    return { json: { updated: true, machineId: status.machineId } };
  }
}

export class GetSensorReadingsNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const machineId = input.json.machineId;
    // Mock sensor readings
    const readings: SensorReading[] = [
      { sensorId: `${machineId}-temp`, sensorType: 'temperature', value: 65, unit: '°C', quality: 'good', timestamp: new Date() },
      { sensorId: `${machineId}-pres`, sensorType: 'pressure', value: 150, unit: 'PSI', quality: 'good', timestamp: new Date() },
      { sensorId: `${machineId}-vib`, sensorType: 'vibration', value: 2.5, unit: 'mm/s', quality: 'good', timestamp: new Date() },
    ];
    return { json: { readings, machineId } };
  }
}

// Production Nodes

export class CreateProductionOrderNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const order: ProductionOrder = {
      orderId: `PO-${Date.now()}`,
      productId: input.json.productId,
      productName: input.json.productName,
      quantity: input.json.quantity,
      quantityProduced: 0,
      quantityRejected: 0,
      status: 'pending',
      priority: input.json.priority || 'normal',
      startDate: new Date(),
      dueDate: new Date(input.json.dueDate),
    };
    return { json: { order } };
  }
}

export class UpdateProductionOrderNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const order = input.json as ProductionOrder;
    // In production, update database
    return { json: { updated: true, orderId: order.orderId } };
  }
}

export class CalculateOEENode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.predictiveMaintenanceConfig) throw new Error('Predictive maintenance config required');
    const engine = new PredictiveMaintenanceEngine(config.predictiveMaintenanceConfig);
    const metrics = input.json as ProductionMetrics;
    const oee = engine.calculateOEE(metrics);
    return { json: { oee, metrics } };
  }
}

export class GetProductionMetricsNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const machineId = input.json.machineId;
    const metrics: ProductionMetrics = {
      period: { start: new Date(input.json.startDate), end: new Date(input.json.endDate) },
      machineId,
      totalProduced: 1250,
      totalRejected: 45,
      yieldRate: 96.4,
      scrapRate: 3.6,
      averageCycleTime: 30,
      oee: { availability: 94.5, performance: 92.0, quality: 96.4, oee: 83.8 },
      downtime: [],
    };
    return { json: { metrics } };
  }
}

// Predictive Maintenance Nodes

export class AnalyzeMachineHealthNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.predictiveMaintenanceConfig) throw new Error('Predictive maintenance config required');
    const engine = new PredictiveMaintenanceEngine(config.predictiveMaintenanceConfig);
    const alert = await engine.analyzeMachineHealth(input.json.machineId, input.json.status, input.json.sensorData);
    return { json: { alert, requiresMaintenance: alert !== null } };
  }
}

export class CreateMaintenanceScheduleNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const schedule: MaintenanceSchedule = {
      scheduleId: `MS-${Date.now()}`,
      machineId: input.json.machineId,
      maintenanceType: input.json.maintenanceType,
      taskDescription: input.json.taskDescription,
      frequency: input.json.frequency,
      nextDueDate: new Date(input.json.nextDueDate),
      estimatedDuration: input.json.estimatedDuration,
      status: 'scheduled',
    };
    return { json: { schedule } };
  }
}

export class GetMaintenanceAlertsNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.predictiveMaintenanceConfig) throw new Error('Predictive maintenance config required');
    const engine = new PredictiveMaintenanceEngine(config.predictiveMaintenanceConfig);
    const alerts = engine.getAlerts();
    return { json: { alerts, count: alerts.length } };
  }
}

// Digital Twin Nodes

export class CreateDigitalTwinNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.predictiveMaintenanceConfig) throw new Error('Predictive maintenance config required');
    const engine = new PredictiveMaintenanceEngine(config.predictiveMaintenanceConfig);
    const twin = await engine.updateDigitalTwin(input.json.twinId, input.json.physicalAssetId, input.json.currentState, input.json.telemetry);
    return { json: { twin } };
  }
}

export class GetDigitalTwinNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.predictiveMaintenanceConfig) throw new Error('Predictive maintenance config required');
    const engine = new PredictiveMaintenanceEngine(config.predictiveMaintenanceConfig);
    const twin = engine.getDigitalTwin(input.json.twinId);
    return { json: { twin, found: twin !== undefined } };
  }
}

export class SimulateDigitalTwinNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const twin = input.json.twin as DigitalTwin;
    // Simple simulation - in production use advanced physics/ML models
    const simulatedState = { ...twin.state.current, speed: twin.state.current.speed * 1.1, temperature: twin.state.current.temperature + 2 };
    return { json: { simulatedState, twin } };
  }
}

// Inventory & Supply Chain Nodes

export class CheckInventoryNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const itemId = input.json.itemId;
    // Mock inventory check
    const inventory: InventoryLevel = {
      itemId,
      itemName: input.json.itemName || `Item ${itemId}`,
      location: 'Warehouse A',
      quantity: 1500,
      unit: 'pcs',
      reorderPoint: 500,
      reorderQuantity: 2000,
      leadTime: 7,
      lastUpdated: new Date(),
      status: 'in_stock',
    };
    return { json: { inventory } };
  }
}

export class CreateMaterialRequestNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const request = {
      requestId: `MR-${Date.now()}`,
      itemId: input.json.itemId,
      quantity: input.json.quantity,
      requiredBy: new Date(input.json.requiredBy),
      priority: input.json.priority || 'normal',
      requestedBy: input.json.requestedBy,
      status: 'pending' as const,
    };
    return { json: { request } };
  }
}

// Energy Monitoring Nodes

export class GetEnergyConsumptionNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const consumption: EnergyConsumption = {
      machineId: input.json.machineId,
      period: { start: new Date(input.json.startDate), end: new Date(input.json.endDate) },
      consumption: { total: 450, average: 45, peak: 68 },
      cost: { total: 67.5, currency: 'USD', rate: 0.15 },
      breakdown: { operation: 350, idle: 80, startup: 20 },
    };
    return { json: { consumption } };
  }
}

export class OptimizeEnergyUsageNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const current = input.json.currentConsumption;
    const optimized = current * 0.85; // 15% reduction
    const savings = (current - optimized) * input.json.rate * 24 * 30;
    return { json: { currentConsumption: current, optimizedConsumption: optimized, monthlySavings: savings, currency: 'USD' } };
  }
}

// Quality Control Nodes

export class PerformQualityCheckNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const check = {
      id: `QC-${Date.now()}`,
      type: input.json.type,
      parameter: input.json.parameter,
      result: input.json.measuredValue >= input.json.expectedValue - input.json.tolerance &&
        input.json.measuredValue <= input.json.expectedValue + input.json.tolerance ? 'pass' : 'fail',
      measuredValue: input.json.measuredValue,
      expectedValue: input.json.expectedValue,
      tolerance: input.json.tolerance,
      timestamp: new Date(),
    };
    return { json: { check } };
  }
}

export class AnalyzeDefectsNode {
  async execute(input: NodeInput): Promise<NodeOutput> {
    const defects = input.json.defects || [];
    const totalDefects = defects.length;
    const defectsByType = defects.reduce((acc: any, d: any) => {
      acc[d.type] = (acc[d.type] || 0) + 1;
      return acc;
    }, {});
    const mostCommonDefect = Object.entries(defectsByType).sort((a: any, b: any) => b[1] - a[1])[0];
    return { json: { totalDefects, defectsByType, mostCommonDefect: mostCommonDefect ? { type: mostCommonDefect[0], count: mostCommonDefect[1] } : null } };
  }
}

// MQTT Nodes (for IoT sensors)

export class MQTTPublishNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    const message: MQTTMessage = {
      topic: input.json.topic,
      payload: input.json.payload,
      qos: input.json.qos || 0,
      retain: input.json.retain || false,
      timestamp: new Date(),
    };
    // In production, publish to actual MQTT broker
    return { json: { published: true, message } };
  }
}

export class MQTTSubscribeNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    const subscription = {
      topic: input.json.topic,
      qos: input.json.qos || 0,
      subscribed: true,
    };
    return { json: { subscription } };
  }
}

// ModBus Nodes

export class ModBusReadNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.modbusConfig) throw new Error('ModBus configuration required');
    const request = input.json as ModBusRequest;
    // Mock response
    const response = {
      function: request.function,
      address: request.address,
      values: Array(request.quantity || 1).fill(0).map(() => Math.random() * 100),
      timestamp: new Date(),
    };
    return { json: { response } };
  }
}

export class ModBusWriteNode {
  async execute(input: NodeInput, config: ManufacturingNodeConfig): Promise<NodeOutput> {
    if (!config.modbusConfig) throw new Error('ModBus configuration required');
    const request = input.json as ModBusRequest;
    return { json: { written: true, address: request.address, value: request.value } };
  }
}

// Export all manufacturing nodes
export const manufacturingNodes = {
  OPCUAConnectNode, OPCUABrowseNode, OPCUAReadNode, OPCUAWriteNode, OPCUASubscribeNode,
  GetMachineStatusNode, UpdateMachineStatusNode, GetSensorReadingsNode,
  CreateProductionOrderNode, UpdateProductionOrderNode, CalculateOEENode, GetProductionMetricsNode,
  AnalyzeMachineHealthNode, CreateMaintenanceScheduleNode, GetMaintenanceAlertsNode,
  CreateDigitalTwinNode, GetDigitalTwinNode, SimulateDigitalTwinNode,
  CheckInventoryNode, CreateMaterialRequestNode,
  GetEnergyConsumptionNode, OptimizeEnergyUsageNode,
  PerformQualityCheckNode, AnalyzeDefectsNode,
  MQTTPublishNode, MQTTSubscribeNode,
  ModBusReadNode, ModBusWriteNode,
};
