/**
 * Blockchain Explorer Component
 * View and track blockchain transactions and events
 */

import React, { useState } from 'react';
import type { BlockchainNetwork, Transaction, TransactionReceipt } from '../../types/web3';
import { blockchainConnector } from '../../web3/BlockchainConnector';
import { logger } from '../../services/SimpleLogger';

// Define search result types
interface AddressSearchResult {
  address: string;
  balance: string;
}

interface BlockSearchResult {
  blockNumber: number;
  timestamp: number;
  transactions: number;
}

interface ErrorSearchResult {
  error: string;
}

type SearchResult = TransactionReceipt | AddressSearchResult | BlockSearchResult | ErrorSearchResult;

export const BlockchainExplorer: React.FC = () => {
  const [network, setNetwork] = useState<BlockchainNetwork>('ethereum');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'tx' | 'address' | 'block'>('tx');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setSearchResult(null);

    try {
      if (searchType === 'tx') {
        const receipt = await blockchainConnector.getTransactionReceipt(network, searchQuery);
        setSearchResult(receipt);
      } else if (searchType === 'address') {
        const balance = await blockchainConnector.getBalance(network, searchQuery);
        setSearchResult({ address: searchQuery, balance });
      } else if (searchType === 'block') {
        // Mock block data
        setSearchResult({
          blockNumber: parseInt(searchQuery),
          timestamp: Date.now(),
          transactions: Math.floor(Math.random() * 200),
        });
      }
    } catch (error) {
      logger.error('Search error:', error);
      setSearchResult({ error: 'Not found or invalid input' });
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  const formatHash = (hash: string) => {
    return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
  };

  // Type guards
  const isErrorResult = (result: SearchResult): result is ErrorSearchResult => {
    return 'error' in result;
  };

  const isTransactionReceipt = (result: SearchResult): result is TransactionReceipt => {
    return 'transactionHash' in result && 'blockNumber' in result && 'gasUsed' in result;
  };

  const isAddressResult = (result: SearchResult): result is AddressSearchResult => {
    return 'address' in result && 'balance' in result;
  };

  const isBlockResult = (result: SearchResult): result is BlockSearchResult => {
    return 'blockNumber' in result && 'timestamp' in result && 'transactions' in result;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">🔍 Blockchain Explorer</h2>
        <p className="text-gray-600">Search transactions, addresses, and blocks</p>
      </div>

      {/* Search Controls */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as BlockchainNetwork)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="ethereum">Ethereum</option>
            <option value="polygon">Polygon</option>
            <option value="bsc">BNB Chain</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="optimism">Optimism</option>
            <option value="base">Base</option>
            <option value="avalanche">Avalanche</option>
            <option value="solana">Solana</option>
          </select>

          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="tx">Transaction</option>
            <option value="address">Address</option>
            <option value="block">Block</option>
          </select>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder={
              searchType === 'tx'
                ? 'Enter transaction hash...'
                : searchType === 'address'
                ? 'Enter wallet address...'
                : 'Enter block number...'
            }
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {searchResult && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">Search Result</h3>

          {isErrorResult(searchResult) ? (
            <p className="text-red-600">{searchResult.error}</p>
          ) : isTransactionReceipt(searchResult) ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Transaction Hash:</span>
                <span className="font-mono">{formatHash(searchResult.transactionHash)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Block Number:</span>
                <span>{searchResult.blockNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={searchResult.status === 1 ? 'text-green-600' : 'text-red-600'}>
                  {searchResult.status === 1 ? '✓ Success' : '✗ Failed'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">From:</span>
                <span className="font-mono">{formatAddress(searchResult.from)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">To:</span>
                <span className="font-mono">{formatAddress(searchResult.to)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Gas Used:</span>
                <span>{searchResult.gasUsed}</span>
              </div>
            </div>
          ) : isAddressResult(searchResult) ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Address:</span>
                <span className="font-mono">{formatAddress(searchResult.address)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Balance:</span>
                <span className="font-semibold">{parseFloat(searchResult.balance).toFixed(6)} ETH</span>
              </div>
            </div>
          ) : isBlockResult(searchResult) ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Block Number:</span>
                <span>{searchResult.blockNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Timestamp:</span>
                <span>{new Date(searchResult.timestamp).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Transactions:</span>
                <span>{searchResult.transactions}</span>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Network Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600 mb-1">Block Height</div>
          <div className="text-2xl font-bold text-blue-900">
            {(Math.random() * 20000000).toFixed(0)}
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600 mb-1">Gas Price</div>
          <div className="text-2xl font-bold text-green-900">
            {(Math.random() * 50 + 10).toFixed(0)} Gwei
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-sm text-purple-600 mb-1">TPS</div>
          <div className="text-2xl font-bold text-purple-900">
            {(Math.random() * 100).toFixed(1)}
          </div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="text-sm text-orange-600 mb-1">Network</div>
          <div className="text-2xl font-bold text-orange-900">Healthy</div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Recent Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-gray-600">Hash</th>
                <th className="px-4 py-2 text-left text-gray-600">From</th>
                <th className="px-4 py-2 text-left text-gray-600">To</th>
                <th className="px-4 py-2 text-left text-gray-600">Value</th>
                <th className="px-4 py-2 text-left text-gray-600">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-mono text-purple-600">
                    {formatHash(`0x${Math.random().toString(16).slice(2)}`)}
                  </td>
                  <td className="px-4 py-2 font-mono">
                    {formatAddress(`0x${Math.random().toString(16).slice(2, 42)}`)}
                  </td>
                  <td className="px-4 py-2 font-mono">
                    {formatAddress(`0x${Math.random().toString(16).slice(2, 42)}`)}
                  </td>
                  <td className="px-4 py-2">{(Math.random() * 10).toFixed(4)} ETH</td>
                  <td className="px-4 py-2 text-gray-600">{i + 1}s ago</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
