import React, { useState, useCallback } from 'react';
import { WorkflowNode } from '../../../types/workflow';

interface FirebaseConfigProps {
  node: WorkflowNode;
  onChange: (config: Record<string, unknown>) => void;
}

interface FirebaseCredentials {
  projectId: string;
  privateKey: string;
  clientEmail: string;
}

interface FirebaseFilter {
  field: string;
  operator: '==' | '!=' | '>' | '>=' | '<' | '<=' | 'array-contains' | 'in' | 'array-contains-any';
  value: string;
}

interface FirebaseConfig {
  service: 'firestore' | 'realtime-database' | 'auth' | 'storage' | 'functions';
  operation: string;
  credentials: FirebaseCredentials;

  // Firestore fields
  collection?: string;
  documentId?: string;
  data?: Record<string, unknown>;
  filters?: FirebaseFilter[];
  orderBy?: string;
  limit?: number;

  // Realtime Database fields
  path?: string;

  // Auth fields
  email?: string;
  password?: string;
  uid?: string;
  displayName?: string;
  phoneNumber?: string;

  // Storage fields
  bucket?: string;
  filePath?: string;
  fileData?: string;
  contentType?: string;

  // Functions fields
  functionName?: string;
  functionData?: Record<string, unknown>;
}

export const FirebaseConfig: React.FC<FirebaseConfigProps> = ({ node, onChange }) => {
  const [config, setConfig] = useState<FirebaseConfig>(
    (node.data.config as unknown as FirebaseConfig) || {
      service: 'firestore',
      operation: 'getDocument',
      credentials: {
        projectId: '',
        privateKey: '',
        clientEmail: '',
      },
      filters: [],
    }
  );

  const handleChange = useCallback((updates: Partial<FirebaseConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      onChange(newConfig);
      return newConfig;
    });
  }, [onChange]);

  const addFilter = useCallback(() => {
    const newFilters = [
      ...(config.filters || []),
      { field: '', operator: '==' as const, value: '' },
    ];
    handleChange({ filters: newFilters });
  }, [config.filters, handleChange]);

  const removeFilter = useCallback((index: number) => {
    const newFilters = config.filters?.filter((_, i) => i !== index) || [];
    handleChange({ filters: newFilters });
  }, [config.filters, handleChange]);

  const updateFilter = useCallback((index: number, updates: Partial<FirebaseFilter>) => {
    const newFilters = [...(config.filters || [])];
    newFilters[index] = { ...newFilters[index], ...updates };
    handleChange({ filters: newFilters });
  }, [config.filters, handleChange]);

  const getOperationsForService = (service: string) => {
    switch (service) {
      case 'firestore':
        return [
          { value: 'getDocument', label: 'Get Document' },
          { value: 'createDocument', label: 'Create Document' },
          { value: 'updateDocument', label: 'Update Document' },
          { value: 'deleteDocument', label: 'Delete Document' },
          { value: 'queryCollection', label: 'Query Collection' },
          { value: 'listDocuments', label: 'List All Documents' },
        ];
      case 'realtime-database':
        return [
          { value: 'getValue', label: 'Get Value' },
          { value: 'setValue', label: 'Set Value' },
          { value: 'updateValue', label: 'Update Value' },
          { value: 'deleteValue', label: 'Delete Value' },
          { value: 'push', label: 'Push (Auto ID)' },
        ];
      case 'auth':
        return [
          { value: 'createUser', label: 'Create User' },
          { value: 'getUser', label: 'Get User' },
          { value: 'updateUser', label: 'Update User' },
          { value: 'deleteUser', label: 'Delete User' },
          { value: 'listUsers', label: 'List Users' },
          { value: 'setCustomClaims', label: 'Set Custom Claims' },
        ];
      case 'storage':
        return [
          { value: 'uploadFile', label: 'Upload File' },
          { value: 'downloadFile', label: 'Download File' },
          { value: 'deleteFile', label: 'Delete File' },
          { value: 'listFiles', label: 'List Files' },
          { value: 'getMetadata', label: 'Get File Metadata' },
        ];
      case 'functions':
        return [
          { value: 'callFunction', label: 'Call Function' },
        ];
      default:
        return [];
    }
  };

  const operations = getOperationsForService(config.service);

  return (
    <div className="space-y-4 max-h-[600px] overflow-y-auto">
      <div>
        <h3 className="text-lg font-semibold mb-2">Firebase Integration</h3>
        <p className="text-sm text-gray-600 mb-4">
          Connect to Firebase services: Firestore, Realtime Database, Auth, Storage, and Functions
        </p>
      </div>

      {/* Service Selection */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Firebase Service</label>
          <select
            className="w-full p-2 border rounded"
            value={config.service}
            onChange={(e) => {
              const newService = e.target.value as FirebaseConfig['service'];
              const newOps = getOperationsForService(newService);
              handleChange({
                service: newService,
                operation: newOps[0]?.value || ''
              });
            }}
          >
            <option value="firestore">Firestore (NoSQL Database)</option>
            <option value="realtime-database">Realtime Database</option>
            <option value="auth">Authentication</option>
            <option value="storage">Cloud Storage</option>
            <option value="functions">Cloud Functions</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Operation</label>
          <select
            className="w-full p-2 border rounded"
            value={config.operation}
            onChange={(e) => handleChange({ operation: e.target.value })}
          >
            {operations.map(op => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Credentials */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Service Account Credentials</h4>
        <div className="space-y-2">
          <div>
            <label className="block text-xs mb-1">Project ID</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.credentials.projectId}
              onChange={(e) => handleChange({
                credentials: { ...config.credentials, projectId: e.target.value }
              })}
              placeholder="your-project-id"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Client Email</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.credentials.clientEmail}
              onChange={(e) => handleChange({
                credentials: { ...config.credentials, clientEmail: e.target.value }
              })}
              placeholder="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Private Key</label>
            <textarea
              className="w-full p-2 border rounded text-sm font-mono"
              rows={3}
              value={config.credentials.privateKey}
              onChange={(e) => handleChange({
                credentials: { ...config.credentials, privateKey: e.target.value }
              })}
              placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Download service account JSON from <a href="https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk" target="_blank" rel="noopener noreferrer" className="text-blue-500">Firebase Console</a>
        </p>
      </div>

      {/* Firestore Operations */}
      {config.service === 'firestore' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Firestore Configuration</h4>

          <div>
            <label className="block text-xs mb-1">Collection *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.collection || ''}
              onChange={(e) => handleChange({ collection: e.target.value })}
              placeholder="users"
            />
          </div>

          {['getDocument', 'updateDocument', 'deleteDocument'].includes(config.operation) && (
            <div>
              <label className="block text-xs mb-1">Document ID *</label>
              <input
                type="text"
                className="w-full p-2 border rounded text-sm"
                value={config.documentId || ''}
                onChange={(e) => handleChange({ documentId: e.target.value })}
                placeholder="user123"
              />
            </div>
          )}

          {['createDocument', 'updateDocument'].includes(config.operation) && (
            <div>
              <label className="block text-xs mb-1">Document Data (JSON)</label>
              <textarea
                className="w-full p-2 border rounded text-sm font-mono"
                rows={6}
                value={JSON.stringify(config.data || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleChange({ data: parsed });
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder={'{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "age": 30\n}'}
              />
            </div>
          )}

          {config.operation === 'queryCollection' && (
            <>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium">Query Filters</label>
                  <button
                    type="button"
                    onClick={addFilter}
                    className="text-xs px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    + Add Filter
                  </button>
                </div>

                {config.filters && config.filters.length > 0 ? (
                  <div className="space-y-2">
                    {config.filters.map((filter, index) => (
                      <div key={index} className="bg-gray-50 p-2 rounded grid grid-cols-12 gap-2">
                        <input
                          type="text"
                          className="col-span-4 p-2 border rounded text-sm"
                          value={filter.field}
                          onChange={(e) => updateFilter(index, { field: e.target.value })}
                          placeholder="Field name"
                        />

                        <select
                          className="col-span-3 p-2 border rounded text-sm"
                          value={filter.operator}
                          onChange={(e) => updateFilter(index, { operator: e.target.value as FirebaseFilter['operator'] })}
                        >
                          <option value="==">==</option>
                          <option value="!=">!=</option>
                          <option value=">">&gt;</option>
                          <option value=">=">&gt;=</option>
                          <option value="<">&lt;</option>
                          <option value="<=">&lt;=</option>
                          <option value="array-contains">array-contains</option>
                          <option value="in">in</option>
                          <option value="array-contains-any">array-contains-any</option>
                        </select>

                        <input
                          type="text"
                          className="col-span-4 p-2 border rounded text-sm"
                          value={filter.value}
                          onChange={(e) => updateFilter(index, { value: e.target.value })}
                          placeholder="Value"
                        />

                        <button
                          type="button"
                          onClick={() => removeFilter(index)}
                          className="col-span-1 text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No filters. Returns all documents.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1">Order By</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded text-sm"
                    value={config.orderBy || ''}
                    onChange={(e) => handleChange({ orderBy: e.target.value })}
                    placeholder="createdAt"
                  />
                </div>

                <div>
                  <label className="block text-xs mb-1">Limit</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    className="w-full p-2 border rounded text-sm"
                    value={config.limit || 100}
                    onChange={(e) => handleChange({ limit: parseInt(e.target.value) || 100 })}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Realtime Database Operations */}
      {config.service === 'realtime-database' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Realtime Database Configuration</h4>

          <div>
            <label className="block text-xs mb-1">Path *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.path || ''}
              onChange={(e) => handleChange({ path: e.target.value })}
              placeholder="/users/user123"
            />
            <p className="text-xs text-gray-500 mt-1">Path in the database (e.g., /users/user123/profile)</p>
          </div>

          {['setValue', 'updateValue', 'push'].includes(config.operation) && (
            <div>
              <label className="block text-xs mb-1">Value (JSON)</label>
              <textarea
                className="w-full p-2 border rounded text-sm font-mono"
                rows={6}
                value={JSON.stringify(config.data || {}, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value);
                    handleChange({ data: parsed });
                  } catch {
                    // Invalid JSON
                  }
                }}
                placeholder={'{\n  "name": "John Doe",\n  "status": "active"\n}'}
              />
            </div>
          )}
        </div>
      )}

      {/* Auth Operations */}
      {config.service === 'auth' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Authentication Configuration</h4>

          {['getUser', 'updateUser', 'deleteUser'].includes(config.operation) && (
            <div>
              <label className="block text-xs mb-1">User ID (UID) *</label>
              <input
                type="text"
                className="w-full p-2 border rounded text-sm"
                value={config.uid || ''}
                onChange={(e) => handleChange({ uid: e.target.value })}
                placeholder="Firebase User UID"
              />
            </div>
          )}

          {config.operation === 'createUser' && (
            <>
              <div>
                <label className="block text-xs mb-1">Email *</label>
                <input
                  type="email"
                  className="w-full p-2 border rounded text-sm"
                  value={config.email || ''}
                  onChange={(e) => handleChange({ email: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-xs mb-1">Password *</label>
                <input
                  type="password"
                  className="w-full p-2 border rounded text-sm"
                  value={config.password || ''}
                  onChange={(e) => handleChange({ password: e.target.value })}
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs mb-1">Display Name</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded text-sm"
                  value={config.displayName || ''}
                  onChange={(e) => handleChange({ displayName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-xs mb-1">Phone Number</label>
                <input
                  type="tel"
                  className="w-full p-2 border rounded text-sm"
                  value={config.phoneNumber || ''}
                  onChange={(e) => handleChange({ phoneNumber: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Storage Operations */}
      {config.service === 'storage' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Cloud Storage Configuration</h4>

          <div>
            <label className="block text-xs mb-1">Bucket Name</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.bucket || ''}
              onChange={(e) => handleChange({ bucket: e.target.value })}
              placeholder="your-project-id.appspot.com"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to use default bucket</p>
          </div>

          <div>
            <label className="block text-xs mb-1">File Path *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.filePath || ''}
              onChange={(e) => handleChange({ filePath: e.target.value })}
              placeholder="images/profile.jpg"
            />
          </div>

          {config.operation === 'uploadFile' && (
            <>
              <div>
                <label className="block text-xs mb-1">File Data (Base64 or URL)</label>
                <textarea
                  className="w-full p-2 border rounded text-sm font-mono"
                  rows={4}
                  value={config.fileData || ''}
                  onChange={(e) => handleChange({ fileData: e.target.value })}
                  placeholder="data:image/png;base64,iVBORw0KG..."
                />
              </div>

              <div>
                <label className="block text-xs mb-1">Content Type</label>
                <input
                  type="text"
                  className="w-full p-2 border rounded text-sm"
                  value={config.contentType || ''}
                  onChange={(e) => handleChange({ contentType: e.target.value })}
                  placeholder="image/jpeg"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Functions Operations */}
      {config.service === 'functions' && (
        <div className="border-t pt-4 space-y-3">
          <h4 className="text-sm font-medium">Cloud Functions Configuration</h4>

          <div>
            <label className="block text-xs mb-1">Function Name *</label>
            <input
              type="text"
              className="w-full p-2 border rounded text-sm"
              value={config.functionName || ''}
              onChange={(e) => handleChange({ functionName: e.target.value })}
              placeholder="myFunction"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Function Data (JSON)</label>
            <textarea
              className="w-full p-2 border rounded text-sm font-mono"
              rows={6}
              value={JSON.stringify(config.functionData || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleChange({ functionData: parsed });
                } catch {
                  // Invalid JSON
                }
              }}
              placeholder={'{\n  "param1": "value1",\n  "param2": "value2"\n}'}
            />
          </div>
        </div>
      )}

      {/* Documentation */}
      <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
        <strong>📚 Firebase:</strong> This integration uses the Firebase Admin SDK.
        Service account credentials provide full admin access to your Firebase project.
      </div>
    </div>
  );
};

export default FirebaseConfig;
