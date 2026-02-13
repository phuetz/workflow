import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Cloud, 
  Package, 
  Settings, 
  Play, 
  Square, 
  RefreshCw,
  Download,
  Upload,
  Shield,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  DollarSign,
  Cpu,
  HardDrive,
  Database,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Globe,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Lock,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Terminal,
  FileText,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ChevronRight,
  Plus,
  Trash2,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Edit3,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Copy,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ExternalLink,
  Zap,
  X
} from 'lucide-react';
import { deploymentService } from '../../services/DeploymentService';
import { 
  DeploymentConfig, 
  DeploymentTemplate, 
  DeploymentStatus,
  DeploymentMetrics,
  ValidationResult
} from '../../types/deployment';

interface DeploymentStatusBadgeProps {
  status: DeploymentStatus;
}

const DeploymentStatusBadge: React.FC<DeploymentStatusBadgeProps> = ({ status }) => {
  const statusConfig = {
    provisioning: { color: 'bg-yellow-500', icon: Clock },
    deploying: { color: 'bg-blue-500', icon: Upload },
    running: { color: 'bg-green-500', icon: CheckCircle },
    updating: { color: 'bg-yellow-500', icon: RefreshCw },
    scaling: { color: 'bg-blue-500', icon: Zap },
    stopping: { color: 'bg-orange-500', icon: Square },
    stopped: { color: 'bg-gray-500', icon: Square },
    failed: { color: 'bg-red-500', icon: AlertCircle },
    terminated: { color: 'bg-gray-700', icon: Trash2 }
  };


  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white ${config.color}`}>
      <Icon size={12} />
      {status}
    </span>
  );
};

export default function DeploymentDashboard() {
  const [templates, setTemplates] = useState<DeploymentTemplate[]>([]);
  const [deployments, setDeployments] = useState<DeploymentConfig[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DeploymentTemplate | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentConfig | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'deployments' | 'create'>('templates');
  const [metrics, setMetrics] = useState<DeploymentMetrics | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [exportFormat, setExportFormat] = useState<'yaml' | 'json' | 'terraform'>('yaml');
  const [showConfigModal, setShowConfigModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [customConfig, setCustomConfig] = useState<unknown>({});

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (selectedDeployment && selectedDeployment.status === 'running') {
      loadMetrics(selectedDeployment.id);
      interval = setInterval(() => loadMetrics(selectedDeployment.id), 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedDeployment]);

  const loadData = async () => {
    const [templatesData, deploymentsData] = await Promise.all([
      deploymentService.getTemplates(),
      deploymentService.listDeployments()
    ]);
    setTemplates(templatesData);
    setDeployments(deploymentsData);
  };

  const loadDeployments = async () => {
    const data = await deploymentService.listDeployments();
    setDeployments(data);
  };

  const loadMetrics = async (deploymentId: string) => {
    const data = await deploymentService.getMetrics(deploymentId);
    setMetrics(data);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDeploy = async (template: DeploymentTemplate, config: any) => {
    const validation = await deploymentService.validateConfiguration(config);
    
    if (validation.valid) {
      const result = await deploymentService.deployApplication(config);
      if (result.success) {
        await loadDeployments();
        setActiveTab('deployments');
      }
    } else {
      setValidationResult(validation);
    }
  };

  const handleExportConfig = (deployment: DeploymentConfig) => {
    const content = deploymentService.exportConfiguration(deployment, exportFormat);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deployment.name}-config.${exportFormat}`;
    a.click();
  };

  const renderTemplates = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <div key={template.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {template.type === 'docker' && <Package className="text-blue-500" size={24} />}
              {template.type === 'kubernetes' && <Server className="text-purple-500" size={24} />}
              {template.type === 'cloud-native' && <Cloud className="text-green-500" size={24} />}
              <div>
                <h3 className="font-semibold text-lg">{template.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{template.size} Instance</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-green-600">
                ${template.estimatedCost.monthly}
              </p>
              <p className="text-xs text-gray-500">/month</p>
            </div>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 mb-4">{template.description}</p>
          
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <Cpu size={16} className="text-gray-400" />
              <span>{template.requirements.minCpu} vCPUs</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <HardDrive size={16} className="text-gray-400" />
              <span>{template.requirements.minMemory}GB RAM</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Database size={16} className="text-gray-400" />
              <span>{template.requirements.minStorage}GB Storage</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setSelectedTemplate(template)}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <FileText size={16} />
              View Details
            </button>
            <button
              onClick={() => {
                setSelectedTemplate(template);
                setShowConfigModal(true);
              }}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Play size={16} />
              Deploy
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderDeployments = () => (
    <div className="space-y-4">
      {deployments.map((deployment) => (
        <div key={deployment.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div>
                <h3 className="font-semibold text-lg">{deployment.name}</h3>
                <p className="text-sm text-gray-500">
                  {deployment.type} • {deployment.infrastructure.provider} • {deployment.metadata.environment}
                </p>
              </div>
              <DeploymentStatusBadge status={deployment.status} />
            </div>
            
            <div className="flex items-center gap-2">
              {deployment.status === 'running' && (
                <>
                  <button
                    onClick={() => deploymentService.restartDeployment(deployment.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Restart"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button
                    onClick={() => deploymentService.stopDeployment(deployment.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Stop"
                  >
                    <Square size={16} />
                  </button>
                </>
              )}
              {deployment.status === 'stopped' && (
                <button
                  onClick={() => deploymentService.deployApplication(deployment.id)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Start"
                >
                  <Play size={16} />
                </button>
              )}
              <button
                onClick={() => setSelectedDeployment(deployment)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="View Details"
              >
                <Settings size={16} />
              </button>
              <button
                onClick={() => handleExportConfig(deployment)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Export Config"
              >
                <Download size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">CPU</p>
              <p className="font-semibold">{deployment.infrastructure.specifications.compute.cpu} vCPUs</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Memory</p>
              <p className="font-semibold">{deployment.infrastructure.specifications.memory.ram}GB</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Storage</p>
              <p className="font-semibold">{deployment.infrastructure.specifications.storage.size}GB</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Network</p>
              <p className="font-semibold">{deployment.infrastructure.specifications.network.bandwidth}Mbps</p>
            </div>
          </div>

          {deployment.status === 'running' && metrics && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Activity size={16} />
                Live Metrics
              </h4>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">CPU Usage</p>
                  <p className="font-semibold">
                    {metrics.cpu[metrics.cpu.length - 1]?.value.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Memory Usage</p>
                  <p className="font-semibold">
                    {metrics.memory[metrics.memory.length - 1]?.value.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Disk Usage</p>
                  <p className="font-semibold">
                    {metrics.disk[metrics.disk.length - 1]?.value.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Network I/O</p>
                  <p className="font-semibold">
                    {metrics.network[metrics.network.length - 1]?.value.toFixed(1)} Mbps
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderDeploymentDetails = () => {
    if (!selectedDeployment) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">{selectedDeployment.name}</h2>
              <button
                onClick={() => setSelectedDeployment(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Infrastructure Details */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Server size={18} />
                Infrastructure
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Provider</p>
                  <p className="font-medium">{selectedDeployment.infrastructure.provider}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Region</p>
                  <p className="font-medium">{selectedDeployment.infrastructure.region || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Application Components */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Package size={18} />
                Application Components
              </h3>
              <div className="space-y-2">
                {selectedDeployment.application.components.map((component) => (
                  <div key={component.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${component.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <span className="font-medium">{component.name}</span>
                      <span className="text-sm text-gray-500">({component.type})</span>
                    </div>
                    <span className="text-sm">{component.replicas} replicas</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Configuration */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Shield size={18} />
                Security
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Authentication</p>
                  <p className="font-medium">
                    {selectedDeployment.security.authentication.providers.filter(p => p.enabled).map(p => p.type).join(', ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">MFA</p>
                  <p className="font-medium">
                    {selectedDeployment.security.authentication.mfa.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Encryption at Rest</p>
                  <p className="font-medium">
                    {selectedDeployment.security.encryption.atRest.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Firewall</p>
                  <p className="font-medium">
                    {selectedDeployment.security.firewall.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
            </div>

            {/* Export Configuration */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Download size={18} />
                Export Configuration
              </h3>
              <div className="flex items-center gap-4">
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value as 'yaml' | 'json' | 'terraform')}
                  className="px-4 py-2 border rounded-lg"
                >
                  <option value="yaml">YAML</option>
                  <option value="json">JSON</option>
                  <option value="terraform">Terraform</option>
                </select>
                <button
                  onClick={() => handleExportConfig(selectedDeployment)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Download size={16} />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Self-Hosted Deployment</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Deploy and manage your workflow automation platform on your own infrastructure
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'templates'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Deployment Templates
          </button>
          <button
            onClick={() => setActiveTab('deployments')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'deployments'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Active Deployments ({deployments.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-3 px-1 font-medium transition-colors ${
              activeTab === 'create'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Custom Deployment
          </button>
        </div>

        {/* Content */}
        {activeTab === 'templates' && renderTemplates()}
        {activeTab === 'deployments' && renderDeployments()}
        {activeTab === 'create' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Custom Deployment Configuration</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Create a custom deployment configuration tailored to your specific requirements.
            </p>
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2">
              <Plus size={20} />
              Create Custom Configuration
            </button>
          </div>
        )}

        {/* Template Details Modal */}
        {selectedTemplate && !showConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{selectedTemplate.name}</h2>
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-600 dark:text-gray-400">{selectedTemplate.description}</p>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Estimated Cost</h3>
                  <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">${selectedTemplate.estimatedCost.monthly}/month</p>
                    <p className="text-sm text-gray-500">≈ ${selectedTemplate.estimatedCost.hourly}/hour</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Quick Start Guide</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    Estimated time: {selectedTemplate.quickStart.estimatedTime} minutes
                  </p>
                  <div className="space-y-2">
                    {selectedTemplate.quickStart.steps.map((step) => (
                      <div key={step.order} className="flex gap-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">
                          {step.order}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{step.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                          {step.command && (
                            <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                              {step.command}
                            </code>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="flex-1 border border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowConfigModal(true);
                    }}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Play size={16} />
                    Deploy Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deployment Details Modal */}
        {renderDeploymentDetails()}
      </div>
    </div>
  );
}