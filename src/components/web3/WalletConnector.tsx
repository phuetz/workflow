/**
 * Wallet Connector Component
 * UI for connecting various wallet types
 */

import React, { useState, useEffect } from 'react';
import type { WalletType, WalletConnection, BlockchainNetwork } from '../../types/web3';
import { walletIntegration } from '../../web3/WalletIntegration';
import { logger } from '../../services/SimpleLogger';

export const WalletConnector: React.FC = () => {
  const [activeWallet, setActiveWallet] = useState<WalletConnection | undefined>();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const walletTypes: Array<{ type: WalletType; name: string; icon: string; description: string }> = [
    { type: 'metamask', name: 'MetaMask', icon: '🦊', description: 'Most popular Ethereum wallet' },
    { type: 'walletconnect', name: 'WalletConnect', icon: '🔗', description: 'Mobile wallet connection' },
    { type: 'coinbase', name: 'Coinbase Wallet', icon: '💼', description: 'Coinbase wallet app' },
    { type: 'ledger', name: 'Ledger', icon: '🔐', description: 'Hardware wallet security' },
    { type: 'phantom', name: 'Phantom', icon: '👻', description: 'Solana wallet' },
    { type: 'keplr', name: 'Keplr', icon: '🌌', description: 'Cosmos ecosystem wallet' },
    { type: 'gnosis-safe', name: 'Gnosis Safe', icon: '🛡️', description: 'Multi-sig wallet' },
  ];

  useEffect(() => {
    // Set up wallet event listeners
    walletIntegration.on('connected', (wallet) => {
      setActiveWallet(wallet);
      setConnecting(false);
    });

    walletIntegration.on('disconnected', () => {
      setActiveWallet(undefined);
    });

    walletIntegration.on('accountChanged', (address) => {
      if (activeWallet) {
        setActiveWallet({ ...activeWallet, address });
      }
    });

    walletIntegration.on('networkChanged', (network) => {
      if (activeWallet) {
        setActiveWallet({ ...activeWallet, network });
      }
    });

    // Check if already connected
    const wallet = walletIntegration.getActiveWallet();
    if (wallet) {
      setActiveWallet(wallet);
    }
  }, []);

  const handleConnect = async (type: WalletType) => {
    setConnecting(true);
    setError(null);

    try {
      const wallet = await walletIntegration.connect(type);
      setActiveWallet(wallet);
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      logger.error('Wallet connection error:', err);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await walletIntegration.disconnect();
    setActiveWallet(undefined);
  };

  const handleSwitchNetwork = async (network: BlockchainNetwork) => {
    try {
      await walletIntegration.switchNetwork(network);
    } catch (err: any) {
      setError(err.message || 'Failed to switch network');
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    return parseFloat(balance).toFixed(4);
  };

  if (activeWallet) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Connected Wallet</h2>
          <button
            onClick={handleDisconnect}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Disconnect
          </button>
        </div>

        <div className="space-y-4">
          {/* Wallet Info */}
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-90">
                {walletTypes.find((w) => w.type === activeWallet.type)?.icon}{' '}
                {walletTypes.find((w) => w.type === activeWallet.type)?.name}
              </span>
              <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                {activeWallet.network}
              </span>
            </div>
            <div className="font-mono text-lg mb-2">{formatAddress(activeWallet.address)}</div>
            {activeWallet.balance && (
              <div className="text-2xl font-bold">{formatBalance(activeWallet.balance)} ETH</div>
            )}
          </div>

          {/* Network Switcher */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Network</label>
            <select
              value={activeWallet.network}
              onChange={(e) => handleSwitchNetwork(e.target.value as BlockchainNetwork)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="ethereum">Ethereum</option>
              <option value="polygon">Polygon</option>
              <option value="arbitrum">Arbitrum</option>
              <option value="optimism">Optimism</option>
              <option value="base">Base</option>
              <option value="bsc">BNB Chain</option>
              <option value="avalanche">Avalanche</option>
            </select>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              📤 Send
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              📥 Receive
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              🔄 Swap
            </button>
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              📊 History
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Connect Wallet</h2>
      <p className="text-gray-600 mb-6">Choose your preferred wallet to connect</p>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {walletTypes.map((wallet) => (
          <button
            key={wallet.type}
            onClick={() => handleConnect(wallet.type)}
            disabled={connecting}
            className="flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="text-3xl mr-3">{wallet.icon}</span>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">{wallet.name}</h3>
              <p className="text-sm text-gray-600">{wallet.description}</p>
            </div>
          </button>
        ))}
      </div>

      {connecting && (
        <div className="mt-6 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-purple-500 border-t-transparent"></div>
          <p className="mt-2 text-gray-600">Connecting wallet...</p>
        </div>
      )}
    </div>
  );
};
