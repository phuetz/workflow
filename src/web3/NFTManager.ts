/**
 * NFT Manager
 * Comprehensive NFT management: mint, transfer, marketplace integration
 */

import type {
  BlockchainNetwork,
  NFT,
  NFTMetadata,
  NFTCollection,
  TokenStandard,
  TransactionReceipt,
  IPFSUpload,
} from '../types/web3';
import { blockchainConnector } from './BlockchainConnector';
import { smartContractEngine, CONTRACT_TEMPLATES } from './SmartContractEngine';

// Marketplace Addresses
const MARKETPLACES: Record<string, Record<BlockchainNetwork, string>> = {
  opensea: {
    ethereum: '0x00000000006c3852cbEf3e08E8dF289169EdE581',
    polygon: '0x00000000006c3852cbEf3e08E8dF289169EdE581',
    arbitrum: '0x00000000006c3852cbEf3e08E8dF289169EdE581',
    base: '0x00000000006c3852cbEf3e08E8dF289169EdE581',
    optimism: '',
    bsc: '',
    avalanche: '',
    solana: '',
    cardano: '',
    polkadot: '',
    cosmos: '',
    sui: '',
    aptos: '',
  },
  magiceden: {
    solana: 'MEisE1HzehtrDpAAT8PnLHjpSSkRYakotTuJRPjTpo8',
    ethereum: '',
    polygon: '',
    arbitrum: '',
    optimism: '',
    base: '',
    bsc: '',
    avalanche: '',
    cardano: '',
    polkadot: '',
    cosmos: '',
    sui: '',
    aptos: '',
  },
};

export class NFTManager {
  private ipfsGateway = 'https://ipfs.io/ipfs/';

  /**
   * Create NFT collection
   */
  async createCollection(
    network: BlockchainNetwork,
    standard: TokenStandard,
    params: {
      name: string;
      symbol: string;
      baseUri?: string;
      royaltyPercentage?: number;
      royaltyRecipient?: string;
    }
  ): Promise<NFTCollection> {
    const { name, symbol, baseUri, royaltyPercentage, royaltyRecipient } = params;

    // Deploy collection contract
    const template = standard === 'ERC721' ? 'ERC721' : 'ERC1155';
    const contract = await smartContractEngine.deployFromTemplate(
      network,
      template,
      {
        name,
        symbol,
        baseUri: baseUri || '',
      }
    );

    const collection: NFTCollection = {
      address: contract.address,
      name,
      symbol,
      totalSupply: 0,
      network,
      standard,
      royaltyPercentage,
      royaltyRecipient,
    };

    return collection;
  }

  /**
   * Mint NFT
   */
  async mintNFT(
    collection: NFTCollection,
    to: string,
    metadata: NFTMetadata,
    tokenId?: string
  ): Promise<{ nft: NFT; receipt: TransactionReceipt }> {
    // Upload metadata to IPFS
    const metadataUri = await this.uploadToIPFS(metadata);

    // Mint based on standard
    let receipt: TransactionReceipt;
    let finalTokenId: string;

    if (collection.standard === 'ERC721') {
      finalTokenId = tokenId || Date.now().toString();
      const contract = await smartContractEngine.loadContract(
        collection.network,
        collection.address,
        CONTRACT_TEMPLATES.ERC721.abi
      );

      receipt = await smartContractEngine.sendTransaction(
        contract,
        'mint',
        [to, finalTokenId]
      );
    } else if (collection.standard === 'ERC1155') {
      finalTokenId = tokenId || '1';
      const contract = await smartContractEngine.loadContract(
        collection.network,
        collection.address,
        CONTRACT_TEMPLATES.ERC1155.abi
      );

      receipt = await smartContractEngine.sendTransaction(
        contract,
        'mint',
        [to, finalTokenId, '1', '0x']
      );
    } else {
      throw new Error(`Unsupported token standard: ${collection.standard}`);
    }

    const nft: NFT = {
      tokenId: finalTokenId,
      contract: collection.address,
      network: collection.network,
      standard: collection.standard,
      metadata,
      owner: to,
      mintedAt: Date.now(),
      ipfsUri: metadataUri,
    };

    return { nft, receipt };
  }

  /**
   * Batch mint NFTs
   */
  async batchMint(
    collection: NFTCollection,
    recipients: string[],
    metadataList: NFTMetadata[]
  ): Promise<{ nfts: NFT[]; receipts: TransactionReceipt[] }> {
    if (recipients.length !== metadataList.length) {
      throw new Error('Recipients and metadata arrays must have same length');
    }

    const nfts: NFT[] = [];
    const receipts: TransactionReceipt[] = [];

    for (let i = 0; i < recipients.length; i++) {
      const { nft, receipt } = await this.mintNFT(
        collection,
        recipients[i],
        metadataList[i]
      );
      nfts.push(nft);
      receipts.push(receipt);
    }

    return { nfts, receipts };
  }

  /**
   * Transfer NFT
   */
  async transferNFT(
    nft: NFT,
    from: string,
    to: string
  ): Promise<TransactionReceipt> {
    const contract = await smartContractEngine.loadContract(
      nft.network,
      nft.contract,
      nft.standard === 'ERC721' ? CONTRACT_TEMPLATES.ERC721.abi : CONTRACT_TEMPLATES.ERC1155.abi
    );

    if (nft.standard === 'ERC721') {
      return await smartContractEngine.sendTransaction(
        contract,
        'transferFrom',
        [from, to, nft.tokenId]
      );
    } else {
      // ERC1155
      return await smartContractEngine.sendTransaction(
        contract,
        'safeTransferFrom',
        [from, to, nft.tokenId, '1', '0x']
      );
    }
  }

  /**
   * Burn NFT
   */
  async burnNFT(nft: NFT): Promise<TransactionReceipt> {
    const contract = await smartContractEngine.loadContract(
      nft.network,
      nft.contract,
      nft.standard === 'ERC721' ? CONTRACT_TEMPLATES.ERC721.abi : CONTRACT_TEMPLATES.ERC1155.abi
    );

    return await smartContractEngine.sendTransaction(
      contract,
      'burn',
      [nft.tokenId]
    );
  }

  /**
   * Get NFT metadata
   */
  async getMetadata(nft: NFT): Promise<NFTMetadata> {
    if (nft.metadata) {
      return nft.metadata;
    }

    // Fetch from IPFS
    if (nft.ipfsUri) {
      return await this.fetchFromIPFS(nft.ipfsUri);
    }

    throw new Error('No metadata available');
  }

  /**
   * Get NFT owner
   */
  async getOwner(nft: NFT): Promise<string> {
    const contract = await smartContractEngine.loadContract(
      nft.network,
      nft.contract,
      CONTRACT_TEMPLATES.ERC721.abi
    );

    const owner = await smartContractEngine.callFunction(
      contract,
      'ownerOf',
      [nft.tokenId]
    );

    return owner as string;
  }

  /**
   * Check NFT ownership
   */
  async checkOwnership(
    network: BlockchainNetwork,
    contractAddress: string,
    tokenId: string,
    owner: string
  ): Promise<boolean> {
    const contract = await smartContractEngine.loadContract(
      network,
      contractAddress,
      CONTRACT_TEMPLATES.ERC721.abi
    );

    try {
      const actualOwner = await smartContractEngine.callFunction(
        contract,
        'ownerOf',
        [tokenId]
      );
      return (actualOwner as string).toLowerCase() === owner.toLowerCase();
    } catch {
      return false;
    }
  }

  /**
   * List NFT on marketplace
   */
  async listNFT(
    nft: NFT,
    marketplace: 'opensea' | 'magiceden',
    price: string,
    duration: number = 86400 * 7 // 7 days
  ): Promise<{ listingId: string; receipt: TransactionReceipt }> {
    const marketplaceAddress = MARKETPLACES[marketplace]?.[nft.network];

    if (!marketplaceAddress) {
      throw new Error(`Marketplace ${marketplace} not supported on ${nft.network}`);
    }

    // Approve marketplace
    const contract = await smartContractEngine.loadContract(
      nft.network,
      nft.contract,
      CONTRACT_TEMPLATES.ERC721.abi
    );

    await smartContractEngine.sendTransaction(
      contract,
      'approve',
      [marketplaceAddress, nft.tokenId]
    );

    // Create listing (mock)
    const receipt = await blockchainConnector.sendTransaction(nft.network, {
      to: marketplaceAddress,
      data: this.encodeListNFT(nft.contract, nft.tokenId, price, duration),
      gasLimit: '200000',
    });

    const listingId = `${nft.contract}-${nft.tokenId}-${Date.now()}`;

    return { listingId, receipt };
  }

  /**
   * Buy NFT from marketplace
   */
  async buyNFT(
    nft: NFT,
    marketplace: 'opensea' | 'magiceden',
    listingId: string,
    price: string
  ): Promise<TransactionReceipt> {
    const marketplaceAddress = MARKETPLACES[marketplace]?.[nft.network];

    if (!marketplaceAddress) {
      throw new Error(`Marketplace ${marketplace} not supported on ${nft.network}`);
    }

    const receipt = await blockchainConnector.sendTransaction(nft.network, {
      to: marketplaceAddress,
      data: this.encodeBuyNFT(listingId),
      value: price,
      gasLimit: '300000',
    });

    return receipt;
  }

  /**
   * Cancel marketplace listing
   */
  async cancelListing(
    nft: NFT,
    marketplace: 'opensea' | 'magiceden',
    listingId: string
  ): Promise<TransactionReceipt> {
    const marketplaceAddress = MARKETPLACES[marketplace]?.[nft.network];

    if (!marketplaceAddress) {
      throw new Error(`Marketplace ${marketplace} not supported on ${nft.network}`);
    }

    const receipt = await blockchainConnector.sendTransaction(nft.network, {
      to: marketplaceAddress,
      data: this.encodeCancelListing(listingId),
      gasLimit: '150000',
    });

    return receipt;
  }

  /**
   * Set royalty for collection
   */
  async setRoyalty(
    collection: NFTCollection,
    percentage: number,
    recipient: string
  ): Promise<TransactionReceipt> {
    const contract = await smartContractEngine.loadContract(
      collection.network,
      collection.address,
      CONTRACT_TEMPLATES.ERC721.abi
    );

    const basisPoints = Math.floor(percentage * 100); // Convert to basis points

    const receipt = await smartContractEngine.sendTransaction(
      contract,
      'setDefaultRoyalty',
      [recipient, basisPoints]
    );

    return receipt;
  }

  /**
   * Get collection stats
   */
  async getCollectionStats(collection: NFTCollection): Promise<{
    totalSupply: number;
    totalOwners: number;
    floorPrice?: string;
    totalVolume?: string;
  }> {
    // Mock stats
    return {
      totalSupply: Math.floor(Math.random() * 10000),
      totalOwners: Math.floor(Math.random() * 5000),
      floorPrice: (Math.random() * 10).toFixed(4),
      totalVolume: (Math.random() * 1000).toFixed(2),
    };
  }

  /**
   * Upload to IPFS
   */
  async uploadToIPFS(data: NFTMetadata | Blob): Promise<string> {
    // Mock IPFS upload
    const cid = `Qm${Math.random().toString(36).substring(2, 48)}`;

    // In production, use actual IPFS client
    // const ipfs = create({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' })
    // const { cid } = await ipfs.add(JSON.stringify(data))

    return `ipfs://${cid}`;
  }

  /**
   * Upload file to IPFS
   */
  async uploadFileToIPFS(file: File): Promise<IPFSUpload> {
    const cid = `Qm${Math.random().toString(36).substring(2, 48)}`;

    return {
      cid,
      url: `${this.ipfsGateway}${cid}`,
      size: file.size,
      type: file.type,
      timestamp: Date.now(),
    };
  }

  /**
   * Fetch from IPFS
   */
  async fetchFromIPFS(uri: string): Promise<NFTMetadata> {
    const cid = uri.replace('ipfs://', '');
    const url = `${this.ipfsGateway}${cid}`;

    // Mock fetch
    return {
      name: 'Sample NFT',
      description: 'A sample NFT',
      image: `${this.ipfsGateway}QmSample`,
      attributes: [
        { trait_type: 'Rarity', value: 'Rare' },
        { trait_type: 'Level', value: 5 },
      ],
    };
  }

  /**
   * Generate metadata from template
   */
  generateMetadata(
    name: string,
    description: string,
    imageUri: string,
    attributes?: Array<{ trait_type: string; value: string | number }>
  ): NFTMetadata {
    return {
      name,
      description,
      image: imageUri,
      attributes,
    };
  }

  /**
   * Validate metadata
   */
  validateMetadata(metadata: NFTMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push('Name is required');
    }

    if (!metadata.description || metadata.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (!metadata.image || metadata.image.trim().length === 0) {
      errors.push('Image is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get NFTs owned by address
   */
  async getNFTsByOwner(
    network: BlockchainNetwork,
    collectionAddress: string,
    owner: string
  ): Promise<NFT[]> {
    // Mock implementation - in production, query blockchain or indexer
    return Array.from({ length: 5 }, (_, i) => ({
      tokenId: (i + 1).toString(),
      contract: collectionAddress,
      network,
      standard: 'ERC721' as TokenStandard,
      metadata: {
        name: `NFT #${i + 1}`,
        description: `Sample NFT ${i + 1}`,
        image: `${this.ipfsGateway}QmSample${i}`,
      },
      owner,
      mintedAt: Date.now() - i * 86400000,
    }));
  }

  /**
   * Encode list NFT function
   */
  private encodeListNFT(
    contract: string,
    tokenId: string,
    price: string,
    duration: number
  ): string {
    return `0x${Math.random().toString(16).slice(2)}`;
  }

  /**
   * Encode buy NFT function
   */
  private encodeBuyNFT(listingId: string): string {
    return `0x${Math.random().toString(16).slice(2)}`;
  }

  /**
   * Encode cancel listing function
   */
  private encodeCancelListing(listingId: string): string {
    return `0x${Math.random().toString(16).slice(2)}`;
  }
}

// Singleton instance
export const nftManager = new NFTManager();
