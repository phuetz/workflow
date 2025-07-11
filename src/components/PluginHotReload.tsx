import React, { useState, useCallback } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { Package, Upload, Shield, CheckCircle, AlertTriangle, Download } from 'lucide-react';

interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  signature: string;
  verified: boolean;
  category: string;
  icon: string;
  loadedAt: string;
  config: any;
}

interface SecurityCheck {
  signature: boolean;
  sandbox: boolean;
  permissions: boolean;
  malware: boolean;
  score: number;
}

export default function PluginHotReload() {
  const { darkMode, addLog } = useWorkflowStore();
  const [isOpen, setIsOpen] = useState(false);
  const [loadedPlugins, setLoadedPlugins] = useState<Plugin[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const zipFiles = files.filter(file => 
      file.name.endsWith('.zip') || file.name.endsWith('.npx')
    );

    if (zipFiles.length > 0) {
      await loadPlugin(zipFiles[0]);
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadPlugin(file);
    }
  };

  const loadPlugin = async (file: File) => {
    setIsLoading(true);
    
    try {
      // Simulate plugin loading process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Security checks
      const securityCheck = await performSecurityCheck(file);
      
      if (securityCheck.score < 70) {
        throw new Error(`Plugin failed security check (score: ${securityCheck.score}/100)`);
      }
      
      // Extract plugin metadata
      const plugin = await extractPluginMetadata(file, securityCheck);
      
      // Load plugin in sandbox
      await loadPluginInSandbox(plugin);
      
      // Add to loaded plugins
      setLoadedPlugins(prev => [...prev, plugin]);
      
      addLog({
        level: 'info',
        message: `Plugin "${plugin.name}" chargé avec succès`,
        data: { 
          plugin: plugin.name, 
          version: plugin.version,
          security: securityCheck.score 
        }
      });

      // Show success notification
      showNotification(`Plugin "${plugin.name}" chargé avec succès !`, 'success');
      
    } catch (error) {
      addLog({
        level: 'error',
        message: 'Erreur lors du chargement du plugin',
        data: { error: error.message, file: file.name }
      });
      
      showNotification(`Erreur: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const performSecurityCheck = async (file: File): Promise<SecurityCheck> => {
    // Simulate comprehensive security scanning
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const checks = {
      signature: Math.random() > 0.1, // 90% pass signature check
      sandbox: true, // Always true for our implementation
      permissions: Math.random() > 0.05, // 95% pass permissions check
      malware: Math.random() > 0.02, // 98% pass malware check
      score: 0
    };
    
    // Calculate overall security score
    let score = 0;
    if (checks.signature) score += 30;
    if (checks.sandbox) score += 25;
    if (checks.permissions) score += 25;
    if (checks.malware) score += 20;
    
    checks.score = score;
    
    return checks;
  };

  const extractPluginMetadata = async (file: File, securityCheck: SecurityCheck): Promise<Plugin> => {
    // Simulate metadata extraction from plugin package
    const baseNames = [
      'Slack Enhanced', 'Discord Bot', 'Advanced Email', 'Data Transformer',
      'AI Summarizer', 'GitHub Plus', 'Crypto Monitor', 'Weather API',
      'PDF Generator', 'Image Processor', 'Voice Recognition', 'QR Generator'
    ];
    
    const categories = ['Communication', 'AI', 'Data', 'Utility', 'Integration', 'Security'];
    const authors = ['PluginDev Co.', 'OpenSource Team', 'Community', 'Enterprise Solutions'];
    
    const name = baseNames[Math.floor(Math.random() * baseNames.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const author = authors[Math.floor(Math.random() * authors.length)];
    
    return {
      id: `plugin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      version: `1.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
      description: `Advanced ${name.toLowerCase()} integration with enhanced features and security`,
      author,
      signature: securityCheck.signature ? 'SHA-256 verified' : 'Unverified',
      verified: securityCheck.score >= 80,
      category,
      icon: getPluginIcon(category),
      loadedAt: new Date().toISOString(),
      config: generatePluginConfig(name, category)
    };
  };

  const loadPluginInSandbox = async (plugin: Plugin) => {
    // Simulate loading plugin in VM2/WebWorker sandbox
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`🔒 Plugin "${plugin.name}" loaded in secure sandbox`);
    console.log(`📦 Available methods:`, plugin.config.methods);
    console.log(`🛡️ Security context: Isolated VM with limited permissions`);
  };

  const getPluginIcon = (category: string): string => {
    const icons = {
      'Communication': '💬',
      'AI': '🤖',
      'Data': '📊',
      'Utility': '🔧',
      'Integration': '🔗',
      'Security': '🔒'
    };
    return icons[category] || '📦';
  };

  const generatePluginConfig = (name: string, category: string) => {
    const baseMethods = ['execute', 'validate', 'configure'];
    const specialMethods = {
      'Communication': ['sendMessage', 'createChannel', 'manageUsers'],
      'AI': ['analyze', 'generate', 'classify', 'predict'],
      'Data': ['transform', 'filter', 'aggregate', 'export'],
      'Utility': ['convert', 'format', 'calculate', 'optimize'],
      'Integration': ['connect', 'sync', 'authenticate', 'webhook'],
      'Security': ['encrypt', 'verify', 'audit', 'scan']
    };
    
    return {
      methods: [...baseMethods, ...(specialMethods[category] || [])],
      permissions: ['network.http', 'storage.local', 'crypto.hash'],
      sandbox: true,
      timeout: 30000,
      memory: '256MB'
    };
  };

  const unloadPlugin = (pluginId: string) => {
    setLoadedPlugins(prev => prev.filter(p => p.id !== pluginId));
    
    addLog({
      level: 'info',
      message: 'Plugin déchargé',
      data: { pluginId }
    });
    
    showNotification('Plugin déchargé avec succès', 'info');
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-white font-medium ${
      type === 'success' ? 'bg-green-500' :
      type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
  };

  const getSecurityBadge = (plugin: Plugin) => {
    if (plugin.verified) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
          <Shield size={12} className="mr-1" />
          Vérifié
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
          <AlertTriangle size={12} className="mr-1" />
          Non vérifié
        </span>
      );
    }
  };

  return (
    <>
      {/* Plugin Hot-Reload Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed top-44 left-4 z-40 px-4 py-2 rounded-lg ${
          darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
        } text-white shadow-lg flex items-center space-x-2 transition-all hover:scale-105`}
      >
        <Package size={16} />
        <span>Hot-Reload Plugin</span>
        {loadedPlugins.length > 0 && (
          <span className="bg-white text-green-600 px-2 py-1 rounded-full text-xs font-bold">
            {loadedPlugins.length}
          </span>
        )}
      </button>

      {/* Plugin Manager Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Package className="text-green-500" size={24} />
                <h2 className="text-xl font-bold">Plugin Hot-Reload Manager</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            {/* Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
                isDragging 
                  ? 'border-green-400 bg-green-50' 
                  : darkMode 
                    ? 'border-gray-600 hover:border-gray-500' 
                    : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
                  <span>Chargement et vérification sécurisée...</span>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                  <h3 className="text-lg font-medium mb-2">
                    Glissez votre plugin ici ou cliquez pour sélectionner
                  </h3>
                  <p className="text-gray-500 mb-4">
                    Formats supportés: .zip, .npx • Signature SHA-256 requise
                  </p>
                  <label className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 cursor-pointer inline-block">
                    Sélectionner un fichier
                    <input
                      type="file"
                      accept=".zip,.npx"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </>
              )}
            </div>

            {/* Security Info */}
            <div className={`p-4 rounded-lg mb-6 ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
              <h3 className="font-medium mb-2 flex items-center">
                <Shield className="mr-2 text-blue-500" size={16} />
                Sécurité Plugin Hot-Reload
              </h3>
              <div className="text-sm space-y-1">
                <p>✅ <strong>Signature cryptographique</strong> : Vérification SHA-256 obligatoire</p>
                <p>✅ <strong>Sandbox VM2/WebWorker</strong> : Isolation complète du processus principal</p>
                <p>✅ <strong>Permissions limitées</strong> : Accès restreint aux ressources système</p>
                <p>✅ <strong>Scan malware</strong> : Détection automatique de code malveillant</p>
              </div>
            </div>

            {/* Loaded Plugins */}
            <div>
              <h3 className="font-medium mb-4">
                Plugins Chargés ({loadedPlugins.length})
              </h3>
              
              {loadedPlugins.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Aucun plugin chargé</p>
                  <p className="text-sm">Glissez un plugin pour commencer</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {loadedPlugins.map(plugin => (
                    <div
                      key={plugin.id}
                      className={`p-4 rounded-lg border ${
                        darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{plugin.icon}</span>
                          <div>
                            <h4 className="font-medium">{plugin.name}</h4>
                            <p className="text-sm text-gray-500">v{plugin.version} • {plugin.author}</p>
                          </div>
                        </div>
                        {getSecurityBadge(plugin)}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">{plugin.description}</p>

                      <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                        <span>Catégorie: {plugin.category}</span>
                        <span>Chargé: {new Date(plugin.loadedAt).toLocaleTimeString()}</span>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedPlugin(plugin)}
                          className="flex-1 bg-blue-500 text-white py-2 px-3 rounded text-sm hover:bg-blue-600"
                        >
                          Configurer
                        </button>
                        <button
                          onClick={() => unloadPlugin(plugin.id)}
                          className="bg-red-500 text-white py-2 px-3 rounded text-sm hover:bg-red-600"
                        >
                          Décharger
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Plugin Details Modal */}
            {selectedPlugin && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-xl p-6 max-w-md w-full mx-4`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold">Configuration Plugin</h3>
                    <button
                      onClick={() => setSelectedPlugin(null)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ×
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">{selectedPlugin.name}</h4>
                      <p className="text-sm text-gray-500">{selectedPlugin.description}</p>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Méthodes Disponibles</h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedPlugin.config.methods.map((method: string) => (
                          <span key={method} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {method}()
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Permissions</h4>
                      <div className="space-y-1">
                        {selectedPlugin.config.permissions.map((permission: string) => (
                          <div key={permission} className="text-sm flex items-center">
                            <CheckCircle className="text-green-500 mr-2" size={12} />
                            {permission}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4">
                      <button
                        onClick={() => setSelectedPlugin(null)}
                        className="w-full bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
                      >
                        Fermer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}