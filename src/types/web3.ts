/**
 * Web3 & Blockchain Type Definitions
 * Comprehensive types for multi-chain blockchain automation
 */

// Supported Blockchain Networks
export type BlockchainNetwork =
  | 'ethereum'
  | 'polygon'
  | 'arbitrum'
  | 'optimism'
  | 'base'
  | 'solana'
  | 'bsc'
  | 'avalanche'
  | 'cardano'
  | 'polkadot'
  | 'cosmos'
  | 'sui'
  | 'aptos';

// Network Configuration
export interface NetworkConfig {
  id: string;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet?: boolean;
  blockTime?: number; // in seconds
}

// Wallet Types
export type WalletType =
  | 'metamask'
  | 'walletconnect'
  | 'coinbase'
  | 'ledger'
  | 'gnosis-safe'
  | 'phantom' // Solana
  | 'keplr'; // Cosmos

export interface WalletConnection {
  type: WalletType;
  address: string;
  network: BlockchainNetwork;
  balance?: string;
  connected: boolean;
  chainId?: number;
}

// Transaction Types
export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  chainId?: number;
  timestamp?: number;
  blockNumber?: number;
  status?: 'pending' | 'confirmed' | 'failed';
}

export interface TransactionReceipt {
  transactionHash: string;
  blockNumber: number;
  blockHash: string;
  from: string;
  to: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  status: number;
  logs: Log[];
  contractAddress?: string;
}

export interface Log {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

// Smart Contract Types
export interface ContractABI {
  name: string;
  type: 'function' | 'event' | 'constructor' | 'fallback' | 'receive';
  inputs: ABIInput[];
  outputs?: ABIOutput[];
  stateMutability?: 'pure' | 'view' | 'nonpayable' | 'payable';
  anonymous?: boolean;
}

export interface ABIInput {
  name: string;
  type: string;
  indexed?: boolean;
  components?: ABIInput[];
  internalType?: string;
}

export interface ABIOutput {
  name: string;
  type: string;
  components?: ABIOutput[];
  internalType?: string;
}

export interface SmartContract {
  address: string;
  abi: ContractABI[];
  network: BlockchainNetwork;
  name?: string;
  bytecode?: string;
  deployedAt?: number;
}

export interface ContractCall {
  contract: SmartContract;
  method: string;
  params: unknown[];
  value?: string;
  gasLimit?: string;
}

export interface ContractEvent {
  contract: SmartContract;
  eventName: string;
  filter?: Record<string, unknown>;
  fromBlock?: number;
  toBlock?: number;
}

// Token Standards
export type TokenStandard = 'ERC20' | 'ERC721' | 'ERC1155' | 'SPL' | 'BEP20';

export interface TokenInfo {
  standard: TokenStandard;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply?: string;
  network: BlockchainNetwork;
}

export interface TokenBalance {
  token: TokenInfo;
  balance: string;
  formattedBalance: string;
  usdValue?: number;
}

// NFT Types
export interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  external_url?: string;
  animation_url?: string;
  background_color?: string;
}

export interface NFT {
  tokenId: string;
  contract: string;
  network: BlockchainNetwork;
  standard: TokenStandard;
  metadata: NFTMetadata;
  owner: string;
  mintedAt?: number;
  ipfsUri?: string;
}

export interface NFTCollection {
  address: string;
  name: string;
  symbol: string;
  totalSupply: number;
  network: BlockchainNetwork;
  standard: TokenStandard;
  royaltyPercentage?: number;
  royaltyRecipient?: string;
}

// DeFi Types
export interface DEXSwap {
  dex: 'uniswap' | 'sushiswap' | 'pancakeswap' | '1inch' | 'raydium' | 'orca';
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: string;
  amountOut: string;
  slippage: number; // percentage
  deadline?: number; // timestamp
  path?: string[];
  gasEstimate?: string;
}

export interface LiquidityPool {
  address: string;
  dex: string;
  token0: TokenInfo;
  token1: TokenInfo;
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  fee: number; // percentage
  apy?: number;
}

export interface LiquidityPosition {
  pool: LiquidityPool;
  lpTokens: string;
  share: number; // percentage
  token0Amount: string;
  token1Amount: string;
  valueUSD?: number;
}

export interface StakingPool {
  address: string;
  token: TokenInfo;
  rewardToken: TokenInfo;
  apy: number;
  totalStaked: string;
  stakingPeriod?: number; // seconds
  unlockTime?: number;
}

export interface StakingPosition {
  pool: StakingPool;
  stakedAmount: string;
  rewards: string;
  startTime: number;
  unlockTime?: number;
}

// Price Oracle Types
export interface PriceOracle {
  provider: 'chainlink' | 'band-protocol' | 'pyth' | 'api3';
  asset: string;
  price: string;
  decimals: number;
  timestamp: number;
  confidence?: number;
}

// Multi-Signature Wallet
export interface MultiSigWallet {
  address: string;
  network: BlockchainNetwork;
  owners: string[];
  threshold: number;
  nonce: number;
}

export interface MultiSigTransaction {
  wallet: MultiSigWallet;
  to: string;
  value: string;
  data: string;
  executed: boolean;
  confirmations: string[];
  requiredConfirmations: number;
}

// DAO Types
export interface DAOProposal {
  id: string;
  dao: string;
  proposer: string;
  description: string;
  startBlock: number;
  endBlock: number;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  status: 'pending' | 'active' | 'succeeded' | 'defeated' | 'queued' | 'executed' | 'cancelled';
  quorum?: string;
}

export interface DAOVote {
  proposalId: string;
  voter: string;
  support: 'for' | 'against' | 'abstain';
  votes: string;
  reason?: string;
}

// Gas Optimization
export interface GasEstimate {
  gasLimit: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedCost: string;
  estimatedCostUSD?: number;
}

export interface GasOptimization {
  standard: GasEstimate;
  fast: GasEstimate;
  instant: GasEstimate;
  recommended: GasEstimate;
}

// Bridge Types
export interface BridgeTransfer {
  fromChain: BlockchainNetwork;
  toChain: BlockchainNetwork;
  token: TokenInfo;
  amount: string;
  recipient: string;
  bridgeProvider: 'stargate' | 'wormhole' | 'synapse' | 'hop' | 'cbridge';
  estimatedTime?: number; // seconds
  fee?: string;
}

// IPFS Types
export interface IPFSUpload {
  cid: string;
  url: string;
  size: number;
  type: string;
  timestamp: number;
}

// Blockchain Event
export interface BlockchainEvent {
  type: 'transaction' | 'block' | 'contract-event' | 'token-transfer' | 'nft-transfer';
  network: BlockchainNetwork;
  blockNumber: number;
  transactionHash?: string;
  timestamp: number;
  data: unknown;
}

// Node Configuration Types
export interface BlockchainNodeConfig {
  network: BlockchainNetwork;
  operation: string;
  address?: string;
  contract?: SmartContract;
  params?: Record<string, unknown>;
  gasSettings?: {
    gasLimit?: string;
    gasPrice?: string;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  };
  confirmations?: number;
  timeout?: number;
}

// Execution Context
export interface Web3ExecutionContext {
  wallet?: WalletConnection;
  network: BlockchainNetwork;
  rpcUrl?: string;
  privateKey?: string; // Encrypted
  apiKeys?: Record<string, string>;
  slippageTolerance?: number;
  gasStrategy?: 'low' | 'medium' | 'high' | 'custom';
}

// Error Types
export interface Web3Error {
  code: string;
  message: string;
  network?: BlockchainNetwork;
  transactionHash?: string;
  details?: unknown;
}

// Analytics
export interface ChainAnalytics {
  network: BlockchainNetwork;
  blockHeight: number;
  tps: number; // transactions per second
  gasPrice: GasEstimate;
  networkHealth: 'healthy' | 'degraded' | 'down';
  lastUpdated: number;
}

// Token Approval
export interface TokenApproval {
  token: TokenInfo;
  spender: string;
  amount: string;
  unlimited?: boolean;
}

// Security
export interface SecurityCheck {
  type: 'contract-verification' | 'token-scan' | 'aml-screening';
  target: string;
  passed: boolean;
  issues?: string[];
  riskScore?: number;
  timestamp: number;
}
