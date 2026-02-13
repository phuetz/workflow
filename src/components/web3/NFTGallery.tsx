/**
 * NFT Gallery Component
 * Display and manage NFT collections
 */

import React, { useState } from 'react';
import type { NFT, NFTCollection, BlockchainNetwork } from '../../types/web3';
import { nftManager } from '../../web3/NFTManager';
import { logger } from '../../services/SimpleLogger';

export const NFTGallery: React.FC = () => {
  const [network, setNetwork] = useState<BlockchainNetwork>('ethereum');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [showMintModal, setShowMintModal] = useState(false);

  // Mock NFT data
  const mockNFTs: NFT[] = Array.from({ length: 12 }, (_, i) => ({
    tokenId: (i + 1).toString(),
    contract: `0x${Math.random().toString(16).slice(2, 42)}`,
    network: 'ethereum',
    standard: 'ERC721' as const,
    metadata: {
      name: `Cool NFT #${i + 1}`,
      description: `A unique digital collectible from the Cool NFT collection`,
      image: `https://picsum.photos/400/400?random=${i}`,
      attributes: [
        { trait_type: 'Background', value: ['Blue', 'Red', 'Green', 'Yellow'][i % 4] },
        { trait_type: 'Rarity', value: ['Common', 'Rare', 'Epic', 'Legendary'][i % 4] },
        { trait_type: 'Level', value: Math.floor(Math.random() * 100) },
      ],
    },
    owner: `0x${Math.random().toString(16).slice(2, 42)}`,
    mintedAt: Date.now() - i * 86400000,
  }));

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleMint = async () => {
    // Mock minting
    logger.debug('Minting NFT...');
    setShowMintModal(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🖼️ NFT Gallery</h2>
          <p className="text-gray-600">Manage your NFT collections</p>
        </div>
        <button
          onClick={() => setShowMintModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          + Mint NFT
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-4">
          <select
            value={network}
            onChange={(e) => setNetwork(e.target.value as BlockchainNetwork)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="ethereum">Ethereum</option>
            <option value="polygon">Polygon</option>
            <option value="bsc">BNB Chain</option>
            <option value="solana">Solana</option>
            <option value="arbitrum">Arbitrum</option>
            <option value="base">Base</option>
          </select>

          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
            <option value="all">All Collections</option>
            <option value="owned">Owned by Me</option>
            <option value="created">Created by Me</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-2 rounded-lg ${
              viewMode === 'grid' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 rounded-lg ${
              viewMode === 'list' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* NFT Grid */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {mockNFTs.map((nft) => (
            <div
              key={nft.tokenId}
              onClick={() => setSelectedNFT(nft)}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="aspect-square bg-gray-100">
                <img
                  src={nft.metadata.image}
                  alt={nft.metadata.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1">{nft.metadata.name}</h3>
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {nft.metadata.description}
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">#{nft.tokenId}</span>
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                    {nft.standard}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {mockNFTs.map((nft) => (
            <div
              key={nft.tokenId}
              onClick={() => setSelectedNFT(nft)}
              className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              <img
                src={nft.metadata.image}
                alt={nft.metadata.name}
                className="w-16 h-16 rounded object-cover"
              />
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{nft.metadata.name}</h3>
                <p className="text-sm text-gray-600">{nft.metadata.description}</p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Token #{nft.tokenId}</div>
                <div className="text-xs text-gray-400">{formatAddress(nft.owner)}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NFT Detail Modal */}
      {selectedNFT && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedNFT(null)}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid md:grid-cols-2 gap-6 p-6">
              {/* Image */}
              <div>
                <img
                  src={selectedNFT.metadata.image}
                  alt={selectedNFT.metadata.name}
                  className="w-full rounded-lg"
                />
              </div>

              {/* Details */}
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">
                      {selectedNFT.metadata.name}
                    </h2>
                    <p className="text-gray-600">{selectedNFT.metadata.description}</p>
                  </div>
                  <button
                    onClick={() => setSelectedNFT(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Owner</div>
                    <div className="font-mono text-sm">{formatAddress(selectedNFT.owner)}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Contract</div>
                    <div className="font-mono text-sm">{formatAddress(selectedNFT.contract)}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Token ID</div>
                    <div className="font-semibold">#{selectedNFT.tokenId}</div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-600 mb-1">Standard</div>
                    <div className="font-semibold">{selectedNFT.standard}</div>
                  </div>
                </div>

                {/* Attributes */}
                {selectedNFT.metadata.attributes && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-gray-900 mb-3">Attributes</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedNFT.metadata.attributes.map((attr, i) => (
                        <div key={i} className="bg-gray-50 rounded-lg p-3">
                          <div className="text-xs text-gray-600 mb-1">{attr.trait_type}</div>
                          <div className="font-semibold text-gray-900">{attr.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-2">
                  <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                    Transfer
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    List for Sale
                  </button>
                  <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                    View on Explorer
                  </button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    Burn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mint Modal */}
      {showMintModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowMintModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Mint New NFT</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Collection
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500">
                  <option>Cool NFT Collection</option>
                  <option>My Art Collection</option>
                  <option>Create New Collection</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Enter NFT name..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  placeholder="Enter description..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <p className="text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">PNG, JPG, GIF up to 10MB</p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleMint}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Mint NFT
                </button>
                <button
                  onClick={() => setShowMintModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
