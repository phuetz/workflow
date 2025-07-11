import React, { useState } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Key, Plus, Edit, Trash2, Eye, EyeOff, TestTube } from 'lucide-react';

export default function CredentialsManager() {
  const { credentials, updateCredentials, darkMode } = useWorkflowStore();
  const [selectedCredential, setSelectedCredential] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showPassword, setShowPassword] = useState<{[key: string]: boolean}>({});
  const [testResults, setTestResults] = useState<{[key: string]: string}>({});

  const credentialTypes = {
    oauth2: {
      name: 'OAuth2',
      fields: ['clientId', 'clientSecret', 'authUrl', 'tokenUrl', 'scope']
    },
    apiKey: {
      name: 'API Key',
      fields: ['apiKey', 'headerName']
    },
    basic: {
      name: 'Basic Auth',
      fields: ['username', 'password']
    },
    jwt: {
      name: 'JWT Token',
      fields: ['token', 'secret']
    },
    webhook: {
      name: 'Webhook',
      fields: ['url', 'secret', 'method']
    }
  };

  const serviceCredentials = {
    google: { type: 'oauth2', name: 'Google Services', icon: '🔷' },
    aws: { type: 'apiKey', name: 'AWS', icon: '🟠' },
    openai: { type: 'apiKey', name: 'OpenAI', icon: '🤖' },
    stripe: { type: 'apiKey', name: 'Stripe', icon: '💳' },
    slack: { type: 'webhook', name: 'Slack', icon: '💬' },
    github: { type: 'apiKey', name: 'GitHub', icon: '🐙' },
    email: { type: 'basic', name: 'Email SMTP', icon: '📧' },
    mysql: { type: 'basic', name: 'MySQL', icon: '🗄️' },
    postgres: { type: 'basic', name: 'PostgreSQL', icon: '🐘' },
    mongodb: { type: 'basic', name: 'MongoDB', icon: '🍃' }
  };

  const testCredential = async (service: string) => {
    setTestResults({ ...testResults, [service]: 'testing' });
    
    // Simulation du test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const success = Math.random() > 0.3;
    setTestResults({ 
      ...testResults, 
      [service]: success ? 'success' : 'failed' 
    });
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPassword({ ...showPassword, [field]: !showPassword[field] });
  };

  return (
    <div className={`p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-white'}`}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Key className="text-blue-500" size={24} />
            <h1 className="text-2xl font-bold">Credentials Manager</h1>
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 flex items-center space-x-2"
          >
            <Plus size={16} />
            <span>Add Credential</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(serviceCredentials).map(([service, config]) => {
            const cred = credentials[service] || {};
            const isConfigured = Object.keys(cred).length > 0;
            const testResult = testResults[service];

            return (
              <div
                key={service}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  isConfigured
                    ? darkMode 
                      ? 'border-green-500 bg-green-900/20' 
                      : 'border-green-500 bg-green-50'
                    : darkMode 
                      ? 'border-gray-600 bg-gray-800' 
                      : 'border-gray-300 bg-gray-50'
                }`}
                onClick={() => setSelectedCredential(service)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <h3 className="font-semibold">{config.name}</h3>
                      <p className="text-sm opacity-75">{credentialTypes[config.type].name}</p>
                    </div>
                  </div>
                  {isConfigured && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          testCredential(service);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                        disabled={testResult === 'testing'}
                      >
                        {testResult === 'testing' ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        ) : (
                          <TestTube size={16} />
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCredential(service);
                          setIsEditing(true);
                        }}
                        className="p-1 hover:bg-gray-200 rounded"
                      >
                        <Edit size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {isConfigured ? (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-600">✓ Configured</span>
                      {testResult === 'success' && (
                        <span className="text-xs text-green-500">✓ Tested</span>
                      )}
                      {testResult === 'failed' && (
                        <span className="text-xs text-red-500">✗ Failed</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Not configured</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Credential Edit Modal */}
        {(selectedCredential || isEditing) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full mx-4`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">
                  {selectedCredential 
                    ? `Edit ${serviceCredentials[selectedCredential]?.name}` 
                    : 'Add Credential'}
                </h2>
                <button
                  onClick={() => {
                    setSelectedCredential(null);
                    setIsEditing(false);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {selectedCredential && (
                <form className="space-y-4">
                  {credentialTypes[serviceCredentials[selectedCredential].type].fields.map((field) => (
                    <div key={field}>
                      <label className="block text-sm font-medium mb-1">
                        {field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <div className="relative">
                        <input
                          type={
                            (field.includes('password') || field.includes('secret') || field.includes('token')) && !showPassword[field]
                              ? 'password'
                              : 'text'
                          }
                          className={`w-full px-3 py-2 border rounded-md ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300'
                          }`}
                          value={credentials[selectedCredential]?.[field] || ''}
                          onChange={(e) => updateCredentials(selectedCredential, { [field]: e.target.value })}
                          placeholder={`Enter ${field}`}
                        />
                        {(field.includes('password') || field.includes('secret') || field.includes('token')) && (
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(field)}
                            className="absolute right-2 top-2 text-gray-500"
                          >
                            {showPassword[field] ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => testCredential(selectedCredential)}
                      className="flex-1 bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600"
                    >
                      Test Connection
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCredential(null);
                        setIsEditing(false);
                      }}
                      className="flex-1 bg-green-500 text-white py-2 rounded-md hover:bg-green-600"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}