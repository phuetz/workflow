/**
 * Blockchain Connector
 * Multi-chain blockchain connection management with pooling and auto-reconnection
 *
 * Implements real Web3 providers using ethers.js for EVM-compatible chains
 */

import { logger } from '../services/SimpleLogger';
import type {
  BlockchainNetwork,
  NetworkConfig,
  Transaction,
  TransactionReceipt,
  GasEstimate,
  ChainAnalytics,
  Web3Error,
  Log,
  ContractABI,
} from '../types/web3';

// Dynamic import for ethers.js to support both server and browser environments
let ethers: typeof import('ethers') | null = null;

async function getEthers(): Promise<typeof import('ethers')> {
  if (!ethers) {
    try {
      ethers = await import('ethers');
    } catch (error) {
      throw new Error('ethers.js is required for blockchain operations. Install with: npm install ethers');
    }
  }
  return ethers;
}

// EVM-compatible networks that use ethers.js
const EVM_NETWORKS: BlockchainNetwork[] = [
  'ethereum',
  'polygon',
  'arbitrum',
  'optimism',
  'base',
  'bsc',
  'avalanche',
];

// Helper to check if network is EVM-compatible
function isEVMNetwork(network: BlockchainNetwork): boolean {
  return EVM_NETWORKS.includes(network);
}

// Network configurations for all supported chains
export const NETWORK_CONFIGS: Record<BlockchainNetwork, NetworkConfig> = {
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/',
    explorerUrl: 'https://etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockTime: 12,
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon-rpc.com',
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockTime: 2,
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockTime: 0.25,
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    explorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockTime: 2,
  },
  base: {
    id: 'base',
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockTime: 2,
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    chainId: 0, // Solana doesn't use chainId
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    explorerUrl: 'https://solscan.io',
    nativeCurrency: { name: 'SOL', symbol: 'SOL', decimals: 9 },
    blockTime: 0.4,
  },
  bsc: {
    id: 'bsc',
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrl: 'https://bsc-dataseed.binance.org',
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    blockTime: 3,
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche C-Chain',
    chainId: 43114,
    rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
    explorerUrl: 'https://snowtrace.io',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    blockTime: 2,
  },
  cardano: {
    id: 'cardano',
    name: 'Cardano',
    chainId: 0,
    rpcUrl: 'https://cardano-mainnet.blockfrost.io/api/v0',
    explorerUrl: 'https://cardanoscan.io',
    nativeCurrency: { name: 'ADA', symbol: 'ADA', decimals: 6 },
    blockTime: 20,
  },
  polkadot: {
    id: 'polkadot',
    name: 'Polkadot',
    chainId: 0,
    rpcUrl: 'wss://rpc.polkadot.io',
    explorerUrl: 'https://polkadot.subscan.io',
    nativeCurrency: { name: 'DOT', symbol: 'DOT', decimals: 10 },
    blockTime: 6,
  },
  cosmos: {
    id: 'cosmos',
    name: 'Cosmos Hub',
    chainId: 0,
    rpcUrl: 'https://rpc-cosmoshub.blockapsis.com',
    explorerUrl: 'https://www.mintscan.io/cosmos',
    nativeCurrency: { name: 'ATOM', symbol: 'ATOM', decimals: 6 },
    blockTime: 7,
  },
  sui: {
    id: 'sui',
    name: 'Sui',
    chainId: 0,
    rpcUrl: 'https://fullnode.mainnet.sui.io',
    explorerUrl: 'https://suivision.xyz',
    nativeCurrency: { name: 'SUI', symbol: 'SUI', decimals: 9 },
    blockTime: 0.5,
  },
  aptos: {
    id: 'aptos',
    name: 'Aptos',
    chainId: 0,
    rpcUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
    explorerUrl: 'https://explorer.aptoslabs.com',
    nativeCurrency: { name: 'APT', symbol: 'APT', decimals: 8 },
    blockTime: 4,
  },
};

interface ConnectionPool {
  network: BlockchainNetwork;
  connections: Connection[];
  maxSize: number;
  activeCount: number;
}

interface Connection {
  id: string;
  provider: unknown; // ethers.Provider for EVM networks, or other provider types
  rpcUrl: string;
  lastUsed: number;
  healthy: boolean;
  reconnecting: boolean;
}

export class BlockchainConnector {
  private pools: Map<BlockchainNetwork, ConnectionPool> = new Map();
  private readonly poolSize = 5;
  private readonly reconnectInterval = 5000; // 5 seconds
  private readonly healthCheckInterval = 30000; // 30 seconds
  private healthCheckTimer?: NodeJS.Timeout;

  constructor() {
    this.startHealthChecks();
  }

  /**
   * Initialize connection pool for a network
   */
  async initializePool(
    network: BlockchainNetwork,
    rpcUrl?: string,
    apiKey?: string
  ): Promise<void> {
    if (this.pools.has(network)) {
      return;
    }

    const config = NETWORK_CONFIGS[network];
    const finalRpcUrl = rpcUrl || config.rpcUrl;
    const url = apiKey ? `${finalRpcUrl}${apiKey}` : finalRpcUrl;

    const pool: ConnectionPool = {
      network,
      connections: [],
      maxSize: this.poolSize,
      activeCount: 0,
    };

    // Create initial connections
    for (let i = 0; i < this.poolSize; i++) {
      try {
        const connection = await this.createConnection(network, url);
        pool.connections.push(connection);
      } catch (error) {
        logger.error(`Failed to create connection ${i} for ${network}:`, error);
      }
    }

    this.pools.set(network, pool);
  }

  /**
   * Create a new connection
   */
  private async createConnection(
    network: BlockchainNetwork,
    rpcUrl: string
  ): Promise<Connection> {
    const connection: Connection = {
      id: `${network}-${Date.now()}-${Math.random()}`,
      provider: await this.createProvider(network, rpcUrl),
      rpcUrl,
      lastUsed: Date.now(),
      healthy: true,
      reconnecting: false,
    };

    return connection;
  }

  /**
   * Create provider based on network type
   * Uses ethers.js JsonRpcProvider for EVM-compatible networks
   */
  private async createProvider(
    network: BlockchainNetwork,
    rpcUrl: string
  ): Promise<unknown> {
    if (isEVMNetwork(network)) {
      try {
        const { JsonRpcProvider } = await getEthers();
        const config = NETWORK_CONFIGS[network];

        // Create JsonRpcProvider with network info for proper chain validation
        const provider = new JsonRpcProvider(rpcUrl, {
          chainId: config.chainId,
          name: network,
        });

        // Test the connection
        await provider.getBlockNumber();

        logger.info(`Created provider for ${network}`, { rpcUrl: rpcUrl.replace(/[a-zA-Z0-9]{32,}/, '***') });
        return provider;
      } catch (error) {
        logger.error(`Failed to create provider for ${network}:`, error);
        throw this.createError(
          'PROVIDER_CREATION_FAILED',
          `Failed to create provider for ${network}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { network, rpcUrl: rpcUrl.replace(/[a-zA-Z0-9]{32,}/, '***') }
        );
      }
    }

    // For non-EVM networks (Solana, Cardano, etc.), return a placeholder
    // These would need their own specific SDKs (@solana/web3.js, etc.)
    logger.warn(`Non-EVM network ${network} uses placeholder provider. Install appropriate SDK for full support.`);
    return {
      network,
      rpcUrl,
      isConnected: true,
      isPlaceholder: true,
      request: async (method: string, params: unknown[]) => {
        throw this.createError(
          'UNSUPPORTED_NETWORK',
          `Network ${network} requires specific SDK implementation`,
          { method, params }
        );
      },
    };
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(network: BlockchainNetwork): Promise<Connection> {
    let pool = this.pools.get(network);

    if (!pool) {
      await this.initializePool(network);
      pool = this.pools.get(network)!;
    }

    // Find the least recently used healthy connection
    const healthyConnections = pool.connections.filter((c) => c.healthy);

    if (healthyConnections.length === 0) {
      throw this.createError('NO_HEALTHY_CONNECTION', `No healthy connections available for ${network}`);
    }

    const connection = healthyConnections.reduce((prev, curr) =>
      prev.lastUsed < curr.lastUsed ? prev : curr
    );

    connection.lastUsed = Date.now();
    pool.activeCount++;

    return connection;
  }

  /**
   * Release a connection back to the pool
   */
  releaseConnection(network: BlockchainNetwork, connectionId: string): void {
    const pool = this.pools.get(network);
    if (!pool) return;

    pool.activeCount = Math.max(0, pool.activeCount - 1);
  }

  /**
   * Send a transaction using a private key
   * For EVM networks, uses ethers.js Wallet and Provider
   */
  async sendTransaction(
    network: BlockchainNetwork,
    tx: Partial<Transaction>
  ): Promise<TransactionReceipt> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `Transaction sending not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const ethersLib = await getEthers();
      const provider = connection.provider as import('ethers').JsonRpcProvider;

      if (!tx.from) {
        throw this.createError('INVALID_TRANSACTION', 'Transaction must include "from" address or private key');
      }

      // Build transaction request
      const txRequest: import('ethers').TransactionRequest = {
        to: tx.to,
        value: tx.value ? ethersLib.parseEther(tx.value) : undefined,
        data: tx.data || '0x',
        gasLimit: tx.gasLimit ? BigInt(tx.gasLimit) : undefined,
        nonce: tx.nonce,
        chainId: NETWORK_CONFIGS[network].chainId,
      };

      // Handle gas pricing (EIP-1559 or legacy)
      if (tx.maxFeePerGas && tx.maxPriorityFeePerGas) {
        txRequest.maxFeePerGas = BigInt(tx.maxFeePerGas);
        txRequest.maxPriorityFeePerGas = BigInt(tx.maxPriorityFeePerGas);
      } else if (tx.gasPrice) {
        txRequest.gasPrice = BigInt(tx.gasPrice);
      }

      // Estimate gas if not provided
      if (!txRequest.gasLimit) {
        const estimatedGas = await provider.estimateGas({
          ...txRequest,
          from: tx.from,
        });
        txRequest.gasLimit = estimatedGas;
      }

      // Note: This method requires the transaction to be signed externally
      // For signing with a private key, use sendTransactionWithKey method
      throw this.createError(
        'SIGNATURE_REQUIRED',
        'Transaction requires signing. Use sendTransactionWithKey() with a private key, or sign the transaction externally.'
      );
    } catch (error) {
      if ((error as Web3Error).code) {
        throw error;
      }
      throw this.createError(
        'TRANSACTION_FAILED',
        `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { network, tx }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Send a transaction with a private key
   * Creates a Wallet instance and signs/sends the transaction
   */
  async sendTransactionWithKey(
    network: BlockchainNetwork,
    privateKey: string,
    to: string,
    value: string,
    data?: string,
    options?: {
      gasLimit?: string;
      gasPrice?: string;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
      nonce?: number;
    }
  ): Promise<TransactionReceipt> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `Transaction sending not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const ethersLib = await getEthers();
      const provider = connection.provider as import('ethers').JsonRpcProvider;

      // Create wallet from private key
      const wallet = new ethersLib.Wallet(privateKey, provider);

      // Build transaction request
      const txRequest: import('ethers').TransactionRequest = {
        to,
        value: ethersLib.parseEther(value),
        data: data || '0x',
        chainId: NETWORK_CONFIGS[network].chainId,
      };

      // Handle gas settings
      if (options?.gasLimit) {
        txRequest.gasLimit = BigInt(options.gasLimit);
      }

      if (options?.maxFeePerGas && options?.maxPriorityFeePerGas) {
        txRequest.maxFeePerGas = BigInt(options.maxFeePerGas);
        txRequest.maxPriorityFeePerGas = BigInt(options.maxPriorityFeePerGas);
      } else if (options?.gasPrice) {
        txRequest.gasPrice = BigInt(options.gasPrice);
      }

      if (options?.nonce !== undefined) {
        txRequest.nonce = options.nonce;
      }

      // Send transaction
      logger.info(`Sending transaction on ${network}`, { to, value });
      const txResponse = await wallet.sendTransaction(txRequest);

      logger.info(`Transaction sent: ${txResponse.hash}`, { network });

      // Wait for confirmation
      const receipt = await txResponse.wait();

      if (!receipt) {
        throw this.createError('TRANSACTION_FAILED', 'Transaction failed - no receipt received');
      }

      // Convert to our TransactionReceipt format
      return this.convertEthersReceipt(receipt);
    } catch (error) {
      if ((error as Web3Error).code) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Transaction failed on ${network}:`, error);
      throw this.createError(
        'TRANSACTION_FAILED',
        `Transaction failed: ${errorMessage}`,
        { network, to, value }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Convert ethers.js TransactionReceipt to our format
   */
  private convertEthersReceipt(receipt: import('ethers').TransactionReceipt): TransactionReceipt {
    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      blockHash: receipt.blockHash,
      from: receipt.from,
      to: receipt.to || '',
      gasUsed: receipt.gasUsed.toString(),
      cumulativeGasUsed: receipt.cumulativeGasUsed.toString(),
      status: receipt.status ?? 0,
      contractAddress: receipt.contractAddress || undefined,
      logs: receipt.logs.map((log) => this.convertEthersLog(log)),
    };
  }

  /**
   * Convert ethers.js Log to our format
   */
  private convertEthersLog(log: import('ethers').Log): Log {
    return {
      address: log.address,
      topics: [...log.topics],
      data: log.data,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      logIndex: log.index,
    };
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(
    network: BlockchainNetwork,
    txHash: string
  ): Promise<TransactionReceipt | null> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `getTransactionReceipt not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const provider = connection.provider as import('ethers').JsonRpcProvider;
      const receipt = await provider.getTransactionReceipt(txHash);

      if (!receipt) {
        return null;
      }

      return this.convertEthersReceipt(receipt);
    } catch (error) {
      logger.error(`Failed to get transaction receipt on ${network}:`, error);
      throw this.createError(
        'RPC_ERROR',
        `Failed to get transaction receipt: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { network, txHash }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Get balance
   * Returns the balance in the native currency (ETH, MATIC, etc.)
   */
  async getBalance(network: BlockchainNetwork, address: string): Promise<string> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `getBalance not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const ethersLib = await getEthers();
      const provider = connection.provider as import('ethers').JsonRpcProvider;
      const balance = await provider.getBalance(address);

      // Format balance to ether (or native currency with 18 decimals)
      return ethersLib.formatEther(balance);
    } catch (error) {
      logger.error(`Failed to get balance on ${network}:`, error);
      throw this.createError(
        'RPC_ERROR',
        `Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { network, address }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(
    network: BlockchainNetwork,
    tx: Partial<Transaction>
  ): Promise<GasEstimate> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `estimateGas not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const ethersLib = await getEthers();
      const provider = connection.provider as import('ethers').JsonRpcProvider;

      // Build transaction request for estimation
      const txRequest: import('ethers').TransactionRequest = {
        from: tx.from,
        to: tx.to,
        value: tx.value ? ethersLib.parseEther(tx.value) : undefined,
        data: tx.data || '0x',
      };

      // Get gas estimate and fee data
      const [gasLimit, feeData] = await Promise.all([
        provider.estimateGas(txRequest),
        provider.getFeeData(),
      ]);

      const gasLimitStr = gasLimit.toString();

      // Calculate estimated cost
      let estimatedCost: bigint;
      const estimate: GasEstimate = {
        gasLimit: gasLimitStr,
        estimatedCost: '0',
      };

      // EIP-1559 networks have maxFeePerGas
      if (feeData.maxFeePerGas) {
        estimate.maxFeePerGas = feeData.maxFeePerGas.toString();
        estimate.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas?.toString();
        estimatedCost = gasLimit * feeData.maxFeePerGas;
      } else if (feeData.gasPrice) {
        estimate.gasPrice = feeData.gasPrice.toString();
        estimatedCost = gasLimit * feeData.gasPrice;
      } else {
        estimatedCost = BigInt(0);
      }

      estimate.estimatedCost = estimatedCost.toString();
      estimate.estimatedCostUSD = undefined; // Would require price oracle integration

      return estimate;
    } catch (error) {
      logger.error(`Failed to estimate gas on ${network}:`, error);
      throw this.createError(
        'GAS_ESTIMATION_FAILED',
        `Failed to estimate gas: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { network, tx }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Get current gas price
   * Returns gas price in wei
   */
  async getGasPrice(network: BlockchainNetwork): Promise<string> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `getGasPrice not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const provider = connection.provider as import('ethers').JsonRpcProvider;
      const feeData = await provider.getFeeData();

      // Return maxFeePerGas for EIP-1559 networks, or gasPrice for legacy
      if (feeData.maxFeePerGas) {
        return feeData.maxFeePerGas.toString();
      } else if (feeData.gasPrice) {
        return feeData.gasPrice.toString();
      }

      throw this.createError('RPC_ERROR', 'Unable to fetch gas price from network');
    } catch (error) {
      if ((error as Web3Error).code) {
        throw error;
      }
      logger.error(`Failed to get gas price on ${network}:`, error);
      throw this.createError(
        'RPC_ERROR',
        `Failed to get gas price: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { network }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Get detailed fee data (EIP-1559 compatible)
   */
  async getFeeData(network: BlockchainNetwork): Promise<{
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  }> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `getFeeData not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const provider = connection.provider as import('ethers').JsonRpcProvider;
      const feeData = await provider.getFeeData();

      return {
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
      };
    } catch (error) {
      logger.error(`Failed to get fee data on ${network}:`, error);
      throw this.createError(
        'RPC_ERROR',
        `Failed to get fee data: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { network }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Get current block number
   */
  async getBlockNumber(network: BlockchainNetwork): Promise<number> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `getBlockNumber not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const provider = connection.provider as import('ethers').JsonRpcProvider;
      return await provider.getBlockNumber();
    } catch (error) {
      logger.error(`Failed to get block number on ${network}:`, error);
      throw this.createError(
        'RPC_ERROR',
        `Failed to get block number: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { network }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Get chain analytics
   */
  async getChainAnalytics(network: BlockchainNetwork): Promise<ChainAnalytics> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `getChainAnalytics not supported for ${network}. Only EVM networks are supported.`
      );
    }

    try {
      const [blockHeight, gasPrice] = await Promise.all([
        this.getBlockNumber(network),
        this.getGasPrice(network),
      ]);

      return {
        network,
        blockHeight,
        tps: 0, // Would require block analysis to calculate accurately
        gasPrice: {
          gasLimit: '21000', // Standard ETH transfer
          gasPrice,
          estimatedCost: (BigInt(21000) * BigInt(gasPrice)).toString(),
        },
        networkHealth: 'healthy',
        lastUpdated: Date.now(),
      };
    } catch (error) {
      return {
        network,
        blockHeight: 0,
        tps: 0,
        gasPrice: {
          gasLimit: '21000',
          estimatedCost: '0',
        },
        networkHealth: 'down',
        lastUpdated: Date.now(),
      };
    }
  }

  /**
   * Switch network
   */
  async switchNetwork(
    from: BlockchainNetwork,
    to: BlockchainNetwork
  ): Promise<void> {
    await this.initializePool(to);
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  /**
   * Perform health checks on all connections
   */
  private async performHealthChecks(): Promise<void> {
    for (const [network, pool] of this.pools) {
      for (const connection of pool.connections) {
        try {
          // Simple health check - try to get block number
          const isHealthy = await this.checkConnectionHealth(connection);
          connection.healthy = isHealthy;

          if (!isHealthy && !connection.reconnecting) {
            this.reconnectConnection(network, connection);
          }
        } catch (error) {
          connection.healthy = false;
          logger.error(`Health check failed for ${connection.id}:`, error);
        }
      }
    }
  }

  /**
   * Check connection health by attempting to get block number
   */
  private async checkConnectionHealth(connection: Connection): Promise<boolean> {
    try {
      const provider = connection.provider as { getBlockNumber?: () => Promise<number>; isPlaceholder?: boolean };

      // Skip health check for placeholder providers (non-EVM networks)
      if (provider.isPlaceholder) {
        return true;
      }

      // For EVM networks, try to get block number
      if (typeof provider.getBlockNumber === 'function') {
        await Promise.race([
          provider.getBlockNumber(),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          ),
        ]);
        return true;
      }

      return false;
    } catch (error) {
      logger.warn(`Connection health check failed for ${connection.id}:`, error);
      return false;
    }
  }

  /**
   * Reconnect a connection
   */
  private async reconnectConnection(
    network: BlockchainNetwork,
    connection: Connection
  ): Promise<void> {
    if (connection.reconnecting) return;

    connection.reconnecting = true;

    try {
      const config = NETWORK_CONFIGS[network];
      connection.provider = await this.createProvider(network, config.rpcUrl);
      connection.healthy = true;
      connection.lastUsed = Date.now();
    } catch (error) {
      logger.error(`Failed to reconnect ${connection.id}:`, error);
      setTimeout(() => {
        this.reconnectConnection(network, connection);
      }, this.reconnectInterval);
    } finally {
      connection.reconnecting = false;
    }
  }

  /**
   * Get random gas price (mock)
   */
  private getRandomGasPrice(network: BlockchainNetwork): string {
    const baseGas: Record<BlockchainNetwork, number> = {
      ethereum: 50000000000, // 50 gwei
      polygon: 30000000000, // 30 gwei
      arbitrum: 100000000, // 0.1 gwei
      optimism: 1000000, // 0.001 gwei
      base: 1000000, // 0.001 gwei
      solana: 5000, // lamports
      bsc: 5000000000, // 5 gwei
      avalanche: 25000000000, // 25 gwei
      cardano: 1000000, // lovelace
      polkadot: 1000000000, // planck
      cosmos: 25000, // uatom
      sui: 1000, // mist
      aptos: 100, // octas
    };

    const base = baseGas[network] || 1000000000;
    const variance = base * 0.2; // 20% variance
    return Math.floor(base + (Math.random() - 0.5) * variance).toString();
  }

  /**
   * Read from a smart contract (view/pure functions)
   */
  async readContract(
    network: BlockchainNetwork,
    contractAddress: string,
    abi: ContractABI[] | string[],
    method: string,
    args: unknown[] = []
  ): Promise<unknown> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `readContract not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const ethersLib = await getEthers();
      const provider = connection.provider as import('ethers').JsonRpcProvider;

      // Create contract instance
      const contract = new ethersLib.Contract(contractAddress, abi as ethersLib.InterfaceAbi, provider);

      // Check if method exists
      if (typeof contract[method] !== 'function') {
        throw this.createError(
          'INVALID_METHOD',
          `Method "${method}" not found in contract ABI`,
          { contractAddress, method }
        );
      }

      // Call the method
      const result = await contract[method](...args);

      logger.info(`Contract read successful`, { network, contractAddress, method });
      return result;
    } catch (error) {
      if ((error as Web3Error).code) {
        throw error;
      }
      logger.error(`Contract read failed on ${network}:`, error);
      throw this.createError(
        'CONTRACT_READ_FAILED',
        `Failed to read contract: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { network, contractAddress, method, args }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Write to a smart contract (state-changing functions)
   * Requires private key for signing
   */
  async writeContract(
    network: BlockchainNetwork,
    privateKey: string,
    contractAddress: string,
    abi: ContractABI[] | string[],
    method: string,
    args: unknown[] = [],
    options?: {
      value?: string;
      gasLimit?: string;
      gasPrice?: string;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<TransactionReceipt> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `writeContract not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const ethersLib = await getEthers();
      const provider = connection.provider as import('ethers').JsonRpcProvider;

      // Create wallet from private key
      const wallet = new ethersLib.Wallet(privateKey, provider);

      // Create contract instance with signer
      const contract = new ethersLib.Contract(contractAddress, abi as ethersLib.InterfaceAbi, wallet);

      // Check if method exists
      if (typeof contract[method] !== 'function') {
        throw this.createError(
          'INVALID_METHOD',
          `Method "${method}" not found in contract ABI`,
          { contractAddress, method }
        );
      }

      // Build transaction overrides
      const overrides: import('ethers').Overrides = {};

      if (options?.value) {
        overrides.value = ethersLib.parseEther(options.value);
      }
      if (options?.gasLimit) {
        overrides.gasLimit = BigInt(options.gasLimit);
      }
      if (options?.maxFeePerGas && options?.maxPriorityFeePerGas) {
        overrides.maxFeePerGas = BigInt(options.maxFeePerGas);
        overrides.maxPriorityFeePerGas = BigInt(options.maxPriorityFeePerGas);
      } else if (options?.gasPrice) {
        overrides.gasPrice = BigInt(options.gasPrice);
      }

      // Call the method with args and overrides
      logger.info(`Writing to contract`, { network, contractAddress, method });
      const txResponse = await contract[method](...args, overrides);

      // Wait for confirmation
      const receipt = await txResponse.wait();

      if (!receipt) {
        throw this.createError('TRANSACTION_FAILED', 'Contract write failed - no receipt received');
      }

      logger.info(`Contract write successful`, { network, contractAddress, method, txHash: receipt.hash });
      return this.convertEthersReceipt(receipt);
    } catch (error) {
      if ((error as Web3Error).code) {
        throw error;
      }
      logger.error(`Contract write failed on ${network}:`, error);
      throw this.createError(
        'CONTRACT_WRITE_FAILED',
        `Failed to write to contract: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { network, contractAddress, method, args }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Get ERC20 token balance
   */
  async getTokenBalance(
    network: BlockchainNetwork,
    tokenAddress: string,
    walletAddress: string
  ): Promise<{ balance: string; decimals: number; symbol: string }> {
    // Standard ERC20 ABI for balanceOf, decimals, and symbol
    const erc20Abi = [
      'function balanceOf(address owner) view returns (uint256)',
      'function decimals() view returns (uint8)',
      'function symbol() view returns (string)',
    ];

    const [balance, decimals, symbol] = await Promise.all([
      this.readContract(network, tokenAddress, erc20Abi, 'balanceOf', [walletAddress]) as Promise<bigint>,
      this.readContract(network, tokenAddress, erc20Abi, 'decimals', []) as Promise<number>,
      this.readContract(network, tokenAddress, erc20Abi, 'symbol', []) as Promise<string>,
    ]);

    // Format balance with proper decimals
    const ethersLib = await getEthers();
    const formattedBalance = ethersLib.formatUnits(balance, decimals);

    return {
      balance: formattedBalance,
      decimals,
      symbol,
    };
  }

  /**
   * Transfer ERC20 tokens
   */
  async transferToken(
    network: BlockchainNetwork,
    privateKey: string,
    tokenAddress: string,
    to: string,
    amount: string,
    options?: {
      gasLimit?: string;
      gasPrice?: string;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<TransactionReceipt> {
    // Standard ERC20 ABI for transfer and decimals
    const erc20Abi = [
      'function transfer(address to, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)',
    ];

    // Get decimals to parse amount correctly
    const decimals = (await this.readContract(network, tokenAddress, erc20Abi, 'decimals', [])) as number;

    // Parse amount with correct decimals
    const ethersLib = await getEthers();
    const parsedAmount = ethersLib.parseUnits(amount, decimals);

    return this.writeContract(network, privateKey, tokenAddress, erc20Abi, 'transfer', [to, parsedAmount], options);
  }

  /**
   * Approve ERC20 token spending
   */
  async approveToken(
    network: BlockchainNetwork,
    privateKey: string,
    tokenAddress: string,
    spender: string,
    amount: string,
    options?: {
      gasLimit?: string;
      gasPrice?: string;
      maxFeePerGas?: string;
      maxPriorityFeePerGas?: string;
    }
  ): Promise<TransactionReceipt> {
    // Standard ERC20 ABI for approve and decimals
    const erc20Abi = [
      'function approve(address spender, uint256 amount) returns (bool)',
      'function decimals() view returns (uint8)',
    ];

    // Get decimals to parse amount correctly
    const decimals = (await this.readContract(network, tokenAddress, erc20Abi, 'decimals', [])) as number;

    // Parse amount with correct decimals
    const ethersLib = await getEthers();
    const parsedAmount = ethersLib.parseUnits(amount, decimals);

    return this.writeContract(network, privateKey, tokenAddress, erc20Abi, 'approve', [spender, parsedAmount], options);
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(
    network: BlockchainNetwork,
    txHash: string
  ): Promise<Transaction | null> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `getTransaction not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const provider = connection.provider as import('ethers').JsonRpcProvider;
      const tx = await provider.getTransaction(txHash);

      if (!tx) {
        return null;
      }

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to || '',
        value: tx.value.toString(),
        data: tx.data,
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        maxFeePerGas: tx.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
        nonce: tx.nonce,
        chainId: Number(tx.chainId),
        blockNumber: tx.blockNumber || undefined,
        status: tx.blockNumber ? 'confirmed' : 'pending',
      };
    } catch (error) {
      logger.error(`Failed to get transaction on ${network}:`, error);
      throw this.createError(
        'RPC_ERROR',
        `Failed to get transaction: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { network, txHash }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    network: BlockchainNetwork,
    txHash: string,
    confirmations: number = 1,
    timeout: number = 60000
  ): Promise<TransactionReceipt> {
    if (!isEVMNetwork(network)) {
      throw this.createError(
        'UNSUPPORTED_NETWORK',
        `waitForTransaction not supported for ${network}. Only EVM networks are supported.`
      );
    }

    const connection = await this.getConnection(network);

    try {
      const provider = connection.provider as import('ethers').JsonRpcProvider;

      const receipt = await Promise.race([
        provider.waitForTransaction(txHash, confirmations),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Transaction confirmation timeout')), timeout)
        ),
      ]);

      if (!receipt) {
        throw this.createError('TRANSACTION_FAILED', 'Transaction failed - no receipt received');
      }

      return this.convertEthersReceipt(receipt);
    } catch (error) {
      if ((error as Web3Error).code) {
        throw error;
      }
      logger.error(`Failed to wait for transaction on ${network}:`, error);
      throw this.createError(
        'TRANSACTION_TIMEOUT',
        `Transaction confirmation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { network, txHash, confirmations }
      );
    } finally {
      this.releaseConnection(network, connection.id);
    }
  }

  /**
   * Create error
   */
  private createError(code: string, message: string, details?: unknown): Web3Error {
    return {
      code,
      message,
      details,
    };
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.pools.clear();
  }
}

// Singleton instance
export const blockchainConnector = new BlockchainConnector();
