import React from 'react';
import {
  BarChart3, FileText, Globe, Play, Plus, Settings, X
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import {
  useAPIBuilder,
  useAPITester,
  EndpointCard,
  EndpointForm,
  TestView,
  DocumentationView,
  APIBuilderTab
} from './builder';

interface APIBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

const TABS: { id: APIBuilderTab; label: string; icon: React.ElementType }[] = [
  { id: 'endpoints', label: 'Endpoints', icon: Globe },
  { id: 'gateway', label: 'Gateway', icon: Settings },
  { id: 'testing', label: 'Testing', icon: Play },
  { id: 'docs', label: 'Documentation', icon: FileText },
  { id: 'monitoring', label: 'Monitoring', icon: BarChart3 }
];

export default function APIBuilder({ isOpen, onClose }: APIBuilderProps) {
  const { darkMode } = useWorkflowStore();

  const {
    activeTab,
    endpoints,
    gateways,
    selectedEndpoint,
    isCreatingEndpoint,
    isLoading,
    formData,
    setActiveTab,
    setSelectedEndpoint,
    setFormData,
    addParameter,
    handleSave,
    resetForm,
    editEndpoint,
    createNewEndpoint
  } = useAPIBuilder(isOpen);

  const tester = useAPITester();

  if (!isOpen) return null;

  const renderEndpointsTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">API Endpoints</h3>
        <button
          onClick={createNewEndpoint}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center space-x-2"
        >
          <Plus size={16} />
          <span>Create Endpoint</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {endpoints.map((endpoint) => (
          <EndpointCard
            key={endpoint.id}
            endpoint={endpoint}
            darkMode={darkMode}
            isSelected={selectedEndpoint?.id === endpoint.id}
            onSelect={() => setSelectedEndpoint(endpoint)}
            onEdit={() => editEndpoint(endpoint)}
          />
        ))}
        {endpoints.length === 0 && (
          <div className="text-center py-12">
            <Globe size={64} className="mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No Endpoints Yet</h3>
            <p className="text-gray-500 mb-4">Create your first API endpoint to get started</p>
            <button
              onClick={createNewEndpoint}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Create First Endpoint
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderTestingTab = () => (
    <TestView
      darkMode={darkMode}
      endpoints={endpoints}
      selectedEndpoint={tester.selectedEndpoint}
      testRequest={tester.testRequest}
      testResponse={tester.testResponse}
      isTestRunning={tester.isTestRunning}
      onSelectEndpoint={tester.setSelectedEndpoint}
      onUpdateRequest={tester.updateTestRequest}
      onRunTest={tester.runTest}
    />
  );

  const renderDocsTab = () => (
    <DocumentationView darkMode={darkMode} gateways={gateways} />
  );

  const renderMonitoringTab = () => (
    <div className="text-center py-12">
      <BarChart3 size={64} className="mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-medium mb-2">Monitoring Dashboard</h3>
      <p className="text-gray-500">Real-time API monitoring and analytics coming soon</p>
    </div>
  );

  const renderGatewayTab = () => (
    <div className="text-center py-12">
      <Settings size={64} className="mx-auto mb-4 text-gray-400" />
      <h3 className="text-lg font-medium mb-2">Gateway Configuration</h3>
      <p className="text-gray-500">Configure API gateways and routing</p>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'endpoints':
        return renderEndpointsTab();
      case 'testing':
        return renderTestingTab();
      case 'docs':
        return renderDocsTab();
      case 'monitoring':
        return renderMonitoringTab();
      case 'gateway':
        return renderGatewayTab();
      default:
        return null;
    }
  };

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
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Globe className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold">No-Code API Builder</h2>
                <p className="text-sm text-gray-500">Create and manage APIs without coding</p>
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
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
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
            renderTabContent()
          )}
        </div>
      </div>

      {/* Endpoint Builder Modal */}
      {isCreatingEndpoint && (
        <EndpointForm
          darkMode={darkMode}
          formData={formData}
          isEditing={!!selectedEndpoint}
          onFormChange={setFormData}
          onSave={handleSave}
          onCancel={resetForm}
          onAddParameter={addParameter}
        />
      )}
    </div>
  );
}
