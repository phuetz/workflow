import React from 'react';
import { useWorkflowStore } from '../../../store/workflowStore';
import { WorkflowNode } from '../../../types/workflow';

interface Props {
  node: WorkflowNode;
}

export default function TOTPConfig({ node }: Props) {
  const { updateNode, darkMode } = useWorkflowStore();
  const config = ((node.data?.config || (node as any).config) || {}) as Record<string, unknown>;

  const update = (field: string, value: unknown) => {
    updateNode(node.id, { config: { ...config, [field]: value } });
  };

  return (
    <div style={{ width: 320, padding: 16 }}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Operation</label>
        <select
          value={(config.operation as string) || 'generate'}
          onChange={(e) => update('operation', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="generate">Generate Code</option>
          <option value="validate">Validate Code</option>
          <option value="generateSecret">Generate Secret</option>
          <option value="generateQR">Generate QR Code</option>
        </select>
      </div>

      {(config.operation === 'generate' || config.operation === 'validate' || config.operation === 'generateQR') && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Secret Key</label>
          <input
            type="password"
            value={(config.secret as string) || ''}
            onChange={(e) => update('secret', e.target.value)}
            placeholder="JBSWY3DPEHPK3PXP"
            className={`w-full px-3 py-2 border rounded font-mono ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
          />
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Base32-encoded secret key
          </p>
        </div>
      )}

      {config.operation === 'validate' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Token to Validate</label>
          <input
            type="text"
            value={(config.token as string) || ''}
            onChange={(e) => update('token', e.target.value)}
            placeholder="123456"
            maxLength={8}
            className={`w-full px-3 py-2 border rounded font-mono text-center text-lg ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
          />
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Algorithm</label>
        <select
          value={(config.algorithm as string) || 'SHA1'}
          onChange={(e) => update('algorithm', e.target.value)}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value="SHA1">SHA-1 (Default)</option>
          <option value="SHA256">SHA-256</option>
          <option value="SHA512">SHA-512</option>
        </select>
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Hash algorithm (SHA-1 is most common)
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Digits</label>
        <select
          value={(config.digits as number) || 6}
          onChange={(e) => update('digits', parseInt(e.target.value))}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        >
          <option value={6}>6 digits</option>
          <option value={7}>7 digits</option>
          <option value={8}>8 digits</option>
        </select>
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Number of digits in the code
        </p>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Time Step (seconds)</label>
        <input
          type="number"
          value={(config.step as number) || 30}
          onChange={(e) => update('step', parseInt(e.target.value))}
          min={15}
          max={120}
          step={15}
          className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
        />
        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          How often the code changes (usually 30s)
        </p>
      </div>

      {config.operation === 'validate' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Time Window</label>
          <input
            type="number"
            value={(config.window as number) || 1}
            onChange={(e) => update('window', parseInt(e.target.value))}
            min={0}
            max={5}
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          />
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Accept codes from past/future time steps (0-5)
          </p>
        </div>
      )}

      {(config.operation === 'generateQR' || config.operation === 'generateSecret') && (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Issuer</label>
            <input
              type="text"
              value={(config.issuer as string) || ''}
              onChange={(e) => update('issuer', e.target.value)}
              placeholder="My Application"
              className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
            />
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Application or service name
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Account Name</label>
            <input
              type="text"
              value={(config.accountName as string) || ''}
              onChange={(e) => update('accountName', e.target.value)}
              placeholder="user@example.com"
              className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
            />
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              User identifier
            </p>
          </div>
        </>
      )}

      {config.operation === 'generateQR' && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">QR Code Size</label>
          <input
            type="number"
            value={(config.qrSize as number) || 200}
            onChange={(e) => update('qrSize', parseInt(e.target.value))}
            min={100}
            max={500}
            step={50}
            className={`w-full px-3 py-2 border rounded ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
          />
          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            QR code dimensions in pixels
          </p>
        </div>
      )}

      <div className={`p-3 rounded ${darkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
        <p className={`text-xs ${darkMode ? 'text-blue-400' : 'text-blue-800'}`}>
          <strong>TOTP (Time-based One-Time Password):</strong> Generates 2FA codes compatible with Google Authenticator, Authy, and other authenticator apps.
        </p>
      </div>
    </div>
  );
}
