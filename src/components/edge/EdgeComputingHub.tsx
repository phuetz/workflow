import React, { useState, useEffect } from 'react';
import {
  Activity, AlertCircle, AlertTriangle, Cpu, Home, Info,
  MoreHorizontal, Play, Plus, Server, Settings, Wifi,
  Workflow, X
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import { logger } from '../../services/SimpleLogger';
import {
  edgeComputingService,
  EdgeNode,
  IoTDevice,
  EdgeWorkflow,
  SensorReading
} from '../../services/EdgeComputingService';

interface FleetAnalytics {
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
}

interface EdgeComputingHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function EdgeComputingHub({ isOpen, onClose }: EdgeComputingHubProps) {
  const { darkMode } = useWorkflowStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'nodes' | 'devices' | 'workflows' | 'analytics' | 'monitoring'>('overview');
  const [edgeNodes, setEdgeNodes] = useState<EdgeNode[]>([]);
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  const [edgeWorkflows, setEdgeWorkflows] = useState<EdgeWorkflow[]>([]);
  const [selectedNode, setSelectedNode] = useState<EdgeNode | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [fleetAnalytics, setFleetAnalytics] = useState<FleetAnalytics | null>(null);
  const [sensorReadings, setSensorReadings] = useState<{ [sensorId: string]: SensorReading[] }>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [nodes, devices, analytics] = await Promise.all([
        edgeComputingService.getEdgeNodes(),
        edgeComputingService.getIoTDevices(),
        edgeComputingService.getFleetAnalytics(['edge-001'], {
          start: new Date(Date.now() - 24 * 60 * 60 * 1000),
          end: new Date()
        })
      ]);

      setEdgeNodes(nodes);
      setIotDevices(devices);
      setFleetAnalytics(analytics);
    } catch (error) {
      logger.error('Failed to load edge computing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
      case 'running':
        return 'text-green-500 bg-green-100';
      case 'offline':
      case 'inactive':
      case 'stopped':
        return 'text-gray-500 bg-gray-100';
      case 'maintenance':
      case 'deploying':
        return 'text-yellow-500 bg-yellow-100';
      case 'error':
      case 'failed':
        return 'text-red-500 bg-red-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'raspberry_pi': return '🥧';
      case 'edge_server': return '🖥️';
      default: return '💻';
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'gateway': return '🌐';
      case 'sensor_hub': return '📡';
      case 'mobile_device': return '📱';
      case 'sensor': return '🌡️';
      case 'actuator': return '⚙️';
      case 'camera': return '📷';
      case 'beacon': return '📶';
      default: return '🔧';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'active':
        return 'text-green-500 bg-green-100';
      case 'offline':
      case 'inactive':
        return 'text-gray-500 bg-gray-100';
      case 'maintenance':
        return 'text-yellow-500 bg-yellow-100';
      default:
        return 'text-gray-500 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    return getNodeIcon(type) || getDeviceIcon(type);
  };

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Fleet Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Edge Nodes</p>
              <p className="text-2xl font-bold">{edgeNodes.length}</p>
              <p className="text-sm text-green-500 mt-1">
                {edgeNodes.filter(n => n.status === 'online').length} online
              </p>
            </div>
            <Server size={32} className="text-blue-500" />
          </div>
        </div>

        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">IoT Devices</p>
              <p className="text-2xl font-bold">{iotDevices.length}</p>
              <p className="text-sm text-green-500 mt-1">
                {iotDevices.filter(d => d.status === 'active').length} active
              </p>
            </div>
            <Cpu size={32} className="text-green-500" />
          </div>
        </div>

        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Workflows</p>
              <p className="text-2xl font-bold">{edgeWorkflows.length}</p>
              <p className="text-sm text-blue-500 mt-1">
                {edgeWorkflows.filter(w => w.status === 'running').length} running
              </p>
            </div>
            <Workflow size={32} className="text-purple-500" />
          </div>
        </div>

        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Data Points</p>
              <p className="text-2xl font-bold">
                {Object.values(sensorReadings).reduce((sum, readings) => sum + readings.length, 0)}
              </p>
              <p className="text-sm text-orange-500 mt-1">Last 24h</p>
            </div>
            <Activity size={32} className="text-orange-500" />
          </div>
        </div>
      </div>

      {/* Fleet Performance */}
      {fleetAnalytics && (
        <div className={`p-6 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h3 className="text-lg font-semibold mb-4">Fleet Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-500 mb-2">
                {fleetAnalytics.performance.avgCpuUsage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Average CPU Usage</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${fleetAnalytics.performance.avgCpuUsage}%` }}
                />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500 mb-2">
                {fleetAnalytics.performance.avgMemoryUsage.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500">Average Memory Usage</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${fleetAnalytics.performance.avgMemoryUsage}%` }}
                />
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-500 mb-2">
                {fleetAnalytics.performance.avgNetworkLatency.toFixed(0)}ms
              </div>
              <div className="text-sm text-gray-500">Average Latency</div>
              <div className="flex items-center justify-center mt-2">
                <Wifi className="text-purple-500" size={16} />
                <span className="ml-1 text-sm text-purple-500">Excellent</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      <div className={`p-6 rounded-lg border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Alerts</h3>
          <button 
            onClick={() => setActiveTab('monitoring')}
            className="text-blue-500 hover:text-blue-600 text-sm"
          >
            View All
          </button>
        </div>
        <div className="space-y-3">
          {[
            { type: 'warning', message: 'High CPU usage on Edge Node #1', timestamp: '2 minutes ago', severity: 'medium' },
            { type: 'info', message: 'New IoT device discovered on Edge Node #2', timestamp: '5 minutes ago', severity: 'low' },
            { type: 'error', message: 'Connection timeout to sensor TH-001', timestamp: '8 minutes ago', severity: 'high' }
          ].map((alert, index) => (
            <div key={index} className={`p-3 rounded-lg flex items-start space-x-3 ${
              alert.severity === 'high' ? 'bg-red-50 dark:bg-red-900/20' :
              alert.severity === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
              'bg-blue-50 dark:bg-blue-900/20'
            }`}>
              {alert.type === 'error' ? (
                <AlertTriangle className="text-red-500 mt-0.5" size={16} />
              ) : alert.type === 'warning' ? (
                <AlertCircle className="text-yellow-500 mt-0.5" size={16} />
              ) : (
                <Info className="text-blue-500 mt-0.5" size={16} />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  alert.severity === 'high' ? 'text-red-700 dark:text-red-300' :
                  alert.severity === 'medium' ? 'text-yellow-700 dark:text-yellow-300' :
                  'text-blue-700 dark:text-blue-300'
                }`}>
                  {alert.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">{alert.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing Nodes */}
      <div className={`p-6 rounded-lg border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h3 className="text-lg font-semibold mb-4">Top Performing Nodes</h3>
        <div className="space-y-3">
          {edgeNodes.slice(0, 3).map((node, index) => (
            <div key={node.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">{getTypeIcon(node.type)}</div>
                <div>
                  <p className="font-medium">{node.name}</p>
                  <p className="text-sm text-gray-500">{node.location.address}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${
                    node.status === 'online' ? 'bg-green-500' :
                    node.status === 'offline' ? 'bg-gray-500' :
                    node.status === 'maintenance' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <span className="text-sm capitalize">{node.status}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  CPU: {node.metrics.cpuUsage.toFixed(1)}% | Memory: {node.metrics.memoryUsage.toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const NodesTab = () => <div className="text-center py-8">Nodes tab content</div>;
  const DevicesTab = () => <div className="text-center py-8">Devices tab content</div>;
  const WorkflowsTab = () => <div className="text-center py-8">Workflows tab content</div>;
  const MonitoringTab = () => <div className="text-center py-8">Monitoring tab content</div>;

  const renderDeviceManagement = () => (
    <div className="space-y-6">
      {/* Device Filter */}
      <div className="flex items-center space-x-4">
        <select className={`px-3 py-2 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'
        }`}>
          <option value="">All Device Types</option>
          <option value="sensor">Sensors</option>
          <option value="actuator">Actuators</option>
          <option value="camera">Cameras</option>
          <option value="gateway">Gateways</option>
        </select>
        
        <select className={`px-3 py-2 rounded-lg border ${
          darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200'
        }`}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
          <option value="error">Error</option>
        </select>

        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          Discover Devices
        </button>
      </div>

      {/* Devices Table */}
      <div className={`rounded-lg border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } overflow-hidden`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold">IoT Devices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left p-4 font-medium">Device</th>
                <th className="text-left p-4 font-medium">Type</th>
                <th className="text-left p-4 font-medium">Edge Node</th>
                <th className="text-left p-4 font-medium">Protocol</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Last Seen</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {iotDevices.map(device => (
                <tr key={device.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{getTypeIcon(device.type)}</div>
                      <div>
                        <p className="font-medium">{device.name}</p>
                        <p className="text-sm text-gray-500">{device.manufacturer} {device.model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 capitalize">{device.type}</td>
                  <td className="p-4">
                    <span className="text-sm">{edgeNodes.find(n => n.id === device.edgeNodeId)?.name || 'Unknown'}</span>
                  </td>
                  <td className="p-4 uppercase">{device.protocol}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
                      {device.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {device.lastSeen.toLocaleString()}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {}}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                      >
                        <Settings size={16} />
                      </button>
                      <button className="p-2 text-green-500 hover:bg-green-50 rounded">
                        <Play size={16} />
                      </button>
                      <button className="p-2 text-gray-500 hover:bg-gray-50 rounded">
                        <MoreHorizontal size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`w-full max-w-7xl max-h-[90vh] ${
        darkMode ? 'bg-gray-900' : 'bg-white'
      } rounded-xl shadow-2xl overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                <Cpu className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Edge Computing Hub</h2>
                <p className="text-sm text-gray-500">Manage edge nodes, IoT devices, and edge workflows</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {[
            { id: 'overview', label: 'Overview', icon: Home },
            { id: 'nodes', label: 'Edge Nodes', icon: Server },
            { id: 'devices', label: 'IoT Devices', icon: Cpu },
            { id: 'workflows', label: 'Workflows', icon: Workflow },
            { id: 'monitoring', label: 'Monitoring', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'overview' | 'nodes' | 'devices' | 'workflows' | 'analytics' | 'monitoring')}
              className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 transition-colors ${
                activeTab === tab.id
                  ? darkMode
                    ? 'bg-gray-800 text-green-400 border-b-2 border-green-400'
                    : 'bg-gray-50 text-green-600 border-b-2 border-green-600'
                  : darkMode
                    ? 'text-gray-400 hover:text-gray-200'
                    : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ height: 'calc(90vh - 160px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewTab />}
              {activeTab === 'nodes' && <NodesTab />}
              {activeTab === 'devices' && <DevicesTab />}
              {activeTab === 'monitoring' && <MonitoringTab />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}