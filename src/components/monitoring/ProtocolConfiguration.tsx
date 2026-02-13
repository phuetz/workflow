/**
 * Protocol Configuration Component
 *
 * UI for managing protocol connections and settings
 */

import React, { useState, useEffect } from 'react';
import { ProtocolHub, ProtocolType } from '../../protocols/ProtocolHub';
import { logger } from '../../services/SimpleLogger';
import { useToast } from '../ui/Toast';

interface ProtocolConfig {
  type: ProtocolType;
  enabled: boolean;
  connected: boolean;
  config: Record<string, any>;
}

interface ProtocolConfigurationProps {
  protocolHub: ProtocolHub;
}

const ProtocolConfiguration: React.FC<ProtocolConfigurationProps> = ({ protocolHub }) => {
  const toast = useToast();
  const [protocols, setProtocols] = useState<ProtocolConfig[]>([
    {
      type: ProtocolType.ACP,
      enabled: false,
      connected: false,
      config: {
        url: 'ws://localhost:8080',
        agentId: 'agent-1',
        apiKey: ''
      }
    },
    {
      type: ProtocolType.A2A,
      enabled: false,
      connected: false,
      config: {
        agentId: 'agent-1',
        encryption: true
      }
    },
    {
      type: ProtocolType.MCP,
      enabled: false,
      connected: false,
      config: {}
    },
    {
      type: ProtocolType.OPENAI_SWARM,
      enabled: false,
      connected: false,
      config: {}
    }
  ]);

  const [stats, setStats] = useState<{
    totalProtocols: number;
    connectedProtocols: number;
    activeProtocol?: ProtocolType;
    protocols: Record<string, { connected: boolean; capabilities: string[] }>;
  } | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType | null>(null);

  useEffect(() => {
    // Update stats periodically
    const interval = setInterval(() => {
      setStats(protocolHub.getStats());
      updateConnectionStatus();
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [protocolHub]);

  const updateConnectionStatus = () => {
    const connected = protocolHub.getConnectedProtocols();
    setProtocols(prev => prev.map(p => ({
      ...p,
      connected: connected.includes(p.type)
    })));
  };

  const handleToggleProtocol = async (type: ProtocolType) => {
    const protocol = protocols.find(p => p.type === type);
    if (!protocol) return;

    try {
      if (protocol.enabled && protocol.connected) {
        await protocolHub.disconnect(type);
        setProtocols(prev => prev.map(p =>
          p.type === type ? { ...p, enabled: false, connected: false } : p
        ));
      } else {
        // Connect based on protocol type
        switch (type) {
          case ProtocolType.ACP:
            protocolHub.registerACP(protocol.config as any);
            break;
          case ProtocolType.A2A:
            protocolHub.registerA2A((protocol.config as any).agentId, protocol.config as any);
            break;
          case ProtocolType.MCP:
            protocolHub.registerMCP();
            break;
          case ProtocolType.OPENAI_SWARM:
            protocolHub.registerOpenAISwarm();
            break;
        }

        await protocolHub.connect(type);
        setProtocols(prev => prev.map(p =>
          p.type === type ? { ...p, enabled: true, connected: true } : p
        ));
      }
    } catch (error) {
      logger.error(`Failed to toggle protocol ${type}:`, error);
      toast.error(`Failed to ${protocol.enabled ? 'disconnect' : 'connect'} ${type}`);
    }
  };

  const handleConfigChange = (type: ProtocolType, key: string, value: any) => {
    setProtocols(prev => prev.map(p =>
      p.type === type
        ? { ...p, config: { ...p.config, [key]: value } }
        : p
    ));
  };

  const getProtocolIcon = (type: ProtocolType) => {
    switch (type) {
      case ProtocolType.ACP:
        return '🔌';
      case ProtocolType.A2A:
        return '🔗';
      case ProtocolType.MCP:
        return '🛠️';
      case ProtocolType.OPENAI_SWARM:
        return '🤖';
      default:
        return '📡';
    }
  };

  const getStatusColor = (connected: boolean) => {
    return connected ? 'text-green-600' : 'text-gray-400';
  };

  const getStatusBadge = (connected: boolean) => {
    return connected
      ? <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Connected</span>
      : <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">Disconnected</span>;
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Protocol Configuration</h2>

      {/* Overview Stats */}
      {stats && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600">Total Protocols</div>
              <div className="text-2xl font-bold">{stats.totalProtocols}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Connected</div>
              <div className="text-2xl font-bold text-green-600">{stats.connectedProtocols}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Active Protocol</div>
              <div className="text-lg font-semibold">{stats.activeProtocol || 'None'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Protocol List */}
      <div className="space-y-4">
        {protocols.map(protocol => (
          <div
            key={protocol.type}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{getProtocolIcon(protocol.type)}</span>
                <div>
                  <h3 className="text-lg font-semibold">{protocol.type.toUpperCase()}</h3>
                  <p className="text-sm text-gray-600">
                    {protocol.type === ProtocolType.ACP && 'Agent Communication Protocol'}
                    {protocol.type === ProtocolType.A2A && 'Agent-to-Agent Protocol'}
                    {protocol.type === ProtocolType.MCP && 'Model Context Protocol'}
                    {protocol.type === ProtocolType.OPENAI_SWARM && 'OpenAI Swarm Protocol'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {getStatusBadge(protocol.connected)}
                <button
                  onClick={() => handleToggleProtocol(protocol.type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    protocol.connected
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {protocol.connected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            </div>

            {/* Configuration */}
            <div className="mt-4">
              <button
                onClick={() => setSelectedProtocol(
                  selectedProtocol === protocol.type ? null : protocol.type
                )}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                {selectedProtocol === protocol.type ? 'Hide' : 'Show'} Configuration
              </button>

              {selectedProtocol === protocol.type && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
                  {protocol.type === ProtocolType.ACP && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Server URL
                        </label>
                        <input
                          type="text"
                          value={protocol.config.url}
                          onChange={(e) => handleConfigChange(protocol.type, 'url', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="ws://localhost:8080"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Agent ID
                        </label>
                        <input
                          type="text"
                          value={protocol.config.agentId}
                          onChange={(e) => handleConfigChange(protocol.type, 'agentId', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="agent-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          API Key
                        </label>
                        <input
                          type="password"
                          value={protocol.config.apiKey}
                          onChange={(e) => handleConfigChange(protocol.type, 'apiKey', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Enter API key"
                        />
                      </div>
                    </>
                  )}

                  {protocol.type === ProtocolType.A2A && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Agent ID
                        </label>
                        <input
                          type="text"
                          value={protocol.config.agentId}
                          onChange={(e) => handleConfigChange(protocol.type, 'agentId', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="agent-1"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={protocol.config.encryption}
                          onChange={(e) => handleConfigChange(protocol.type, 'encryption', e.target.checked)}
                          className="mr-2"
                        />
                        <label className="text-sm font-medium text-gray-700">
                          Enable End-to-End Encryption
                        </label>
                      </div>
                    </>
                  )}

                  {protocol.type === ProtocolType.MCP && (
                    <p className="text-sm text-gray-600 italic">
                      No additional configuration required
                    </p>
                  )}

                  {protocol.type === ProtocolType.OPENAI_SWARM && (
                    <p className="text-sm text-gray-600 italic">
                      No additional configuration required
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Capabilities */}
            {protocol.connected && stats?.protocols?.[protocol.type] && (
              <div className="mt-4 pt-3 border-t">
                <div className="text-sm font-medium text-gray-700 mb-2">Capabilities:</div>
                <div className="flex flex-wrap gap-2">
                  {stats.protocols[protocol.type].capabilities.map((cap: string) => (
                    <span
                      key={cap}
                      className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 flex space-x-3">
        <button
          onClick={() => protocolHub.connectAll()}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
        >
          Connect All
        </button>
        <button
          onClick={() => protocolHub.disconnectAll()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
        >
          Disconnect All
        </button>
      </div>
    </div>
  );
};

export default ProtocolConfiguration;
